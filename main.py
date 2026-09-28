from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uvicorn

from database import Seat, SessionLocal, Trip, engine


# ==========================================
# BACKGROUND JOB (CRONJOB TỰ ĐỘNG GIẢI PHÓNG GHẾ HẾT HẠN)
# ==========================================

def release_expired_seats_job():
    """Background Job quét và giải phóng tất cả ghế HELD đã hết hạn trong DB."""
    db = SessionLocal()
    try:
        now = datetime.now()
        expired_seats = (
            db.query(Seat)
            .filter(Seat.status == "HELD", Seat.held_until < now)
            .all()
        )

        if expired_seats:
            affected_trip_ids = {seat.trip_id for seat in expired_seats}

            for seat in expired_seats:
                seat.status = "AVAILABLE"
                seat.held_until = None

            db.commit()

            for trip_id in affected_trip_ids:
                trip = db.query(Trip).filter(Trip.id == trip_id).first()
                if trip:
                    avail_count = (
                        db.query(Seat)
                        .filter(Seat.trip_id == trip_id, Seat.status == "AVAILABLE")
                        .count()
                    )
                    trip.available_seats = avail_count
            
            db.commit()
            print(f"[{datetime.now().strftime('%H:%M:%S')}] -> [CRONJOB] Đã tự động nhả {len(expired_seats)} ghế hết hạn giữ!")
    except Exception as e:
        db.rollback()
        print(f"Lỗi Cronjob giải phóng ghế: {e}")
    finally:
        db.close()


scheduler = BackgroundScheduler()
scheduler.add_job(release_expired_seats_job, 'interval', seconds=10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    print("-> Background Job Cronjob nhả ghế đã khởi chạy thành công!")
    yield
    scheduler.shutdown()


app = FastAPI(title="Bus Seats & Lock API - Backend 2", lifespan=lifespan)


# Dependency lấy DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# SCHEMAS (PYDANTIC MODELS)
# ==========================================

class SeatResponse(BaseModel):
    id: int
    seat_number: str
    status: str  # "AVAILABLE", "HELD", "BOOKED"
    held_until: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TripSeatMapResponse(BaseModel):
    trip_id: int
    total_seats: int
    available_seats: int
    seats: List[SeatResponse]


class HoldSeatRequest(BaseModel):
    seat_ids: List[int]


# ==========================================
# API ENDPOINTS (BE2: US02 & US03)
# ==========================================

@app.get("/")
def home():
    return {"message": "Bus Seats & Lock API (Backend 2)"}


# US02: API Lấy sơ đồ ghế
@app.get(
    "/api/v1/trips/{trip_id}/seats",
    response_model=TripSeatMapResponse,
    summary="Lấy sơ đồ ghế và trạng thái (US02)",
)
def get_trip_seat_map(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy chuyến xe có ID = {trip_id}",
        )

    seats = (
        db.query(Seat)
        .filter(Seat.trip_id == trip_id)
        .order_by(Seat.seat_number.asc())
        .all()
    )

    return TripSeatMapResponse(
        trip_id=trip.id,
        total_seats=trip.total_seats,
        available_seats=trip.available_seats,
        seats=[
            SeatResponse(
                id=seat.id,
                seat_number=seat.seat_number,
                status=seat.status,
                held_until=seat.held_until,
            )
            for seat in seats
        ],
    )


# US03: API Tạm giữ ghế trong 10 phút (Lock Seat)
@app.post(
    "/api/v1/trips/{trip_id}/hold-seats",
    summary="Tạm giữ vị trí ghế trong 10 phút (US03)",
)
def hold_seats(trip_id: int, payload: HoldSeatRequest, db: Session = Depends(get_db)):
    seats = (
        db.query(Seat)
        .filter(Seat.trip_id == trip_id, Seat.id.in_(payload.seat_ids))
        .all()
    )

    if len(seats) != len(payload.seat_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Một số vị trí ghế không hợp lệ hoặc không thuộc chuyến xe này.",
        )

    unavailable_seats = [s.seat_number for s in seats if s.status != "AVAILABLE"]
    if unavailable_seats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Các ghế sau vừa có người chọn: {', '.join(unavailable_seats)}. Vui lòng chọn ghế khác.",
        )

    # Đặt thời gian giữ ghế 10 phút (khi test có thể sửa thành seconds=15)
    hold_time = datetime.now() + timedelta(minutes=10)
    for seat in seats:
        seat.status = "HELD"
        seat.held_until = hold_time

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip:
        trip.available_seats -= len(seats)

    db.commit()

    return {
        "message": "Tạm giữ ghế thành công!",
        "held_until": hold_time,
        "seat_ids": payload.seat_ids
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)