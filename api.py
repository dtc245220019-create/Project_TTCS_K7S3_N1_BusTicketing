"""Unified API Module for Smart Bus Ticketing System.

Modularized FastAPI application aggregating functional routers:
- routers/auth_routes.py: US04 Đăng ký, đăng nhập, thông tin người dùng
- routers/trips_routes.py: US01 Tra cứu chuyến, US02/US03 Sơ đồ ghế, Tạm giữ ghế, Tuyến xe, Bản đồ Smart Map
- routers/payments_routes.py: US05 Thanh toán trực tuyến (Sandbox, VNPay, ZaloPay), Tạo đơn đặt vé
- routers/tickets_routes.py: US06 Xuất vé QR, US07 Lịch sử vé, Hủy vé, Đổi vé, US08 Soát vé, Boarding lên xe, Hoàn tiền
- routers/vouchers_routes.py: BE4 Mã giảm giá (Vouchers), Phí dịch vụ (Fees)
- routers/monthly_pass_routes.py: US16 Vé tháng, Gia hạn vé tháng, Gói cước
- routers/admin_routes.py: Quản lý người dùng, Doanh thu, Tỷ lệ lấp đầy, Phân công tài xế/phụ xe, Audit logs, Duyệt ưu đãi
- routers/interactions_routes.py: US20 Thông báo hệ thống, Phản ánh khách hàng (Feedbacks), AI Chatbot
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import get_connection, initialize_database

# Re-export common schemas and helper utilities for 100% backward compatibility
from routers.common import (
    log_audit,
    _ticket_query,
    _serialize_ticket,
    _find_ticket,
    _send_and_record_notification,
    PaymentRequest,
    CallbackRequest,
    InspectionRequest,
    CancelRequest,
    ChangeSeatRequest,
    ChangeTripRequest,
    HoldSeatRequest,
    RegisterRequest,
    LoginRequest,
    CreateOrderRequest,
)

# Import functional routers
from routers.auth_routes import router as auth_router
from routers.trips_routes import router as trips_router
from routers.payments_routes import router as payments_router
from routers.tickets_routes import router as tickets_router
from routers.vouchers_routes import router as vouchers_router
from routers.monthly_pass_routes import router as monthly_pass_router
from routers.admin_routes import router as admin_router
from routers.interactions_routes import router as interactions_router

app = FastAPI(
    title="Smart Bus Ticketing API - Unified System",
    description="Hệ thống API quản lý và đặt vé xe buýt thông minh, hỗ trợ đa kênh thanh toán và AI Chatbot.",
    version="2.0.0",
)

# CORS middleware for React / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    with get_connection() as connection:
        initialize_database(connection)


# Register all functional routers into FastAPI application
app.include_router(auth_router)
app.include_router(trips_router)
app.include_router(payments_router)
app.include_router(tickets_router)
app.include_router(vouchers_router)
app.include_router(monthly_pass_router)
app.include_router(admin_router)
app.include_router(interactions_router)