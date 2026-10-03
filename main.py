import json
import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse

from .config import (
    VNPAY_TMN_CODE,
    VNPAY_HASH_SECRET,
    VNPAY_PAYMENT_URL,
    VNPAY_RETURN_URL,
    ZALOPAY_KEY2,
)
from .payment_gateway import (
    create_vnpay_payment_url,
    verify_vnpay_signature,
    verify_zalopay_callback,
)

app = FastAPI(
    title="US17 + US18 Payment Integration",
    version="1.0.0"
)

# Demo in-memory storage.
# Khi tích hợp vào project thật, thay bằng database của project.
PAYMENTS = {}


# ==========================================================
# US17 - TẠO THANH TOÁN
# ==========================================================

@app.post("/api/v1/payments/vnpay/create")
async def create_vnpay_payment(body: dict):
    amount = int(body.get("amount", 0))
    order_info = body.get("order_info", "Thanh toan ve xe")

    if amount <= 0:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "amount phai > 0"}
        )

    transaction_code = "VNP" + uuid.uuid4().hex[:12].upper()

    PAYMENTS[transaction_code] = {
        "transaction_code": transaction_code,
        "provider": "VNPAY",
        "amount": amount,
        "status": "PENDING",
    }

    payment_url = create_vnpay_payment_url(
        txn_ref=transaction_code,
        amount=amount,
        order_info=order_info,
        tmn_code=VNPAY_TMN_CODE,
        hash_secret=VNPAY_HASH_SECRET,
        payment_url=VNPAY_PAYMENT_URL,
        return_url=VNPAY_RETURN_URL,
    )

    return {
        "success": True,
        "transaction_code": transaction_code,
        "status": "PENDING",
        "payment_url": payment_url,
    }


# ==========================================================
# US18 - VNPAY IPN / WEBHOOK
# ==========================================================

@app.get("/api/v1/payments/vnpay/ipn")
async def vnpay_ipn(request: Request):
    params = dict(request.query_params)

    if not verify_vnpay_signature(params, VNPAY_HASH_SECRET):
        return {"RspCode": "97", "Message": "Invalid signature"}

    txn_ref = params.get("vnp_TxnRef")
    response_code = params.get("vnp_ResponseCode")
    amount = int(params.get("vnp_Amount", "0")) // 100

    payment = PAYMENTS.get(txn_ref)

    if not payment:
        return {"RspCode": "01", "Message": "Order not found"}

    if payment["amount"] != amount:
        return {"RspCode": "04", "Message": "Invalid amount"}

    # Idempotent callback:
    # callback lặp lại không làm thay đổi sai trạng thái.
    if payment["status"] == "SUCCESS":
        return {"RspCode": "00", "Message": "Confirm Success"}

    if response_code == "00":
        payment["status"] = "SUCCESS"
    else:
        payment["status"] = "FAILED"

    return {"RspCode": "00", "Message": "Confirm Success"}


# ==========================================================
# US18 - VNPAY RETURN
# ==========================================================

@app.get("/api/v1/payments/vnpay/return")
async def vnpay_return(request: Request):
    params = dict(request.query_params)

    if not verify_vnpay_signature(params, VNPAY_HASH_SECRET):
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Invalid signature"}
        )

    txn_ref = params.get("vnp_TxnRef")

    # Return URL chỉ dùng để đưa người dùng về website.
    # Không dùng Return URL để tự xác nhận thanh toán.
    return {
        "success": True,
        "transaction_code": txn_ref,
        "message": "Da xac thuc Return URL. Cho IPN cap nhat trang thai."
    }


# ==========================================================
# US17 - ZALOPAY CREATE
# ==========================================================

@app.post("/api/v1/payments/zalopay/create")
async def create_zalopay_payment(body: dict):
    amount = int(body.get("amount", 0))

    if amount <= 0:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "amount phai > 0"}
        )

    transaction_code = "ZLP" + uuid.uuid4().hex[:12].upper()

    PAYMENTS[transaction_code] = {
        "transaction_code": transaction_code,
        "provider": "ZALOPAY",
        "amount": amount,
        "status": "PENDING",
    }

    # Phần gọi API tạo order thật của ZaloPay phụ thuộc
    # credentials + endpoint của merchant.
    # Endpoint này tạo transaction nội bộ để minh họa US17.
    return {
        "success": True,
        "transaction_code": transaction_code,
        "status": "PENDING",
        "message": "Da tao transaction ZaloPay. Gan API create order cua ZaloPay vao day."
    }


# ==========================================================
# US18 - ZALOPAY CALLBACK
# ==========================================================

@app.post("/api/v1/payments/zalopay/callback")
async def zalopay_callback(request: Request):
    body = await request.json()

    data = body.get("data", "")
    mac = body.get("mac", "")

    if not verify_zalopay_callback(data, mac, ZALOPAY_KEY2):
        return {"return_code": -1, "return_message": "Invalid MAC"}

    try:
        payload = json.loads(data)
    except json.JSONDecodeError:
        return {"return_code": -1, "return_message": "Invalid data"}

    transaction_code = (
        payload.get("transaction_code")
        or payload.get("app_trans_id")
    )

    payment = PAYMENTS.get(transaction_code)

    if not payment:
        return {"return_code": 0, "return_message": "Order not found"}

    # Idempotent callback
    if payment["status"] == "SUCCESS":
        return {"return_code": 1, "return_message": "Success"}

    payment["status"] = "SUCCESS"

    return {
        "return_code": 1,
        "return_message": "Success"
    }


# ==========================================================
# KIỂM TRA TRẠNG THÁI
# ==========================================================

@app.get("/api/v1/payments/{transaction_code}")
async def payment_status(transaction_code: str):
    payment = PAYMENTS.get(transaction_code)

    if not payment:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message": "Transaction not found"
            }
        )

    return {
        "success": True,
        "data": payment
    }


@app.get("/")
async def root():
    return {
        "project": "US17 + US18",
        "US17": "Create payment VNPAY + ZaloPay",
        "US18": "Webhook / Callback VNPAY + ZaloPay"
    }
