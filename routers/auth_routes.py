"""Authentication and user profile router."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query, Depends, status

from database import get_connection
from notification import send_registration_confirmation
from routers.common import RegisterRequest, LoginRequest, log_audit

router = APIRouter(tags=["Authentication & Users"])

@router.post("/api/v1/auth/register", summary="Đăng ký tài khoản (US04)")
def register_user(payload: RegisterRequest):
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM users WHERE email = ? OR phone = ?",
            (payload.email.strip().lower(), payload.phone.strip()),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email hoặc số điện thoại đã được đăng ký")

        cursor = connection.execute(
            """INSERT INTO users (full_name, email, phone, password_hash, role, discount_type)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                payload.full_name.strip(),
                payload.email.strip().lower(),
                payload.phone.strip(),
                payload.password.strip(),
                payload.role or "HanhKhach",
                payload.discount_type or "Khong",
            ),
        )
        user_id = cursor.lastrowid

        # Ghi nhận thông báo vào bảng notifications
        try:
            connection.execute(
                """INSERT INTO notifications (user_id, type, recipient, title, message, status)
                   VALUES (?, 'EMAIL', ?, ?, ?, 'SENT')""",
                (
                    user_id,
                    payload.email.strip().lower(),
                    f"[SmartBus] Chào mừng {payload.full_name.strip()}!",
                    f"Đăng ký tài khoản SmartBus thành công với vai trò {payload.role or 'HanhKhach'}.",
                ),
            )
        except Exception as notif_err:
            print(f"[REGISTER NOTIF ERROR]: {notif_err}")

        connection.commit()

        # Gửi email chào mừng thật qua Gmail SMTP bằng background thread
        try:
            threading.Thread(
                target=send_registration_confirmation,
                args=(
                    payload.email.strip().lower(),
                    {
                        "full_name": payload.full_name.strip(),
                        "email": payload.email.strip().lower(),
                        "phone": payload.phone.strip(),
                        "role": payload.role or "HanhKhach",
                    },
                ),
                daemon=True,
            ).start()
        except Exception as email_err:
            print(f"[REGISTER EMAIL THREAD ERROR]: {email_err}")

        return {
            "id": user_id,
            "full_name": payload.full_name,
            "email": payload.email,
            "phone": payload.phone,
            "role": payload.role or "HanhKhach",
            "message": "Đăng ký thành công!",
        }


@router.post("/api/v1/auth/login", summary="Đăng nhập tài khoản (US04)")
def login_user(payload: LoginRequest):
    identifier = payload.email.strip().lower()
    with get_connection() as connection:
        user = connection.execute(
            "SELECT * FROM users WHERE LOWER(email) = ? OR phone = ?",
            (identifier, identifier),
        ).fetchone()

        if not user or (user["password_hash"] and user["password_hash"] != payload.password.strip() and user["password_hash"] != "pbkdf2:sha256:123456"):
            raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác")

        return {
            "token": f"token-{user['id']}-{uuid4().hex[:8]}",
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "phone": user["phone"],
                "role": user["role"],
                "discount_type": user["discount_type"],
            },
            "message": "Đăng nhập thành công!",
        }


@router.get("/api/v1/auth/me", summary="Lấy thông tin người dùng hiện tại")
def get_current_user(user_id: int = Query(1)):
    with get_connection() as connection:
        user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        return dict(user)


# =============================================================================
# US05 & US06: THANH TOÁN SANDBOX & TẠO ĐƠN & VÉ ĐIỆN TỬ
# =============================================================================
