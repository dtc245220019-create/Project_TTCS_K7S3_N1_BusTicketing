
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.database import get_db
from app.models.voucher import Voucher
from app.schemas.voucher import (
    VoucherCreate,
    VoucherUpdate,
    VoucherResponse
)

router = APIRouter(
    prefix="/vouchers",
    tags=["Vouchers"]
)


@router.post("/", response_model=VoucherResponse, status_code=status.HTTP_201_CREATED)
def create_voucher(voucher_data: VoucherCreate, db: Session = Depends(get_db)):
    existing_voucher = db.query(Voucher).filter(
        Voucher.code == voucher_data.code
    ).first()

    if existing_voucher:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ma voucher da ton tai"
        )

    voucher = Voucher(**voucher_data.model_dump())
    db.add(voucher)
    db.commit()
    db.refresh(voucher)

    return voucher


@router.get("/", response_model=list[VoucherResponse])
def get_vouchers(db: Session = Depends(get_db)):
    return db.query(Voucher).order_by(Voucher.id.desc()).all()


@router.get("/{voucher_id}", response_model=VoucherResponse)
def get_voucher(voucher_id: int, db: Session = Depends(get_db)):
    voucher = db.query(Voucher).filter(
        Voucher.id == voucher_id
    ).first()

    if not voucher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay voucher"
        )

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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay voucher"
        )

    update_data = voucher_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(voucher, key, value)

    db.commit()
    db.refresh(voucher)

    return voucher


@router.delete("/{voucher_id}")
def delete_voucher(voucher_id: int, db: Session = Depends(get_db)):
    voucher = db.query(Voucher).filter(
        Voucher.id == voucher_id
    ).first()

    if not voucher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay voucher"
        )

    db.delete(voucher)
    db.commit()

    return {"message": "Xoa voucher thanh cong"}