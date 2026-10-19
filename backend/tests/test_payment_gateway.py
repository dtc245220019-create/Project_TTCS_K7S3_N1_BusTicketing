"""Comprehensive Unit and Integration Tests for BE1: Payment Gateway (US17, US18).

Tests:
1. VNPay & ZaloPay cryptographic functions (HMAC-SHA512 and HMAC-SHA256)
2. URL generation and query string building
3. Payment creation API endpoints (/api/v1/payments/vnpay/create, /api/v1/payments/zalopay/create)
4. Webhook and Callback endpoints with idempotency, signature validation and DB updates:
   - VNPay IPN (/api/v1/payments/vnpay/ipn)
   - VNPay Return (/api/v1/payments/vnpay/return)
   - ZaloPay Callback (/api/v1/payments/zalopay/callback)
5. Query payment status (/api/v1/payments/{transaction_code})
"""

import hashlib
import hmac
import json
import urllib.parse
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api import app
from database import get_connection
from payment_gateway import (
    VNPAY_HASH_SECRET,
    VNPAY_TMN_CODE,
    ZALOPAY_KEY1,
    ZALOPAY_KEY2,
    _vnpay_sign_data,
    create_vnpay_payment_url,
    create_zalopay_mac,
    verify_vnpay_signature,
    verify_zalopay_callback,
)

client = TestClient(app)


# =============================================================================
# 1. CRYPTOGRAPHIC & GATEWAY HELPER TESTS (US17)
# =============================================================================

class TestVNPayCryptoHelpers:

    def test_vnpay_url_generation_contains_required_fields(self):
        txn_ref = f"VNPTEST_{uuid4().hex[:8]}"
        url = create_vnpay_payment_url(
            txn_ref=txn_ref,
            amount=250000,
            order_info="Thanh toan ve test",
            tmn_code="TESTTMN",
            hash_secret="TESTSECRET",
            payment_url="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
            return_url="http://localhost:8000/api/v1/payments/vnpay/return",
        )
        assert url.startswith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?")
        assert "vnp_TxnRef=" + txn_ref in url
        assert "vnp_Amount=25000000" in url
        assert "vnp_TmnCode=TESTTMN" in url
        assert "vnp_Command=pay" in url
        assert "vnp_Version=2.1.0" in url
        assert "vnp_CurrCode=VND" in url
        assert "vnp_SecureHash=" in url

    def test_verify_vnpay_signature_valid(self):
        params = {
            "vnp_TxnRef": "TXN_12345",
            "vnp_Amount": "10000000",
            "vnp_ResponseCode": "00",
            "vnp_OrderInfo": "Ve xe Ha Noi - Da Nang",
        }
        sign_data = _vnpay_sign_data(params)
        secret = "MY_VNPAY_SECRET_KEY"
        secure_hash = hmac.new(
            secret.encode(),
            sign_data.encode(),
            hashlib.sha512
        ).hexdigest()

        params_with_hash = dict(params)
        params_with_hash["vnp_SecureHash"] = secure_hash
        params_with_hash["vnp_SecureHashType"] = "SHA512"

        assert verify_vnpay_signature(params_with_hash, hash_secret=secret) is True

    def test_verify_vnpay_signature_invalid(self):
        params = {
            "vnp_TxnRef": "TXN_12345",
            "vnp_Amount": "10000000",
            "vnp_ResponseCode": "00",
            "vnp_SecureHash": "invalidhash1234567890abcdef",
        }
        assert verify_vnpay_signature(params, hash_secret="MY_VNPAY_SECRET_KEY") is False

    def test_verify_vnpay_signature_tampered_amount(self):
        params = {
            "vnp_TxnRef": "TXN_12345",
            "vnp_Amount": "10000000",
            "vnp_ResponseCode": "00",
        }
        sign_data = _vnpay_sign_data(params)
        secret = "SECRET"
        secure_hash = hmac.new(secret.encode(), sign_data.encode(), hashlib.sha512).hexdigest()

        # Attacker tampers with amount from 100,000 to 1,000
        tampered_params = dict(params)
        tampered_params["vnp_Amount"] = "100000"
        tampered_params["vnp_SecureHash"] = secure_hash

        assert verify_vnpay_signature(tampered_params, hash_secret=secret) is False


class TestZaloPayCryptoHelpers:

    def test_zalopay_mac_generation(self):
        data = "TXN_ZLP_001|250000"
        key = "secret_key_1"
        mac = create_zalopay_mac(data, key1=key)
        expected = hmac.new(key.encode(), data.encode(), hashlib.sha256).hexdigest()
        assert mac == expected

    def test_zalopay_callback_verification_valid(self):
        payload_data = json.dumps({"transaction_code": "ZLP_100", "amount": 300000})
        key2 = "zalopay_secret_key_2"
        mac = hmac.new(key2.encode(), payload_data.encode(), hashlib.sha256).hexdigest()

        assert verify_zalopay_callback(payload_data, mac, key2=key2) is True

    def test_zalopay_callback_verification_invalid(self):
        payload_data = json.dumps({"transaction_code": "ZLP_100", "amount": 300000})
        assert verify_zalopay_callback(payload_data, "bad_mac_signature", key2="key2") is False


# =============================================================================
# 2. VNPAY API ROUTE INTEGRATION TESTS (US17, US18)
# =============================================================================

class TestVNPayApiEndpoints:

    def test_create_vnpay_payment_success(self):
        res = client.post("/api/v1/payments/vnpay/create", json={
            "amount": 180000,
            "order_info": "Thanh toan ve xe buyt",
            "booking_code": "BOOK-VNPAY-01",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["status"] == "PENDING"
        assert data["transaction_code"].startswith("VNP")
        assert "vnp_SecureHash" in data["payment_url"]

        # Check DB
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM payments WHERE transaction_code = ?",
                (data["transaction_code"],),
            ).fetchone()
            assert row is not None
            assert row["amount"] == 180000
            assert row["provider"] == "VNPAY"
            assert row["status"] == "PENDING"

    def test_create_vnpay_payment_invalid_amount(self):
        res = client.post("/api/v1/payments/vnpay/create", json={
            "amount": 0,
            "order_info": "Test",
        })
        assert res.status_code == 422

    def test_vnpay_ipn_success_and_idempotency(self):
        # 1. Create a payment in DB
        txn_ref = f"VNP{uuid4().hex[:10].upper()}"
        booking_code = f"BOOK-{uuid4().hex[:8].upper()}"
        with get_connection() as conn:
            conn.execute(
                """INSERT INTO bookings (booking_code, user_id, trip_id, total_amount, status)
                   VALUES (?, 1, 1, 200000, 'PENDING')""",
                (booking_code,),
            )
            conn.execute(
                """INSERT INTO payments (booking_code, transaction_code, amount, provider, status)
                   VALUES (?, ?, 200000, 'VNPAY', 'PENDING')""",
                (booking_code, txn_ref),
            )
            conn.execute(
                "INSERT OR REPLACE INTO demo_tickets (ticket_code, booking_code, status) VALUES ('TKT-IPN-1', ?, 'CANCELLED')",
                (booking_code,),
            )
            conn.commit()

        # 2. Simulate valid IPN call
        params = {
            "vnp_TxnRef": txn_ref,
            "vnp_Amount": "20000000",  # 200,000 * 100
            "vnp_ResponseCode": "00",
            "vnp_OrderInfo": "Thanh toan hop le",
        }
        sign_str = _vnpay_sign_data(params)
        secure_hash = hmac.new(VNPAY_HASH_SECRET.encode(), sign_str.encode(), hashlib.sha512).hexdigest()
        params["vnp_SecureHash"] = secure_hash

        res = client.get("/api/v1/payments/vnpay/ipn", params=params)
        assert res.status_code == 200
        assert res.json()["RspCode"] == "00"

        # Verify DB updated
        with get_connection() as conn:
            p_row = conn.execute("SELECT * FROM payments WHERE transaction_code = ?", (txn_ref,)).fetchone()
            assert p_row["status"] == "SUCCESS"
            assert p_row["paid_at"] is not None

            b_row = conn.execute("SELECT status FROM bookings WHERE booking_code = ?", (booking_code,)).fetchone()
            assert b_row["status"] == "PAID"

            dt_row = conn.execute("SELECT status FROM demo_tickets WHERE booking_code = ?", (booking_code,)).fetchone()
            assert dt_row["status"] == "ACTIVE"

        # 3. Test Idempotency: call IPN again with same params
        res_dup = client.get("/api/v1/payments/vnpay/ipn", params=params)
        assert res_dup.status_code == 200
        assert res_dup.json()["RspCode"] == "00"

    def test_vnpay_ipn_invalid_signature(self):
        res = client.get("/api/v1/payments/vnpay/ipn", params={
            "vnp_TxnRef": "TXN_NON_EXIST",
            "vnp_SecureHash": "tampered_signature",
        })
        assert res.status_code == 200
        assert res.json()["RspCode"] == "97"

    def test_vnpay_ipn_order_not_found(self):
        params = {
            "vnp_TxnRef": "UNKNOWN_TXN_999999",
            "vnp_Amount": "10000000",
            "vnp_ResponseCode": "00",
        }
        sign_str = _vnpay_sign_data(params)
        secure_hash = hmac.new(VNPAY_HASH_SECRET.encode(), sign_str.encode(), hashlib.sha512).hexdigest()
        params["vnp_SecureHash"] = secure_hash

        res = client.get("/api/v1/payments/vnpay/ipn", params=params)
        assert res.status_code == 200
        assert res.json()["RspCode"] == "01"

    def test_vnpay_ipn_invalid_amount(self):
        txn_ref = f"VNP{uuid4().hex[:10].upper()}"
        with get_connection() as conn:
            conn.execute(
                """INSERT INTO payments (transaction_code, amount, provider, status)
                   VALUES (?, 150000, 'VNPAY', 'PENDING')""",
                (txn_ref,),
            )
            conn.commit()

        # Send IPN with wrong amount (100,000 instead of 150,000)
        params = {
            "vnp_TxnRef": txn_ref,
            "vnp_Amount": "10000000",
            "vnp_ResponseCode": "00",
        }
        sign_str = _vnpay_sign_data(params)
        secure_hash = hmac.new(VNPAY_HASH_SECRET.encode(), sign_str.encode(), hashlib.sha512).hexdigest()
        params["vnp_SecureHash"] = secure_hash

        res = client.get("/api/v1/payments/vnpay/ipn", params=params)
        assert res.status_code == 200
        assert res.json()["RspCode"] == "04"

    def test_vnpay_return_url_endpoint(self):
        params = {
            "vnp_TxnRef": "VNP_RET_123",
            "vnp_ResponseCode": "00",
        }
        sign_str = _vnpay_sign_data(params)
        secure_hash = hmac.new(VNPAY_HASH_SECRET.encode(), sign_str.encode(), hashlib.sha512).hexdigest()
        params["vnp_SecureHash"] = secure_hash

        res = client.get("/api/v1/payments/vnpay/return", params=params)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["transaction_code"] == "VNP_RET_123"
        assert data["response_code"] == "00"


# =============================================================================
# 3. ZALOPAY API ROUTE INTEGRATION TESTS (US17, US18)
# =============================================================================

class TestZaloPayApiEndpoints:

    def test_create_zalopay_payment_success(self):
        res = client.post("/api/v1/payments/zalopay/create", json={
            "amount": 220000,
            "booking_code": "BOOK-ZLP-01",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["status"] == "PENDING"
        assert data["transaction_code"].startswith("ZLP")
        assert "mac" in data
        assert "payment_url" in data

        # Check DB
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM payments WHERE transaction_code = ?",
                (data["transaction_code"],),
            ).fetchone()
            assert row is not None
            assert row["amount"] == 220000
            assert row["provider"] == "ZALOPAY"

    def test_zalopay_callback_success_and_idempotency(self):
        txn_code = f"ZLP{uuid4().hex[:10].upper()}"
        booking_code = f"BOOK-{uuid4().hex[:8].upper()}"

        with get_connection() as conn:
            conn.execute(
                """INSERT INTO bookings (booking_code, user_id, trip_id, total_amount, status)
                   VALUES (?, 1, 1, 300000, 'PENDING')""",
                (booking_code,),
            )
            conn.execute(
                """INSERT INTO payments (booking_code, transaction_code, amount, provider, status)
                   VALUES (?, ?, 300000, 'ZALOPAY', 'PENDING')""",
                (booking_code, txn_code),
            )
            conn.commit()

        callback_data = json.dumps({"transaction_code": txn_code, "amount": 300000})
        mac = create_zalopay_mac(callback_data, key1=ZALOPAY_KEY2)

        res = client.post("/api/v1/payments/zalopay/callback", json={
            "data": callback_data,
            "mac": mac,
        })
        assert res.status_code == 200
        assert res.json()["return_code"] == 1

        # Check DB
        with get_connection() as conn:
            p_row = conn.execute("SELECT * FROM payments WHERE transaction_code = ?", (txn_code,)).fetchone()
            assert p_row["status"] == "SUCCESS"
            assert p_row["paid_at"] is not None

            b_row = conn.execute("SELECT status FROM bookings WHERE booking_code = ?", (booking_code,)).fetchone()
            assert b_row["status"] == "PAID"

        # Idempotency: repeat callback
        res_dup = client.post("/api/v1/payments/zalopay/callback", json={
            "data": callback_data,
            "mac": mac,
        })
        assert res_dup.status_code == 200
        assert res_dup.json()["return_code"] == 1

    def test_zalopay_callback_invalid_mac(self):
        callback_data = json.dumps({"transaction_code": "ZLP_INVALID"})
        res = client.post("/api/v1/payments/zalopay/callback", json={
            "data": callback_data,
            "mac": "invalid_mac_hash",
        })
        assert res.status_code == 200
        assert res.json()["return_code"] == -1

    def test_zalopay_callback_order_not_found(self):
        callback_data = json.dumps({"transaction_code": "ZLP_DOES_NOT_EXIST_999"})
        mac = create_zalopay_mac(callback_data, key1=ZALOPAY_KEY2)

        res = client.post("/api/v1/payments/zalopay/callback", json={
            "data": callback_data,
            "mac": mac,
        })
        assert res.status_code == 200
        assert res.json()["return_code"] == 0


# =============================================================================
# 4. PAYMENT STATUS LOOKUP (US17)
# =============================================================================

def test_get_payment_status_found():
    txn_code = f"TXN-LOOKUP-{uuid4().hex[:6].upper()}"
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO payments (transaction_code, amount, provider, status)
               VALUES (?, 175000, 'VNPAY', 'PENDING')""",
            (txn_code,),
        )
        conn.commit()

    res = client.get(f"/api/v1/payments/{txn_code}")
    assert res.status_code == 200
    data = res.json()
    assert data["transaction_code"] == txn_code
    assert data["amount"] == 175000
    assert data["status"] == "PENDING"


def test_get_payment_status_not_found():
    res = client.get("/api/v1/payments/TXN-NON-EXISTENT-XYZ")
    assert res.status_code == 404
