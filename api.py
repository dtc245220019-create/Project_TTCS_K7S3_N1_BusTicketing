"""Unified API Module for Smart Bus Ticketing System.

Proxies to backend/api/ package for backwards compatibility.
"""

from __future__ import annotations

import os
import sys

_curr_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.join(_curr_dir, "backend")
_src_dir = os.path.join(_backend_dir, "src")
_api_dir = os.path.join(_backend_dir, "api")

for _p in [_curr_dir, _backend_dir, _src_dir, _api_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from backend.api import app, startup
from backend.api import (
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

__all__ = [
    "app",
    "startup",
    "log_audit",
    "_ticket_query",
    "_serialize_ticket",
    "_find_ticket",
    "_send_and_record_notification",
    "PaymentRequest",
    "CallbackRequest",
    "InspectionRequest",
    "CancelRequest",
    "ChangeSeatRequest",
    "ChangeTripRequest",
    "HoldSeatRequest",
    "RegisterRequest",
    "LoginRequest",
    "CreateOrderRequest",
]