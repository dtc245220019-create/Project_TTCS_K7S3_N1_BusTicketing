"""Common schemas, models, and shared helper functions for all API routers."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional, Union
from pydantic import BaseModel, Field

from database import get_connection
from notification import send_email_confirmation, send_sms_confirmation


def log_audit(connection, user_id: int, action: str, entity_type: str, entity_id: int, details: str = ""):
    """Helper ghi nhật ký thao tác hệ thống (Audit Logs)"""
    try:
        connection.execute(
            """INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, action, entity_type, entity_id, details, datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        )
    except Exception as e:
        print(f"Log audit error: {e}")


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


class ChangeTripRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    new_trip_id: int = Field(..., gt=0)
    new_seat_number: Optional[str] = None


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
               COALESCE(bi.passenger_name, u.full_name, 'Hành khách') AS passenger_name,
               COALESCE(u.phone, '0901234567') AS passenger_phone,
               COALESCE(bus.bus_type, 'SmartBus VIP Limousine 36 chỗ') AS bus_type,
               COALESCE(bus.license_plate, '29B-123.45') AS license_plate
        FROM tickets t
        LEFT JOIN booking_items bi ON bi.id = t.booking_item_id
        LEFT JOIN bookings b ON b.id = bi.booking_id OR b.id = t.id
        LEFT JOIN trips tr ON tr.id = COALESCE(b.trip_id, t.trip_id)
        LEFT JOIN buses bus ON bus.id = tr.bus_id
        LEFT JOIN seats s ON s.id = COALESCE(bi.seat_id, t.seat_id)
        LEFT JOIN users u ON u.id = COALESCE(b.user_id, t.user_id)
    """


def _serialize_ticket(row: Any) -> dict[str, Any]:
    qr_payload = row["qr_payload"] or f"ticket:{row['ticket_code']}"
    # QR image URL using public QR API as dynamic fallback
    qr_img = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={qr_payload}"

    # Kiểm tra xem chuyến xe đã khởi hành trong quá khứ chưa
    dep_str = str(row["departure_time"] or "")
    is_past = False
    try:
        if len(dep_str) >= 16:
            dep_dt = datetime.strptime(dep_str[:16], "%Y-%m-%d %H:%M")
            if dep_dt < datetime.now():
                is_past = True
    except Exception:
        pass

    raw_st = row["status"]
    if raw_st in ("USED", "DaSoat", "COMPLETED"):
        ui_status = "COMPLETED"
    elif raw_st in ("CANCELLED", "DaHuy"):
        ui_status = "CANCELLED"
    elif raw_st in ("PAID", "CONFIRMED", "GiuCho", "DaThanhToan"):
        ui_status = "CONFIRMED"
        # Vé đã thanh toán của chuyến sắp tới hoặc hôm nay được giữ trạng thái hợp lệ
        if not is_past:
            is_past = False
    elif is_past:
        ui_status = "COMPLETED"
    else:
        ui_status = "CONFIRMED"

    row_keys = row.keys() if hasattr(row, "keys") else []
    p_phone = row["passenger_phone"] if "passenger_phone" in row_keys else "0901234567"
    b_type = row["bus_type"] if "bus_type" in row_keys else "SmartBus VIP Limousine 36 chỗ"
    l_plate = row["license_plate"] if "license_plate" in row_keys else "29B-123.45"

    return {
        "id": row["ticket_code"],
        "ticket_id": row["ticket_id"],
        "ticket_code": row["ticket_code"],
        "booking_id": row["booking_id"],
        "booking_code": row["booking_code"],
        "routeName": row["route_name"] or "Tuyến xe liên tỉnh",
        "route_name": row["route_name"] or "Tuyến xe liên tỉnh",
        "from": row["departure_city"] or "Hà Nội",
        "to": row["arrival_city"] or "Thái Nguyên",
        "departure_city": row["departure_city"] or "Hà Nội",
        "arrival_city": row["arrival_city"] or "Thái Nguyên",
        "departure_at": row["departure_time"],
        "departureTime": row["departure_time"] or "08:00 - Hôm nay",
        "departure_time": row["departure_time"] or "08:00 - Hôm nay",
        "arrival_time": row["arrival_time"] or "16:00 - Hôm nay",
        "seatNumber": row["seat_number"] or "A01",
        "seat_numbers": [row["seat_number"] or "A01"],
        "price": f"{int(row['total_amount']):,} VNĐ" if row["total_amount"] else "120.000 VNĐ",
        "total_amount": row["total_amount"],
        "passenger_name": row["passenger_name"] or "Hành khách",
        "passenger_phone": p_phone,
        "bus_type": b_type,
        "license_plate": l_plate,
        "status": ui_status,
        "raw_status": raw_st,
        "is_past": is_past,
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
