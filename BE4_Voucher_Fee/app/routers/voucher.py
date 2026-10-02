from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database.database import get_db
from app.models.voucher import Voucher
from app.schemas.voucher import (
    VoucherCreate,
    VoucherUpdate,
    VoucherResponse,
    VoucherApplyRequest,
    VoucherApplyResponse
)
router = APIRouter(
    prefix="/vouchers",
    tags=["Vouchers"]
)

@router.get("/", response_model=list[VoucherResponse])
def get_vouchers(db: Session = Depends(get_db)):
    return db.query(Voucher).all()

@router.post("/apply", response_model=VoucherApplyResponse)
def apply_voucher(
    voucher_data: VoucherApplyRequest,
    db: Session = Depends(get_db)
):
    voucher = db.query(Voucher).filter(
        Voucher.code == voucher_data.code
    ).first()

    if not voucher:
        raise HTTPException(
            status_code=404,
            detail="Voucher not found"
        )

    if voucher_data.order_value < voucher.min_order_value:
        raise HTTPException(
            status_code=400,
            detail=f"Order value must be at least {voucher.min_order_value}"
        )

    if not voucher.is_active:
        raise HTTPException(
            status_code=400,
            detail="Voucher is inactive"
        )

    if datetime.utcnow() < voucher.start_date:
        raise HTTPException(
            status_code=400,
            detail="Voucher is not started yet"
        )

    if datetime.utcnow() > voucher.end_date:
        raise HTTPException(
            status_code=400,
            detail="Voucher has expired"
        )

    if voucher.discount_type == "percent":
        discount_amount = voucher_data.order_value * voucher.discount_value / 100
    else:
        discount_amount = voucher.discount_value

    if voucher.max_discount is not None and discount_amount > voucher.max_discount:
        discount_amount = voucher.max_discount

    return {
        "code": voucher.code,
        "order_value": voucher_data.order_value,
        "discount_amount": discount_amount,
        "final_amount": voucher_data.order_value - discount_amount
    }

@router.get("/{voucher_id}", response_model=VoucherResponse)
def get_voucher(voucher_id: int, db: Session = Depends(get_db)):
    voucher = db.query(Voucher).filter(Voucher.id == voucher_id).first()

    if not voucher:
        raise HTTPException(
            status_code=404,
            detail="Voucher not found"
        )

    return voucher


@router.post("/", response_model=VoucherResponse)
def create_voucher(
    voucher_data: VoucherCreate,
    db: Session = Depends(get_db)
):
    existing_voucher = db.query(Voucher).filter(
        Voucher.code == voucher_data.code
    ).first()

    if existing_voucher:
        raise HTTPException(
            status_code=400,
            detail="Voucher code already exists"
        )

    voucher = Voucher(**voucher_data.model_dump())

    db.add(voucher)
    db.commit()
    db.refresh(voucher)

    return voucher


@router.put("/{voucher_id}", response_model=VoucherResponse)
def update_voucher(
    voucher_id: int,
    voucher_data: VoucherUpdate,
    db: Session = Depends(get_db)
):
    voucher = db.query(Voucher).filter(
        Voucher.id == voucher_id
    ).first()

    if not voucher:
        raise HTTPException(
            status_code=404,
            detail="Voucher not found"
        )

    update_data = voucher_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(voucher, key, value)

    db.commit()
    db.refresh(voucher)

    return voucher


@router.delete("/{voucher_id}")
def delete_voucher(
    voucher_id: int,
    db: Session = Depends(get_db)
):
    voucher = db.query(Voucher).filter(
        Voucher.id == voucher_id
    ).first()

    if not voucher:
        raise HTTPException(
            status_code=404,
            detail="Voucher not found"
        )

    db.delete(voucher)
    db.commit()

    return {
        "message": "Voucher deleted successfully"
    }