from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal


class FeeBase(BaseModel):
    name: str
    description: Optional[str] = None
    fee_type: Literal["percent", "fixed"]
    fee_value: float = Field(gt=0)
    is_active: bool = True


class FeeCreate(FeeBase):
    pass


class FeeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fee_type: Optional[Literal["percent", "fixed"]] = None
    fee_value: Optional[float] = Field(default=None, gt=0)
    is_active: Optional[bool] = None


class FeeResponse(FeeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class FeeCalculateRequest(BaseModel):
    fee_id: int
    order_value: float = Field(gt=0)


class FeeCalculateResponse(BaseModel):
    fee_id: int
    order_value: float
    fee_amount: float
    final_amount: float