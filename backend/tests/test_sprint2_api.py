import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import database
from api import app
from seed_data import seed_database, seed_rich_demo_data
from BE1_zalo_vnpay.app.config import VNPAY_HASH_SECRET, ZALOPAY_KEY1, ZALOPAY_KEY2
from BE1_zalo_vnpay.app.payment_gateway import _vnpay_sign_data, create_zalopay_mac
import hashlib
import hmac


class Sprint2ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = Path(tempfile.mkdtemp())
        self.db_path = self.temp / "test_sprint2.db"
        self.path_patch = patch.object(database, "DATABASE_PATH", self.db_path)
        self.path_patch.start()
        self.client = TestClient(app)
        self.client.__enter__()
        with database.get_connection() as connection:
            database.initialize_database(connection)
            seed_database(connection)
            seed_rich_demo_data(connection)

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.path_patch.stop()
        try:
            os.remove(self.db_path)
            os.rmdir(self.temp)
        except PermissionError:
            pass

    # 1. Test Vouchers (BE4)
    def test_voucher_crud_and_apply(self):
        # List vouchers
        res = self.client.get("/api/v1/vouchers")
        self.assertEqual(res.status_code, 200)
        vouchers = res.json()
        self.assertTrue(any(v.get("code") == "CHAO20" for v in vouchers))

        # Apply percentage voucher CHAO20 (20% off)
        res_apply = self.client.post("/api/v1/vouchers/apply", json={
            "code": "CHAO20",
            "order_value": 200000
        })
        self.assertEqual(res_apply.status_code, 200)
        data = res_apply.json()
        self.assertEqual(data["discount_amount"], 40000)
        self.assertEqual(data["final_amount"], 160000)

        # Apply fixed voucher BUS50 (50k off for min order 100k)
        res_bus50 = self.client.post("/api/v1/vouchers/apply", json={
            "code": "BUS50",
            "order_value": 150000
        })
        self.assertEqual(res_bus50.status_code, 200)
        self.assertEqual(res_bus50.json()["discount_amount"], 50000)
        self.assertEqual(res_bus50.json()["final_amount"], 100000)

        # Apply voucher below min order value
        res_min = self.client.post("/api/v1/vouchers/apply", json={
            "code": "BUS50",
            "order_value": 50000
        })
        self.assertEqual(res_min.status_code, 400)

    # 2. Test Fees (BE4)
    def test_fee_crud_and_calculate(self):
        res = self.client.get("/api/v1/fees")
        self.assertEqual(res.status_code, 200)
        fees = res.json()
        self.assertTrue(len(fees) >= 2)

        # Calculate fee
        res_calc = self.client.post("/api/v1/fees/calculate", json={
            "fee_id": 1,
            "order_value": 100000
        })
        self.assertEqual(res_calc.status_code, 200)
        data = res_calc.json()
        self.assertEqual(data["fee_amount"], 5000)
        self.assertEqual(data["final_amount"], 105000)

    # 3. Test VNPay (BE1 - US17/US18)
    def test_vnpay_flow(self):
        # Create VNPay payment URL
        res = self.client.post("/api/v1/payments/vnpay/create", json={
            "amount": 250000,
            "order_info": "Thanh toan ve test",
            "booking_code": "BOOK-PAID-001"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        txn_ref = data["transaction_code"]
        self.assertIn("vnp_SecureHash", data["payment_url"])

        # Simulate VNPay IPN with valid signature
        params = {
            "vnp_TxnRef": txn_ref,
            "vnp_Amount": "25000000",
            "vnp_ResponseCode": "00",
            "vnp_OrderInfo": "Thanh toan ve test",
        }
        sign_str = _vnpay_sign_data(params)
        secure_hash = hmac.new(
            VNPAY_HASH_SECRET.encode(),
            sign_str.encode(),
            hashlib.sha512
        ).hexdigest()
        params["vnp_SecureHash"] = secure_hash

        res_ipn = self.client.get("/api/v1/payments/vnpay/ipn", params=params)
        self.assertEqual(res_ipn.status_code, 200)
        self.assertEqual(res_ipn.json()["RspCode"], "00")

    # 4. Test ZaloPay (BE1 - US17/US18)
    def test_zalopay_flow(self):
        res = self.client.post("/api/v1/payments/zalopay/create", json={
            "amount": 150000,
            "booking_code": "BOOK-PAID-001"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        txn_code = data["transaction_code"]

        # Simulate ZaloPay callback with valid MAC
        callback_payload = f'{{"transaction_code":"{txn_code}","amount":150000}}'
        mac = create_zalopay_mac(callback_payload, ZALOPAY_KEY2)
        res_cb = self.client.post("/api/v1/payments/zalopay/callback", json={
            "data": callback_payload,
            "mac": mac
        })
        self.assertEqual(res_cb.status_code, 200)
        self.assertEqual(res_cb.json()["return_code"], 1)

    # 5. Test Boarding (US24)
    def test_boarding_workflow(self):
        res = self.client.post("/api/v1/tickets/boarding", json={
            "ticket_code": "TKT-8892",
            "staff_email": "taixe.nguyen@smartbus.vn"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["valid"])
        self.assertEqual(data["boarding_status"], "DaSoat")

        # Query boarding status
        res_stat = self.client.get(
            "/api/v1/tickets/TKT-8892/boarding?staff_email=taixe.nguyen@smartbus.vn"
        )
        self.assertEqual(res_stat.status_code, 200)
        self.assertEqual(res_stat.json()["boarding_status"], "DaSoat")

    # 6. Test Notifications (US20)
    def test_notifications_endpoint(self):
        res = self.client.get("/api/v1/notifications")
        self.assertEqual(res.status_code, 200)
        notifications = res.json()
        self.assertTrue(len(notifications) >= 1)


if __name__ == "__main__":
    unittest.main()
