"""Standalone QR inspection API using the original project's SQLite schema."""

from contextlib import asynccontextmanager, closing
from pathlib import Path
import sqlite3
import sys

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import DATABASE_PATH, initialize_database

STAFF_ROLES = {"STAFF", "ADMIN", "DRIVER", "CONDUCTOR", "TaiXe", "PhuXe"}


class InspectionRequest(BaseModel):
    ticket_code: str | None = Field(default=None, max_length=1024)
    qr_payload: str | None = Field(default=None, max_length=1024)
    staff_user_id: int | None = Field(default=None, gt=0)
    staff_email: str | None = Field(default=None, max_length=255)
    trip_id: int | None = Field(default=None, gt=0)

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


def normalize_code(raw: str) -> str:
    """Only extract the code; passenger/route data in a QR is never trusted."""
    code = raw.strip()
    if code.upper().startswith("SMARTBUS|"):
        code = code.split("|")[1].strip()
    elif code.lower().startswith("ticket:"):
        code = code[len("ticket:"):].strip()
    if not code or len(code) > 100 or any(
        not (char.isascii() and (char.isalnum() or char in "-_")) for char in code
    ):
        raise ValueError("Mã vé/QR không đúng định dạng")
    return code.upper()


def connect(db_path):
    connection = sqlite3.connect(db_path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def resolve_staff(connection, staff_user_id, staff_email):
    if staff_user_id:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (staff_user_id,)).fetchone()
    elif staff_email and staff_email.strip():
        row = connection.execute(
            "SELECT * FROM users WHERE LOWER(email) = ?", (staff_email.strip().lower(),)
        ).fetchone()
    else:
        raise HTTPException(422, "Cần cung cấp nhân viên soát vé")
    if row is None:
        raise HTTPException(404, "Không tìm thấy nhân viên soát vé")
    if staff_email and row["email"].lower() != staff_email.strip().lower():
        raise HTTPException(422, "ID và email nhân viên không khớp")
    if row["role"] not in STAFF_ROLES:
        raise HTTPException(403, "Tài khoản không có quyền soát vé")
    return row


TICKET_QUERY = """
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


def inspect(connection, payload):
    code = normalize_code(payload.qr_payload or payload.ticket_code)
    # Serialize the read/check/update/log sequence, including demo-only tickets.
    with connection:
        connection.execute("BEGIN IMMEDIATE")
        staff = resolve_staff(connection, payload.staff_user_id, payload.staff_email)
        ticket = connection.execute(TICKET_QUERY, (code,)).fetchone()
        demo = connection.execute(
            "SELECT * FROM demo_tickets WHERE UPPER(ticket_code) = ?", (code,)
        ).fetchone()
        previous = connection.execute(
            "SELECT 1 FROM ticket_inspections WHERE UPPER(ticket_code) = ? AND result = 'VALID'",
            (code,),
        ).fetchone()
        booking_code = ticket["booking_code"] if ticket else (demo["booking_code"] if demo else None)
        payment = connection.execute(
            """SELECT 1 FROM payments WHERE status = 'SUCCESS'
               AND ((? IS NOT NULL AND booking_id = ?) OR booking_code = ?)""",
            (ticket["booking_id"] if ticket else None,
             ticket["booking_id"] if ticket else None, booking_code),
        ).fetchone()

        if ticket is None and demo is None:
            result, reason_code, reason = "INVALID", "NOT_FOUND", "Mã vé không tồn tại"
        elif (ticket and (ticket["status"] in {"CANCELLED", "DaHuy"}
                         or ticket["booking_status"] == "CANCELLED")) or (demo and demo["status"] == "CANCELLED"):
            result, reason_code, reason = "CANCELLED", "CANCELLED", "Vé đã bị hủy"
        elif previous or (ticket and ticket["status"] in {"USED", "DaSoat"}):
            result, reason_code, reason = "ALREADY_USED", "ALREADY_USED", "Vé đã được sử dụng trước đó"
        elif ticket and (ticket["status"] == "EXPIRED" or ticket["booking_status"] == "EXPIRED"):
            result, reason_code, reason = "INVALID", "EXPIRED", "Vé đã hết hiệu lực"
        elif ticket and ticket["trip_status"] in {"CANCELLED", "COMPLETED"}:
            result, reason_code, reason = "INVALID", "TRIP_UNAVAILABLE", "Chuyến xe đã hủy hoặc kết thúc"
        elif payload.trip_id and (not ticket or ticket["resolved_trip_id"] != payload.trip_id):
            result, reason_code, reason = "INVALID", "WRONG_TRIP", "Vé không thuộc chuyến xe đang soát"
        elif (ticket and staff["role"] in {"DRIVER", "TaiXe"} and ticket["driver_id"]
              and ticket["driver_id"] != staff["id"]):
            result, reason_code, reason = "INVALID", "WRONG_DRIVER", "Tài xế không được phân công chuyến xe này"
        elif (ticket and ticket["status"] in {"PAID", "DaThanhToan"}
              and (ticket["booking_id"] is None or ticket["booking_status"] == "PAID")
              and payment) or (ticket is None and demo and payment):
            result, reason_code, reason = "VALID", "VALID", "Vé hợp lệ! Cho phép hành khách lên xe."
        else:
            result, reason_code, reason = "UNPAID", "UNPAID", "Vé chưa hoàn tất thanh toán"

        valid = result == "VALID"
        if valid and ticket:
            connection.execute(
                "UPDATE tickets SET status = 'USED', used_at = CURRENT_TIMESTAMP WHERE id = ?",
                (ticket["id"],),
            )
        cursor = connection.execute(
            """INSERT INTO ticket_inspections
               (ticket_id, ticket_code, staff_user_id, staff_email, result, note)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (ticket["id"] if ticket else None, code, staff["id"], staff["email"],
             result, f"{reason_code}: {reason}"),
        )
        log = connection.execute(
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
            "details": details, "inspection_id": cursor.lastrowid,
            "inspected_at": log["inspected_at"], "staff_user_id": staff["id"],
        }


def create_app(db_path=DATABASE_PATH):
    """Factory allows tests to use temporary databases, never the live database."""
    db_path = Path(db_path)

    @asynccontextmanager
    async def lifespan(application):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(connect(db_path)) as connection:
            initialize_database(connection)
        yield

    application = FastAPI(title="Smart Bus - Backend S2 QR Inspection", version="1.0.0", lifespan=lifespan)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
        allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Accept"],
    )

    @application.post("/api/v1/tickets/verify", summary="Soát vé QR cho tài xế/nhà xe")
    def verify_ticket(payload: InspectionRequest):
        with closing(connect(db_path)) as connection:
            return inspect(connection, payload)

    @application.get("/api/v1/inspections/recent", summary="Nhật ký soát vé")
    def recent_inspections(
        staff_user_id: int | None = Query(None, gt=0),
        staff_email: str | None = Query(None, max_length=255),
        limit: int = Query(10, ge=1, le=100),
    ):
        with closing(connect(db_path)) as connection:
            staff = resolve_staff(connection, staff_user_id, staff_email)
            # Management sees all records; drivers/conductors see their own.
            query = "SELECT ti.*, COALESCE(t.actual_price, 0) AS price FROM ticket_inspections ti LEFT JOIN tickets t ON t.id = ti.ticket_id"
            params = []
            if staff["role"] not in {"ADMIN", "STAFF"}:
                query += " WHERE ti.staff_user_id = ?"
                params.append(staff["id"])
            query += " ORDER BY ti.id DESC LIMIT ?"
            params.append(limit)
            return [dict(row) for row in connection.execute(query, params).fetchall()]

    return application


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)