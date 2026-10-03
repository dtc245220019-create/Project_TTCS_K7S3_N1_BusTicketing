import os
from dotenv import load_dotenv

load_dotenv()

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
