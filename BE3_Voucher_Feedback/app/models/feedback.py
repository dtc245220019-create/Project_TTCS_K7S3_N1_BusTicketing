
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from database.database import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    passenger_name = Column(String(100), nullable=False)
    trip_code = Column(String(50), nullable=True)
    rating = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    feedback_type = Column(String(30), default="other", nullable=False)
    status = Column(String(30), default="pending", nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)