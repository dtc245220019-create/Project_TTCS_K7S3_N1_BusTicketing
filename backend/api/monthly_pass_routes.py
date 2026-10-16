"""Monthly passes and renewal router."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, List, Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query, status

from pydantic import BaseModel, Field

from database import get_connection
from common import log_audit

router = APIRouter(tags=["Monthly Passes"])

PASS_DAYS_PER_MONTH = 30
PASS_TRIPS_PER_MONTH = 10          # 1 tháng = 10 lượt giá gốc (ưu đãi đi lại hàng tháng)
PASS_MONTH_DISCOUNT = {1: 0.0, 3: 0.08, 6: 0.15, 12: 0.25}   # mua dài hạn giảm thêm
PASS_STUDENT_DISCOUNT = 0.20        # HSSV giảm 20%


class RegisterPassRequest(BaseModel):

    user_id: int = Field(..., gt=0)
    route_id: int = Field(..., gt=0)
    months: int = Field(1, description="Số tháng: 1, 3, 6 hoặc 12")
    pass_id: Optional[int] = None       # có pass_id => gia hạn vé cũ
    passenger_name: Optional[str] = None
    passenger_id_card: Optional[str] = None
    price: Optional[float] = None
    payment_method: Optional[str] = "SANDBOX"
    customer_account_number: Optional[str] = None
    customer_bank_name: Optional[str] = None
    customer_account_holder: Optional[str] = None


def _pass_price(base_price: int, months: int, discount_type: Optional[str]) -> dict[str, int]:
    full = base_price * PASS_TRIPS_PER_MONTH * months
    term_off = round(full * PASS_MONTH_DISCOUNT.get(months, 0.0))
    after_term = full - term_off
    student_off = round(after_term * PASS_STUDENT_DISCOUNT) if discount_type and discount_type != "Khong" else 0
    return {
        "full": full,
        "term_discount": term_off,
        "student_discount": student_off,
        "total": after_term - student_off,
    }


def _serialize_pass(row: Any) -> dict[str, Any]:
    d = dict(row)
    today = datetime.now().date()
    end = datetime.fromisoformat(str(d["end_date"])[:10]).date()
    days_left = (end - today).days
    d["days_left"] = max(days_left, 0)
    d["status"] = "ConHan" if days_left >= 0 else "HetHan"
    d["qr_payload"] = f"pass:{d['id']}"
    d["ticket_code"] = f"PASS-{d['id']:04d}"
    d["passenger_name"] = d.get("passenger_name") or d.get("full_name") or "Hành khách"
    d["passenger_id_card"] = d.get("passenger_id_card") or d.get("phone") or "N/A"
    return d


_PASS_SELECT = """SELECT p.id, p.user_id, p.route_id, p.start_date, p.end_date, p.status,
                         COALESCE(p.passenger_name, u.full_name) AS passenger_name,
                         COALESCE(p.passenger_id_card, u.phone) AS passenger_id_card,
                         COALESCE(p.price, 0) AS price,
                         p.created_at,
                         r.name AS route_name, r.departure_city, r.arrival_city, r.base_price, r.distance_km,
                         u.full_name, u.email, u.phone, u.discount_type
                  FROM monthly_passes p
                  JOIN routes r ON r.id = p.route_id
                  JOIN users u ON u.id = p.user_id"""


@router.get("/api/v1/monthly-passes/plans", summary="Danh sách gói cước vé tháng và chính sách ưu đãi")
def get_monthly_pass_plans():
    return {
        "trips_per_month_equivalent": PASS_TRIPS_PER_MONTH,
        "student_discount_rate": PASS_STUDENT_DISCOUNT,
        "plans": [
            {"months": 1, "duration_days": 30, "discount_rate": 0.0, "name": "Gói 1 Tháng (Tiêu chuẩn)", "badge": "Phổ thông"},
            {"months": 3, "duration_days": 90, "discount_rate": 0.08, "name": "Gói 3 Tháng (Tiết kiệm)", "badge": "Tiết kiệm 8%"},
            {"months": 6, "duration_days": 180, "discount_rate": 0.15, "name": "Gói 6 Tháng (Bán niên)", "badge": "Ưu đãi 15%"},
            {"months": 12, "duration_days": 360, "discount_rate": 0.25, "name": "Gói 1 Năm (Toàn niên)", "badge": "Siêu tiết kiệm 25%"},
        ],
        "benefits": [
            "Không giới hạn số lượt đi lại trên tuyến đăng ký",
            "Mã QR động check-in tức thì bằng điện thoại hoặc in thẻ cứng",
            "Học sinh, Sinh viên & Người cao tuổi được giảm thêm 20%",
            "Tự động cộng dồn thời hạn sử dụng khi gia hạn trước hạn",
        ]
    }


@router.get("/api/v1/monthly-passes", summary="Danh sách vé tháng của người dùng")
def list_monthly_passes(user_id: Optional[int] = Query(None, gt=0)):
    with get_connection() as connection:
        if user_id:
            rows = connection.execute(_PASS_SELECT + " WHERE p.user_id = ? ORDER BY p.end_date DESC", (user_id,)).fetchall()
        else:
            rows = connection.execute(_PASS_SELECT + " ORDER BY p.end_date DESC").fetchall()
        return [_serialize_pass(r) for r in rows]


@router.get("/api/v1/monthly-passes/user/{user_id}", summary="Danh sách vé tháng theo User ID (BE Compatibility)")
def get_user_monthly_passes(user_id: int):
    with get_connection() as connection:
        rows = connection.execute(_PASS_SELECT + " WHERE p.user_id = ? ORDER BY p.end_date DESC", (user_id,)).fetchall()
        return [_serialize_pass(r) for r in rows]


@router.get("/api/v1/monthly-passes/{pass_id}", summary="Chi tiết vé tháng")
def get_monthly_pass_detail(pass_id: int):
    with get_connection() as connection:
        row = connection.execute(_PASS_SELECT + " WHERE p.id = ?", (pass_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy vé tháng")
        return _serialize_pass(row)


@router.post("/api/v1/monthly-passes/register", status_code=201, summary="Đăng ký mới hoặc gia hạn vé tháng (US16)")
def register_monthly_pass(payload: RegisterPassRequest):
    if payload.months not in PASS_MONTH_DISCOUNT:
        raise HTTPException(status_code=400, detail="Gói vé tháng chỉ hỗ trợ 1, 3, 6 hoặc 12 tháng")

    with get_connection() as connection:
        route = connection.execute(
            "SELECT id, name, departure_city, arrival_city, base_price FROM routes WHERE id = ? AND status = 'HoatDong'",
            (payload.route_id,)
        ).fetchone()
        if not route:
            raise HTTPException(status_code=404, detail="Tuyến xe không tồn tại hoặc đã ngừng hoạt động")
        user = connection.execute("SELECT id, full_name, email, phone, discount_type FROM users WHERE id = ?", (payload.user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

        today = datetime.now().date()
        price = _pass_price(route["base_price"], payload.months, user["discount_type"])
        final_price = payload.price if payload.price is not None and payload.price > 0 else price["total"]
        added_days = PASS_DAYS_PER_MONTH * payload.months

        passenger_name = (payload.passenger_name or user["full_name"] or "Hành khách").strip()
        passenger_id_card = (payload.passenger_id_card or user["phone"] or "001202012345").strip()

        if payload.pass_id:  # ---- GIA HẠN ----
            old = connection.execute(
                "SELECT * FROM monthly_passes WHERE id = ? AND user_id = ?", (payload.pass_id, payload.user_id)
            ).fetchone()
            if not old:
                raise HTTPException(status_code=404, detail="Không tìm thấy vé tháng cần gia hạn")
            old_end = datetime.fromisoformat(str(old["end_date"])[:10]).date()
            still_active = old_end >= today
            # còn hạn: cộng dồn vào ngày hết hạn cũ; đã hết hạn: bắt đầu lại từ hôm nay
            new_start = old["start_date"] if still_active else today.isoformat()
            new_end = (old_end if still_active else today - timedelta(days=1)) + timedelta(days=added_days)
            connection.execute(
                """UPDATE monthly_passes 
                   SET start_date = ?, end_date = ?, status = 'ConHan', price = ?,
                       passenger_name = COALESCE(?, passenger_name),
                       passenger_id_card = COALESCE(?, passenger_id_card)
                   WHERE id = ?""",
                (new_start, new_end.isoformat(), final_price, passenger_name, passenger_id_card, old["id"]),
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
                """INSERT INTO monthly_passes 
                   (user_id, passenger_name, passenger_id_card, route_id, start_date, end_date, price, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'ConHan')""",
                (payload.user_id, passenger_name, passenger_id_card, payload.route_id, start.isoformat(), new_end.isoformat(), final_price),
            )
            pass_id, action = cur.lastrowid, "NEW"

        txn_code = f"TXN-PASS-{uuid4().hex[:8].upper()}"
        connection.execute(
            """INSERT INTO payments (booking_id, booking_code, transaction_code, amount, provider, status, paid_at)
               VALUES (NULL, ?, ?, ?, ?, 'SUCCESS', ?)""",
            (f"PASS-{pass_id}", txn_code, final_price, (payload.payment_method or "SANDBOX").upper(), datetime.now().isoformat()),
        )

        # Gửi thông báo In-app cho người dùng (US20)
        try:
            start_display = start.isoformat() if action == "NEW" else new_start
            end_display = new_end.isoformat()
            act_text = "Gia hạn" if action == "RENEW" else "Đăng ký"
            connection.execute(
                """INSERT INTO notifications (user_id, title, message, type, recipient, status)
                   VALUES (?, ?, ?, 'EMAIL', ?, 'SENT')""",
                (
                    user["id"],
                    f"[SmartBus] {act_text} vé tháng thành công #{pass_id}",
                    f"Vé tháng tuyến {route['departure_city']} - {route['arrival_city']} đã kích hoạt thành công (Hạn: {start_display} đến {end_display}). Số tiền: {int(final_price):,} VNĐ.",
                    user["email"] or "customer@smartbus.vn",
                ),
            )
        except Exception:
            pass

        connection.commit()

        row = connection.execute(_PASS_SELECT + " WHERE p.id = ?", (pass_id,)).fetchone()
        serialized = _serialize_pass(row)
        return {
            "success": True,
            "action": action,
            "transaction_code": txn_code,
            "amount": final_price,
            "price_detail": price,
            "pass": serialized,
            "pass_info": serialized,
            "message": "Gia hạn vé tháng thành công!" if action == "RENEW" else "Đăng ký vé tháng thành công!",
        }


# =============================================================================
# RBAC & PHÂN QUYỀN 4 ACTOR (ADMIN & DRIVER APIs)
