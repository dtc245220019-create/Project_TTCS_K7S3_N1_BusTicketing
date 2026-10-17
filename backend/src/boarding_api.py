"""API that records a passenger boarding after QR inspection.

The canonical status is USED, exactly as the original api.py and backend 1 use.
DaSoat is exposed only as a compatibility label for the Vietnamese ERD.
"""

from contextlib import asynccontextmanager, closing
from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_1 = PROJECT_ROOT / "backendS2" / "backend 1"
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BACKEND_1) not in sys.path:
    sys.path.insert(0, str(BACKEND_1))

from database import DATABASE_PATH, initialize_database
from qr_api import TICKET_QUERY, connect, normalize_code, resolve_staff


class BoardingRequest(BaseModel):
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


def board_ticket(connection, payload: BoardingRequest):
    code = normalize_code(payload.qr_payload or payload.ticket_code)
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
        row = connection.execute(
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
            "boarded_at": row["inspected_at"] if valid else None,
            "inspected_at": row["inspected_at"], "staff_user_id": staff["id"],
        }


def create_app(db_path=DATABASE_PATH):
    db_path = Path(db_path)

    @asynccontextmanager
    async def lifespan(application):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(connect(db_path)) as connection:
            initialize_database(connection)
        yield

    application = FastAPI(title="Smart Bus - Backend S2 Boarding API", version="1.0.0", lifespan=lifespan)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
        allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Accept"],
    )

    @application.post("/api/v1/tickets/boarding", summary="Cập nhật vé đã lên xe")
    @application.post("/api/v1/tickets/board", include_in_schema=False)
    def mark_boarding(payload: BoardingRequest):
        with closing(connect(db_path)) as connection:
            return board_ticket(connection, payload)

    @application.get("/api/v1/tickets/{ticket_code}/boarding", summary="Tra cứu trạng thái lên xe")
    def get_boarding_status(
        ticket_code: str,
        staff_user_id: int | None = Query(None, gt=0),
        staff_email: str | None = Query(None, max_length=255),
    ):
        with closing(connect(db_path)) as connection:
            resolve_staff(connection, staff_user_id, staff_email)
            try:
                code = normalize_code(ticket_code)
            except ValueError as error:
                raise HTTPException(422, str(error)) from error
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

    return application


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)