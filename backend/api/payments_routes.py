"""Payments, online gateways (VNPay, ZaloPay, Sandbox) and order creation router."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from database import get_connection
from common import (
    PaymentRequest,
    CallbackRequest,
    CreateOrderRequest,
    log_audit,
    _ticket_query,
    _serialize_ticket,
    _find_ticket,
    _send_and_record_notification,
)
from payment_gateway import (
    VNPAY_TMN_CODE,
    VNPAY_HASH_SECRET,
    VNPAY_PAYMENT_URL,
    VNPAY_RETURN_URL,
    ZALOPAY_KEY1,
    ZALOPAY_KEY2,
    create_vnpay_payment_url,
    verify_vnpay_signature,
    create_zalopay_mac,
    verify_zalopay_callback,
)

router = APIRouter(tags=["Payments & Orders"])

@router.post("/api/v1/payments", status_code=201, summary="Tạo giao dịch thanh toán Sandbox")
def create_payment(payload: PaymentRequest):
    booking = payload.booking_code.strip().upper()
    provider = payload.provider.strip().upper()
    if not booking:
        raise HTTPException(status_code=422, detail="booking_code is required")

    transaction = f"TXN-SANDBOX-{uuid4().hex[:12].upper()}"
    with get_connection() as connection:
        connection.execute(
            """INSERT INTO payments (booking_code, transaction_code, amount, provider, status)
               VALUES (?, ?, ?, ?, 'PENDING')""",
            (booking, transaction, payload.amount, provider),
        )
        connection.commit()
        row = connection.execute(
            "SELECT * FROM payments WHERE transaction_code = ?", (transaction,)
        ).fetchone()
    return dict(row)


# =============================================================================
# US17 & US18: CỔNG THANH TOÁN VNPAY & ZALOPAY (BE1)
# =============================================================================

class VNPayCreateRequest(BaseModel):
    amount: int = Field(gt=0)
    order_info: Optional[str] = "Thanh toan ve xe buyt SmartBus"
    booking_code: Optional[str] = None


class ZaloPayCreateRequest(BaseModel):
    amount: int = Field(gt=0)
    booking_code: Optional[str] = None


@router.post("/api/v1/payments/vnpay/create", summary="Tạo URL thanh toán VNPay (US17)")
def create_vnpay_payment(payload: VNPayCreateRequest):
    transaction_code = "VNP" + uuid4().hex[:12].upper()
    with get_connection() as connection:
        connection.execute(
            """INSERT INTO payments (booking_code, transaction_code, amount, provider, status)
               VALUES (?, ?, ?, 'VNPAY', 'PENDING')""",
            (payload.booking_code, transaction_code, payload.amount),
        )
        connection.commit()

    payment_url = create_vnpay_payment_url(
        txn_ref=transaction_code,
        amount=payload.amount,
        order_info=payload.order_info or "Thanh toan ve xe",
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


@router.get("/api/v1/payments/vnpay/ipn", summary="VNPay IPN Webhook (US18)")
def vnpay_ipn(request: Request):
    params = dict(request.query_params)
    if not verify_vnpay_signature(params, VNPAY_HASH_SECRET):
        return {"RspCode": "97", "Message": "Invalid signature"}

    txn_ref = params.get("vnp_TxnRef")
    response_code = params.get("vnp_ResponseCode")
    amount = int(params.get("vnp_Amount", "0")) // 100

    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM payments WHERE transaction_code = ?", (txn_ref,)
        ).fetchone()
        if not row:
            return {"RspCode": "01", "Message": "Order not found"}

        if row["amount"] != amount:
            return {"RspCode": "04", "Message": "Invalid amount"}

        if row["status"] == "SUCCESS":
            return {"RspCode": "00", "Message": "Confirm Success"}

        now_str = datetime.now().isoformat()
        if response_code == "00":
            connection.execute(
                "UPDATE payments SET status = 'SUCCESS', paid_at = ? WHERE id = ?",
                (now_str, row["id"]),
            )
            if row["booking_code"]:
                connection.execute(
                    "UPDATE bookings SET status = 'PAID' WHERE booking_code = ?",
                    (row["booking_code"],),
                )
                connection.execute(
                    """UPDATE tickets SET status = 'PAID'
                       WHERE booking_item_id IN (
                           SELECT bi.id FROM booking_items bi
                           JOIN bookings b ON b.id = bi.booking_id
                           WHERE b.booking_code = ?
                       )""",
                    (row["booking_code"],),
                )
                connection.execute(
                    "UPDATE demo_tickets SET status = 'ACTIVE' WHERE booking_code = ?",
                    (row["booking_code"],),
                )
            log_audit(
                connection,
                user_id=None,
                action="VNPAY_PAYMENT_SUCCESS",
                entity_type="payments",
                entity_id=row["id"],
                details=f"VNPay payment {txn_ref} confirmed success for booking {row['booking_code']}",
            )
        else:
            connection.execute("UPDATE payments SET status = 'FAILED' WHERE id = ?", (row["id"],))
            log_audit(
                connection,
                user_id=None,
                action="VNPAY_PAYMENT_FAILED",
                entity_type="payments",
                entity_id=row["id"],
                details=f"VNPay payment {txn_ref} failed with response code {response_code}",
            )

        connection.commit()

    return {"RspCode": "00", "Message": "Confirm Success"}


@router.get("/api/v1/payments/vnpay/return", summary="VNPay Return URL (US18)")
def vnpay_return(request: Request):
    params = dict(request.query_params)
    valid = verify_vnpay_signature(params, VNPAY_HASH_SECRET)
    txn_ref = params.get("vnp_TxnRef", "")
    code = params.get("vnp_ResponseCode", "")
    success = valid and code == "00"
    booking_code = None
    amount = None
    if txn_ref:
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM payments WHERE transaction_code = ?", (txn_ref,)
            ).fetchone()
            if row:
                booking_code = row["booking_code"]
                amount = row["amount"]

    return {
        "success": success,
        "transaction_code": txn_ref,
        "booking_code": booking_code,
        "amount": amount,
        "response_code": code,
        "message": "Giao dịch VNPay thành công!" if success else "Giao dịch VNPay không thành công hoặc chữ ký không hợp lệ.",
    }


@router.post("/api/v1/payments/zalopay/create", summary="Tạo giao dịch ZaloPay (US17)")
def create_zalopay_payment(payload: ZaloPayCreateRequest):
    transaction_code = "ZLP" + uuid4().hex[:12].upper()
    with get_connection() as connection:
        connection.execute(
            """INSERT INTO payments (booking_code, transaction_code, amount, provider, status)
               VALUES (?, ?, ?, 'ZALOPAY', 'PENDING')""",
            (payload.booking_code, transaction_code, payload.amount),
        )
        connection.commit()

    mac_data = f"{transaction_code}|{payload.amount}"
    mac = create_zalopay_mac(mac_data, ZALOPAY_KEY1)

    return {
        "success": True,
        "transaction_code": transaction_code,
        "status": "PENDING",
        "mac": mac,
        "payment_url": f"https://sandbox.zalopay.vn/pay/{transaction_code}",
        "message": "Đã khởi tạo giao dịch ZaloPay thành công!",
    }


@router.post("/api/v1/payments/zalopay/callback", summary="ZaloPay Callback Webhook (US18)")
async def zalopay_callback(request: Request):
    try:
        body = await request.json()
    except Exception:
        return {"return_code": -1, "return_message": "Invalid JSON body"}

    data = body.get("data", "")
    mac = body.get("mac", "")

    if not verify_zalopay_callback(data, mac, ZALOPAY_KEY2):
        return {"return_code": -1, "return_message": "Invalid MAC"}

    import json
    try:
        payload = json.loads(data)
    except Exception:
        return {"return_code": -1, "return_message": "Invalid data format"}

    txn_code = payload.get("transaction_code") or payload.get("app_trans_id")
    if not txn_code:
        return {"return_code": 0, "return_message": "Missing transaction code"}

    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM payments WHERE transaction_code = ?", (txn_code,)
        ).fetchone()
        if not row:
            return {"return_code": 0, "return_message": "Order not found"}

        if row["status"] == "SUCCESS":
            return {"return_code": 1, "return_message": "Success"}

        now_str = datetime.now().isoformat()
        connection.execute(
            "UPDATE payments SET status = 'SUCCESS', paid_at = ? WHERE id = ?",
            (now_str, row["id"]),
        )
        if row["booking_code"]:
            connection.execute(
                "UPDATE bookings SET status = 'PAID' WHERE booking_code = ?",
                (row["booking_code"],),
            )
            connection.execute(
                """UPDATE tickets SET status = 'PAID'
                   WHERE booking_item_id IN (
                       SELECT bi.id FROM booking_items bi
                       JOIN bookings b ON b.id = bi.booking_id
                       WHERE b.booking_code = ?
                   )""",
                (row["booking_code"],),
            )
            connection.execute(
                "UPDATE demo_tickets SET status = 'ACTIVE' WHERE booking_code = ?",
                (row["booking_code"],),
            )

        log_audit(
            connection,
            user_id=None,
            action="ZALOPAY_PAYMENT_SUCCESS",
            entity_type="payments",
            entity_id=row["id"],
            details=f"ZaloPay payment {txn_code} confirmed success for booking {row['booking_code']}",
        )
        connection.commit()

    return {"return_code": 1, "return_message": "Success"}


@router.get("/api/v1/payments/{transaction_code}", summary="Tra cứu trạng thái thanh toán")
def get_payment(transaction_code: str):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM payments WHERE UPPER(transaction_code) = ?",
            (transaction_code.strip().upper(),),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return dict(row)


@router.post("/api/v1/payments/{transaction_code}/callback", summary="Xử lý callback thanh toán")
def payment_callback(transaction_code: str, payload: CallbackRequest):
    code = transaction_code.strip().upper()
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM payments WHERE UPPER(transaction_code) = ?", (code,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Payment not found")

        if row["status"] != "PENDING":
            if row["status"] == payload.status:
                return dict(row)
            raise HTTPException(status_code=409, detail="Payment already finalized")

        now = datetime.now(timezone.utc).isoformat() if payload.status == "SUCCESS" else None
        connection.execute(
            """UPDATE payments SET status = ?, provider_transaction_code = ?, paid_at = ?
               WHERE UPPER(transaction_code) = ?""",
            (payload.status, payload.provider_transaction_code, now, code),
        )

        # Nếu thanh toán thành công, cập nhật booking & demo_tickets
        if payload.status == "SUCCESS" and row["booking_code"]:
            connection.execute(
                "UPDATE bookings SET status = 'PAID' WHERE booking_code = ?",
                (row["booking_code"],),
            )
            # Cập nhật vé tương ứng
            connection.execute(
                """UPDATE tickets SET status = 'PAID'
                   WHERE booking_item_id IN (
                       SELECT bi.id FROM booking_items bi
                       JOIN bookings b ON b.id = bi.booking_id
                       WHERE b.booking_code = ?
                   )""",
                (row["booking_code"],),
            )

        connection.commit()
        updated = connection.execute(
            "SELECT * FROM payments WHERE UPPER(transaction_code) = ?", (code,)
        ).fetchone()
    return dict(updated)


@router.post("/api/v1/payments/create-order", summary="Tạo đơn đặt vé & Thanh toán trực tuyến")
def create_order(payload: CreateOrderRequest):
    booking_code = f"BOOK-{uuid4().hex[:8].upper()}"
    txn_code = f"TXN-{payload.payment_method.upper()}-{uuid4().hex[:8].upper()}"

    with get_connection() as connection:
        trip = connection.execute("SELECT * FROM trips WHERE id = ?", (payload.trip_id,)).fetchone()
        if not trip:
            raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")

        dep_str = str(trip["departure_at"] or "")
        try:
            if len(dep_str) >= 16:
                dep_dt = datetime.strptime(dep_str[:16], "%Y-%m-%d %H:%M")
                if dep_dt <= datetime.now():
                    raise HTTPException(status_code=400, detail="Chuyến xe này đã khởi hành (quá giờ đặt vé), không thể đặt vé!")
        except HTTPException:
            raise
        except Exception:
            pass

        # Tạo Booking
        cursor = connection.execute(
            """INSERT INTO bookings (booking_code, user_id, trip_id, total_amount, status)
               VALUES (?, ?, ?, ?, 'PAID')""",
            (booking_code, payload.user_id, payload.trip_id, payload.total_amount),
        )
        booking_id = cursor.lastrowid

        # Tạo Payment
        now_str = datetime.now().isoformat()
        connection.execute(
            """INSERT INTO payments (booking_id, booking_code, transaction_code, amount, provider, status, paid_at)
               VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?)""",
            (booking_id, booking_code, txn_code, payload.total_amount, payload.payment_method, now_str),
        )

        generated_tickets = []
        for seat_num in payload.seat_numbers:
            seat_row = connection.execute(
                "SELECT id FROM seats WHERE trip_id = ? AND seat_number = ?",
                (payload.trip_id, seat_num),
            ).fetchone()
            seat_id = seat_row["id"] if seat_row else 1

            # Khóa ghế đã đặt
            connection.execute(
                "UPDATE seats SET status = 'BOOKED', held_until = NULL WHERE id = ?", (seat_id,)
            )

            # Tạo Booking Item
            bi_cursor = connection.execute(
                """INSERT INTO booking_items (booking_id, seat_id, passenger_name, passenger_id_number)
                   VALUES (?, ?, ?, ?)""",
                (booking_id, seat_id, payload.passenger_name, payload.passenger_phone),
            )
            item_id = bi_cursor.lastrowid

            # Tạo Mã vé & QR Code
            ticket_code = f"TKT-{uuid4().hex[:6].upper()}"
            qr_payload = f"ticket:{ticket_code}"

            connection.execute(
                """INSERT INTO tickets (ticket_code, qr_payload, booking_item_id, user_id, trip_id, seat_id, actual_price, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID')""",
                (ticket_code, qr_payload, item_id, payload.user_id, payload.trip_id, seat_id, payload.total_amount // len(payload.seat_numbers)),
            )
            connection.execute(
                "INSERT OR REPLACE INTO demo_tickets (ticket_code, booking_code, status) VALUES (?, ?, 'ACTIVE')",
                (ticket_code, booking_code),
            )
            generated_tickets.append(ticket_code)

        connection.commit()

        # Gửi thông báo Email + SMS xác nhận đặt vé thành công (US20)
        try:
            trip_info = connection.execute(
                "SELECT origin, destination, departure_at FROM trips WHERE id = ?",
                (payload.trip_id,),
            ).fetchone()
            u_info = connection.execute(
                "SELECT email, phone FROM users WHERE id = ?",
                (payload.user_id,),
            ).fetchone()
            user_email = u_info["email"] if u_info else "nguyenvana@gmail.com"
            user_phone = payload.passenger_phone or (u_info["phone"] if u_info else "0912345678")

            for t_code, s_num in zip(generated_tickets, payload.seat_numbers):
                t_row = connection.execute("SELECT id FROM tickets WHERE ticket_code = ?", (t_code,)).fetchone()
                ticket_id = t_row["id"] if t_row else None
                t_data = {
                    "ticket_code": t_code,
                    "customer_name": payload.passenger_name,
                    "route_name": f"{trip_info['origin']} - {trip_info['destination']}" if trip_info else "Tuyến xe liên tỉnh",
                    "departure_time": trip_info["departure_at"] if trip_info else "Hôm nay",
                    "seat_number": s_num,
                    "total_price": payload.total_amount // len(payload.seat_numbers),
                }
                _send_and_record_notification(
                    connection, t_data, user_email, user_phone, payload.user_id, ticket_id
                )
        except Exception as notify_err:
            print(f"[NOTIFICATION] Lỗi thông báo đặt vé: {notify_err}")

        return {
            "success": True,
            "booking_code": booking_code,
            "transaction_code": txn_code,
            "tickets": generated_tickets,
            "message": "Thanh toán thành công và vé điện tử đã được phát hành!",
        }


