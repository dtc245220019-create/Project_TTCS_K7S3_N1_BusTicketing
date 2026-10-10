
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.database import get_db
from app.models.feedback import Feedback
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackUpdate,
    FeedbackResponse
)

router = APIRouter(
    prefix="/feedbacks",
    tags=["Feedbacks"]
)


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(feedback_data: FeedbackCreate, db: Session = Depends(get_db)):
    feedback = Feedback(**feedback_data.model_dump())

    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return feedback


@router.get("/", response_model=list[FeedbackResponse])
def get_feedbacks(db: Session = Depends(get_db)):
    return db.query(Feedback).order_by(Feedback.id.desc()).all()


@router.get("/{feedback_id}", response_model=FeedbackResponse)
def get_feedback(feedback_id: int, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(
        Feedback.id == feedback_id
    ).first()

    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay phan anh"
        )

    return feedback


@router.patch("/{feedback_id}/status", response_model=FeedbackResponse)
def update_feedback_status(
    feedback_id: int,
    feedback_data: FeedbackUpdate,
    db: Session = Depends(get_db)
):
    feedback = db.query(Feedback).filter(
        Feedback.id == feedback_id
    ).first()

    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay phan anh"
        )

    feedback.status = feedback_data.status

    db.commit()
    db.refresh(feedback)

    return feedback