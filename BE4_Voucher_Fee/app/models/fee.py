from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime

from database.database import Base


class Fee(Base):
    __tablename__ = "fees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    fee_type = Column(String(20), nullable=False)
    fee_value = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)