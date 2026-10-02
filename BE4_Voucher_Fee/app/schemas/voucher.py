from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal


class VoucherBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    discount_type: Literal["percent", "fixed"]
    discount_value: float = Field(gt=0)
    min_order_value: float = Field(default=0, ge=0)
    max_discount: Optional[float] = Field(default=None, gt=0)
    start_date: datetime
    end_date: datetime
    is_active: bool = True


class VoucherCreate(VoucherBase):
    pass


class VoucherUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[Literal["percent", "fixed"]] = None
    discount_value: Optional[float] = Field(default=None, gt=0)
    min_order_value: Optional[float] = Field(default=None, ge=0)
    max_discount: Optional[float] = Field(default=None, gt=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class VoucherResponse(VoucherBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class VoucherApplyRequest(BaseModel):
    code: str
    order_value: float = Field(gt=0)


class VoucherApplyResponse(BaseModel):
    code: str
    order_value: float
    discount_amount: float
    final_amount: float