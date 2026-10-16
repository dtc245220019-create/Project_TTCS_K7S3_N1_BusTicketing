"""Admin management, staff assignment, revenue reporting, occupancy, audit logs, and discount approvals router."""

from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta
from typing import Any, List, Optional, Union
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from database import get_connection
from routers.common import log_audit


def parse_report_date(value: Optional[str], field_name: str, *, end_of_day: bool = False):
    if not value:
        return None
    try:
        parsed = datetime.strptime(value.strip(), "%Y-%m-%d")
    except ValueError:
        return None
    if end_of_day:
        parsed = parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
    return parsed


router = APIRouter(tags=["Admin Operations & Reporting"])


@router.get("/api/v1/admin/users", summary="Danh sách người dùng và phân quyền (Admin)")
def list_admin_users():
    with get_connection() as connection:
        rows = connection.execute(
            """SELECT id, full_name, email, phone, role, discount_type, discount_status, created_at
               FROM users ORDER BY id ASC"""
        ).fetchall()
        return [dict(r) for r in rows]


class UpdateRoleRequest(BaseModel):
    role: str
    admin_user_id: Optional[int] = 12


@router.put("/api/v1/admin/users/{user_id}/role", summary="Cập nhật vai trò người dùng (Admin)")
def update_user_role(user_id: int, payload: UpdateRoleRequest):
    allowed_roles = {"HanhKhach", "TaiXe", "PhuXe", "Admin", "CUSTOMER", "DRIVER", "STAFF", "ADMIN"}
    if payload.role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ")

    with get_connection() as connection:
        user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

        connection.execute(
            "UPDATE users SET role = ? WHERE id = ?",
            (payload.role, user_id),
        )
        connection.commit()
        updated = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return {"success": True, "role": payload.role, "message": f"Đã cập nhật vai trò thành '{payload.role}'", "user": dict(updated)}


@router.get("/api/v1/admin/stats", summary="Thống kê tổng quan hệ thống (Admin)")
def get_admin_stats():
    with get_connection() as connection:
        total_rev = connection.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'SUCCESS'"
        ).fetchone()[0]
        total_tickets = connection.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
        total_trips = connection.execute("SELECT COUNT(*) FROM trips").fetchone()[0]
        total_users = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        total_passes = connection.execute("SELECT COUNT(*) FROM monthly_passes").fetchone()[0]

        # Đếm số lượng theo vai trò
        roles_rows = connection.execute(
            "SELECT role, COUNT(*) as cnt FROM users GROUP BY role"
        ).fetchall()
        role_counts = {r["role"]: r["cnt"] for r in roles_rows}

        recent_bookings = connection.execute(
            """SELECT b.id, b.booking_code, b.total_amount, b.status,
                      COALESCE(u.full_name, 'Khách hàng') as customer_name,
                      tr.origin, tr.destination, tr.departure_at
               FROM bookings b
               LEFT JOIN users u ON u.id = b.user_id
               LEFT JOIN trips tr ON tr.id = b.trip_id
               ORDER BY b.id DESC LIMIT 10"""
        ).fetchall()

        return {
            "total_revenue": int(total_rev),
            "total_tickets": total_tickets,
            "total_trips": total_trips,
            "total_users": total_users,
            "total_monthly_passes": total_passes,
            "role_counts": role_counts,
            "recent_bookings": [dict(r) for r in recent_bookings],
        }


@router.get("/api/v1/admin/trips", summary="Quản lý chuyến xe (Admin)")
def list_admin_trips():
    with get_connection() as connection:
        rows = connection.execute(
            """SELECT tr.*, r.name AS route_name, b.license_plate, b.bus_type,
                      u.full_name as driver_name, staff.full_name as staff_name
               FROM trips tr
               LEFT JOIN routes r ON r.id = tr.route_id
               LEFT JOIN buses b ON b.id = tr.bus_id
               LEFT JOIN users u ON u.id = tr.driver_id
               LEFT JOIN users staff ON staff.id = tr.staff_id
               ORDER BY tr.departure_at ASC"""
        ).fetchall()
        return [dict(r) for r in rows]


class UpdateTripStatusRequest(BaseModel):
    status: Optional[str] = None
    driver_id: Optional[int] = None
    staff_id: Optional[int] = None
    bus_id: Optional[int] = None


@router.put("/api/v1/admin/trips/{trip_id}/status", summary="Cập nhật trạng thái chuyến xe (Admin)")
def update_trip_status(trip_id: int, payload: UpdateTripStatusRequest):
    with get_connection() as connection:
        trip = connection.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        if not trip:
            raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")

        updates = []
        params = []
        if payload.status:
            updates.append("status = ?")
            params.append(payload.status)
        if payload.driver_id is not None:
            updates.append("driver_id = ?")
            params.append(payload.driver_id)
        if payload.staff_id is not None:
            updates.append("staff_id = ?")
            params.append(payload.staff_id)
        if payload.bus_id is not None:
            updates.append("bus_id = ?")
            params.append(payload.bus_id)

        if updates:
            params.append(trip_id)
            connection.execute(f"UPDATE trips SET {', '.join(updates)} WHERE id = ?", params)
            connection.commit()

        updated = connection.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        return {"success": True, "trip": dict(updated)}




class CreateRouteRequest(BaseModel):
    name: str
    departure_city: str
    arrival_city: str
    base_price: int = Field(default=150000, ge=0)
    distance_km: float = Field(default=100.0, ge=0)
    status: str = "HoatDong"


@router.post("/api/v1/admin/routes", status_code=status.HTTP_201_CREATED, summary="Tạo mới tuyến xe (Admin)")
def create_admin_route(payload: CreateRouteRequest):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tên tuyến xe không được để trống")
    with get_connection() as conn:
        existing = conn.execute("SELECT id FROM routes WHERE LOWER(name) = LOWER(?)", (name,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Tuyến xe với tên này đã tồn tại trên hệ thống")
        cursor = conn.execute(
            """INSERT INTO routes (name, departure_city, arrival_city, base_price, distance_km, status)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (name, payload.departure_city.strip(), payload.arrival_city.strip(), payload.base_price, payload.distance_km, payload.status),
        )
        route_id = cursor.lastrowid
        log_audit(conn, 12, "CREATE_ROUTE", "ROUTE", route_id, f"Tạo tuyến xe mới: {name}")
        conn.commit()
        row = conn.execute("SELECT * FROM routes WHERE id = ?", (route_id,)).fetchone()
        return {"success": True, "message": "Tạo tuyến xe mới thành công!", "route": dict(row)}


@router.get("/api/v1/admin/routes", summary="Danh sách tuyến xe chi tiết (Admin)")
def list_admin_routes():
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT r.*,
                      (SELECT COUNT(*) FROM trips t WHERE t.route_id = r.id) AS total_trips
               FROM routes r
               ORDER BY r.id ASC"""
        ).fetchall()
        return [dict(r) for r in rows]


class CreateStaffRequest(BaseModel):
    full_name: str
    email: str
    phone: str = "0900000000"
    role: str = "TaiXe"  # TaiXe | PhuXe
    password: str = "123456"


@router.post("/api/v1/admin/staff", status_code=status.HTTP_201_CREATED, summary="Thêm mới tài xế / phụ xe (Admin)")
def create_admin_staff(payload: CreateStaffRequest):
    allowed_roles = {"TaiXe", "PhuXe", "DRIVER", "CONDUCTOR", "STAFF"}
    if payload.role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Vai trò nhân sự phải là Tài Xế (TaiXe) hoặc Phụ Xe (PhuXe)")

    email = payload.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email không được để trống")

    with get_connection() as conn:
        existing = conn.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email này đã được sử dụng bởi một tài khoản khác")

        cursor = conn.execute(
            """INSERT INTO users (full_name, email, phone, role, discount_type, discount_status, password_hash)
               VALUES (?, ?, ?, ?, 'Khong', 'DaDuyet', ?)""",
            (payload.full_name.strip(), email, payload.phone.strip(), payload.role, payload.password.strip()),
        )
        user_id = cursor.lastrowid
        role_label = "Tài xế" if payload.role in ("TaiXe", "DRIVER") else "Phụ xe"
        log_audit(conn, 12, "CREATE_STAFF", "USER", user_id, f"Thêm nhân sự {role_label}: {payload.full_name} ({email})")
        conn.commit()
        row = conn.execute("SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
        return {"success": True, "message": f"Thêm {role_label} thành công!", "staff": dict(row)}


@router.get("/api/v1/admin/staff", summary="Danh sách tài xế và phụ xe (Admin)")
def list_admin_staff():
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT u.id, u.full_name, u.email, u.phone, u.role, u.created_at,
                      (SELECT COUNT(*) FROM trips t WHERE t.driver_id = u.id OR t.staff_id = u.id) AS assigned_trips
               FROM users u
               WHERE u.role IN ('TaiXe', 'PhuXe', 'DRIVER', 'CONDUCTOR', 'STAFF')
               ORDER BY u.role DESC, u.id ASC"""
        ).fetchall()
        return [dict(r) for r in rows]


class CreateAdminTripRequest(BaseModel):
    route_id: int
    departure_at: str  # YYYY-MM-DD HH:MM
    arrival_at: str    # YYYY-MM-DD HH:MM
    bus_id: Optional[int] = 1
    driver_id: Optional[int] = 11
    staff_id: Optional[int] = 2
    base_price: Optional[int] = None


@router.post("/api/v1/admin/trips", status_code=status.HTTP_201_CREATED, summary="Tạo chuyến xe mới theo tuyến (Admin)")
def create_admin_trip(payload: CreateAdminTripRequest):
    with get_connection() as conn:
        route = conn.execute("SELECT * FROM routes WHERE id = ?", (payload.route_id,)).fetchone()
        if not route:
            raise HTTPException(status_code=404, detail="Không tìm thấy tuyến xe")

        bus = conn.execute("SELECT * FROM buses WHERE id = ?", (payload.bus_id,)).fetchone() if payload.bus_id else None
        total_seats = bus["total_seats"] if bus else 36

        price = payload.base_price if payload.base_price is not None else route["base_price"]
        trip_code = f"TRIP-R{payload.route_id}-{uuid4().hex[:6].upper()}"

        dep_at = str(payload.departure_at or "").strip().replace("T", " ")
        arr_at = str(payload.arrival_at or "").strip().replace("T", " ")
        if len(dep_at) == 16:
            dep_at += ":00"
        if arr_at and len(arr_at) == 16:
            arr_at += ":00"
        if not arr_at:
            arr_at = dep_at

        cursor = conn.execute(
            """INSERT INTO trips (trip_code, origin, destination, departure_at, arrival_at, base_price, status, bus_id, route_id, driver_id, staff_id, available_seats)
               VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, ?, ?, ?)""",
            (trip_code, route["departure_city"], route["arrival_city"], dep_at, arr_at, price, payload.bus_id, payload.route_id, payload.driver_id, payload.staff_id, total_seats),
        )
        trip_id = cursor.lastrowid

        # Tự động tạo sơ đồ 2 tầng (Dãy A và Dãy B)
        deck_lower = [f"A{i:02d}" for i in range(1, 19)]
        deck_upper = [f"B{i:02d}" for i in range(1, 19)]
        for s in deck_lower:
            conn.execute("INSERT OR IGNORE INTO seats (trip_id, seat_number, deck_or_row, status) VALUES (?, ?, 'TangDuoi', 'AVAILABLE')", (trip_id, s))
        for s in deck_upper:
            conn.execute("INSERT OR IGNORE INTO seats (trip_id, seat_number, deck_or_row, status) VALUES (?, ?, 'TangTren', 'AVAILABLE')", (trip_id, s))

        log_audit(conn, 12, "CREATE_TRIP", "TRIP", trip_id, f"Tạo chuyến mới {trip_code} cho tuyến {route['name']}")
        conn.commit()
        new_trip = conn.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        return {"success": True, "message": "Tạo chuyến xe thành công và đã sinh đủ sơ đồ ghế!", "trip": dict(new_trip)}


class AssignTripRequest(BaseModel):
    driver_id: Optional[int] = None
    staff_id: Optional[int] = None
    bus_id: Optional[int] = None


@router.put("/api/v1/admin/trips/{trip_id}/assign", summary="Gán tài xế & phụ xe cho chuyến xe (Admin)")
def assign_trip_staff(trip_id: int, payload: AssignTripRequest):
    with get_connection() as conn:
        trip = conn.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        if not trip:
            raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")

        updates = []
        params = []
        if payload.driver_id is not None:
            updates.append("driver_id = ?")
            params.append(payload.driver_id)
        if payload.staff_id is not None:
            updates.append("staff_id = ?")
            params.append(payload.staff_id)
        if payload.bus_id is not None:
            updates.append("bus_id = ?")
            params.append(payload.bus_id)

        if updates:
            params.append(trip_id)
            conn.execute(f"UPDATE trips SET {', '.join(updates)} WHERE id = ?", params)
            log_audit(conn, 12, "ASSIGN_STAFF", "TRIP", trip_id, f"Phân công tài xế/phụ xe cho chuyến #{trip_id}")
            conn.commit()

        updated = conn.execute(
            """SELECT tr.*, r.name AS route_name, b.license_plate, b.bus_type,
                      u.full_name AS driver_name, staff.full_name AS staff_name
               FROM trips tr
               LEFT JOIN routes r ON r.id = tr.route_id
               LEFT JOIN buses b ON b.id = tr.bus_id
               LEFT JOIN users u ON u.id = tr.driver_id
               LEFT JOIN users staff ON staff.id = tr.staff_id
               WHERE tr.id = ?""",
            (trip_id,),
        ).fetchone()
        return {"success": True, "message": "Đã phân công tài xế và phụ xe thành công!", "trip": dict(updated)}


@router.get("/api/v1/driver/trips", summary="Lịch trình và danh sách phân công của Tài xế & Phụ xe")
def get_driver_trips(
    driver_id: Optional[int] = Query(None),
    staff_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
):
    target_id = user_id or driver_id or staff_id
    with get_connection() as connection:
        query = """
            SELECT tr.*, r.name AS route_name, b.license_plate, b.bus_type,
                   u.full_name as driver_name, staff.full_name as staff_name
            FROM trips tr
            LEFT JOIN routes r ON r.id = tr.route_id
            LEFT JOIN buses b ON b.id = tr.bus_id
            LEFT JOIN users u ON u.id = tr.driver_id
            LEFT JOIN users staff ON staff.id = tr.staff_id
        """
        params = []
        if target_id:
            query += " WHERE (tr.driver_id = ? OR tr.staff_id = ?)"
            params.extend([target_id, target_id])
        query += " ORDER BY tr.departure_at ASC"
        rows = connection.execute(query, params).fetchall()

        results = []
        for r in rows:
            tid = r["id"]
            p_rows = connection.execute(
                """SELECT t.id as ticket_id, t.ticket_code, t.status as ticket_status,
                          COALESCE(s.seat_number, 'A01') as seat_number,
                          COALESCE(bi.passenger_name, u.full_name, 'Hành khách') as passenger_name,
                          COALESCE(u.phone, '0901234567') as phone
                   FROM tickets t
                   LEFT JOIN booking_items bi ON bi.id = t.booking_item_id
                   LEFT JOIN bookings b ON b.id = bi.booking_id
                   LEFT JOIN seats s ON s.id = COALESCE(bi.seat_id, t.seat_id)
                   LEFT JOIN users u ON u.id = COALESCE(b.user_id, t.user_id)
                   WHERE (t.trip_id = ? OR b.trip_id = ?)
                   ORDER BY s.seat_number ASC""",
                (tid, tid),
            ).fetchall()

            results.append({
                "id": r["id"],
                "trip_code": r["trip_code"],
                "origin": r["origin"],
                "destination": r["destination"],
                "departure_at": r["departure_at"],
                "arrival_at": r["arrival_at"],
                "status": r["status"],
                "license_plate": r["license_plate"] or "29B-123.45",
                "bus_type": r["bus_type"] or "Giường nằm cao cấp",
                "driver_name": r["driver_name"] or "Trần Văn Tài",
                "staff_name": r["staff_name"] or "Chưa phân công",
                "passengers": [
                    {
                        "ticket_id": p["ticket_id"],
                        "ticket_code": p["ticket_code"],
                        "seat_number": p["seat_number"],
                        "passenger_name": p["passenger_name"],
                        "phone": p["phone"],
                        "boarded": p["ticket_status"] in ("USED", "DaSoat"),
                        "ticket_status": p["ticket_status"],
                    }
                    for p in p_rows
                ],
            })
        return results


class BoardPassengerRequest(BaseModel):
    ticket_id: Union[int, str]
    staff_email: Optional[str] = "taixe.nguyen@smartbus.vn"


@router.post("/api/v1/driver/board-passenger", summary="Xác nhận khách lên xe trực tiếp (Tài xế/Phụ xe)")
def driver_board_passenger(payload: BoardPassengerRequest):
    with get_connection() as connection:
        ticket = connection.execute(
            "SELECT * FROM tickets WHERE id = ? OR ticket_code = ?",
            (str(payload.ticket_id), str(payload.ticket_id)),
        ).fetchone()
        if not ticket:
            raise HTTPException(status_code=404, detail="Không tìm thấy vé")

        connection.execute(
            "UPDATE tickets SET status = 'USED', used_at = CURRENT_TIMESTAMP WHERE id = ?",
            (ticket["id"],),
        )
        connection.execute(
            """INSERT INTO ticket_inspections (ticket_id, ticket_code, staff_user_id, staff_email, result, note)
               VALUES (?, ?, 11, ?, 'VALID', 'Tài xế xác nhận lên xe trực tiếp từ danh sách hành khách')""",
            (ticket["id"], ticket["ticket_code"], payload.staff_email),
        )
        connection.commit()
        return {
            "success": True,
            "boarded": True,
            "status": "USED",
            "message": "Xác nhận hành khách lên xe thành công!",
            "ticket_code": ticket["ticket_code"],
        }




@router.get("/api/v1/admin/audit-logs", tags=["Sprint 3 - Audit & Security"])
def get_audit_logs():
    with get_connection() as conn:
        logs = conn.execute(
            """SELECT a.*, COALESCE(u.full_name, 'Hệ thống') as user_name 
               FROM audit_logs a 
               LEFT JOIN users u ON a.user_id = u.id 
               ORDER BY a.created_at DESC"""
        ).fetchall()
        return [dict(log) for log in logs]


@router.get("/api/v1/admin/discounts/pending", tags=["Sprint 3 - Audit & Security"])
def get_pending_discounts():
    with get_connection() as conn:
        users = conn.execute(
            """SELECT id, full_name, email, phone, discount_type, discount_status 
               FROM users 
               WHERE discount_status = 'ChoDuyet' OR (discount_type != 'Khong' AND discount_status != 'DaDuyet')"""
        ).fetchall()
        return [dict(u) for u in users]


class ApproveDiscountRequest(BaseModel):
    admin_id: Optional[int] = 12
    status: str  # 'DaDuyet' hoặc 'TuChoi'
    discount_type: Optional[str] = None
    note: Optional[str] = None


@router.put("/api/v1/admin/discounts/{user_id}/approve", tags=["Sprint 3 - Audit & Security"])
def approve_discount(user_id: int, req: ApproveDiscountRequest):
    with get_connection() as conn:
        user = conn.execute("SELECT id, full_name, discount_type FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

        final_type = (
            req.discount_type
            or (user["discount_type"] if user["discount_type"] != "Khong" else "HSSV")
            if req.status == "DaDuyet"
            else "Khong"
        )
        conn.execute(
            "UPDATE users SET discount_status = ?, discount_type = ? WHERE id = ?",
            (req.status, final_type, user_id),
        )

        action_name = "APPROVE_DISCOUNT" if req.status == "DaDuyet" else "REJECT_DISCOUNT"
        details_msg = f"Duyệt ưu đãi [{final_type}] cho #{user_id} ({user['full_name']}). Ghi chú: {req.note or 'Không'}"
        log_audit(conn, req.admin_id or 12, action_name, "USER_DISCOUNT", user_id, details_msg)
        conn.commit()
        return {
            "success": True,
            "message": f"Cập nhật ưu đãi thành công ({req.status})",
            "user_id": user_id,
            "discount_type": final_type,
            "discount_status": req.status,
        }




@router.get("/api/v1/admin/revenue", tags=["Sprint 3 - Doanh Thu & Báo Cáo"])
def admin_revenue_report(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    route_id: Optional[int] = Query(None),
    trip_id: Optional[int] = Query(None),
):
    start = parse_report_date(from_date, "from_date")
    end = parse_report_date(to_date, "to_date", end_of_day=True)

    conditions = ["p.status = 'SUCCESS'"]
    params = []
    if start:
        conditions.append("datetime(p.paid_at) >= datetime(?)")
        params.append(start.strftime("%Y-%m-%d %H:%M:%S"))
    if end:
        conditions.append("datetime(p.paid_at) <= datetime(?)")
        params.append(end.strftime("%Y-%m-%d %H:%M:%S"))
    if route_id:
        conditions.append("t.route_id = ?")
        params.append(route_id)
    if trip_id:
        conditions.append("t.id = ?")
        params.append(trip_id)

    where_clause = " AND ".join(conditions)
    with get_connection() as c:
        rows = [
            dict(r)
            for r in c.execute(
                f"""SELECT p.id, p.transaction_code, p.booking_code, p.amount, p.provider,
                           p.status, p.paid_at, p.created_at,
                           b.id AS booking_id, b.trip_id,
                           t.trip_code, t.origin, t.destination, t.route_id,
                           r.name AS route_name,
                           (SELECT COALESCE(SUM(rf.approved_amount), 0) FROM refunds rf
                            WHERE rf.payment_id = p.id AND rf.status = 'REFUNDED') AS refunded_amount
                    FROM payments p
                    LEFT JOIN bookings b ON b.id = p.booking_id
                    LEFT JOIN trips t ON t.id = b.trip_id
                    LEFT JOIN routes r ON r.id = t.route_id
                    WHERE {where_clause}
                    ORDER BY datetime(COALESCE(p.paid_at, p.created_at)) DESC, p.id DESC""",
                params,
            ).fetchall()
        ]

        by_day = [
            dict(r)
            for r in c.execute(
                f"""SELECT substr(p.paid_at, 1, 10) AS date,
                           COUNT(*) AS transaction_count,
                           COALESCE(SUM(p.amount), 0) AS revenue
                    FROM payments p
                    LEFT JOIN bookings b ON b.id = p.booking_id
                    LEFT JOIN trips t ON t.id = b.trip_id
                    WHERE {where_clause}
                    GROUP BY substr(p.paid_at, 1, 10)
                    ORDER BY date DESC""",
                params,
            ).fetchall()
        ]

    for row in rows:
        row["refunded_amount"] = row.get("refunded_amount") or 0
        row["net_revenue"] = (row.get("amount") or 0) - row["refunded_amount"]

    for day in by_day:
        day["gross_revenue"] = day.get("revenue", 0)
        day["refunded_amount"] = sum(
            row["refunded_amount"] for row in rows if (row.get("paid_at") or "")[:10] == (day.get("date") or "")
        )
        day["revenue"] = day["gross_revenue"] - day["refunded_amount"]

    gross = sum(row.get("amount") or 0 for row in rows)
    refunded = sum(row["refunded_amount"] for row in rows)
    return {
        "transaction_count": len(rows),
        "gross_revenue": gross,
        "refunded_amount": refunded,
        "total_revenue": gross - refunded,
        "by_day": by_day,
        "transactions": rows,
    }


@router.get("/api/v1/admin/revenue/export", tags=["Sprint 3 - Doanh Thu & Báo Cáo"])
def admin_revenue_export(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    route_id: Optional[int] = Query(None),
    trip_id: Optional[int] = Query(None),
):
    report = admin_revenue_report(from_date, to_date, route_id, trip_id)
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow([
        "Mã Giao Dịch", "Mã Đặt Vé", "Số Tiền (VNĐ)", "Cổng TT", "Thời Gian",
        "Mã Chuyến", "Tuyến Xe", "Điểm Đi", "Điểm Đến", "Đã Hoàn", "Thực Thu"
    ])
    for r in report["transactions"]:
        writer.writerow([
            r.get("transaction_code", ""),
            r.get("booking_code", ""),
            int(r.get("amount", 0)),
            r.get("provider", ""),
            r.get("paid_at", ""),
            r.get("trip_code", ""),
            r.get("route_name", ""),
            r.get("origin", ""),
            r.get("destination", ""),
            int(r.get("refunded_amount", 0)),
            int(r.get("net_revenue", 0)),
        ])
    return StreamingResponse(
        iter(["\ufeff" + output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=revenue_report.csv"},
    )


@router.get("/api/v1/admin/occupancy", tags=["Sprint 3 - Doanh Thu & Báo Cáo"])
def admin_occupancy_report(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    route_id: Optional[int] = Query(None),
):
    with get_connection() as c:
        rows = [
            dict(r)
            for r in c.execute(
                """SELECT tr.id, tr.trip_code, tr.route_id, tr.origin, tr.destination,
                          tr.departure_at, tr.status, tr.available_seats,
                          COALESCE(b.total_seats, 36) AS total_seats,
                          (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id = tr.id AND tk.status IN ('PAID','USED','DaThanhToan','DaSoat')) AS sold_seats
                   FROM trips tr
                   LEFT JOIN buses b ON b.id = tr.bus_id
                   ORDER BY datetime(tr.departure_at) DESC"""
            ).fetchall()
        ]
    for r in rows:
        total = max(1, r.get("total_seats") or 36)
        sold = max(0, r.get("sold_seats") or 0)
        rate = round((sold / total) * 100, 1)
        r["occupancy_rate"] = max(0.0, min(100.0, rate))
    avg_occ = round(sum(r["occupancy_rate"] for r in rows) / len(rows), 1) if rows else 0.0
    return {"count": len(rows), "trips": rows, "overall": {"average_occupancy_rate": avg_occ}}


@router.get("/api/v1/admin/occupancy/trips/{trip_id}", tags=["Sprint 3 - Doanh Thu & Báo Cáo"])
def admin_trip_occupancy(trip_id: int):
    with get_connection() as c:
        row = c.execute(
            """SELECT tr.id, tr.trip_code, tr.route_id, tr.origin, tr.destination,
                      tr.departure_at, tr.status, tr.available_seats,
                      COALESCE(b.total_seats, 36) AS total_seats,
                      (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id = tr.id AND tk.status IN ('PAID','USED','DaThanhToan','DaSoat')) AS sold_seats
               FROM trips tr
               LEFT JOIN buses b ON b.id = tr.bus_id
               WHERE tr.id = ?""",
            (trip_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")
        res = dict(row)
        total = max(1, res.get("total_seats") or 36)
        sold = max(0, res.get("sold_seats") or 0)
        rate = round((sold / total) * 100, 1)
        res["occupancy_rate"] = max(0.0, min(100.0, rate))
        return res




@router.get("/api/v1/admin/refunds", tags=["Sprint 3 - Refunds"])
def admin_get_refunds():
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT rf.*, rf.requested_amount AS amount, COALESCE(u.full_name, 'Hành khách') as passenger_name, COALESCE(u.phone, '---') as phone
               FROM refunds rf
               LEFT JOIN users u ON u.id = rf.user_id
               ORDER BY rf.created_at DESC"""
        ).fetchall()
        refunds_list = [dict(r) for r in rows]
        return {"refunds": refunds_list, "count": len(refunds_list)}


@router.post("/api/v1/admin/refunds/{refund_id}/approve", tags=["Sprint 3 - Refunds"])
def admin_approve_refund(refund_id: int):
    with get_connection() as conn:
        rf = conn.execute("SELECT * FROM refunds WHERE id = ?", (refund_id,)).fetchone()
        if not rf:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu hoàn tiền")
        amt = rf["requested_amount"]
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        conn.execute(
            """UPDATE refunds SET status = 'APPROVED', approved_amount = ?, processed_at = ?, note = 'Đã hoàn tiền thành công vào tài khoản'
               WHERE id = ?""",
            (amt, now_str, refund_id),
        )
        if rf["ticket_code"]:
            conn.execute("UPDATE tickets SET status = 'CANCELLED' WHERE ticket_code = ?", (rf["ticket_code"],))
        log_audit(conn, 12, "APPROVE_REFUND", "REFUND", refund_id, f"Hoàn tiền {int(amt):,}đ cho vé {rf['ticket_code']}")
        conn.commit()
        return {"success": True, "message": "Đã phê duyệt và hoàn tiền thành công!", "status": "APPROVED"}


@router.post("/api/v1/admin/refunds/{refund_id}/reject", tags=["Sprint 3 - Refunds"])
def admin_reject_refund(refund_id: int, payload: Optional[dict] = None):
    payload = payload or {}
    reason = payload.get("reason", "Hủy vé quá muộn so với giờ quy định")
    with get_connection() as conn:
        rf = conn.execute("SELECT * FROM refunds WHERE id = ?", (refund_id,)).fetchone()
        if not rf:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu hoàn tiền")
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        conn.execute(
            """UPDATE refunds SET status = 'REJECTED', processed_at = ?, note = ?
               WHERE id = ?""",
            (now_str, reason, refund_id),
        )
        log_audit(conn, 12, "REJECT_REFUND", "REFUND", refund_id, f"Từ chối hoàn vé: {reason}")
        conn.commit()
        return {"success": True, "message": "Đã từ chối hoàn tiền", "status": "REJECTED"}


