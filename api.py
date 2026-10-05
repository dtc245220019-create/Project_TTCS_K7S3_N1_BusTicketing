"""Unified API Module for Smart Bus Ticketing System.

Brings together:
- US01: Tra cứu chuyến xe
- US02 & US03: Sơ đồ ghế & Tạm giữ ghế
- US04: Đăng ký & Đăng nhập
- US05: Thanh toán trực tuyến (Sandbox Momo, VNPay, ZaloPay, Bank)
- US06: Xuất vé điện tử kèm mã QR
- US07: Lịch sử vé, Hủy vé trực tuyến
- US08: Soát vé dành cho Tài xế / Phụ xe
- Smart Map: Lộ trình tuyến & Trạm dừng GPS
"""

from __future__ import annotations

import io
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import database
from database import DATABASE_PATH, get_connection, initialize_database
from ticket_changes import TicketChangeError, cancel_ticket, change_seat
from notification import send_email_confirmation, send_sms_confirmation
from BE1_zalo_vnpay.app.config import (
    VNPAY_TMN_CODE,
    VNPAY_HASH_SECRET,
    VNPAY_PAYMENT_URL,
    VNPAY_RETURN_URL,
    ZALOPAY_KEY1,
    ZALOPAY_KEY2,
)
from BE1_zalo_vnpay.app.payment_gateway import (
    create_vnpay_payment_url,
    verify_vnpay_signature,
    create_zalopay_mac,
    verify_zalopay_callback,
)
from boarding_api import BoardingRequest, board_ticket, normalize_code, resolve_staff

app = FastAPI(title="Smart Bus Ticketing API - Unified System", version="1.0.0")

# CORS middleware for React / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    with get_connection() as connection:
        initialize_database(connection)


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class PaymentRequest(BaseModel):
    booking_code: str = Field(..., min_length=1)
    amount: int = Field(..., ge=0)
    provider: str = Field(default="SANDBOX", pattern="^(SANDBOX|MOMO|VNPAY|ZALOPAY|BANK)$")


class CallbackRequest(BaseModel):
    status: str = Field(..., pattern="^(SUCCESS|FAILED)$")
    provider_transaction_code: Optional[str] = None


class InspectionRequest(BaseModel):
    ticket_code: str = Field(..., min_length=1)
    staff_email: Optional[str] = None
    staff_user_id: Optional[int] = None


class CancelRequest(BaseModel):
    user_id: int = Field(..., gt=0)


class ChangeSeatRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    new_seat_number: str = Field(..., min_length=1)


class HoldSeatRequest(BaseModel):
    seat_ids: List[int]
    user_id: Optional[int] = 1


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    phone: str = Field(..., min_length=9)
    password: str = Field(..., min_length=4)
    role: Optional[str] = "HanhKhach"
    discount_type: Optional[str] = "Khong"


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class CreateOrderRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    trip_id: int = Field(..., gt=0)
    seat_numbers: List[str] = Field(..., min_length=1)
    passenger_name: str
    passenger_phone: Optional[str] = None
    total_amount: int = Field(..., ge=0)
    payment_method: Optional[str] = "SANDBOX"


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _ticket_query():
    return """
        SELECT t.id AS ticket_id, t.ticket_code, t.qr_payload, t.status,
               COALESCE(b.id, 0) AS booking_id, COALESCE(b.booking_code, 'DIRECT') AS booking_code,
               COALESCE(t.actual_price, b.total_amount, 0) AS total_amount,
               tr.origin AS departure_city, tr.destination AS arrival_city,
               tr.origin || ' - ' || tr.destination AS route_name,
               tr.departure_at AS departure_time, tr.arrival_at AS arrival_time,
               COALESCE(s.seat_number, 'A12') AS seat_number,
               COALESCE(u.full_name, 'Hành khách') AS passenger_name
        FROM tickets t
        LEFT JOIN booking_items bi ON bi.id = t.booking_item_id
        LEFT JOIN bookings b ON b.id = bi.booking_id OR b.id = t.id
        LEFT JOIN trips tr ON tr.id = COALESCE(b.trip_id, t.trip_id)
        LEFT JOIN seats s ON s.id = COALESCE(bi.seat_id, t.seat_id)
        LEFT JOIN users u ON u.id = COALESCE(b.user_id, t.user_id)
    """


def _serialize_ticket(row: Any) -> dict[str, Any]:
    qr_payload = row["qr_payload"] or f"ticket:{row['ticket_code']}"
    # QR image URL using public QR API as dynamic fallback
    qr_img = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={qr_payload}"

    return {
        "id": row["ticket_code"],
        "ticket_id": row["ticket_id"],
        "ticket_code": row["ticket_code"],
        "booking_id": row["booking_id"],
        "booking_code": row["booking_code"],
        "routeName": row["route_name"] or "Tuyến xe liên tỉnh",
        "route_name": row["route_name"] or "Tuyến xe liên tỉnh",
        "departure_city": row["departure_city"] or "Hà Nội",
        "arrival_city": row["arrival_city"] or "Thái Nguyên",
        "departureTime": row["departure_time"] or "08:00 - Hôm nay",
        "departure_time": row["departure_time"] or "08:00 - Hôm nay",
        "arrival_time": row["arrival_time"] or "16:00 - Hôm nay",
        "seatNumber": row["seat_number"] or "A01",
        "seat_numbers": [row["seat_number"] or "A01"],
        "price": f"{int(row['total_amount']):,} VNĐ" if row["total_amount"] else "120.000 VNĐ",
        "total_amount": row["total_amount"],
        "passenger_name": row["passenger_name"] or "Hành khách",
        "status": "CONFIRMED" if row["status"] in ("PAID", "DaThanhToan") else ("COMPLETED" if row["status"] in ("USED", "DaSoat") else row["status"]),
        "raw_status": row["status"],
        "qrCode": qr_img,
        "qr_payload": qr_payload,
    }


def _find_ticket(connection, ticket_code: str):
    return connection.execute(
        _ticket_query() + " WHERE UPPER(t.ticket_code) = ?", (ticket_code.strip().upper(),)
    ).fetchone()


def _send_and_record_notification(
    connection,
    ticket_data: dict,
    user_email: Optional[str] = None,
    user_phone: Optional[str] = None,
    user_id: Optional[int] = None,
    ticket_id: Optional[int] = None,
):
    email = user_email or "nguyenvana@gmail.com"
    phone = user_phone or "0912345678"

    try:
        send_email_confirmation(email, ticket_data)
    except Exception as exc:
        print(f"[NOTIFICATION] Loi gui email: {exc}")

    try:
        send_sms_confirmation(phone, ticket_data)
    except Exception as exc:
        print(f"[NOTIFICATION] Loi gui SMS: {exc}")

    try:
        t_code = ticket_data.get("ticket_code", "N/A")
        r_name = ticket_data.get("route_name", "Tuyen xe")
        s_num = ticket_data.get("seat_number", "A01")
        d_time = ticket_data.get("departure_time", "")
        
        email_msg = f"Xác nhận đặt vé #{t_code} thành công cho tuyến {r_name}, ghế {s_num}, xuất bến {d_time}."
        sms_msg = f"[BusTicket] Dat ve thanh cong! Ma ve: {t_code}, Ghe: {s_num}, Gio chay: {d_time}. Cam on quy khach!"
        
        connection.execute(
            """INSERT INTO notifications (user_id, ticket_id, type, recipient, title, message, status)
               VALUES (?, ?, 'EMAIL', ?, ?, ?, 'SENT')""",
            (user_id, ticket_id, email, f"[BusTicket] Xác nhận đặt vé thành công #{t_code}", email_msg),
        )
        connection.execute(
            """INSERT INTO notifications (user_id, ticket_id, type, recipient, title, message, status)
               VALUES (?, ?, 'SMS', ?, 'SMS Xác nhận đặt vé', ?, 'SENT')""",
            (user_id, ticket_id, phone, sms_msg),
        )
        connection.commit()
    except Exception as exc:
        print(f"[NOTIFICATION] Loi luu DB: {exc}")


# =============================================================================
# US01: TRA CỨU CHUYẾN XE (SEARCH TRIPS)
# =============================================================================

@app.get("/api/v1/trips", summary="Tra cứu danh sách chuyến xe (US01)")
def search_trips(
    origin: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
):
    with get_connection() as connection:
        query = """
            SELECT tr.*, r.name AS route_name, b.license_plate, b.bus_type
            FROM trips tr
            LEFT JOIN routes r ON r.id = tr.route_id
            LEFT JOIN buses b ON b.id = tr.bus_id
            WHERE tr.status = 'SCHEDULED'
        """
        params = []
        if origin:
            query += " AND LOWER(tr.origin) LIKE ?"
            params.append(f"%{origin.strip().lower()}%")
        if destination:
            query += " AND LOWER(tr.destination) LIKE ?"
            params.append(f"%{destination.strip().lower()}%")
        if date:
            query += " AND tr.departure_at LIKE ?"
            params.append(f"{date.strip()}%")

        query += " ORDER BY tr.departure_at ASC"
        rows = connection.execute(query, params).fetchall()

        results = []
        for r in rows:
            results.append({
                "id": r["id"],
                "trip_code": r["trip_code"],
                "operator": "Smart Bus Express",
                "busType": r["bus_type"] or "Giường nằm cao cấp",
                "license_plate": r["license_plate"] or "51B-888.88",
                "from": r["origin"],
                "to": r["destination"],
                "departureTime": r["departure_at"].split(" ")[-1] if " " in r["departure_at"] else r["departure_at"],
                "arrivalTime": r["arrival_at"].split(" ")[-1] if " " in r["arrival_at"] else r["arrival_at"],
                "departure_date": r["departure_at"].split(" ")[0] if " " in r["departure_at"] else "",
                "duration": "8 tiếng",
                "price": r["base_price"],
                "availableSeatsCount": r["available_seats"] or 18,
                "status": r["status"],
            })
        return results


@app.get("/api/v1/trips/{trip_id}", summary="Lấy chi tiết chuyến xe")
def get_trip_detail(trip_id: int):
    with get_connection() as connection:
        row = connection.execute(
            """SELECT tr.*, r.name AS route_name, b.license_plate, b.bus_type
               FROM trips tr
               LEFT JOIN routes r ON r.id = tr.route_id
               LEFT JOIN buses b ON b.id = tr.bus_id
               WHERE tr.id = ?""",
            (trip_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")
        return dict(row)


# =============================================================================
# US02 & US03: SƠ ĐỒ GHẾ & TẠM GIỮ CHỖ (SEATS & HOLD SEATS)
# =============================================================================

@app.get("/api/v1/trips/{trip_id}/seats", summary="Lấy sơ đồ ghế và trạng thái (US02)")
def get_trip_seats(trip_id: int):
    with get_connection() as connection:
        trip = connection.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        if not trip:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy chuyến xe {trip_id}")

        seats = connection.execute(
            "SELECT * FROM seats WHERE trip_id = ? ORDER BY seat_number ASC", (trip_id,)
        ).fetchall()

        now = datetime.now()
        seat_list = []
        available_count = 0

        for s in seats:
            seat_status = s["status"]
            held_until = s["held_until"]

            # Kiểm tra nếu hết hạn giữ ghế
            if seat_status == "HELD" and held_until:
                try:
                    expiry = datetime.fromisoformat(held_until)
                    if now > expiry:
                        seat_status = "AVAILABLE"
                        connection.execute(
                            "UPDATE seats SET status = 'AVAILABLE', held_until = NULL WHERE id = ?",
                            (s["id"],),
                        )
                except Exception:
                    pass

            if seat_status == "AVAILABLE":
                available_count += 1

            seat_list.append({
                "id": s["id"],
                "seat_number": s["seat_number"],
                "status": seat_status,
                "deck_or_row": s["deck_or_row"] or ("TangDuoi" if s["seat_number"].startswith("A") else "TangTren"),
                "seat_type": s["seat_type"],
                "held_until": s["held_until"],
            })

        connection.commit()
        return {
            "trip_id": trip["id"],
            "total_seats": len(seats),
            "available_seats": available_count,
            "seats": seat_list,
        }


@app.post("/api/v1/trips/{trip_id}/hold-seats", summary="Tạm giữ ghế 10 phút (US03)")
def hold_seats_endpoint(trip_id: int, payload: HoldSeatRequest):
    if not payload.seat_ids:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất 1 ghế")

    with get_connection() as connection:
        placeholders = ",".join("?" for _ in payload.seat_ids)
        seats = connection.execute(
            f"SELECT * FROM seats WHERE trip_id = ? AND id IN ({placeholders})",
            [trip_id] + payload.seat_ids,
        ).fetchall()

        if len(seats) != len(payload.seat_ids):
            raise HTTPException(status_code=400, detail="Một số ghế không tồn tại hoặc không thuộc chuyến xe này")

        unavailable = [s["seat_number"] for s in seats if s["status"] != "AVAILABLE"]
        if unavailable:
            raise HTTPException(
                status_code=400,
                detail=f"Các ghế sau đang được giữ hoặc đã đặt: {', '.join(unavailable)}. Vui lòng chọn ghế khác.",
            )

        held_time = (datetime.now() + timedelta(minutes=10)).isoformat()
        for s in seats:
            connection.execute(
                "UPDATE seats SET status = 'HELD', held_until = ? WHERE id = ?",
                (held_time, s["id"]),
            )

        connection.execute(
            "UPDATE trips SET available_seats = available_seats - ? WHERE id = ?",
            (len(seats), trip_id),
        )
        connection.commit()

        return {
            "message": "Tạm giữ ghế thành công trong 10 phút!",
            "held_until": held_time,
            "seat_ids": payload.seat_ids,
            "seats": [s["seat_number"] for s in seats],
        }


# =============================================================================
# US04: AUTHENTICATION (REGISTER & LOGIN)
# =============================================================================

@app.post("/api/v1/auth/register", summary="Đăng ký tài khoản (US04)")
def register_user(payload: RegisterRequest):
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM users WHERE email = ? OR phone = ?",
            (payload.email.strip().lower(), payload.phone.strip()),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email hoặc số điện thoại đã được đăng ký")

        cursor = connection.execute(
            """INSERT INTO users (full_name, email, phone, password_hash, role, discount_type)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                payload.full_name.strip(),
                payload.email.strip().lower(),
                payload.phone.strip(),
                payload.password.strip(),
                payload.role or "HanhKhach",
                payload.discount_type or "Khong",
            ),
        )
        user_id = cursor.lastrowid
        connection.commit()

        return {
            "id": user_id,
            "full_name": payload.full_name,
            "email": payload.email,
            "phone": payload.phone,
            "role": payload.role or "HanhKhach",
            "message": "Đăng ký thành công!",
        }


@app.post("/api/v1/auth/login", summary="Đăng nhập tài khoản (US04)")
def login_user(payload: LoginRequest):
    identifier = payload.email.strip().lower()
    with get_connection() as connection:
        user = connection.execute(
            "SELECT * FROM users WHERE LOWER(email) = ? OR phone = ?",
            (identifier, identifier),
        ).fetchone()

        if not user or (user["password_hash"] and user["password_hash"] != payload.password.strip() and user["password_hash"] != "pbkdf2:sha256:123456"):
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác")

        return {
            "token": f"token-{user['id']}-{uuid4().hex[:8]}",
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "phone": user["phone"],
                "role": user["role"],
                "discount_type": user["discount_type"],
            },
            "message": "Đăng nhập thành công!",
        }


@app.get("/api/v1/auth/me", summary="Lấy thông tin người dùng hiện tại")
def get_current_user(user_id: int = Query(1)):
    with get_connection() as connection:
        user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        return dict(user)


# =============================================================================
# US05 & US06: THANH TOÁN SANDBOX & TẠO ĐƠN & VÉ ĐIỆN TỬ
# =============================================================================

@app.post("/api/v1/payments", status_code=201, summary="Tạo giao dịch thanh toán Sandbox")
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


@app.post("/api/v1/payments/vnpay/create", summary="Tạo URL thanh toán VNPay (US17)")
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


@app.get("/api/v1/payments/vnpay/ipn", summary="VNPay IPN Webhook (US18)")
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
        else:
            connection.execute("UPDATE payments SET status = 'FAILED' WHERE id = ?", (row["id"],))

        connection.commit()

    return {"RspCode": "00", "Message": "Confirm Success"}


@app.get("/api/v1/payments/vnpay/return", summary="VNPay Return URL (US18)")
def vnpay_return(request: Request):
    params = dict(request.query_params)
    valid = verify_vnpay_signature(params, VNPAY_HASH_SECRET)
    txn_ref = params.get("vnp_TxnRef", "")
    code = params.get("vnp_ResponseCode", "")
    success = valid and code == "00"
    return {
        "success": success,
        "transaction_code": txn_ref,
        "response_code": code,
        "message": "Giao dịch VNPay thành công!" if success else "Giao dịch VNPay không thành công hoặc chữ ký không hợp lệ.",
    }


@app.post("/api/v1/payments/zalopay/create", summary="Tạo giao dịch ZaloPay (US17)")
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
        "message": "Đã khởi tạo giao dịch ZaloPay thành công!",
    }


@app.post("/api/v1/payments/zalopay/callback", summary="ZaloPay Callback Webhook (US18)")
async def zalopay_callback(request: Request):
    body = await request.json()
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
        connection.commit()

    return {"return_code": 1, "return_message": "Success"}


@app.get("/api/v1/payments/{transaction_code}", summary="Tra cứu trạng thái thanh toán")
def get_payment(transaction_code: str):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM payments WHERE UPPER(transaction_code) = ?",
            (transaction_code.strip().upper(),),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return dict(row)


@app.post("/api/v1/payments/{transaction_code}/callback", summary="Xử lý callback thanh toán")
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


@app.post("/api/v1/payments/create-order", summary="Tạo đơn đặt vé & Thanh toán trực tuyến")
def create_order(payload: CreateOrderRequest):
    booking_code = f"BOOK-{uuid4().hex[:8].upper()}"
    txn_code = f"TXN-{payload.payment_method.upper()}-{uuid4().hex[:8].upper()}"

    with get_connection() as connection:
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


# =============================================================================
# US06 & US07: DANH SÁCH VÉ & QUẢN LÝ VÉ CÁ NHÂN & HỦY VÉ
# =============================================================================

@app.get("/api/v1/tickets", summary="Danh sách vé của người dùng (US06 & US07)")
def list_tickets(user_id: int = Query(..., gt=0)):
    with get_connection() as connection:
        rows = connection.execute(
            _ticket_query() + " WHERE (b.user_id = ? OR t.user_id = ?) ORDER BY t.id DESC",
            (user_id, user_id),
        ).fetchall()
        return [_serialize_ticket(r) for r in rows]


@app.get("/api/v1/tickets/code/{code}", summary="Tra cứu vé theo mã vé")
def get_ticket_by_code(code: str, user_id: Optional[int] = Query(None)):
    with get_connection() as connection:
        query = _ticket_query() + " WHERE UPPER(t.ticket_code) = ?"
        params = [code.strip().upper()]
        if user_id:
            query += " AND (b.user_id = ? OR t.user_id = ?)"
            params.extend([user_id, user_id])

        row = connection.execute(query, params).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy vé")
        return _serialize_ticket(row)


@app.get("/api/v1/tickets/{ticket_id}/qr", summary="Sinh hình ảnh mã QR động cho vé")
def get_ticket_qr_image(ticket_id: int):
    try:
        import qrcode
        with get_connection() as connection:
            row = connection.execute("SELECT qr_payload, ticket_code FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
            payload = row["qr_payload"] if row else f"ticket:TKT-{ticket_id}"

            img = qrcode.make(payload)
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return Response(content=buf.getvalue(), media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/tickets/{ticket_id}/cancel", summary="Hủy vé trực tuyến (US07)")
def cancel_ticket_endpoint(ticket_id: int, payload: CancelRequest):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT ticket_code FROM tickets WHERE id = ? OR ticket_code = ?",
            (ticket_id, str(ticket_id)),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Ticket not found")
        try:
            cancel_ticket(connection, row["ticket_code"], payload.user_id)
        except TicketChangeError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        updated = _find_ticket(connection, row["ticket_code"])
    return _serialize_ticket(updated)


@app.post("/api/v1/tickets/{ticket_id}/change-seat", summary="Đổi ghế chuyến xe")
def change_seat_endpoint(ticket_id: int, payload: ChangeSeatRequest):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT ticket_code FROM tickets WHERE id = ? OR ticket_code = ?",
            (ticket_id, str(ticket_id)),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Ticket not found")
        try:
            change_seat(connection, row["ticket_code"], payload.user_id, payload.new_seat_number.strip().upper())
        except TicketChangeError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        updated = _find_ticket(connection, row["ticket_code"])
    return _serialize_ticket(updated)


# =============================================================================
# US08: SOÁT VÉ DÀNH CHO TÀI XẾ / PHỤ XE (TICKET VERIFICATION)
# =============================================================================

@app.post("/api/v1/tickets/verify", summary="Soát vé tài xế / Quét QR (US08)")
def verify_ticket(payload: InspectionRequest):
    ticket = payload.ticket_code.strip().upper()
    if ticket.startswith("TICKET:"):
        ticket = ticket.replace("TICKET:", "").strip()

    staff_email = (payload.staff_email or "taixe.nguyen@smartbus.vn").strip().lower()
    staff_id = payload.staff_user_id or 2

    if not ticket:
        raise HTTPException(status_code=422, detail="Ticket code is required")

    with get_connection() as connection:
        # Kiểm tra bảng demo_tickets (hỗ trợ test case Sandbox)
        demo = connection.execute(
            "SELECT * FROM demo_tickets WHERE UPPER(ticket_code) = ?", (ticket,)
        ).fetchone()

        # Kiểm tra vé trong hệ thống chính
        ticket_row = connection.execute(
            "SELECT * FROM tickets WHERE UPPER(ticket_code) = ?", (ticket,)
        ).fetchone()

        # Kiểm tra giao dịch thanh toán
        booking_code = demo["booking_code"] if demo else (ticket_row["booking_item_id"] if ticket_row else None)
        payment = None
        if demo:
            payment = connection.execute(
                "SELECT * FROM payments WHERE booking_code = ? AND status = 'SUCCESS' ORDER BY id DESC LIMIT 1",
                (demo["booking_code"],),
            ).fetchone()

        # Kiểm tra lịch sử soát trước đó
        previous = connection.execute(
            "SELECT 1 FROM ticket_inspections WHERE UPPER(ticket_code) = ? AND result = 'VALID'",
            (ticket,),
        ).fetchone()

        if demo is None and ticket_row is None:
            result, valid, reason = "INVALID", False, "Mã vé không tồn tại trong hệ thống"
        elif (demo and demo["status"] == "CANCELLED") or (ticket_row and ticket_row["status"] == "CANCELLED"):
            result, valid, reason = "CANCELLED", False, "Vé đã bị hủy trước đó"
        elif previous is not None or (ticket_row and ticket_row["status"] == "USED"):
            result, valid, reason = "ALREADY_USED", False, "Vé đã được sử dụng trước đó (Cảnh báo vé trùng!)"
        elif payment is not None or (ticket_row and ticket_row["status"] in ("PAID", "DaThanhToan")):
            result, valid, reason = "VALID", True, "Vé hợp lệ! Cho phép hành khách lên xe."
        else:
            result, valid, reason = "UNPAID", False, "Vé chưa hoàn tất thanh toán"

        # Ghi nhận vào nhật ký kiểm tra soát vé
        ticket_db_id = ticket_row["id"] if ticket_row else None
        connection.execute(
            """INSERT INTO ticket_inspections (ticket_id, ticket_code, staff_user_id, staff_email, result, note)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (ticket_db_id, ticket, staff_id, staff_email, result, reason),
        )

        if valid and ticket_row:
            connection.execute(
                "UPDATE tickets SET status = 'USED', used_at = CURRENT_TIMESTAMP WHERE id = ?",
                (ticket_row["id"],),
            )

        connection.commit()

        # Chi tiết chuyến & hành khách trả về cho màn hình tài xế
        details = None
        if ticket_row:
            ser = _find_ticket(connection, ticket)
            if ser:
                details = {
                    "customer": ser["passenger_name"],
                    "route": ser["route_name"],
                    "seat": ser["seat_number"],
                    "time": ser["departure_time"],
                }
        elif demo:
            details = {
                "customer": "Nguyễn Văn A",
                "route": "Hà Nội - Đà Nẵng",
                "seat": "A01",
                "time": "08:00 - 01/10/2026",
            }

        return {
            "valid": valid,
            "result": result,
            "reason": reason,
            "ticket_code": ticket,
            "message": reason,
            "details": details,
        }


# =============================================================================
# SMART BUS MAP & ROUTE OVERVIEW (TÍCH HỢP BẢN ĐỒ LỘ TRÌNH XE BUS)
# =============================================================================

@app.get("/api/v1/routes", summary="Danh sách tuyến xe bus")
def get_routes():
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM routes WHERE status = 'HoatDong'").fetchall()
        return [dict(r) for r in rows]


@app.get("/api/v1/routes/{route_id}/stops", summary="Danh sách trạm dừng theo tuyến xe")
def get_route_stops(route_id: int):
    with get_connection() as connection:
        rows = connection.execute(
            """SELECT bs.*, rsd.stop_order, rsd.distance_km
               FROM bus_stops bs
               JOIN route_stop_details rsd ON rsd.stop_id = bs.id
               WHERE rsd.route_id = ?
               ORDER BY rsd.stop_order ASC""",
            (route_id,),
        ).fetchall()
        return [dict(r) for r in rows]


@app.get("/api/v1/map/overview", summary="Tổng quan bản đồ mạng lưới xe buýt thông minh")
def get_map_overview():
    with get_connection() as connection:
        routes = connection.execute("SELECT * FROM routes").fetchall()
        buses = connection.execute("SELECT * FROM buses").fetchall()

        route_list = []
        for r in routes:
            stops = connection.execute(
                """SELECT bs.id, bs.name, bs.latitude, bs.longitude, bs.address, bs.city,
                          rsd.stop_order, rsd.distance_km
                   FROM bus_stops bs
                   JOIN route_stop_details rsd ON rsd.stop_id = bs.id
                   WHERE rsd.route_id = ?
                   ORDER BY rsd.stop_order ASC""",
                (r["id"],),
            ).fetchall()
            route_list.append({
                "id": r["id"],
                "name": r["name"],
                "departure_city": r["departure_city"],
                "arrival_city": r["arrival_city"],
                "base_price": r["base_price"],
                "distance_km": r["distance_km"],
                "stops": [dict(s) for s in stops],
            })

        bus_list = [dict(b) for b in buses]
        return {
            "routes": route_list,
            "buses": bus_list,
        }


# =============================================================================
# RECENT INSPECTION LOGS (FOR DRIVER SCREEN AUDIT)
# =============================================================================

@app.get("/api/v1/inspections/recent", summary="Lịch sử soát vé gần đây")
def get_recent_inspections():
    with get_connection() as connection:
        rows = connection.execute(
            """SELECT ti.*, COALESCE(t.actual_price, 0) as price
               FROM ticket_inspections ti
               LEFT JOIN tickets t ON t.id = ti.ticket_id
               ORDER BY ti.id DESC LIMIT 10"""
        ).fetchall()
        return [dict(r) for r in rows]


# =============================================================================
# VOUCHERS & SERVICE FEES (SPRINT 2 - BE4)
# =============================================================================

class VoucherApplyRequest(BaseModel):
    code: str
    order_value: float = Field(gt=0)


class FeeCalculateRequest(BaseModel):
    fee_id: int
    order_value: float = Field(gt=0)


class CreateVoucherRequest(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    discount_type: str = "percent"  # percent or fixed
    discount_value: float = Field(gt=0)
    min_order_value: float = Field(default=0, ge=0)
    max_discount: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class CreateFeeRequest(BaseModel):
    name: str
    description: Optional[str] = None
    fee_type: str = "fixed"  # fixed or percent
    fee_value: float = Field(gt=0)


@app.get("/api/v1/vouchers", summary="Danh sách mã giảm giá (BE4)")
def list_vouchers():
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM vouchers WHERE is_active = 1 OR status = 'ACTIVE'").fetchall()
        return [dict(r) for r in rows]


@app.post("/api/v1/vouchers", summary="Tạo mới mã giảm giá (BE4)")
def create_voucher(payload: CreateVoucherRequest):
    code = payload.code.strip().upper()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    start = payload.start_date or now_str
    end = payload.end_date or "2027-12-31 23:59:59"
    max_disc = payload.max_discount or (payload.discount_value if payload.discount_type == "fixed" else 100000.0)

    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM vouchers WHERE UPPER(code) = ? OR UPPER(voucher_code) = ?", (code, code)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Mã giảm giá đã tồn tại")

        cursor = connection.execute(
            """INSERT INTO vouchers 
               (code, voucher_code, name, description, discount_type, discount_value, discount_percent, min_order_value, max_discount, max_discount_amount, start_date, end_date, expires_at, is_active, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE')""",
            (code, code, payload.name, payload.description or "", payload.discount_type, payload.discount_value,
             payload.discount_value if payload.discount_type == "percent" else 0.0,
             payload.min_order_value, max_disc, int(max_disc), start, end, end),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM vouchers WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return dict(row)


@app.post("/api/v1/vouchers/apply", summary="Áp dụng mã giảm giá (BE4)")
def apply_voucher_endpoint(payload: VoucherApplyRequest):
    code = payload.code.strip().upper()
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM vouchers WHERE UPPER(code) = ? OR UPPER(voucher_code) = ?", (code, code)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Mã giảm giá không tồn tại")

        is_active = row["is_active"] if "is_active" in row.keys() else 1
        status = row["status"] if "status" in row.keys() else "ACTIVE"
        if not is_active or status != "ACTIVE":
            raise HTTPException(status_code=400, detail="Mã giảm giá hiện không hoạt động")

        min_val = row["min_order_value"] if "min_order_value" in row.keys() and row["min_order_value"] is not None else 0.0
        if payload.order_value < min_val:
            raise HTTPException(
                status_code=400,
                detail=f"Giá trị đơn hàng phải từ {int(min_val):,} VNĐ để áp dụng mã này"
            )

        disc_type = row["discount_type"] if "discount_type" in row.keys() and row["discount_type"] else "percent"
        disc_val = row["discount_value"] if "discount_value" in row.keys() and row["discount_value"] is not None else (row["discount_percent"] or 0.0)
        max_disc = row["max_discount"] if "max_discount" in row.keys() and row["max_discount"] is not None else (row["max_discount_amount"] or None)

        if disc_type == "percent":
            discount_amount = payload.order_value * (disc_val / 100.0)
        else:
            discount_amount = disc_val

        if max_disc is not None and max_disc > 0 and discount_amount > max_disc:
            discount_amount = float(max_disc)

        final_amount = max(0.0, payload.order_value - discount_amount)
        return {
            "code": code,
            "order_value": payload.order_value,
            "discount_amount": discount_amount,
            "final_amount": final_amount,
        }


@app.get("/api/v1/fees", summary="Danh sách các loại phí dịch vụ (BE4)")
def list_fees():
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM fees WHERE is_active = 1").fetchall()
        return [dict(r) for r in rows]


@app.post("/api/v1/fees", summary="Thêm mới loại phí dịch vụ (BE4)")
def create_fee(payload: CreateFeeRequest):
    with get_connection() as connection:
        cursor = connection.execute(
            """INSERT INTO fees (name, description, fee_type, fee_value, is_active)
               VALUES (?, ?, ?, ?, 1)""",
            (payload.name, payload.description or "", payload.fee_type, payload.fee_value),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM fees WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return dict(row)


@app.post("/api/v1/fees/calculate", summary="Tính toán phí dịch vụ cho đơn hàng (BE4)")
def calculate_fee_endpoint(payload: FeeCalculateRequest):
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM fees WHERE id = ?", (payload.fee_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy loại phí")

        if not row["is_active"]:
            raise HTTPException(status_code=400, detail="Loại phí này hiện không áp dụng")

        if row["fee_type"] == "percent":
            fee_amount = payload.order_value * (row["fee_value"] / 100.0)
        else:
            fee_amount = row["fee_value"]

        return {
            "fee_id": row["id"],
            "order_value": payload.order_value,
            "fee_amount": fee_amount,
            "final_amount": payload.order_value + fee_amount,
        }


# =============================================================================
# US24: XÁC NHẬN LÊN XE KHI QUÉT MÃ QR (BOARDING CHECK-IN)
# =============================================================================

@app.post("/api/v1/tickets/boarding", summary="Xác nhận hành khách lên xe sau khi quét QR (US24)")
@app.post("/api/v1/tickets/board", include_in_schema=False)
def boarding_endpoint(payload: BoardingRequest):
    with get_connection() as connection:
        return board_ticket(connection, payload)


@app.get("/api/v1/tickets/{ticket_code}/boarding", summary="Tra cứu trạng thái lên xe của vé (US24)")
def get_boarding_status_endpoint(
    ticket_code: str,
    staff_user_id: Optional[int] = Query(None, gt=0),
    staff_email: Optional[str] = Query(None, max_length=255),
):
    with get_connection() as connection:
        resolve_staff(connection, staff_user_id, staff_email)
        try:
            code = normalize_code(ticket_code)
        except ValueError as err:
            raise HTTPException(422, str(err)) from err

        ticket = connection.execute(
            "SELECT ticket_code, status, used_at FROM tickets WHERE UPPER(ticket_code) = ?", (code,)
        ).fetchone()
        if ticket is None:
            raise HTTPException(404, "Không tìm thấy vé")

        return {
            "ticket_code": ticket["ticket_code"],
            "canonical_ticket_status": ticket["status"],
            "boarding_status": "DaSoat" if ticket["status"] in {"USED", "DaSoat"} else "ChuaLenXe",
            "boarded_at": ticket["used_at"],
        }


# =============================================================================
# US20: THÔNG BÁO TỨC THÌ (IN-APP & EMAIL/SMS NOTIFICATIONS)
# =============================================================================

@app.get("/api/v1/notifications", summary="Danh sách thông báo hệ thống và người dùng (US20)")
def get_notifications_endpoint(user_id: Optional[int] = Query(None), limit: int = Query(20, ge=1, le=100)):
    with get_connection() as connection:
        if user_id:
            rows = connection.execute(
                """SELECT * FROM notifications 
                   WHERE user_id = ? OR user_id IS NULL
                   ORDER BY id DESC LIMIT ?""",
                (user_id, limit),
            ).fetchall()
        else:
            rows = connection.execute(
                "SELECT * FROM notifications ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]


# =============================================================================
# VÉ THÁNG: ĐĂNG KÝ MỚI / GIA HẠN (bảng monthly_passes)
# =============================================================================

PASS_DAYS_PER_MONTH = 30
PASS_TRIPS_PER_MONTH = 10          # 1 tháng = 10 lượt giá gốc (đi/về mỗi ngày làm việc ~ 20 lượt, đã ưu đãi)
PASS_MONTH_DISCOUNT = {1: 0.0, 3: 0.08, 6: 0.15}   # mua dài hạn giảm thêm
PASS_STUDENT_DISCOUNT = 0.20        # HSSV giảm 20% (đồng bộ với vé lẻ)


class RegisterPassRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    route_id: int = Field(..., gt=0)
    months: int = Field(..., description="Số tháng: 1, 3 hoặc 6")
    pass_id: Optional[int] = None       # có pass_id => gia hạn vé cũ
    payment_method: Optional[str] = "SANDBOX"


def _pass_price(base_price: int, months: int, discount_type: Optional[str]) -> dict[str, int]:
    full = base_price * PASS_TRIPS_PER_MONTH * months
    term_off = round(full * PASS_MONTH_DISCOUNT[months])
    after_term = full - term_off
    student_off = round(after_term * PASS_STUDENT_DISCOUNT) if discount_type and discount_type != "Khong" else 0
    return {"full": full, "term_discount": term_off, "student_discount": student_off, "total": after_term - student_off}


def _serialize_pass(row: Any) -> dict[str, Any]:
    d = dict(row)
    today = datetime.now().date()
    end = datetime.fromisoformat(d["end_date"]).date()
    days_left = (end - today).days
    d["days_left"] = max(days_left, 0)
    d["status"] = "ConHan" if days_left >= 0 else "HetHan"
    d["qr_payload"] = f"pass:{d['id']}"
    return d


_PASS_SELECT = """SELECT p.id, p.user_id, p.route_id, p.start_date, p.end_date, p.status,
                         r.name AS route_name, r.departure_city, r.arrival_city, r.base_price, r.distance_km
                  FROM monthly_passes p JOIN routes r ON r.id = p.route_id"""


@app.get("/api/v1/monthly-passes", summary="Danh sách vé tháng của người dùng")
def list_monthly_passes(user_id: int = Query(..., gt=0)):
    with get_connection() as connection:
        rows = connection.execute(_PASS_SELECT + " WHERE p.user_id = ? ORDER BY p.end_date DESC", (user_id,)).fetchall()
        return [_serialize_pass(r) for r in rows]


@app.post("/api/v1/monthly-passes/register", status_code=201, summary="Đăng ký mới hoặc gia hạn vé tháng")
def register_monthly_pass(payload: RegisterPassRequest):
    if payload.months not in PASS_MONTH_DISCOUNT:
        raise HTTPException(status_code=400, detail="Gói vé tháng chỉ hỗ trợ 1, 3 hoặc 6 tháng")

    with get_connection() as connection:
        route = connection.execute(
            "SELECT id, base_price FROM routes WHERE id = ? AND status = 'HoatDong'", (payload.route_id,)
        ).fetchone()
        if not route:
            raise HTTPException(status_code=404, detail="Tuyến xe không tồn tại hoặc đã ngừng hoạt động")
        user = connection.execute("SELECT id, discount_type FROM users WHERE id = ?", (payload.user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

        today = datetime.now().date()
        price = _pass_price(route["base_price"], payload.months, user["discount_type"])
        added_days = PASS_DAYS_PER_MONTH * payload.months

        if payload.pass_id:  # ---- GIA HẠN ----
            old = connection.execute(
                "SELECT * FROM monthly_passes WHERE id = ? AND user_id = ?", (payload.pass_id, payload.user_id)
            ).fetchone()
            if not old:
                raise HTTPException(status_code=404, detail="Không tìm thấy vé tháng cần gia hạn")
            old_end = datetime.fromisoformat(old["end_date"]).date()
            still_active = old_end >= today
            # còn hạn: cộng dồn vào ngày hết hạn cũ; đã hết hạn: bắt đầu lại từ hôm nay
            new_start = old["start_date"] if still_active else today.isoformat()
            new_end = (old_end if still_active else today - timedelta(days=1)) + timedelta(days=added_days)
            connection.execute(
                "UPDATE monthly_passes SET start_date = ?, end_date = ?, status = 'ConHan' WHERE id = ?",
                (new_start, new_end.isoformat(), old["id"]),
            )
            pass_id, action = old["id"], "RENEW"
        else:  # ---- ĐĂNG KÝ MỚI ----
            dup = connection.execute(
                "SELECT id FROM monthly_passes WHERE user_id = ? AND route_id = ? AND end_date >= ?",
                (payload.user_id, payload.route_id, today.isoformat()),
            ).fetchone()
            if dup:
                raise HTTPException(status_code=409, detail="Bạn đang có vé tháng còn hạn trên tuyến này, hãy chọn Gia hạn")
            start = today
            new_end = today + timedelta(days=added_days - 1)
            cur = connection.execute(
                "INSERT INTO monthly_passes (user_id, route_id, start_date, end_date, status) VALUES (?, ?, ?, ?, 'ConHan')",
                (payload.user_id, payload.route_id, start.isoformat(), new_end.isoformat()),
            )
            pass_id, action = cur.lastrowid, "NEW"

        txn_code = f"TXN-PASS-{uuid4().hex[:8].upper()}"
        connection.execute(
            """INSERT INTO payments (booking_id, booking_code, transaction_code, amount, provider, status, paid_at)
               VALUES (NULL, ?, ?, ?, ?, 'SUCCESS', ?)""",
            (f"PASS-{pass_id}", txn_code, price["total"], (payload.payment_method or "SANDBOX").upper(), datetime.now().isoformat()),
        )
        connection.commit()

        row = connection.execute(_PASS_SELECT + " WHERE p.id = ?", (pass_id,)).fetchone()
        return {
            "success": True,
            "action": action,
            "transaction_code": txn_code,
            "amount": price["total"],
            "price_detail": price,
            "pass": _serialize_pass(row),
            "message": "Gia hạn vé tháng thành công!" if action == "RENEW" else "Đăng ký vé tháng thành công!",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)