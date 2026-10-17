"""Cổng thanh toán VNPay & ZaloPay (Sprint 2 - US17 & US18).

Cung cấp các hàm tạo URL thanh toán VNPay, xác thực chữ ký số HMAC-SHA512,
và tính toán/kiểm tra mã MAC ZaloPay HMAC-SHA256.
"""

import hashlib
import hmac
import os
import urllib.parse
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

# =========================
# VNPAY CONFIG & GATEWAY (US17, US18)
# =========================
VNPAY_TMN_CODE = os.getenv("VNPAY_TMN_CODE", "YOUR_TMN_CODE")
VNPAY_HASH_SECRET = os.getenv("VNPAY_HASH_SECRET", "YOUR_HASH_SECRET")
VNPAY_PAYMENT_URL = os.getenv(
    "VNPAY_PAYMENT_URL",
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
)
VNPAY_RETURN_URL = os.getenv(
    "VNPAY_RETURN_URL",
    "http://localhost:8000/api/v1/payments/vnpay/return"
)

# =========================
# ZALOPAY CONFIG & GATEWAY (US17, US18)
# =========================
ZALOPAY_APP_ID = os.getenv("ZALOPAY_APP_ID", "YOUR_APP_ID")
ZALOPAY_KEY1 = os.getenv("ZALOPAY_KEY1", "YOUR_KEY1")
ZALOPAY_KEY2 = os.getenv("ZALOPAY_KEY2", "YOUR_KEY2")
ZALOPAY_BASE_URL = os.getenv(
    "ZALOPAY_BASE_URL",
    "https://sb-openapi.zalopay.vn/v2"
)
ZALOPAY_CALLBACK_URL = os.getenv(
    "ZALOPAY_CALLBACK_URL",
    "http://localhost:8000/api/v1/payments/zalopay/callback"
)


def _vnpay_sign_data(params: dict) -> str:
    """Tạo chuỗi dữ liệu ký cho VNPay theo chuẩn URL encode."""
    items = []
    for key in sorted(params.keys()):
        value = params[key]
        if value is None or value == "":
            continue
        items.append(
            f"{urllib.parse.quote_plus(str(key))}="
            f"{urllib.parse.quote_plus(str(value))}"
        )
    return "&".join(items)


def create_vnpay_payment_url(
    txn_ref: str,
    amount: int,
    order_info: str,
    tmn_code: str = VNPAY_TMN_CODE,
    hash_secret: str = VNPAY_HASH_SECRET,
    payment_url: str = VNPAY_PAYMENT_URL,
    return_url: str = VNPAY_RETURN_URL,
    ip_addr: str = "127.0.0.1",
) -> str:
    """Tạo URL thanh toán VNPay kèm chữ ký số HMAC-SHA512."""
    params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": tmn_code,
        "vnp_Amount": int(amount) * 100,
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": txn_ref,
        "vnp_OrderInfo": order_info,
        "vnp_OrderType": "other",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": return_url,
        "vnp_IpAddr": ip_addr,
        "vnp_CreateDate": datetime.now().strftime("%Y%m%d%H%M%S"),
    }

    sign_data = _vnpay_sign_data(params)
    secure_hash = hmac.new(
        hash_secret.encode(),
        sign_data.encode(),
        hashlib.sha512
    ).hexdigest()

    query = urllib.parse.urlencode(params)
    return f"{payment_url}?{query}&vnp_SecureHash={secure_hash}"


def verify_vnpay_signature(params: dict, hash_secret: str = VNPAY_HASH_SECRET) -> bool:
    """Xác thực chữ ký HMAC-SHA512 từ callback / IPN của VNPay."""
    received = params.get("vnp_SecureHash")
    if not received:
        return False

    data = {
        k: v for k, v in params.items()
        if k.startswith("vnp_") and k not in ("vnp_SecureHash", "vnp_SecureHashType")
    }

    expected = hmac.new(
        hash_secret.encode(),
        _vnpay_sign_data(data).encode(),
        hashlib.sha512
    ).hexdigest()

    return hmac.compare_digest(
        received.lower(),
        expected.lower()
    )


def create_zalopay_mac(data: str, key1: str = ZALOPAY_KEY1) -> str:
    """Tạo mã xác thực MAC HMAC-SHA256 cho yêu cầu ZaloPay."""
    return hmac.new(
        key1.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()


def verify_zalopay_callback(data: str, mac: str, key2: str = ZALOPAY_KEY2) -> bool:
    """Xác thực mã MAC trả về trong callback của ZaloPay."""
    expected = hmac.new(
        key2.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, mac)
