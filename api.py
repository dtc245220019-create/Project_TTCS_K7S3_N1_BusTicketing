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
import sqlite3
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

import database
from database import DATABASE_PATH, get_connection, initialize_database
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
app = FastAPI(title="Smart Bus Ticketing API - Unified System", version="1.0.0")

# CORS middleware for React / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
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
    # Kept as an optional compatibility field, but never trusted from clients.
    role: Optional[str] = None
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
# EMBEDDED MODULE LOGIC: TICKET CHANGES & BOARDING
# =============================================================================

class TicketChangeError(ValueError):
    """Raised when a ticket cannot be cancelled or its seat changed."""


class BoardingRequest(BaseModel):
    ticket_code: Optional[str] = Field(default=None, max_length=1024)
    qr_payload: Optional[str] = Field(default=None, max_length=1024)
    staff_user_id: Optional[int] = Field(default=None, gt=0)
    staff_email: Optional[str] = Field(default=None, max_length=255)
    trip_id: Optional[int] = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_input(self):
        if not (self.ticket_code or self.qr_payload):
            raise ValueError("Cần cung cấp ticket_code hoặc qr_payload")
        if not (self.staff_user_id or self.staff_email):
            raise ValueError("Cần cung cấp staff_user_id hoặc staff_email")
        if self.ticket_code and self.qr_payload:
            if normalize_code(self.ticket_code) != normalize_code(self.qr_payload):
                raise ValueError("ticket_code và qr_payload không khớp")
        normalize_code(self.qr_payload or self.ticket_code)
        return self


STAFF_ROLES = {"STAFF", "ADMIN", "DRIVER", "CONDUCTOR", "TAIXE", "PHUXE"}


def normalized_role(user):
    return str(user["role"]).strip().upper()


def normalize_code(raw: str) -> str:
    """Normalize the QR payload to a safe ticket code."""
    code = raw.strip()
    if code.upper().startswith("SMARTBUS|"):
        code = code.split("|", 1)[1].strip()
    elif code.lower().startswith("ticket:"):
        code = code[len("ticket:"):].strip()
    if not code or len(code) > 100 or any(
        not (char.isascii() and (char.isalnum() or char in "-_")) for char in code
    ):
        raise ValueError("Mã vé/QR không đúng định dạng")
    return code.upper()


def resolve_staff(connection, staff_user_id, staff_email):
    """Find the staff member and verify that the account may inspect tickets."""
    if staff_user_id:
        row = connection.execute(
            "SELECT * FROM users WHERE id = ?", (staff_user_id,)
        ).fetchone()
    elif staff_email and staff_email.strip():
        row = connection.execute(
            "SELECT * FROM users WHERE LOWER(email) = ?",
            (staff_email.strip().lower(),),
        ).fetchone()
    else:
        raise HTTPException(422, "Cần cung cấp nhân viên soát vé")
    if row is None:
        raise HTTPException(404, "Không tìm thấy nhân viên soát vé")
    if staff_email and row["email"].lower() != staff_email.strip().lower():
        raise HTTPException(422, "ID và email nhân viên không khớp")
    if normalized_role(row) not in STAFF_ROLES:
        raise HTTPException(403, "Tài khoản không có quyền soát vé")
    return row


BOARDING_TICKET_QUERY = """
    SELECT t.*, b.id AS booking_id, b.booking_code, b.status AS booking_status,
           COALESCE(t.trip_id, b.trip_id) AS resolved_trip_id,
           COALESCE(bi.passenger_name, u.full_name) AS passenger_name,
           s.seat_number, tr.origin, tr.destination, tr.departure_at,
           tr.status AS trip_status, tr.driver_id, bus.license_plate
    FROM tickets t
    LEFT JOIN booking_items bi ON bi.id = t.booking_item_id
    LEFT JOIN bookings b ON b.id = bi.booking_id
    LEFT JOIN users u ON u.id = COALESCE(t.user_id, b.user_id)
    LEFT JOIN seats s ON s.id = COALESCE(bi.seat_id, t.seat_id)
    LEFT JOIN trips tr ON tr.id = COALESCE(t.trip_id, b.trip_id)
    LEFT JOIN buses bus ON bus.id = tr.bus_id
    WHERE UPPER(t.ticket_code) = ?
"""


def _change_ticket(connection, ticket_code, user_id, now):
    row = connection.execute(
        """SELECT t.id, t.status AS ticket_status, b.id AS booking_id,
                  b.status AS booking_status, b.trip_id,
                  bi.id AS item_id, bi.seat_id, tr.departure_at,
                  tr.status AS trip_status
           FROM tickets t
           JOIN booking_items bi ON bi.id = t.booking_item_id
           JOIN bookings b ON b.id = bi.booking_id
           JOIN trips tr ON tr.id = b.trip_id
           WHERE t.ticket_code = ? AND b.user_id = ?""",
        (ticket_code, user_id),
    ).fetchone()
    if row is None:
        raise TicketChangeError("Ticket not found or not owned by user")
    if row["ticket_status"] != "PAID" or row["booking_status"] != "PAID":
        raise TicketChangeError("Only paid, unused tickets can be changed")
    if row["trip_status"] != "SCHEDULED":
        raise TicketChangeError("Trip is not scheduled")
    departure = datetime.fromisoformat(row["departure_at"])
    if now >= departure - timedelta(hours=24):
        raise TicketChangeError("Changes close 24 hours before departure")
    return row


def cancel_ticket(connection: sqlite3.Connection, ticket_code: str, user_id: int, *, now=None) -> None:
    now = now or datetime.now()
    with connection:
        connection.execute("BEGIN IMMEDIATE")
        row = _change_ticket(connection, ticket_code, user_id, now)
        count = connection.execute(
            "SELECT COUNT(*) FROM booking_items WHERE booking_id = ?",
            (row["booking_id"],),
        ).fetchone()[0]
        if count != 1:
            raise TicketChangeError("Multi-ticket bookings are not supported yet")
        connection.execute(
            "UPDATE tickets SET status = 'CANCELLED' WHERE id = ?", (row["id"],)
        )
        connection.execute(
            "UPDATE bookings SET status = 'CANCELLED' WHERE id = ?",
            (row["booking_id"],),
        )


def change_seat(connection: sqlite3.Connection, ticket_code: str, user_id: int,
                new_seat_number: str, *, now=None) -> None:
    now = now or datetime.now()
    with connection:
        connection.execute("BEGIN IMMEDIATE")
        row = _change_ticket(connection, ticket_code, user_id, now)
        seat = connection.execute(
            "SELECT id FROM seats WHERE trip_id = ? AND seat_number = ?",
            (row["trip_id"], new_seat_number),
        ).fetchone()
        if seat is None or seat["id"] == row["seat_id"]:
            raise TicketChangeError("New seat does not exist or is unchanged")
        occupied = connection.execute(
            """SELECT 1 FROM booking_items bi
               JOIN bookings b ON b.id = bi.booking_id
               WHERE bi.seat_id = ? AND b.status IN ('PENDING', 'PAID')
               LIMIT 1""",
            (seat["id"],),
        ).fetchone()
        if occupied:
            raise TicketChangeError("Seat is occupied")
        connection.execute(
            "UPDATE booking_items SET seat_id = ? WHERE id = ?",
            (seat["id"], row["item_id"]),
        )


def board_ticket(connection, payload: BoardingRequest):
    """Atomically validate and record a passenger boarding event."""
    code = normalize_code(payload.qr_payload or payload.ticket_code)
    with connection:
        connection.execute("BEGIN IMMEDIATE")
        staff = resolve_staff(connection, payload.staff_user_id, payload.staff_email)
        ticket = connection.execute(BOARDING_TICKET_QUERY, (code,)).fetchone()
        demo = connection.execute(
            "SELECT * FROM demo_tickets WHERE UPPER(ticket_code) = ?", (code,)
        ).fetchone()
        if normalized_role(staff) in {"DRIVER", "TAIXE"}:
            if ticket is None or ticket["driver_id"] != staff["id"]:
                raise HTTPException(403, "Tài xế chỉ được soát vé chuyến được phân công")
        previous = connection.execute(
            "SELECT 1 FROM ticket_inspections WHERE UPPER(ticket_code) = ? AND result = 'VALID'",
            (code,),
        ).fetchone()

        if ticket is None and demo is None:
            result, reason_code, reason = "INVALID", "NOT_FOUND", "Mã vé không tồn tại"
        elif (ticket and (ticket["status"] in {"CANCELLED", "DaHuy"}
                          or ticket["booking_status"] == "CANCELLED")) or (demo and demo["status"] == "CANCELLED"):
            result, reason_code, reason = "CANCELLED", "CANCELLED", "Vé đã bị hủy"
        elif previous or (ticket and ticket["status"] in {"USED", "DaSoat"}):
            result, reason_code, reason = "ALREADY_USED", "ALREADY_USED", "Vé đã được ghi nhận lên xe trước đó"
        elif ticket and (ticket["status"] == "EXPIRED" or ticket["booking_status"] == "EXPIRED"):
            result, reason_code, reason = "INVALID", "EXPIRED", "Vé đã hết hiệu lực"
        elif ticket and ticket["trip_status"] in {"CANCELLED", "COMPLETED"}:
            result, reason_code, reason = "INVALID", "TRIP_UNAVAILABLE", "Chuyến xe đã hủy hoặc kết thúc"
        elif payload.trip_id and (not ticket or ticket["resolved_trip_id"] != payload.trip_id):
            result, reason_code, reason = "INVALID", "WRONG_TRIP", "Vé không thuộc chuyến xe đang lên"
        elif (ticket and staff["role"] in {"DRIVER", "TaiXe"} and ticket["driver_id"]
              and ticket["driver_id"] != staff["id"]):
            result, reason_code, reason = "INVALID", "WRONG_DRIVER", "Tài xế không được phân công chuyến xe này"
        else:
            booking_code = ticket["booking_code"] if ticket else demo["booking_code"]
            payment = connection.execute(
                """SELECT 1 FROM payments WHERE status = 'SUCCESS'
                   AND ((? IS NOT NULL AND booking_id = ?) OR booking_code = ?) LIMIT 1""",
                (ticket["booking_id"] if ticket else None,
                 ticket["booking_id"] if ticket else None, booking_code),
            ).fetchone()
            paid = ticket and ticket["status"] in {"PAID", "DaThanhToan"}
            if (payment and paid and (ticket["booking_id"] is None or ticket["booking_status"] == "PAID")) or (ticket is None and demo and payment):
                result, reason_code, reason = "VALID", "BOARDED", "Đã xác nhận hành khách lên xe"
            else:
                result, reason_code, reason = "UNPAID", "UNPAID", "Vé chưa hoàn tất thanh toán"

        valid = result == "VALID"
        if valid and ticket:
            connection.execute(
                "UPDATE tickets SET status = 'USED', used_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('PAID', 'DaThanhToan')",
                (ticket["id"],),
            )
        cursor = connection.execute(
            """INSERT INTO ticket_inspections
               (ticket_id, ticket_code, staff_user_id, staff_email, result, note)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (ticket["id"] if ticket else None, code, staff["id"], staff["email"],
             result, f"{reason_code}: {reason}"),
        )
        inspected = connection.execute(
            "SELECT inspected_at FROM ticket_inspections WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        details = None
        if ticket:
            details = {
                "customer": ticket["passenger_name"],
                "route": f"{ticket['origin']} - {ticket['destination']}",
                "seat": ticket["seat_number"], "time": ticket["departure_at"],
                "trip_id": ticket["resolved_trip_id"],
                "license_plate": ticket["license_plate"], "price": ticket["actual_price"],
            }
        return {
            "valid": valid, "result": result, "reason_code": reason_code,
            "reason": reason, "message": reason, "ticket_code": code,
            "boarding_status": "DaSoat" if valid or result == "ALREADY_USED" else "ChuaLenXe",
            "canonical_ticket_status": "USED" if valid or result == "ALREADY_USED" else (ticket["status"] if ticket else None),
            "details": details, "inspection_id": cursor.lastrowid,
            "boarded_at": inspected["inspected_at"] if valid else None,
            "inspected_at": inspected["inspected_at"], "staff_user_id": staff["id"],
        }


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


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600000)
    return f"pbkdf2_sha256$600000${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt, digest = stored.split("$")
        if algorithm != "pbkdf2_sha256" or int(iterations) != 600000:
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations))
        return hmac.compare_digest(actual.hex(), digest)
    except (ValueError, AttributeError):
        # Legacy plaintext/default passwords must be reset, not silently accepted.
        return False


def authenticated_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Vui lòng đăng nhập", headers={"WWW-Authenticate": "Bearer"})
    token_hash = hashlib.sha256(authorization[7:].encode()).hexdigest()
    with get_connection() as connection:
        user = connection.execute(
            """SELECT u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id
               WHERE s.token_hash = ? AND s.expires_at > ?""",
            (token_hash, datetime.now(timezone.utc).isoformat()),
        ).fetchone()
    if user is None:
        raise HTTPException(401, "Phiên đăng nhập không hợp lệ hoặc hết hạn")
    return dict(user)


def require_owner(user, user_id):
    if user_id != user["id"]:
        raise HTTPException(403, "Không có quyền truy cập dữ liệu người dùng khác")


def authenticated_staff(user=Depends(authenticated_user)):
    if normalized_role(user) not in STAFF_ROLES:
        raise HTTPException(403, "Tài khoản không có quyền soát vé")
    return user


def authenticated_customer(user=Depends(authenticated_user)):
    if normalized_role(user) not in {"CUSTOMER", "HANHKHACH"}:
        raise HTTPException(403, "Chỉ hành khách được sử dụng chức năng này")
    return user


def authenticated_admin(user=Depends(authenticated_user)):
    if normalized_role(user) != "ADMIN":
        raise HTTPException(403, "Chỉ quản trị viên được sử dụng chức năng này")
    return user


from be4_loader import register_be4
from admin_api import register_admin
register_admin(app, authenticated_admin)
register_be4(app, authenticated_customer, authenticated_admin)


@app.post("/api/v1/trips/{trip_id}/hold-seats", summary="Tạm giữ ghế 10 phút (US03)")
def hold_seats_endpoint(trip_id: int, payload: HoldSeatRequest, user=Depends(authenticated_customer)):
    require_owner(user, payload.user_id)
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

@app.post("/api/v1/auth/logout")
def logout(authorization: str = Header(...), user=Depends(authenticated_user)):
    with get_connection() as connection:
        connection.execute("DELETE FROM auth_sessions WHERE token_hash = ?",
                           (hashlib.sha256(authorization[7:].encode()).hexdigest(),))
    return {"success": True}


@app.post("/api/v1/auth/register", summary="Đăng ký tài khoản (US04)")
def register_user(payload: RegisterRequest):
    if payload.role not in (None, "CUSTOMER", "HanhKhach"):
        raise HTTPException(403, "Không thể tự đăng ký tài khoản nhân viên/quản trị")
    if not payload.full_name.strip() or "@" not in payload.email or len(payload.password) < 8:
        raise HTTPException(422, "Thông tin không hợp lệ; mật khẩu cần ít nhất 8 ký tự")
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
                hash_password(payload.password),
                "HanhKhach",
                payload.discount_type or "Khong",
            ),
        )
        user_id = cursor.lastrowid
        token = secrets.token_urlsafe(32)
        connection.execute(
            "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (hashlib.sha256(token.encode()).hexdigest(), user_id,
             (datetime.now(timezone.utc) + timedelta(hours=8)).isoformat()),
        )
        connection.commit()

        return {
            "id": user_id,
            "full_name": payload.full_name,
            "email": payload.email,
            "phone": payload.phone,
            "role": "HanhKhach",
            "token": token,
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

        if not user or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác")

        token = secrets.token_urlsafe(32)
        connection.execute(
            "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (hashlib.sha256(token.encode()).hexdigest(), user["id"],
             (datetime.now(timezone.utc) + timedelta(hours=8)).isoformat()),
        )
        connection.commit()
        return {
            "token": token,
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
def get_current_user(user=Depends(authenticated_user)):
    return {key: value for key, value in user.items() if key != "password_hash"}


# =============================================================================
# US05 & US06: THANH TOÁN SANDBOX & TẠO ĐƠN & VÉ ĐIỆN TỬ
# =============================================================================

@app.post("/api/v1/payments", status_code=201, summary="Tạo giao dịch thanh toán Sandbox")
def create_payment(payload: PaymentRequest, user=Depends(authenticated_customer)):
    booking = payload.booking_code.strip().upper()
    provider = payload.provider.strip().upper()
    if not booking:
        raise HTTPException(status_code=422, detail="booking_code is required")

    transaction = f"TXN-SANDBOX-{uuid4().hex[:12].upper()}"
    with get_connection() as connection:
        booking_row = connection.execute("SELECT * FROM bookings WHERE booking_code = ?", (booking,)).fetchone()
        if booking_row is None:
            raise HTTPException(404, "Không tìm thấy đơn đặt vé")
        require_owner(user, booking_row["user_id"])
        if booking_row["status"] != "PENDING" or payload.amount != booking_row["total_amount"]:
            raise HTTPException(409, "Đơn hoặc số tiền thanh toán không hợp lệ")
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
def create_vnpay_payment(payload: VNPayCreateRequest, user=Depends(authenticated_customer)):
    transaction_code = "VNP" + uuid4().hex[:12].upper()
    with get_connection() as connection:
        booking = connection.execute("SELECT * FROM bookings WHERE booking_code = ?", (payload.booking_code,)).fetchone()
        if booking is None:
            raise HTTPException(404, "Không tìm thấy đơn đặt vé")
        require_owner(user, booking["user_id"])
        if booking["status"] != "PENDING" or booking["total_amount"] != payload.amount:
            raise HTTPException(409, "Đơn hoặc số tiền thanh toán không hợp lệ")
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


def confirm_provider_payment(connection, row, provider, amount):
    """Validate an atomic provider confirmation before activating tickets."""
    if row["provider"] != provider or row["amount"] != amount:
        return False
    if row["status"] == "SUCCESS":
        return True
    if row["status"] != "PENDING":
        return False
    booking = connection.execute("SELECT * FROM bookings WHERE booking_code = ?", (row["booking_code"],)).fetchone()
    if booking is None or booking["status"] != "PENDING" or booking["total_amount"] != amount:
        return False
    tickets = connection.execute(
        """SELECT t.*, s.status AS seat_status, s.held_until AS seat_expiry
           FROM tickets t JOIN booking_items bi ON bi.id = t.booking_item_id
           JOIN seats s ON s.id = bi.seat_id WHERE bi.booking_id = ?""", (booking["id"],),
    ).fetchall()
    now = datetime.now()
    if not tickets or any(
        t["status"] != "PENDING" or t["seat_status"] != "HELD"
        or not t["held_until"] or datetime.fromisoformat(t["held_until"]) <= now
        or t["seat_expiry"] != t["held_until"] for t in tickets
    ):
        return False
    connection.execute("UPDATE payments SET status = 'SUCCESS', paid_at = ? WHERE id = ?", (now.isoformat(), row["id"]))
    connection.execute("UPDATE bookings SET status = 'PAID' WHERE id = ?", (booking["id"],))
    for ticket in tickets:
        connection.execute("UPDATE tickets SET status = 'PAID', held_until = NULL WHERE id = ?", (ticket["id"],))
        connection.execute("UPDATE seats SET status = 'BOOKED', held_until = NULL WHERE id = ?", (ticket["seat_id"],))
    return True


@app.get("/api/v1/payments/vnpay/ipn", summary="VNPay IPN Webhook (US18)")
def vnpay_ipn(request: Request):
    params = dict(request.query_params)
    if not VNPAY_HASH_SECRET or VNPAY_HASH_SECRET.startswith("YOUR_"):
        return {"RspCode": "97", "Message": "Provider not configured"}
    if not verify_vnpay_signature(params, VNPAY_HASH_SECRET):
        return {"RspCode": "97", "Message": "Invalid signature"}

    txn_ref = params.get("vnp_TxnRef")
    response_code = params.get("vnp_ResponseCode")
    try:
        raw_amount = int(params.get("vnp_Amount", "0"))
    except ValueError:
        return {"RspCode": "04", "Message": "Invalid amount"}
    if raw_amount <= 0 or raw_amount % 100:
        return {"RspCode": "04", "Message": "Invalid amount"}
    amount = raw_amount // 100

    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            "SELECT * FROM payments WHERE transaction_code = ?", (txn_ref,)
        ).fetchone()
        if not row:
            return {"RspCode": "01", "Message": "Order not found"}

        if row["amount"] != amount or row["provider"] != "VNPAY":
            return {"RspCode": "04", "Message": "Invalid amount"}

        if row["status"] == "SUCCESS":
            return {"RspCode": "00", "Message": "Confirm Success"}

        if response_code == "00":
            accepted = confirm_provider_payment(connection, row, "VNPAY", amount)
            return {"RspCode": "00" if accepted else "02", "Message": "Confirm Success" if accepted else "Order no longer payable"}
        if row["status"] != "PENDING":
            return {"RspCode": "02", "Message": "Order already finalized"}

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
def create_zalopay_payment(payload: ZaloPayCreateRequest, user=Depends(authenticated_customer)):
    transaction_code = "ZLP" + uuid4().hex[:12].upper()
    with get_connection() as connection:
        booking = connection.execute("SELECT * FROM bookings WHERE booking_code = ?", (payload.booking_code,)).fetchone()
        if booking is None:
            raise HTTPException(404, "Không tìm thấy đơn đặt vé")
        require_owner(user, booking["user_id"])
        if booking["status"] != "PENDING" or booking["total_amount"] != payload.amount:
            raise HTTPException(409, "Đơn hoặc số tiền thanh toán không hợp lệ")
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
    if not ZALOPAY_KEY2 or ZALOPAY_KEY2.startswith("YOUR_"):
        return {"return_code": -1, "return_message": "Provider not configured"}
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
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            "SELECT * FROM payments WHERE transaction_code = ?", (txn_code,)
        ).fetchone()
        if not row:
            return {"return_code": 0, "return_message": "Order not found"}

        accepted = confirm_provider_payment(connection, row, "ZALOPAY", payload.get("amount"))
        return {"return_code": 1 if accepted else 0, "return_message": "Success" if accepted else "Invalid or expired order"}

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
def get_payment(transaction_code: str, user=Depends(authenticated_customer)):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM payments WHERE UPPER(transaction_code) = ?",
            (transaction_code.strip().upper(),),
        ).fetchone()
        if row is not None:
            booking = connection.execute("SELECT user_id FROM bookings WHERE booking_code = ?", (row["booking_code"],)).fetchone()
            if booking is None:
                raise HTTPException(404, "Không tìm thấy đơn đặt vé")
            require_owner(user, booking["user_id"])
    if row is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return dict(row)


@app.post("/api/v1/payments/{transaction_code}/callback", summary="Xử lý callback thanh toán")
def payment_callback(transaction_code: str, payload: CallbackRequest):
    # Public unsigned callbacks must never authorize a payment.
    raise HTTPException(403, "Callback không ký đã bị vô hiệu hóa; sử dụng webhook của nhà cung cấp")
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
def create_order(payload: CreateOrderRequest, user=Depends(authenticated_customer)):
    require_owner(user, payload.user_id)
    names = [name.strip().upper() for name in payload.seat_numbers]
    if len(set(names)) != len(names):
        raise HTTPException(422, "Không được chọn ghế trùng")
    if payload.payment_method not in {"SANDBOX", "VNPAY", "ZALOPAY", "VIETQR", "BANK", "MOMO"}:
        raise HTTPException(422, "Phương thức thanh toán không hợp lệ")
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        trip = connection.execute("SELECT * FROM trips WHERE id = ?", (payload.trip_id,)).fetchone()
        if trip is None or trip["status"] != "SCHEDULED" or datetime.fromisoformat(trip["departure_at"]) <= datetime.now():
            raise HTTPException(409, "Chuyến không còn mở đặt vé")
        total = trip["base_price"] * len(names)
        if payload.total_amount != total:
            raise HTTPException(409, f"Giá vé hiện tại là {total} VNĐ; vui lòng kiểm tra lại")
        seats = []
        for name in names:
            seat = connection.execute("SELECT * FROM seats WHERE trip_id = ? AND seat_number = ?", (payload.trip_id, name)).fetchone()
            if seat is None or seat["status"] != "AVAILABLE":
                raise HTTPException(409, "Ghế không tồn tại hoặc không còn trống")
            occupied = connection.execute(
                """SELECT 1 FROM booking_items bi JOIN bookings b ON b.id = bi.booking_id
                   WHERE bi.seat_id = ? AND b.status IN ('PENDING', 'PAID')
                   AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.booking_item_id = bi.id AND t.status = 'CANCELLED')""",
                (seat["id"],),
            ).fetchone()
            if occupied:
                raise HTTPException(409, "Ghế đã thuộc một đơn khác")
            seats.append(seat)
        code = f"BOOK-{uuid4().hex.upper()}"
        booking_id = connection.execute(
            "INSERT INTO bookings (booking_code, user_id, trip_id, total_amount, status) VALUES (?, ?, ?, ?, 'PENDING')",
            (code, user["id"], payload.trip_id, total),
        ).lastrowid
        expires = (datetime.now() + timedelta(minutes=10)).isoformat()
        for seat in seats:
            item_id = connection.execute(
                "INSERT INTO booking_items (booking_id, seat_id, passenger_name, passenger_id_number) VALUES (?, ?, ?, ?)",
                (booking_id, seat["id"], payload.passenger_name, payload.passenger_phone),
            ).lastrowid
            ticket_code = f"TKT-{uuid4().hex.upper()}"
            connection.execute(
                """INSERT INTO tickets (ticket_code, qr_payload, booking_item_id, user_id, trip_id, seat_id, actual_price, held_until, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')""",
                (ticket_code, f"ticket:{ticket_code}", item_id, user["id"], payload.trip_id, seat["id"], trip["base_price"], expires),
            )
            connection.execute("UPDATE seats SET status = 'HELD', held_until = ? WHERE id = ?", (expires, seat["id"]))
        connection.execute("UPDATE trips SET available_seats = (SELECT COUNT(*) FROM seats WHERE trip_id = ? AND status = 'AVAILABLE') WHERE id = ?", (payload.trip_id, payload.trip_id))
        provider = payload.payment_method.upper()
        transaction_code = f"TXN-{provider}-{uuid4().hex[:12].upper()}"
        connection.execute(
            """INSERT INTO payments (booking_id, booking_code, transaction_code, amount, provider, status)
               VALUES (?, ?, ?, ?, ?, 'PENDING')""",
            (booking_id, code, transaction_code, total, provider),
        )
    return {"success": True, "status": "PENDING", "booking_code": code, "total_amount": total,
            "transaction_code": transaction_code, "payment_provider": provider,
            "held_until": expires, "tickets": [], "message": "Đã giữ chỗ; vé chỉ có hiệu lực sau xác nhận thanh toán"}


# =============================================================================
# US06 & US07: DANH SÁCH VÉ & QUẢN LÝ VÉ CÁ NHÂN & HỦY VÉ
# =============================================================================

@app.get("/api/v1/tickets", summary="Danh sách vé của người dùng (US06 & US07)")
def list_tickets(user_id: int = Query(..., gt=0), user=Depends(authenticated_customer)):
    require_owner(user, user_id)
    with get_connection() as connection:
        rows = connection.execute(
            _ticket_query() + " WHERE (b.user_id = ? OR t.user_id = ?) ORDER BY t.id DESC",
            (user_id, user_id),
        ).fetchall()
        return [_serialize_ticket(r) for r in rows]


@app.get("/api/v1/tickets/code/{code}", summary="Tra cứu vé theo mã vé")
def get_ticket_by_code(code: str, user_id: Optional[int] = Query(None), user=Depends(authenticated_customer)):
    if user_id is not None:
        require_owner(user, user_id)
    user_id = user["id"]
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
def get_ticket_qr_image(ticket_id: int, user=Depends(authenticated_customer)):
    with get_connection() as connection:
        owner = connection.execute(
            """SELECT COALESCE(t.user_id, b.user_id) AS user_id FROM tickets t
               LEFT JOIN booking_items bi ON bi.id = t.booking_item_id
               LEFT JOIN bookings b ON b.id = bi.booking_id WHERE t.id = ?""", (ticket_id,),
        ).fetchone()
        if owner is None:
            raise HTTPException(404, "Không tìm thấy vé")
        require_owner(user, owner["user_id"])
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
def cancel_ticket_endpoint(ticket_id: int, payload: CancelRequest, user=Depends(authenticated_customer)):
    require_owner(user, payload.user_id)
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
def change_seat_endpoint(ticket_id: int, payload: ChangeSeatRequest, user=Depends(authenticated_customer)):
    require_owner(user, payload.user_id)
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
def verify_ticket(payload: InspectionRequest, user=Depends(authenticated_staff)):
    payload.staff_user_id = user["id"]
    payload.staff_email = user["email"]
    return boarding_endpoint(BoardingRequest(
        ticket_code=payload.ticket_code, staff_user_id=user["id"], staff_email=user["email"]
    ), user)


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
def get_recent_inspections(user=Depends(authenticated_staff)):
    with get_connection() as connection:
        rows = connection.execute(
            """SELECT ti.*, COALESCE(t.actual_price, 0) as price
               FROM ticket_inspections ti
               LEFT JOIN tickets t ON t.id = ti.ticket_id
                WHERE (? = 'ADMIN' OR ti.staff_user_id = ?)
                ORDER BY ti.id DESC LIMIT 10""", (normalized_role(user), user["id"])
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
    discount_type: str = Field(default="percent", pattern="^(percent|fixed)$")
    discount_value: float = Field(gt=0)
    min_order_value: float = Field(default=0, ge=0)
    max_discount: Optional[float] = Field(default=None, ge=0)
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class CreateFeeRequest(BaseModel):
    name: str
    description: Optional[str] = None
    fee_type: str = Field(default="fixed", pattern="^(percent|fixed)$")
    fee_value: float = Field(gt=0)


@app.get("/api/v1/vouchers", summary="Danh sách mã giảm giá (BE4)")
def list_vouchers():
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM vouchers WHERE is_active = 1 OR status = 'ACTIVE'").fetchall()
        return [dict(r) for r in rows]


@app.post("/api/v1/vouchers", summary="Tạo mới mã giảm giá (BE4)")
def create_voucher(payload: CreateVoucherRequest, user=Depends(authenticated_admin)):
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

        now = datetime.now()
        for field_name, message, is_invalid in (
            ("start_date", "Mã giảm giá chưa đến thời gian áp dụng", lambda value: now < value),
            ("end_date", "Mã giảm giá đã hết hạn", lambda value: now > value),
            ("expires_at", "Mã giảm giá đã hết hạn", lambda value: now > value),
        ):
            raw_date = row[field_name] if field_name in row.keys() else None
            if not raw_date:
                continue
            try:
                effective_date = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
                if effective_date.tzinfo is not None:
                    effective_date = effective_date.replace(tzinfo=None)
            except (TypeError, ValueError) as exc:
                raise HTTPException(status_code=400, detail="Thời hạn mã giảm giá không hợp lệ") from exc
            if is_invalid(effective_date):
                raise HTTPException(status_code=400, detail=message)

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
def create_fee(payload: CreateFeeRequest, user=Depends(authenticated_admin)):
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
def boarding_endpoint(payload: BoardingRequest, user=Depends(authenticated_staff)):
    payload.staff_user_id = user["id"]
    payload.staff_email = user["email"]
    with get_connection() as connection:
        return board_ticket(connection, payload)


@app.get("/api/v1/tickets/{ticket_code}/boarding", summary="Tra cứu trạng thái lên xe của vé (US24)")
def get_boarding_status_endpoint(
    ticket_code: str,
    staff_user_id: Optional[int] = Query(None, gt=0),
    staff_email: Optional[str] = Query(None, max_length=255),
    user=Depends(authenticated_staff),
):
    with get_connection() as connection:
        resolve_staff(connection, user["id"], user["email"])
        try:
            code = normalize_code(ticket_code)
        except ValueError as err:
            raise HTTPException(422, str(err)) from err

        ticket = connection.execute(
            BOARDING_TICKET_QUERY, (code,)
        ).fetchone()
        if ticket is None:
            raise HTTPException(404, "Không tìm thấy vé")
        if normalized_role(user) in {"DRIVER", "TAIXE"} and ticket["driver_id"] != user["id"]:
            raise HTTPException(403, "Tài xế chỉ được xem vé chuyến được phân công")

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
def get_notifications_endpoint(user_id: Optional[int] = Query(None), limit: int = Query(20, ge=1, le=100), user=Depends(authenticated_user)):
    if user_id is not None:
        require_owner(user, user_id)
    user_id = user["id"]
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
