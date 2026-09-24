from datetime import date, datetime
from typing import List

from fastapi import Depends, FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import uvicorn

from database import BusStop, Route, SessionLocal, Trip, engine

app = FastAPI(title="Bus Searching API - Backend 1")


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

class TripResponse(BaseModel):
    trip_id: int
    route_name: str
    departure_city: str
    arrival_city: str
    departure_time: datetime
    arrival_time: datetime
    price: float = Field(..., gt=0)
    available_seats: int = Field(..., ge=0)

    model_config = {"from_attributes": True}


# ==========================================
# API ENDPOINTS (BE1: US01 - Tra cứu chuyến xe)
# ==========================================

@app.get("/")
def home():
    return {"message": "Bus Searching API (Backend 1)"}


@app.get(
    "/api/v1/trips/search",
    response_model=List[TripResponse],
    summary="Tìm kiếm chuyến xe (US01)",
)
def search_trips(
    departure_city: str = Query(..., min_length=2, description="Điểm xuất phát"),
    arrival_city: str = Query(..., min_length=2, description="Điểm đến"),
    departure_date: date = Query(..., description="Ngày khởi hành (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    dep_city = departure_city.strip()
    arr_city = arrival_city.strip()

    if dep_city.lower() == arr_city.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Điểm xuất phát và điểm đến không được giống nhau.",
        )

    today = date.today()
    if departure_date < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày khởi hành không được nằm trong quá khứ.",
        )

    now = datetime.now()
    start_of_day = datetime.combine(departure_date, datetime.min.time())
    end_of_day = datetime.combine(departure_date, datetime.max.time())
    search_start_time = max(start_of_day, now)

    query = (
        db.query(Trip)
        .join(Route)
        .filter(
            Route.departure_city.ilike(f"%{dep_city}%"),
            Route.arrival_city.ilike(f"%{arr_city}%"),
            Trip.departure_time >= search_start_time,
            Trip.departure_time <= end_of_day,
            Trip.available_seats > 0,
            Trip.status == "SCHEDULED",
        )
        .order_by(Trip.departure_time.asc())
    )

    results = query.all()

    return [
        TripResponse(
            trip_id=trip.id,
            route_name=trip.route.name,
            departure_city=trip.route.departure_city,
            arrival_city=trip.route.arrival_city,
            departure_time=trip.departure_time,
            arrival_time=trip.arrival_time,
            price=trip.price,
            available_seats=trip.available_seats,
        )
        for trip in results
    ]


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)