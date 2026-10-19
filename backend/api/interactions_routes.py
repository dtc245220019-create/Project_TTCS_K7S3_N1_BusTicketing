"""Notifications, customer feedbacks, and Smart AI Chatbot router."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from database import get_connection
from chatbot_engine import process_smart_chat

router = APIRouter(tags=["Interactions, Feedbacks & Chatbot AI"])

class DepartureReminderRequest(BaseModel):
    user_id: Optional[int] = 1
    ticket_code: Optional[str] = None
    trip_id: Optional[int] = None
    minutes_before: Optional[int] = 30


@router.post("/api/v1/notifications/reminder-departure", summary="Tạo thông báo nhắc nhở xe sắp chạy")
def trigger_departure_reminder(req: DepartureReminderRequest):
    with get_connection() as connection:
        query = """
            SELECT tk.id, tk.ticket_code, tk.user_id, tr.departure_at, tr.origin, tr.destination,
                   COALESCE(r.name, tr.origin || ' - ' || tr.destination) as route_name,
                   u.email, u.full_name
            FROM tickets tk
            JOIN trips tr ON tr.id = tk.trip_id
            LEFT JOIN routes r ON r.id = tr.route_id
            LEFT JOIN users u ON u.id = tk.user_id
            WHERE 1=1
        """
        params = []
        if req.ticket_code:
            query += " AND (tk.ticket_code = ? OR tk.id = ?)"
            params.extend([req.ticket_code, req.ticket_code])
        elif req.trip_id:
            query += " AND tr.id = ?"
            params.append(req.trip_id)
        elif req.user_id:
            query += " AND tk.user_id = ?"
            params.append(req.user_id)

        rows = connection.execute(query, params).fetchall()
        created = []
        for r in rows:
            u_id = r["user_id"] or req.user_id or 1
            recipient = r["email"] or "customer@example.com"
            t_code = r["ticket_code"]
            r_name = r["route_name"]
            dep = r["departure_at"]

            title = f"⏰ [Nhắc nhở] Sắp đến giờ khởi hành chuyến xe #{t_code}"
            msg = (
                f"Kính gửi Quý khách, chuyến xe tuyến {r_name} (Mã vé #{t_code}) "
                f"dự kiến khởi hành lúc {dep} (còn khoảng {req.minutes_before} phút). "
                f"Quý khách vui lòng có mặt tại bến xe trước 15 phút để làm thủ tục lên xe!"
            )
            connection.execute(
                """INSERT INTO notifications (user_id, ticket_id, type, recipient, title, message, status)
                   VALUES (?, ?, 'EMAIL', ?, ?, ?, 'SENT')""",
                (u_id, r["id"], recipient, title, msg),
            )
            created.append({"ticket_code": t_code, "departure_at": dep, "route_name": r_name})

        connection.commit()
        return {
            "success": True,
            "message": f"Đã gửi {len(created)} thông báo nhắc nhở khởi hành thành công!",
            "reminders": created,
        }


@router.get("/api/v1/notifications", summary="Danh sách thông báo hệ thống và người dùng (US20)")
def get_notifications_endpoint(user_id: Optional[int] = Query(None), limit: int = Query(30, ge=1, le=100)):
    with get_connection() as connection:
        # Nếu có user_id, kiểm tra xem người dùng có vé sắp chạy nào chưa có thông báo nhắc nhở không
        if user_id:
            try:
                upcoming_tickets = connection.execute(
                    """SELECT tk.id, tk.ticket_code, tr.departure_at, tr.origin, tr.destination,
                              COALESCE(r.name, tr.origin || ' - ' || tr.destination) as route_name,
                              u.email
                       FROM tickets tk
                       JOIN trips tr ON tr.id = tk.trip_id
                       LEFT JOIN routes r ON r.id = tr.route_id
                       LEFT JOIN users u ON u.id = tk.user_id
                       WHERE tk.user_id = ? AND tk.status IN ('PAID', 'CONFIRMED', 'DaThanhToan', 'GiuCho')
                       ORDER BY tk.id DESC LIMIT 5""",
                    (user_id,),
                ).fetchall()

                for tk in upcoming_tickets:
                    # Kiểm tra xem đã có thông báo nhắc nhở cho vé này chưa
                    exists = connection.execute(
                        "SELECT id FROM notifications WHERE user_id = ? AND title LIKE ?",
                        (user_id, f"%#{tk['ticket_code']}%"),
                    ).fetchone()
                    if not exists:
                        title = f"⏰ [Nhắc nhở] Sắp đến giờ khởi hành chuyến xe #{tk['ticket_code']}"
                        msg = (
                            f"Chuyến xe tuyến {tk['route_name']} của Quý khách dự kiến khởi hành lúc {tk['departure_at']}. "
                            f"Vui lòng có mặt tại điểm đón trước 15 phút và chuẩn bị mã QR để lên xe thuận tiện!"
                        )
                        connection.execute(
                            """INSERT INTO notifications (user_id, ticket_id, type, recipient, title, message, status)
                               VALUES (?, ?, 'EMAIL', ?, ?, ?, 'SENT')""",
                            (user_id, tk["id"], tk["email"] or "customer@example.com", title, msg),
                        )
                connection.commit()
            except Exception as check_err:
                print(f"[CHECK UPCOMING NOTIF ERROR]: {check_err}")

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



class FeedbackCreateRequest(BaseModel):
    user_id: Optional[int] = 1
    trip_id: Optional[int] = None
    ticket_code: Optional[str] = None
    rating_stars: Optional[int] = 5
    rating: Optional[int] = None
    category: Optional[str] = "Chung"
    content: Optional[str] = ""
    comment: Optional[str] = None


@router.post("/api/v1/feedbacks", status_code=201, tags=["Sprint 3 - Feedbacks"])
def create_feedback(req: FeedbackCreateRequest):
    final_stars = req.rating or req.rating_stars or 5
    final_content = (req.comment or req.content or "").strip()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO feedbacks (user_id, trip_id, rating, rating_stars, category, comment, content, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?)""",
            (
                req.user_id,
                req.trip_id,
                final_stars,
                final_stars,
                req.category or "Chung",
                final_content,
                final_content,
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )
        conn.commit()
        return {
            "id": cursor.lastrowid,
            "message": "Cảm ơn bạn đã gửi phản ánh/đánh giá!",
            "status": "APPROVED",
        }


@router.get("/api/v1/feedbacks", tags=["Sprint 3 - Feedbacks"])
def get_feedbacks(user_id: Optional[int] = None, category: Optional[str] = None, rating: Optional[int] = None):
    with get_connection() as conn:
        query = """
            SELECT f.*, COALESCE(u.full_name, 'Khách hàng SmartBus') as user_name,
                   COALESCE(f.content, f.comment) as content,
                   COALESCE(f.rating_stars, f.rating) as rating_stars,
                   COALESCE(r.name, tr.origin || ' ➔ ' || tr.destination, '') as route_name
            FROM feedbacks f
            LEFT JOIN users u ON u.id = f.user_id
            LEFT JOIN trips tr ON tr.id = f.trip_id
            LEFT JOIN routes r ON r.id = tr.route_id
            WHERE 1=1
        """
        params = []
        if user_id:
            query += " AND f.user_id = ?"
            params.append(user_id)
        if category:
            query += " AND f.category = ?"
            params.append(category)
        if rating:
            query += " AND (f.rating_stars = ? OR f.rating = ?)"
            params.extend([rating, rating])

        query += " ORDER BY f.created_at DESC, f.id DESC"
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]


@router.patch("/api/v1/feedbacks/{feedback_id}/status", tags=["Sprint 3 - Feedbacks"])
def update_feedback_status(feedback_id: int, payload: dict):
    st = payload.get("status", "APPROVED")
    with get_connection() as conn:
        conn.execute("UPDATE feedbacks SET status = ? WHERE id = ?", (st, feedback_id))
        conn.commit()
        return {"success": True, "id": feedback_id, "status": st}




class ChatbotAskRequest(BaseModel):
    message: Optional[str] = None
    question: Optional[str] = None
    user_id: Optional[int] = None
    conversation: Optional[list] = []


from chatbot_engine import process_smart_chat


@router.post("/api/v1/chatbot/chat", tags=["Sprint 3 - Chatbot AI"])
@router.post("/api/v1/chatbot/ask", tags=["Sprint 3 - Chatbot AI"])
def chatbot_chat_endpoint(req: ChatbotAskRequest):
    content = (req.message or req.question or "").strip()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nội dung câu hỏi (message hoặc question) không được để trống",
        )
    with get_connection() as conn:
        return process_smart_chat(
            message=content,
            conn=conn,
            user_id=req.user_id,
            conversation=req.conversation,
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)