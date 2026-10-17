from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from app.models.fee import Fee
from app.schemas.fee import (
    FeeCreate,
    FeeUpdate,
    FeeResponse,
    FeeCalculateRequest,
    FeeCalculateResponse
)
router = APIRouter(
    prefix="/fees",
    tags=["Fees"]
)

@router.post("/calculate", response_model=FeeCalculateResponse)
def calculate_fee(
    fee_data: FeeCalculateRequest,
    db: Session = Depends(get_db)
):
    fee = db.query(Fee).filter(
        Fee.id == fee_data.fee_id
    ).first()

    if not fee:
        raise HTTPException(
            status_code=404,
            detail="Fee not found"
        )

    if not fee.is_active:
        raise HTTPException(
            status_code=400,
            detail="Fee is inactive"
        )

    if fee.fee_type == "percent":
        fee_amount = fee_data.order_value * fee.fee_value / 100
    else:
        fee_amount = fee.fee_value

    return {
        "fee_id": fee.id,
        "order_value": fee_data.order_value,
        "fee_amount": fee_amount,
        "final_amount": fee_data.order_value + fee_amount
    }

@router.get("/", response_model=list[FeeResponse])
def get_fees(db: Session = Depends(get_db)):
    return db.query(Fee).all()


@router.get("/{fee_id}", response_model=FeeResponse)
def get_fee(fee_id: int, db: Session = Depends(get_db)):
    fee = db.query(Fee).filter(Fee.id == fee_id).first()

    if not fee:
        raise HTTPException(
            status_code=404,
            detail="Fee not found"
        )

    return fee


@router.post("/", response_model=FeeResponse)
def create_fee(
    fee_data: FeeCreate,
    db: Session = Depends(get_db)
):
    fee = Fee(**fee_data.model_dump())

    db.add(fee)
    db.commit()
    db.refresh(fee)

    return fee


@router.put("/{fee_id}", response_model=FeeResponse)
def update_fee(
    fee_id: int,
    fee_data: FeeUpdate,
    db: Session = Depends(get_db)
):
    fee = db.query(Fee).filter(Fee.id == fee_id).first()

    if not fee:
        raise HTTPException(
            status_code=404,
            detail="Fee not found"
        )

    update_data = fee_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(fee, key, value)

    db.commit()
    db.refresh(fee)

    return fee


@router.delete("/{fee_id}")
def delete_fee(
    fee_id: int,
    db: Session = Depends(get_db)
):
    fee = db.query(Fee).filter(Fee.id == fee_id).first()

    if not fee:
        raise HTTPException(
            status_code=404,
            detail="Fee not found"
        )

    db.delete(fee)
    db.commit()

    return {
        "message": "Fee deleted successfully"
    }