"""Tickets, QR inspection, seat/trip change, cancellation, and boarding router."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from database import get_connection
from ticket_changes import TicketChangeError, cancel_ticket, change_seat
from boarding_api import BoardingRequest, board_ticket, normalize_code, resolve_staff
from common import (
    CancelRequest,
    ChangeSeatRequest,
    ChangeTripRequest,
    InspectionRequest,
    log_audit,
    _ticket_query,
    _serialize_ticket,
    _find_ticket,
)

router = APIRouter(tags=["Tickets, Verification & Boarding"])

@router.get("/api/v1/tickets", summary="Danh sách vé của người dùng (US06 & US07)")
def list_tickets(user_id: int = Query(..., gt=0)):
    with get_connection() as connection:
        rows = connection.execute(
            _ticket_query() + " WHERE (b.user_id = ? OR t.user_id = ?) ORDER BY t.id DESC",
            (user_id, user_id),
        ).fetchall()
        return [_serialize_ticket(r) for r in rows]


@router.get("/api/v1/tickets/code/{code}", summary="Tra cứu vé theo mã vé")
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


@router.get("/api/v1/tickets/{ticket_id}/qr", summary="Sinh hình ảnh mã QR động cho vé")
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


@router.post("/api/v1/tickets/{ticket_id}/cancel", summary="Hủy vé trực tuyến (US07)")
def cancel_ticket_endpoint(ticket_id: str, payload: CancelRequest):
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


@router.post("/api/v1/tickets/{ticket_id}/change-seat", summary="Đổi ghế chuyến xe")
def change_seat_endpoint(ticket_id: str, payload: ChangeSeatRequest):
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


@router.post("/api/v1/tickets/{ticket_id}/change-trip", summary="Đổi chuyến xe (US05 & US07)")
def change_trip_endpoint(ticket_id: str, payload: ChangeTripRequest):
    with get_connection() as connection:
        row = connection.execute(
            """SELECT t.id, t.ticket_code, t.status AS ticket_status, b.id AS booking_id,
                      b.status AS booking_status, b.trip_id, bi.id AS item_id, bi.seat_id
               FROM tickets t
               LEFT JOIN booking_items bi ON bi.id = t.booking_item_id
               LEFT JOIN bookings b ON b.id = bi.booking_id OR b.id = t.id
               WHERE t.id = ? OR t.ticket_code = ?""",
            (ticket_id, str(ticket_id)),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Ticket not found")

        new_trip = connection.execute("SELECT * FROM trips WHERE id = ?", (payload.new_trip_id,)).fetchone()
        if not new_trip:
            raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe mới")

        if payload.new_seat_number:
            seat = connection.execute(
                "SELECT * FROM seats WHERE trip_id = ? AND UPPER(seat_number) = ?",
                (payload.new_trip_id, payload.new_seat_number.strip().upper()),
            ).fetchone()
            if not seat:
                raise HTTPException(status_code=400, detail=f"Ghế {payload.new_seat_number} không tồn tại trên chuyến mới")
        else:
            seat = connection.execute(
                "SELECT * FROM seats WHERE trip_id = ? AND status = 'AVAILABLE' LIMIT 1",
                (payload.new_trip_id,),
            ).fetchone()
            if not seat:
                raise HTTPException(status_code=400, detail="Chuyến xe mới đã hết ghế trống")

        if row["seat_id"]:
            connection.execute("UPDATE seats SET status = 'AVAILABLE' WHERE id = ?", (row["seat_id"],))
        connection.execute("UPDATE seats SET status = 'BOOKED' WHERE id = ?", (seat["id"],))

        if row["item_id"]:
            connection.execute("UPDATE booking_items SET seat_id = ? WHERE id = ?", (seat["id"], row["item_id"]))

        if row["booking_id"]:
            connection.execute("UPDATE bookings SET trip_id = ? WHERE id = ?", (payload.new_trip_id, row["booking_id"]))

        connection.execute("UPDATE tickets SET trip_id = ?, seat_id = ? WHERE id = ?", (payload.new_trip_id, seat["id"], row["id"]))
        connection.commit()

        updated = _find_ticket(connection, row["ticket_code"])
        return _serialize_ticket(updated)




@router.post("/api/v1/tickets/verify", summary="Soát vé tài xế / Quét QR (US08)")
def verify_ticket(payload: InspectionRequest):
    ticket = payload.ticket_code.strip().upper()
    if ticket.startswith("TICKET:"):
        ticket = ticket.replace("TICKET:", "").strip()

    staff_email = (payload.staff_email or "taixe.nguyen@smartbus.vn").strip().lower()
    staff_id = payload.staff_user_id or 2

    if not ticket:
        raise HTTPException(status_code=422, detail="Ticket code is required")

    # Phân quyền: Kiểm tra người thực hiện soát vé có vai trò hợp lệ không
    with get_connection() as connection:
        staff_row = connection.execute(
            "SELECT * FROM users WHERE id = ? OR LOWER(email) = ?",
            (staff_id, staff_email),
        ).fetchone()
        if staff_row and staff_row["role"] in {"CUSTOMER", "HanhKhach"}:
            raise HTTPException(
                status_code=403,
                detail=f"Tài khoản '{staff_row['full_name']}' (Hành khách) không có quyền soát vé! Nghiệp vụ này chỉ dành cho Tài xế, Phụ xe và Quản trị viên."
            )

    # Kiểm tra nếu là vé tháng (PASS)
    if ticket.startswith("PASS:") or ticket.startswith("PASS-") or ticket.startswith("PASS_"):
        pass_id_str = ticket.replace("PASS:", "").replace("PASS-", "").replace("PASS_", "").strip()
        try:
            pass_id = int(pass_id_str)
        except ValueError:
            pass_id = None

        if pass_id is not None:
            with get_connection() as connection:
                mp = connection.execute(
                    """SELECT p.*, r.name as route_name, r.departure_city, r.arrival_city,
                              COALESCE(p.passenger_name, u.full_name) as cust_name, u.phone
                       FROM monthly_passes p
                       JOIN routes r ON r.id = p.route_id
                       JOIN users u ON u.id = p.user_id
                       WHERE p.id = ?""",
                    (pass_id,),
                ).fetchone()

                if mp:
                    today = datetime.now().date()
                    end_d = datetime.fromisoformat(str(mp["end_date"])[:10]).date()
                    days_left = (end_d - today).days
                    if days_left >= 0:
                        res_status = "VALID"
                        is_valid = True
                        msg = f"Thẻ vé tháng HỢP LỆ! Tuyến: {mp['route_name']} (Còn {days_left} ngày sử dụng)"
                    else:
                        res_status = "EXPIRED"
                        is_valid = False
                        msg = f"Thẻ vé tháng ĐÃ HẾT HẠN vào ngày {mp['end_date']}!"

                    # Ghi log soát vé
                    connection.execute(
                        """INSERT INTO ticket_inspections (ticket_id, ticket_code, staff_user_id, staff_email, result, note)
                           VALUES (NULL, ?, ?, ?, ?, ?)""",
                        (ticket, staff_id, staff_email, res_status, msg),
                    )
                    connection.commit()

                    return {
                        "valid": is_valid,
                        "result": res_status,
                        "reason": msg,
                        "ticket_code": ticket,
                        "message": msg,
                        "details": {
                            "customer": mp["cust_name"],
                            "route": mp["route_name"],
                            "seat": "Thẻ vé tháng (Tự do)",
                            "time": f"Hạn dùng: {mp['end_date']} (Còn {max(days_left, 0)} ngày)",
                        },
                    }

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


@router.get("/api/v1/inspections/recent", summary="Lịch sử soát vé gần đây")
def get_recent_inspections():
    with get_connection() as connection:
        rows = connection.execute(
            """SELECT ti.*, COALESCE(t.actual_price, 0) as price
               FROM ticket_inspections ti
               LEFT JOIN tickets t ON t.id = ti.ticket_id
               ORDER BY ti.id DESC LIMIT 10"""
        ).fetchall()
        return [dict(r) for r in rows]




@router.post("/api/v1/tickets/boarding", summary="Xác nhận hành khách lên xe sau khi quét QR (US24)")
@router.post("/api/v1/tickets/board", include_in_schema=False)
def boarding_endpoint(payload: BoardingRequest):
    with get_connection() as connection:
        return board_ticket(connection, payload)


@router.get("/api/v1/tickets/{ticket_code}/boarding", summary="Tra cứu trạng thái lên xe của vé (US24)")
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




class RefundCreateRequest(BaseModel):
    ticket_code: str
    user_id: Optional[int] = None
    reason: Optional[str] = "Thay đổi kế hoạch"
    refund_method: Optional[str] = "bank"
    bank_name: Optional[str] = "Vietcombank"
    bank_account: Optional[str] = ""
    account_holder: Optional[str] = ""


@router.post("/api/v1/refunds/request", tags=["Sprint 3 - Refunds"])
def create_refund_request(req: RefundCreateRequest):
    # US08: uy thac cho module rieng backend/src/refund_api.py
    from refund_api import RefundError, request_refund
    with get_connection() as conn:
        try:
            res = request_refund(
                conn, req.ticket_code, req.user_id, req.reason,
                req.bank_name, req.bank_account, req.account_holder,
            )
        except RefundError as exc:
            code = 404 if "tim thay" in str(exc).lower() else 422
            raise HTTPException(status_code=code, detail=str(exc))
        res["message"] = "Yêu cầu hoàn tiền đã được tiếp nhận! Hệ thống sẽ xử lý trong 24h."
        res["amount"] = res.pop("amount", 0)
        return res


@router.get("/api/v1/refunds/status/{ticket_code}", tags=["Sprint 3 - Refunds"])
def get_refund_status(ticket_code: str):
    clean_code = ticket_code.strip().upper()
    rf_id = clean_code.replace("RF-", "").replace("RF", "").strip()
    with get_connection() as conn:
        rf = conn.execute(
            """SELECT rf.*, COALESCE(NULLIF(rf.approved_amount, 0), NULLIF(rf.requested_amount, 0), 120000) AS amount,
                      tr.origin, tr.destination, tr.departure_at
               FROM refunds rf
               LEFT JOIN tickets t ON UPPER(t.ticket_code) = UPPER(rf.ticket_code) OR t.id = rf.ticket_id
               LEFT JOIN trips tr ON tr.id = t.trip_id
               WHERE UPPER(rf.ticket_code) = ? OR UPPER(rf.note) LIKE ? OR CAST(rf.id AS TEXT) = ?
               ORDER BY rf.id DESC LIMIT 1""",
            (clean_code, f"%{clean_code}%", rf_id),
        ).fetchone()
        if not rf:
            raise HTTPException(status_code=404, detail="Chưa có yêu cầu hoàn tiền nào cho mã vé này")
        return dict(rf)


@router.get("/api/v1/refunds/user/{user_id}", tags=["Sprint 3 - Refunds"])
def get_user_refunds(user_id: int):
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT rf.*, COALESCE(NULLIF(rf.approved_amount, 0), NULLIF(rf.requested_amount, 0), 120000) AS amount,
                      tr.origin, tr.destination, tr.departure_at,
                      COALESCE(s.seat_number, 'A01') AS seat_number,
                      COALESCE(tr.origin || ' - ' || tr.destination, 'Hà Nội - Thái Nguyên') AS route_name
               FROM refunds rf
               LEFT JOIN tickets t ON UPPER(t.ticket_code) = UPPER(rf.ticket_code) OR t.id = rf.ticket_id
               LEFT JOIN trips tr ON tr.id = t.trip_id
               LEFT JOIN seats s ON s.id = t.seat_id
               WHERE rf.user_id = ? OR t.user_id = ?
               ORDER BY rf.id DESC""",
            (user_id, user_id),
        ).fetchall()
        return [dict(r) for r in rows]


