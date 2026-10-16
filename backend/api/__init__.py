"""Backend API Routers package.

Contains modular FastAPI APIRouters for all system features:
- auth_routes: Authentication & User Profiles
- trips_routes: Trip Search, Seat Maps, Routes & GPS Network Map
- payments_routes: Online Payment Gateways (VNPay, ZaloPay, Sandbox)
- tickets_routes: Electronic QR Tickets, Cancellation, Seat Change, Boarding & Refunds
- vouchers_routes: Discount Vouchers & Service Fees
- monthly_pass_routes: Monthly Passes & Renewals
- admin_routes: Admin Management, Revenue Analytics, Occupancy, Staff Assignment
- interactions_routes: Notifications, Feedback & AI Chatbot
"""

from __future__ import annotations

import os
import sys

_api_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_api_dir)
_src_dir = os.path.join(_backend_dir, "src")

for _p in [_backend_dir, _src_dir, _api_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import get_connection, initialize_database

# Re-export common schemas and helper utilities for 100% backward compatibility
from common import (
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
from auth_routes import router as auth_router
from trips_routes import router as trips_router
from payments_routes import router as payments_router
from tickets_routes import router as tickets_router
from vouchers_routes import router as vouchers_router
from monthly_pass_routes import router as monthly_pass_router
from admin_routes import router as admin_router
from interactions_routes import router as interactions_router

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
