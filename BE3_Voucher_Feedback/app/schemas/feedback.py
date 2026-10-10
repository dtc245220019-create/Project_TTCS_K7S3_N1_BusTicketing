
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    passenger_name: str = Field(min_length=1, max_length=100)
    trip_code: Optional[str] = Field(default=None, max_length=50)
    rating: int = Field(ge=1, le=5)
    content: str = Field(min_length=1)
    feedback_type: str = Field(
        default="other",
        pattern="^(complaint|compliment|suggestion|other)$"
    )


class FeedbackUpdate(BaseModel):
    status: str = Field(pattern="^(pending|in_review|resolved)$")


class FeedbackResponse(BaseModel):
    id: int
    passenger_name: str
    trip_code: Optional[str]
    rating: int
    content: str
    feedback_type: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)