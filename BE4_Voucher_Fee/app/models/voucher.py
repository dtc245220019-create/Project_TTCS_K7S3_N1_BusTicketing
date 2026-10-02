from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime

from database.database import Base


class Voucher(Base):
    __tablename__ = "vouchers"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    discount_type = Column(String(20), nullable=False)
    discount_value = Column(Float, nullable=False)
    min_order_value = Column(Float, default=0)
    max_discount = Column(Float, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)