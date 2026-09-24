from datetime import datetime, timedelta
from database import SessionLocal, Route, Trip, BusStop, Seat, engine, Base

def seed_database():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        # 1. Thêm Tuyến đường
        route_hn_tn = db.query(Route).filter_by(name="Hà Nội - Thái Nguyên").first()
        if not route_hn_tn:
            route_hn_tn = Route(
                name="Hà Nội - Thái Nguyên",
                departure_city="Hà Nội",
                arrival_city="Thái Nguyên",
                distance_km=75.0
            )
            db.add(route_hn_tn)
            db.commit()
            db.refresh(route_hn_tn)

        # 2. Thêm Chuyến xe mẫu cho ngày 2026-09-30
        target_date = datetime.strptime("2026-09-30", "%Y-%m-%d").date()
        
        trip = db.query(Trip).filter_by(route_id=route_hn_tn.id).first()
        if not trip:
            trip = Trip(
                route_id=route_hn_tn.id,
                bus_number="29B-12345",
                total_seats=20,
                available_seats=20,
                departure_time=datetime.combine(target_date, datetime.min.time()) + timedelta(hours=8),
                arrival_time=datetime.combine(target_date, datetime.min.time()) + timedelta(hours=10),
                price=120000,
                status="SCHEDULED"
            )
            db.add(trip)
            db.commit()
            db.refresh(trip)

            # 3. Tạo 20 ghế mẫu (A1 -> A10, B1 -> B10)
            seats = []
            for row in ['A', 'B']:
                for num in range(1, 11):
                    seats.append(Seat(trip_id=trip.id, seat_number=f"{row}{num}", status="AVAILABLE"))
            db.add_all(seats)
            db.commit()
            print("-> TẠO DỮ LIỆU MẪU VỚI 20 GHẾ TRỐNG THÀNH CÔNG!")
        else:
            print("Database đã có chuyến xe!")

    except Exception as e:
        db.rollback()
        print(f"Lỗi: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()