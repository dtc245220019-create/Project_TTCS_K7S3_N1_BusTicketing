"""Notifications, customer feedbacks, and Smart AI Chatbot router."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from database import get_connection
from chatbot_engine import process_smart_chat

router = APIRouter(tags=["Interactions, Feedbacks & Chatbot AI"])

@router.get("/api/v1/notifications", summary="Danh sách thông báo hệ thống và người dùng (US20)")
def get_notifications_endpoint(user_id: Optional[int] = Query(None), limit: int = Query(20, ge=1, le=100)):
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
               VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)""",
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
            "status": "PENDING",
        }


@router.get("/api/v1/feedbacks", tags=["Sprint 3 - Feedbacks"])
def get_feedbacks(user_id: Optional[int] = None):
    with get_connection() as conn:
        query = """
            SELECT f.*, COALESCE(u.full_name, 'Hành khách') as user_name,
                   COALESCE(f.content, f.comment) as content,
                   COALESCE(f.rating_stars, f.rating) as rating_stars
            FROM feedbacks f
            LEFT JOIN users u ON u.id = f.user_id
        """
        params = []
        if user_id:
            query += " WHERE f.user_id = ?"
            params.append(user_id)
        query += " ORDER BY f.created_at DESC"
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
    message: str
    user_id: Optional[int] = None
    conversation: Optional[list] = []


from chatbot_engine import process_smart_chat


@router.post("/api/v1/chatbot/chat", tags=["Sprint 3 - Chatbot AI"])
@router.post("/api/v1/chatbot/ask", tags=["Sprint 3 - Chatbot AI"])
def chatbot_chat_endpoint(req: ChatbotAskRequest):
    with get_connection() as conn:
        return process_smart_chat(
            message=req.message,
            conn=conn,
            user_id=req.user_id,
            conversation=req.conversation,
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)