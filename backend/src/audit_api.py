from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import sqlite3
from database import get_connection

router = APIRouter(prefix="/api/v1/admin", tags=["Admin - Audit & Discounts"])


def log_audit(connection: sqlite3.Connection, user_id: int, action: str, entity_type: str, entity_id: int, details: str = ""):
    """Hàm helper ghi nhật ký thao tác vào bảng audit_logs"""
    connection.execute(
        """
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (user_id, action, entity_type, entity_id, details, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    )


class ApproveDiscountRequest(BaseModel):
    admin_id: int
    status: str  # 'DaDuyet' hoặc 'TuChoi'
    discount_type: Optional[str] = None  # Nhập loại ưu đãi tùy ý: 'ThuongBinh', 'CaoTuoi', 'HSSV', 'BenhBinh', ...
    note: Optional[str] = None


@router.get("/audit-logs")
def get_audit_logs():
    """Lấy danh sách nhật ký hệ thống Audit Logs"""
    with get_connection() as conn:
        logs = conn.execute(
            """
            SELECT a.*, u.full_name as user_name 
            FROM audit_logs a 
            LEFT JOIN users u ON a.user_id = u.id 
            ORDER BY a.created_at DESC
            """
        ).fetchall()
        return [dict(log) for log in logs]


@router.get("/discounts/pending")
def get_pending_discounts():
    """Lấy danh sách các yêu cầu ưu đãi chờ duyệt"""
    with get_connection() as conn:
        users = conn.execute(
            """
            SELECT id, full_name, email, phone, discount_type, discount_status 
            FROM users 
            WHERE discount_status = 'ChoDuyet' OR discount_type != 'Khong'
            """
        ).fetchall()
        return [dict(u) for u in users]


@router.put("/discounts/{user_id}/approve")
def approve_discount(user_id: int, req: ApproveDiscountRequest):
    """Duyệt hoặc từ chối ưu đãi của người dùng (Hỗ trợ nhập linh hoạt ThuongBinh, CaoTuoi, HSSV,...)"""
    if req.status not in ["DaDuyet", "TuChoi"]:
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ. Sử dụng 'DaDuyet' hoặc 'TuChoi'")

    with get_connection() as conn:
        user = conn.execute("SELECT id, full_name, discount_type FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

        # 1. Xác định loại ưu đãi:
        # - Nếu Admin nhập discount_type -> dùng giá trị Admin nhập.
        # - Nếu Admin không nhập -> giữ nguyên loại ưu đãi hiện tại của User trong CSDL.
        # - Nếu loại cũ là "Khong" mà Admin duyệt mà không nhập -> mặc định gán "HSSV".
        final_discount_type = user['discount_type']
        if req.discount_type:
            final_discount_type = req.discount_type
        elif final_discount_type == "Khong" and req.status == "DaDuyet":
            final_discount_type = "HSSV"

        # 2. Cập nhật trạng thái và loại ưu đãi cho User
        conn.execute(
            "UPDATE users SET discount_status = ?, discount_type = ? WHERE id = ?",
            (req.status, final_discount_type, user_id)
        )

        # 3. Ghi Audit Log
        action_name = "APPROVE_DISCOUNT" if req.status == "DaDuyet" else "REJECT_DISCOUNT"
        details_msg = f"Duyệt ưu đãi [{final_discount_type}] cho người dùng #{user_id} ({user['full_name']}). Ghi chú: {req.note or 'Không'}"
        
        log_audit(
            connection=conn,
            user_id=req.admin_id,
            action=action_name,
            entity_type="USER_DISCOUNT",
            entity_id=user_id,
            details=details_msg
        )

        conn.commit()
        return {
            "message": f"Cập nhật ưu đãi thành công ({req.status})",
            "user_id": user_id,
            "discount_type": final_discount_type,
            "status": req.status
        }