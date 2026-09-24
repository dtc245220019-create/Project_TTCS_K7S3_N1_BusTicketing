from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, 
    Boolean, CheckConstraint, UniqueConstraint, Index, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

Base = declarative_base()


# 1. BẢNG NGƯỜI DÙNG (USERS)
class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    phone = Column(String(15), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="CUSTOMER")  # CUSTOMER, ADMIN

    bookings = relationship("Booking", back_populates="user")


# 2. BẢNG TUYẾN ĐƯỜNG (ROUTES)
class Route(Base):
    __tablename__ = 'routes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    departure_city = Column(String(100), nullable=False, index=True)
    arrival_city = Column(String(100), nullable=False, index=True)
    distance_km = Column(Float, nullable=True)

    __table_args__ = (
        CheckConstraint('distance_km IS NULL OR distance_km > 0', name='check_positive_distance'),
        CheckConstraint('departure_city <> arrival_city', name='check_different_cities'),
    )

    trips = relationship("Trip", back_populates="route", cascade="all, delete-orphan")
    bus_stops = relationship("BusStop", back_populates="route", cascade="all, delete-orphan")


# 3. BẢNG TRẠM DỪNG (BUS_STOPS)
class BusStop(Base):
    __tablename__ = 'bus_stops'

    id = Column(Integer, primary_key=True, autoincrement=True)
    route_id = Column(Integer, ForeignKey('routes.id', ondelete="CASCADE"), nullable=False)
    stop_name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    stop_order = Column(Integer, nullable=False)

    __table_args__ = (
        CheckConstraint('stop_order > 0', name='check_positive_stop_order'),
        UniqueConstraint('route_id', 'stop_order', name='uq_route_stop_order'),
    )

    route = relationship("Route", back_populates="bus_stops")


# 4. BẢNG CHUYẾN XE (TRIPS)
class Trip(Base):
    __tablename__ = 'trips'

    id = Column(Integer, primary_key=True, autoincrement=True)
    route_id = Column(Integer, ForeignKey('routes.id', ondelete="RESTRICT"), nullable=False)
    bus_number = Column(String(50), nullable=False)
    total_seats = Column(Integer, default=40, nullable=False)
    available_seats = Column(Integer, nullable=False)
    departure_time = Column(DateTime, nullable=False, index=True)
    arrival_time = Column(DateTime, nullable=False)
    price = Column(Float, nullable=False)
    status = Column(String(20), default="SCHEDULED", nullable=False)  # SCHEDULED, COMPLETED, CANCELLED

    __table_args__ = (
        CheckConstraint('price > 0', name='check_positive_price'),
        CheckConstraint('available_seats >= 0 AND available_seats <= total_seats', name='check_seats_limit'),
        CheckConstraint('arrival_time > departure_time', name='check_arrival_after_departure'),
        Index('idx_trip_search', 'departure_time', 'status'),
    )

    route = relationship("Route", back_populates="trips")
    seats = relationship("Seat", back_populates="trip", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="trip")


# 5. BẢNG GHẾ NGỒI (SEATS) - Cập nhật thêm thuộc tính held_until
class Seat(Base):
    __tablename__ = 'seats'

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(Integer, ForeignKey('trips.id', ondelete="CASCADE"), nullable=False)
    seat_number = Column(String(10), nullable=False)  # Ví dụ: A1, A2, B1
    status = Column(String(20), default="AVAILABLE")  # AVAILABLE, HELD, BOOKED
    held_until = Column(DateTime, nullable=True)  # Mới bổ sung: Lưu mốc thời gian hết hạn giữ ghế

    __table_args__ = (
        UniqueConstraint('trip_id', 'seat_number', name='uq_trip_seat'),
    )

    trip = relationship("Trip", back_populates="seats")


# 6. BẢNG ĐẶT VÉ (BOOKINGS)
class Booking(Base):
    __tablename__ = 'bookings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="RESTRICT"), nullable=False)
    trip_id = Column(Integer, ForeignKey('trips.id', ondelete="RESTRICT"), nullable=False)
    total_price = Column(Float, nullable=False)
    status = Column(String(20), default="PENDING")  # PENDING, CONFIRMED, CANCELLED
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="bookings")
    trip = relationship("Trip", back_populates="bookings")
    payment = relationship("Payment", back_populates="booking", uselist=False)


# 7. BẢNG THANH TOÁN (PAYMENTS)
class Payment(Base):
    __tablename__ = 'payments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey('bookings.id', ondelete="CASCADE"), unique=True, nullable=False)
    payment_method = Column(String(50), nullable=False)  # VNPAY, MOMO, CASH
    transaction_code = Column(String(100), unique=True)
    amount = Column(Float, nullable=False)
    status = Column(String(20), default="PENDING")  # PENDING, SUCCESS, FAILED
    payment_time = Column(DateTime)

    booking = relationship("Booking", back_populates="payment")


# Khởi tạo Engine và tạo Database
engine = create_engine("sqlite:///bus_booking.db", echo=False)
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)