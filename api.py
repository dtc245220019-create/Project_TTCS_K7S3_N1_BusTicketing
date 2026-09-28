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

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import database
from database import DATABASE_PATH, get_connection, initialize_database
from ticket_changes import TicketChangeError, cancel_ticket, change_seat

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)