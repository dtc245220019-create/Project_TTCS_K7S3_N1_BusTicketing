import hashlib
import hmac
import urllib.parse
from datetime import datetime


# =========================
# US17 - VNPAY
# =========================

def _vnpay_sign_data(params: dict) -> str:
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
    tmn_code: str,
    hash_secret: str,
    payment_url: str,
    return_url: str,
    ip_addr: str = "127.0.0.1",
) -> str:
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


def verify_vnpay_signature(params: dict, hash_secret: str) -> bool:
    received = params.get("vnp_SecureHash")
    if not received:
        return False

    data = {
        k: v for k, v in params.items()
        if k not in ("vnp_SecureHash", "vnp_SecureHashType")
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


# =========================
# US17 - ZaloPay
# =========================

def create_zalopay_mac(data: str, key1: str) -> str:
    return hmac.new(
        key1.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()


def verify_zalopay_callback(data: str, mac: str, key2: str) -> bool:
    expected = hmac.new(
        key2.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, mac)
