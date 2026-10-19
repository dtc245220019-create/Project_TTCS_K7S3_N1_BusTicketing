"""Vouchers and service fees router."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from database import get_connection
from common import log_audit

router = APIRouter(tags=["Vouchers & Fees"])

class VoucherApplyRequest(BaseModel):
    code: str
    order_value: float = Field(gt=0)


class FeeCalculateRequest(BaseModel):
    fee_id: int
    order_value: float = Field(gt=0)


class CreateVoucherRequest(BaseModel):
    code: str
    name: Optional[str] = ""
    title: Optional[str] = None
    description: Optional[str] = None
    discount_type: str = "percent"  # percent or fixed
    discount_value: float = Field(default=10.0, ge=0)
    discount_percent: Optional[float] = 10.0
    min_order_value: float = Field(default=0, ge=0)
    max_discount: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    expiry_date: Optional[str] = None


class CreateFeeRequest(BaseModel):
    name: str
    description: Optional[str] = None
    fee_type: str = "fixed"  # fixed or percent
    fee_value: float = Field(gt=0)


@router.get("/api/v1/vouchers", summary="Danh sách mã giảm giá (BE4)")
def list_vouchers():
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM vouchers WHERE is_active = 1 OR status = 'ACTIVE' ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]


@router.post("/api/v1/vouchers", status_code=status.HTTP_201_CREATED, summary="Tạo mới mã giảm giá (BE4)")
def create_voucher(payload: CreateVoucherRequest):
    code = payload.code.strip().upper()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    start = payload.start_date or now_str
    end = payload.end_date or payload.expiry_date or "2027-12-31 23:59:59"

    today_str = datetime.now().strftime("%Y-%m-%d")
    if end[:10] < today_str:
        raise HTTPException(status_code=400, detail="Ngày hết hạn của mã giảm giá không thể ở trong quá khứ")

    raw_type = str(payload.discount_type or "percent").strip().lower()
    norm_type = "percent" if raw_type in ("percent", "percentage", "%") else "fixed"
    name = payload.title or payload.name or code
    disc_val = float(payload.discount_value or (payload.discount_percent or 10.0))
    disc_pct = disc_val if norm_type == "percent" else 0.0
    max_disc = float(payload.max_discount or (disc_val if norm_type == "fixed" else 100000.0))

    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM vouchers WHERE UPPER(code) = ? OR UPPER(voucher_code) = ?", (code, code)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Mã giảm giá đã tồn tại")

        cursor = connection.execute(
            """INSERT INTO vouchers 
               (code, voucher_code, name, description, discount_type, discount_value, discount_percent, min_order_value, max_discount, max_discount_amount, start_date, end_date, expires_at, is_active, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE')""",
            (code, code, name, payload.description or "", norm_type, disc_val,
             disc_pct, payload.min_order_value, max_disc, int(max_disc), start, end, end),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM vouchers WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return dict(row)


@router.post("/api/v1/vouchers/apply", summary="Áp dụng mã giảm giá (BE4)")
def apply_voucher_endpoint(payload: VoucherApplyRequest):
    code = payload.code.strip().upper()
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM vouchers WHERE UPPER(code) = ? OR UPPER(voucher_code) = ?", (code, code)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Mã giảm giá không tồn tại")

        is_active = row["is_active"] if "is_active" in row.keys() else 1
        status = row["status"] if "status" in row.keys() else "ACTIVE"
        if not is_active or status != "ACTIVE":
            raise HTTPException(status_code=400, detail="Mã giảm giá hiện không hoạt động")

        min_val = row["min_order_value"] if "min_order_value" in row.keys() and row["min_order_value"] is not None else 0.0
        if payload.order_value < min_val:
            raise HTTPException(
                status_code=400,
                detail=f"Giá trị đơn hàng phải từ {int(min_val):,} VNĐ để áp dụng mã này"
            )

        disc_type = str(row["discount_type"] or "percent").strip().lower()
        disc_val = float(row["discount_value"] if "discount_value" in row.keys() and row["discount_value"] is not None else (row["discount_percent"] or 0.0))
        if disc_val == 0.0 and "discount_percent" in row.keys() and row["discount_percent"]:
            disc_val = float(row["discount_percent"])

        max_disc = row["max_discount"] if "max_discount" in row.keys() and row["max_discount"] is not None else (row["max_discount_amount"] or None)

        is_percent = (
            disc_type in ("percent", "percentage", "%") or
            (disc_val <= 100.0 and disc_val > 0.0 and row.get("discount_percent") is not None and float(row.get("discount_percent") or 0) > 0.0)
        )

        if is_percent:
            discount_amount = payload.order_value * (disc_val / 100.0)
        else:
            discount_amount = disc_val

        if max_disc is not None and max_disc > 0 and discount_amount > max_disc:
            discount_amount = float(max_disc)

        final_amount = max(0.0, payload.order_value - discount_amount)
        return {
            "code": code,
            "order_value": payload.order_value,
            "discount_amount": discount_amount,
            "final_amount": final_amount,
        }


@router.get("/api/v1/fees", summary="Danh sách các loại phí dịch vụ (BE4)")
def list_fees():
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM fees WHERE is_active = 1").fetchall()
        return [dict(r) for r in rows]


@router.post("/api/v1/fees", summary="Thêm mới loại phí dịch vụ (BE4)")
def create_fee(payload: CreateFeeRequest):
    with get_connection() as connection:
        cursor = connection.execute(
            """INSERT INTO fees (name, description, fee_type, fee_value, is_active)
               VALUES (?, ?, ?, ?, 1)""",
            (payload.name, payload.description or "", payload.fee_type, payload.fee_value),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM fees WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return dict(row)


@router.post("/api/v1/fees/calculate", summary="Tính toán phí dịch vụ cho đơn hàng (BE4)")
def calculate_fee_endpoint(payload: FeeCalculateRequest):
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM fees WHERE id = ?", (payload.fee_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy loại phí")

        if not row["is_active"]:
            raise HTTPException(status_code=400, detail="Loại phí này hiện không áp dụng")

        if row["fee_type"] == "percent":
            fee_amount = payload.order_value * (row["fee_value"] / 100.0)
        else:
            fee_amount = row["fee_value"]

        return {
            "fee_id": row["id"],
            "order_value": payload.order_value,
            "fee_amount": fee_amount,
            "final_amount": payload.order_value + fee_amount,
        }


