import json
import os
import re
from typing import Any, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .database import get_connection

router = APIRouter(prefix="/api/v1/chatbot", tags=["AI Chat Bot"])

API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
BASE_URL = os.getenv("AI_API_BASE_URL", "https://api.openai.com/v1").rstrip("/")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    user_id: Optional[int] = None
    conversation: list[dict[str, str]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    success: bool
    message: str
    source: str
    data: dict[str, Any] = {}


def rows(sql, params=()):
    conn = get_connection()
    try:
        return [dict(x) for x in conn.execute(sql, params).fetchall()]
    finally:
        conn.close()


def get_business_context(user_id=None):
    data = {
        "routes": rows("""
            SELECT id, name, departure_city, arrival_city,
                   base_price, distance_km, status
            FROM routes
            WHERE status = 'ACTIVE'
            ORDER BY id
        """),
        "trips": rows("""
            SELECT trip_code, origin, destination, departure_at,
                   arrival_at, base_price, available_seats, status
            FROM trips
            WHERE status <> 'CANCELLED'
            ORDER BY departure_at
        """),
        "vouchers": rows("""
            SELECT code, name, description, discount_percent, max_discount
            FROM vouchers
            WHERE is_active = 1
        """),
    }

    if user_id:
        data["my_tickets"] = rows("""
            SELECT t.ticket_code, t.seat_number, t.status,
                   t.actual_price, tr.origin, tr.destination,
                   tr.departure_at
            FROM tickets t
            LEFT JOIN trips tr ON tr.id = t.trip_id
            WHERE t.user_id = ?
            ORDER BY t.issued_at DESC
            LIMIT 20
        """, (user_id,))

    return data


SYSTEM_PROMPT = """
Bạn là SmartBus AI, chatbot hỗ trợ khách hàng của hệ thống đặt vé xe.

Trả lời bằng tiếng Việt, dễ hiểu và ngắn gọn.

QUY TẮC:
- Chỉ sử dụng dữ liệu trong BUSINESS_DATA cho thông tin chuyến xe,
  giá, ghế, voucher và vé.
- Không tự bịa dữ liệu.
- Nếu không có dữ liệu, hãy nói rõ.
- Có thể tư vấn tìm chuyến, đặt vé, chọn ghế, thanh toán,
  VNPay/ZaloPay, voucher, tra cứu vé, hủy/đổi vé và vé tháng.
- Không nói rằng bạn đã thực hiện giao dịch nếu chỉ đang tư vấn.
- Không tiết lộ API key, mật khẩu hoặc dữ liệu bí mật.
"""


def money(value):
    try:
        return f"{int(float(value)):,}".replace(",", ".") + " VNĐ"
    except Exception:
        return str(value)


def fallback(message, data):
    q = message.lower()

    if any(x in q for x in ["chuyến", "xe", "đi từ", "đến"]):
        words = [w for w in re.findall(r"\w+", q) if len(w) >= 3]
        matched = []

        for trip in data["trips"]:
            text = (
                f"{trip['origin']} {trip['destination']} "
                f"{trip['trip_code']}").lower()
            if any(w in text for w in words):
                matched.append(trip)

        if matched:
            result = ["Mình tìm thấy các chuyến sau:"]
            for t in matched[:8]:
                result.append(
                    f"- {t['trip_code']}: {t['origin']} → {t['destination']} | "
                    f"{t['departure_at']} | {money(t['base_price'])} | "
                    f"còn {t['available_seats']} ghế"
                )
            return "\n".join(result)

        return (
            "Mình chưa tìm thấy chuyến phù hợp. "
            "Bạn hãy cho mình điểm đi, điểm đến và thời gian muốn đi."
        )

    if any(x in q for x in ["voucher", "mã giảm", "giảm giá"]):
        if not data["vouchers"]:
            return "Hiện chưa có voucher hoạt động."

        return "Voucher hiện có:\n" + "\n".join(
            f"- {v['code']}: {v['name']} - giảm {v['discount_percent']}%"
            for v in data["vouchers"]
        )

    if any(x in q for x in ["thanh toán", "vnpay", "zalopay"]):
        return (
            "Hệ thống có thể tích hợp VNPay/ZaloPay. "
            "Sau khi tạo giao dịch, trạng thái thanh toán được cập nhật "
            "qua callback/IPN."
        )

    if any(x in q for x in ["hủy vé", "huỷ vé", "đổi vé"]):
        return (
            "Bạn có thể tra cứu vé rồi sử dụng chức năng Hủy vé hoặc "
            "Đổi vé/ghế. Chat Bot chỉ tư vấn, thao tác thực tế cần "
            "gọi API nghiệp vụ."
        )

    if "vé của tôi" in q or "vé tôi" in q:
        tickets = data.get("my_tickets", [])
        if not tickets:
            return "Không tìm thấy vé nào của tài khoản này."

        return "Vé gần đây của bạn:\n" + "\n".join(
            f"- {t['ticket_code']}: {t['origin']} → {t['destination']} | "
            f"ghế {t['seat_number']} | {t['status']} | "
            f"{money(t['actual_price'])}"
            for t in tickets
        )

    return (
        "Xin chào! Mình là SmartBus AI. "
        "Mình có thể hỗ trợ tìm chuyến, giá vé, ghế, voucher, "
        "thanh toán VNPay/ZaloPay, tra cứu vé và hướng dẫn hủy/đổi vé."
    )


async def ask_ai(message, data, conversation):
    if not API_KEY:
        return fallback(message, data), "local_fallback"

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for item in conversation[-10:]:
        if item.get("role") in ("user", "assistant"):
            messages.append({
                "role": item["role"],
                "content": item.get("content", "")[:4000]
            })

    messages.append({
        "role": "user",
        "content": (
            "BUSINESS_DATA:\n"
            + json.dumps(data, ensure_ascii=False, default=str)[:30000]
            + "\n\nQUESTION:\n"
            + message
        )
    })

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                f"{BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL,
                    "messages": messages,
                    "temperature": 0.2,
                    "max_tokens": 700
                }
            )

        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"].strip(), "ai"

    except Exception:
        return fallback(message, data), "local_fallback"


@router.get("/")
def health():
    return {
        "success": True,
        "service": "SmartBus AI Chat Bot",
        "ai_configured": bool(API_KEY),
        "model": MODEL if API_KEY else None
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="message không được để trống")

    context = get_business_context(request.user_id)
    answer, source = await ask_ai(
        request.message.strip(),
        context,
        request.conversation
    )

    return ChatResponse(
        success=True,
        message=answer,
        source=source,
        data={
            "user_id": request.user_id,
            "context_types": list(context.keys())
        }
    )
