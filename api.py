from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from database import get_connection

class RefundRequest(BaseModel):
    booking_code: str = Field(..., min_length=1)
    reason: str = Field(default="", max_length=500)

def register_refunds(app, authenticated_customer):
    @app.post("/api/v1/refunds", status_code=201, summary="Tạo yêu cầu hoàn tiền (BE4 US8)")
    def create_refund(payload: RefundRequest, user=Depends(authenticated_customer)):
        booking_code = payload.booking_code.strip().upper()
        with get_connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            booking = connection.execute(
                "SELECT * FROM bookings WHERE UPPER(booking_code)=? AND user_id=?",
                (booking_code, user["id"]),
            ).fetchone()
            if booking is None:
                raise HTTPException(404, "Không tìm thấy đơn đặt vé của tài khoản")
            if booking["status"] != "CANCELLED":
                raise HTTPException(409, "Chỉ đơn đã hủy mới được yêu cầu hoàn tiền")
            payment = connection.execute(
                "SELECT * FROM payments WHERE (booking_id=? OR (booking_id IS NULL AND booking_code=?)) AND status='SUCCESS' ORDER BY id DESC LIMIT 1",
                (booking["id"], booking["booking_code"]),
            ).fetchone()
            if payment is None:
                raise HTTPException(409, "Đơn chưa có thanh toán thành công")
            existing = connection.execute(
                "SELECT * FROM refunds WHERE booking_id=? AND status IN ('PENDING','APPROVED','PROCESSING','REFUNDED')",
                (booking["id"],),
            ).fetchone()
            if existing:
                raise HTTPException(409, "Đơn đã có yêu cầu hoàn tiền")
            refund_id = connection.execute(
                """INSERT INTO refunds (booking_id,payment_id,user_id,requested_amount,reason)
                   VALUES (?,?,?,?,?)""",
                (booking["id"], payment["id"], user["id"], payment["amount"], payload.reason.strip()),
            ).lastrowid
            return dict(connection.execute("SELECT * FROM refunds WHERE id=?", (refund_id,)).fetchone())


    @app.get("/api/v1/refunds", summary="Xem yêu cầu hoàn tiền của mình (BE4 US8)")
    def list_my_refunds(user=Depends(authenticated_customer)):
        with get_connection() as connection:
            return [dict(row) for row in connection.execute(
                """SELECT f.*, b.booking_code, p.transaction_code, p.amount AS payment_amount
                   FROM refunds f JOIN bookings b ON b.id=f.booking_id
                   JOIN payments p ON p.id=f.payment_id
                   WHERE f.user_id=? ORDER BY f.id DESC""", (user["id"],)
            ).fetchall()]




class RefundDecision(BaseModel):
    status: str = Field(pattern="^(APPROVED|REJECTED|REFUNDED|FAILED)$")
    admin_note: str = Field(default="", max_length=500)


def register_refund_admin(app, authenticated_admin):
    router = APIRouter(prefix="/api/v1/admin", dependencies=[Depends(authenticated_admin)])

    @router.get("/refunds", summary="Danh sách yêu cầu hoàn tiền")
    def refunds(status: Optional[str] = Query(None, pattern="^(PENDING|APPROVED|REJECTED|PROCESSING|REFUNDED|FAILED)$")):
        sql = """SELECT f.*, b.booking_code, p.transaction_code, p.amount AS payment_amount,
                         u.full_name, u.email
                  FROM refunds f JOIN bookings b ON b.id=f.booking_id
                  JOIN payments p ON p.id=f.payment_id JOIN users u ON u.id=f.user_id"""
        params = []
        if status:
            sql += " WHERE f.status=?"
            params.append(status)
        sql += " ORDER BY f.id DESC"
        with get_connection() as c:
            return [dict(row) for row in c.execute(sql, params).fetchall()]

    @router.patch("/refunds/{refund_id}", summary="Duyệt hoặc từ chối hoàn tiền")
    def decide_refund(refund_id: int, payload: RefundDecision):
        with get_connection() as c:
            c.execute("BEGIN IMMEDIATE")
            refund = c.execute("SELECT * FROM refunds WHERE id=?", (refund_id,)).fetchone()
            if refund is None:
                raise HTTPException(404, "Không tìm thấy yêu cầu hoàn tiền")
            transitions = {"PENDING": {"APPROVED", "REJECTED"}, "APPROVED": {"REFUNDED", "FAILED"}}
            if payload.status not in transitions.get(refund["status"], set()):
                raise HTTPException(409, "Yêu cầu hoàn tiền đã được xử lý")
            if payload.status == "REFUNDED" and not payload.admin_note.strip():
                raise HTTPException(422, "Cần ghi mã giao dịch hoặc bằng chứng hoàn tiền thủ công")
            approved = refund["requested_amount"] if payload.status in {"APPROVED", "REFUNDED", "FAILED"} else None
            new_status = payload.status
            c.execute(
                "UPDATE refunds SET status=?, approved_amount=?, admin_note=?, processed_at=CURRENT_TIMESTAMP WHERE id=?",
                (new_status, approved, payload.admin_note.strip(), refund_id),
            )
            return dict(c.execute("SELECT * FROM refunds WHERE id=?", (refund_id,)).fetchone())

    app.include_router(router)
