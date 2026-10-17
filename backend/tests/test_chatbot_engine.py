"""Comprehensive Unit and Integration Tests for BE1: Chatbot AI Engine (Sprint 3 / US25).

Tests:
1. NLP Helpers: Vietnamese accent normalization (normalize_vn)
2. NLP Entity Extraction: Point-of-origin and destination detection (extract_locations)
3. RAG Semantic Intent Recognition:
   - Trip schedule & pricing lookup (Dynamic DB query)
   - 10-minute Smart Seat Lock mechanism (US03)
   - Refund & ticket cancellation policy (24-hour advance, 100% refund)
   - Online payment guidance (VNPay, ZaloPay, MoMo, Bank QR)
   - Student discount (20% HSSV) & Voucher promotions
   - My Tickets & QR code lookup
   - Service feedback & complaints (US24)
   - General greetings
4. API Route Integration:
   - POST /api/v1/chatbot/ask with 'message'
   - POST /api/v1/chatbot/ask with 'question'
   - POST /api/v1/chatbot/chat
   - Validation handling for empty queries (422)
"""

import pytest
from fastapi.testclient import TestClient

from api import app
from database import get_connection
from chatbot_engine import (
    CITY_ALIASES,
    extract_locations,
    format_money,
    normalize_vn,
    process_smart_chat,
)

client = TestClient(app)


# =============================================================================
# 1. NLP & TEXT PROCESSING TESTS
# =============================================================================

class TestNLPHelpers:

    def test_normalize_vn_accents(self):
        assert normalize_vn("Hà Nội") == "ha noi"
        assert normalize_vn("Đà Nẵng") == "da nang"
        assert normalize_vn("Thành phố Hồ Chí Minh") == "thanh pho ho chi minh"
        assert normalize_vn("Thái Nguyên") == "thai nguyen"
        assert normalize_vn("") == ""

    def test_extract_locations_destination_only(self):
        locs = extract_locations("Tôi muốn tìm xe đi Đà Lạt")
        assert locs["destination"] == "dalat"

    def test_extract_locations_origin_and_destination(self):
        locs = extract_locations("Tìm xe từ Hà Nội vào Sài Gòn")
        assert locs["origin"] == "hanoi"
        assert locs["destination"] == "hochiminh"

    def test_extract_locations_with_abbreviations(self):
        locs = extract_locations("Từ HN đi ĐN")
        assert locs["origin"] == "hanoi"
        assert locs["destination"] == "danang"

    def test_format_money(self):
        assert "250.000 VNĐ" == format_money(250000)
        assert "1.200.000 VNĐ" == format_money(1200000)


# =============================================================================
# 2. RAG & INTENT RECOGNITION TESTS
# =============================================================================

class TestChatbotIntents:

    def test_intent_cancellation_and_refund(self):
        with get_connection() as conn:
            res = process_smart_chat("Làm sao để hủy vé và được hoàn tiền?", conn)
            assert res["success"] is True
            assert "24 giờ" in res["message"]
            assert "100%" in res["message"]
            assert "TICKETS" in res["actions"]
            assert "FEEDBACK" in res["actions"]

    def test_intent_seat_holding_mechanism(self):
        with get_connection() as conn:
            res = process_smart_chat("Ghế được tạm giữ trong bao lâu vậy bot?", conn)
            assert res["success"] is True
            assert "10 phút" in res["message"]
            assert "TRIPS" in res["actions"]

    def test_intent_payment_gateways(self):
        with get_connection() as conn:
            res = process_smart_chat("Có hỗ trợ thanh toán VNPay và ZaloPay không?", conn)
            assert res["success"] is True
            assert "VNPay" in res["message"]
            assert "ZaloPay" in res["message"]
            assert "TICKETS" in res["actions"]

    def test_intent_vouchers_and_student_discount(self):
        with get_connection() as conn:
            res = process_smart_chat("Có mã giảm giá cho học sinh sinh viên không?", conn)
            assert res["success"] is True
            assert "20%" in res["message"]
            assert "TRIPS" in res["actions"]

    def test_intent_feedback_and_complaint(self):
        with get_connection() as conn:
            res = process_smart_chat("Tôi muốn phản ánh thái độ phục vụ của tài xế", conn)
            assert res["success"] is True
            assert "phản ánh" in res["message"].lower()
            assert "FEEDBACK" in res["actions"]

    def test_intent_dynamic_trip_search(self):
        with get_connection() as conn:
            res = process_smart_chat("Có chuyến xe nào đi Thái Nguyên không?", conn)
            assert res["success"] is True
            assert "TRIPS" in res["actions"]
            assert "chuyến xe" in res["message"].lower()

    def test_intent_greeting(self):
        with get_connection() as conn:
            res = process_smart_chat("Xin chào SmartBus", conn)
            assert res["success"] is True
            assert "SmartBus AI xin chào" in res["message"]
            assert "TRIPS" in res["actions"]


# =============================================================================
# 3. FASTAPI ENDPOINT INTEGRATION TESTS
# =============================================================================

class TestChatbotEndpoints:

    def test_ask_endpoint_with_message_field(self):
        res = client.post("/api/v1/chatbot/ask", json={
            "message": "Giá vé xe đi Đà Lạt là bao nhiêu?",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "message" in data
        assert len(data["message"]) > 0

    def test_ask_endpoint_with_question_field(self):
        res = client.post("/api/v1/chatbot/ask", json={
            "question": "Làm thế nào để đổi vé?",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "message" in data

    def test_chat_endpoint(self):
        res = client.post("/api/v1/chatbot/chat", json={
            "message": "Các phương thức thanh toán?",
            "conversation": [{"role": "user", "text": "Alo"}],
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "VNPay" in data["message"] or "thanh toán" in data["message"].lower()

    def test_empty_message_returns_422(self):
        res = client.post("/api/v1/chatbot/ask", json={
            "message": "   ",
        })
        assert res.status_code == 422
