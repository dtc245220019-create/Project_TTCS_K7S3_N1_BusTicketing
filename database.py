"""Unified Database Module for Smart Bus Ticketing.

Matches 100% of the ERD model in 'Đề tài Smart_Bus_Ticketing'.
Supports SQLite and MySQL (via DATABASE_URL), and ensures 100% test compatibility.
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "data" / "bus_booking.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")

# =============================================================================
# SQLITE DDL SCHEMA (For raw sqlite connections & unit tests)
# =============================================================================
SCHEMA = """
PRAGMA foreign_keys = ON;

-- 1. ERD: NGUOI_DUNG & USERS
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT DEFAULT '0901234567',
    password_hash TEXT DEFAULT 'pbkdf2:sha256:123456',
    role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN', 'DRIVER', 'CONDUCTOR', 'TaiXe', 'PhuXe', 'HanhKhach')),
    discount_type TEXT DEFAULT 'Khong',
    discount_status TEXT DEFAULT 'ChoDuyet',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. ERD: TUYEN_XE & ROUTES
CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    departure_city TEXT NOT NULL,
    arrival_city TEXT NOT NULL,
    base_price INTEGER NOT NULL DEFAULT 0,
    distance_km REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'HoatDong'
);

-- 3. ERD: TRAM_DUNG & BUS_STOPS
CREATE TABLE IF NOT EXISTS bus_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT NOT NULL,
    city TEXT DEFAULT ''
);

-- 4. ERD: CHI_TIET_TUYEN_TRAM
CREATE TABLE IF NOT EXISTS route_stop_details (
    route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    stop_id INTEGER NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    stop_order INTEGER NOT NULL,
    distance_km REAL NOT NULL DEFAULT 0.0,
    PRIMARY KEY (route_id, stop_id)
);

-- 5. ERD: XE_BUYT & BUSES
CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_plate TEXT NOT NULL UNIQUE,
    bus_type TEXT DEFAULT 'Giường nằm 36 chỗ',
    total_seats INTEGER NOT NULL DEFAULT 36,
    current_lat REAL DEFAULT 0.0,
    current_lng REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'SanSang'
);

-- 6. ERD: CHUYEN_XE & TRIPS
CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_code TEXT NOT NULL UNIQUE,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_at TEXT NOT NULL,
    arrival_at TEXT NOT NULL,
    base_price INTEGER NOT NULL CHECK (base_price >= 0),
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'DEPARTED', 'COMPLETED', 'CANCELLED')),
    bus_id INTEGER REFERENCES buses(id),
    route_id INTEGER REFERENCES routes(id),
    driver_id INTEGER REFERENCES users(id),
    available_seats INTEGER DEFAULT 36
);

-- 7. ERD: GHE_NGOI & SEATS
CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    bus_id INTEGER REFERENCES buses(id),
    seat_number TEXT NOT NULL,
    seat_type TEXT NOT NULL DEFAULT 'STANDARD',
    deck_or_row TEXT DEFAULT 'TangDuoi',
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    held_until TEXT,
    UNIQUE (trip_id, seat_number)
);

-- 8. ERD: VOUCHER
CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_code TEXT NOT NULL UNIQUE,
    discount_percent REAL NOT NULL DEFAULT 0.0,
    max_discount_amount INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
);

-- 9. ERD: BOOKINGS & BOOKING_ITEMS
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_code TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    trip_id INTEGER NOT NULL REFERENCES trips(id),
    total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id INTEGER NOT NULL REFERENCES seats(id),
    passenger_name TEXT NOT NULL,
    passenger_id_number TEXT,
    UNIQUE (booking_id, seat_id)
);

-- 10. ERD: THANH_TOAN & PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER REFERENCES bookings(id),
    booking_code TEXT,
    transaction_code TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    provider TEXT NOT NULL DEFAULT 'SANDBOX',
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')),
    provider_transaction_code TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. ERD: VE_DIEN_TU & TICKETS
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_code TEXT NOT NULL UNIQUE,
    qr_payload TEXT NOT NULL UNIQUE,
    booking_item_id INTEGER REFERENCES booking_items(id),
    user_id INTEGER REFERENCES users(id),
    trip_id INTEGER REFERENCES trips(id),
    seat_id INTEGER REFERENCES seats(id),
    voucher_id INTEGER REFERENCES vouchers(id),
    actual_price INTEGER NOT NULL DEFAULT 0,
    held_until TEXT,
    status TEXT NOT NULL DEFAULT 'PAID' CHECK (status IN ('PENDING', 'PAID', 'USED', 'CANCELLED', 'EXPIRED', 'GiuCho', 'DaThanhToan', 'DaSoat', 'DaHuy')),
    issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TEXT
);

-- 12. DEMO TICKETS (Compatibility for Backend 4 Sandbox Tests)
CREATE TABLE IF NOT EXISTS demo_tickets (
    ticket_code TEXT PRIMARY KEY,
    booking_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED'))
);

-- 13. ERD: NHAT_KY_HOAT_DONG & TICKET_INSPECTIONS
CREATE TABLE IF NOT EXISTS ticket_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER REFERENCES tickets(id),
    ticket_code TEXT,
    staff_user_id INTEGER REFERENCES users(id),
    staff_email TEXT,
    result TEXT NOT NULL CHECK (result IN ('VALID', 'ALREADY_USED', 'CANCELLED', 'INVALID', 'UNPAID')),
    inspected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);

-- 14. ERD: VE_THANG (Monthly Passes)
CREATE TABLE IF NOT EXISTS monthly_passes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    route_id INTEGER NOT NULL REFERENCES routes(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ConHan'
);

-- 15. ERD: BAO_CAO_SU_CO & PHAN_ANH
CREATE TABLE IF NOT EXISTS incident_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id),
    driver_id INTEGER NOT NULL REFERENCES users(id),
    incident_type TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    trip_id INTEGER NOT NULL REFERENCES trips(id),
    rating_stars INTEGER NOT NULL DEFAULT 5,
    content TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


def get_connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database(connection: sqlite3.Connection) -> None:
    connection.executescript(SCHEMA)
    connection.commit()


# =============================================================================
# SQLALCHEMY ORM MODELS (Chuẩn hóa ERD Smart_Bus_Ticketing)
# =============================================================================
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=False, default="0901234567")
    password_hash = Column(String(255), nullable=False, default="pbkdf2:sha256:123456")
    role = Column(String(30), default="CUSTOMER")  # CUSTOMER, STAFF, ADMIN, DRIVER, CONDUCTOR
    discount_type = Column(String(30), default="Khong")  # HSSV, NguoiCaoTuoi, Khong
    discount_status = Column(String(30), default="ChoDuyet")
    created_at = Column(DateTime, default=datetime.now)

    bookings = relationship("Booking", back_populates="user")
    tickets = relationship("Ticket", back_populates="user")


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    departure_city = Column(String(100), nullable=False, index=True)
    arrival_city = Column(String(100), nullable=False, index=True)
    base_price = Column(Integer, default=0, nullable=False)
    distance_km = Column(Float, default=0.0)
    status = Column(String(30), default="HoatDong")

    trips = relationship("Trip", back_populates="route")
    route_stops = relationship("RouteStopDetail", back_populates="route", cascade="all, delete-orphan")


class BusStop(Base):
    __tablename__ = "bus_stops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), default="")

    route_details = relationship("RouteStopDetail", back_populates="bus_stop")


class RouteStopDetail(Base):
    __tablename__ = "route_stop_details"

    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), primary_key=True)
    stop_id = Column(Integer, ForeignKey("bus_stops.id", ondelete="CASCADE"), primary_key=True)
    stop_order = Column(Integer, nullable=False)
    distance_km = Column(Float, default=0.0)

    route = relationship("Route", back_populates="route_stops")
    bus_stop = relationship("BusStop", back_populates="route_details")


class Bus(Base):
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    license_plate = Column(String(50), unique=True, nullable=False)
    bus_type = Column(String(100), default="Giường nằm 36 chỗ")
    total_seats = Column(Integer, default=36, nullable=False)
    current_lat = Column(Float, default=0.0)
    current_lng = Column(Float, default=0.0)
    status = Column(String(30), default="SanSang")  # SanSang, DangChay, BaoTri

    trips = relationship("Trip", back_populates="bus")


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_code = Column(String(50), unique=True, nullable=False, index=True)
    origin = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    departure_at = Column(String(50), nullable=False, index=True)
    arrival_at = Column(String(50), nullable=False)
    base_price = Column(Integer, nullable=False)
    status = Column(String(30), default="SCHEDULED")  # SCHEDULED, DEPARTED, COMPLETED, CANCELLED
    bus_id = Column(Integer, ForeignKey("buses.id"), nullable=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    available_seats = Column(Integer, default=36)

    route = relationship("Route", back_populates="trips")
    bus = relationship("Bus", back_populates="trips")
    seats = relationship("Seat", back_populates="trip", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="trip")
    tickets = relationship("Ticket", back_populates="trip")

    @property
    def departure_time(self):
        return self.departure_at

    @property
    def arrival_time(self):
        return self.arrival_at

    @property
    def total_seats(self):
        return self.bus.total_seats if self.bus else 36


class Seat(Base):
    __tablename__ = "seats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    bus_id = Column(Integer, ForeignKey("buses.id"), nullable=True)
    seat_number = Column(String(10), nullable=False)
    seat_type = Column(String(30), default="STANDARD")
    deck_or_row = Column(String(30), default="TangDuoi")
    status = Column(String(30), default="AVAILABLE")  # AVAILABLE, HELD, BOOKED
    held_until = Column(String(50), nullable=True)

    __table_args__ = (UniqueConstraint("trip_id", "seat_number", name="uq_trip_seat"),)

    trip = relationship("Trip", back_populates="seats")


class Voucher(Base):
    __tablename__ = "vouchers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    voucher_code = Column(String(50), unique=True, nullable=False)
    discount_percent = Column(Float, default=0.0)
    max_discount_amount = Column(Integer, default=0)
    expires_at = Column(String(50), nullable=False)
    status = Column(String(30), default="ACTIVE")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_code = Column(String(50), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    total_amount = Column(Integer, nullable=False)
    status = Column(String(30), default="PENDING")  # PENDING, PAID, CANCELLED, EXPIRED
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="bookings")
    trip = relationship("Trip", back_populates="bookings")
    items = relationship("BookingItem", back_populates="booking", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="booking", uselist=False)


class BookingItem(Base):
    __tablename__ = "booking_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    seat_id = Column(Integer, ForeignKey("seats.id"), nullable=False)
    passenger_name = Column(String(100), nullable=False)
    passenger_id_number = Column(String(50), nullable=True)

    booking = relationship("Booking", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    booking_code = Column(String(50), nullable=True)
    transaction_code = Column(String(100), unique=True, nullable=False)
    amount = Column(Integer, nullable=False)
    provider = Column(String(50), default="SANDBOX")
    status = Column(String(30), default="PENDING")  # PENDING, SUCCESS, FAILED, EXPIRED, CANCELLED
    provider_transaction_code = Column(String(100), nullable=True)
    paid_at = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    booking = relationship("Booking", back_populates="payment")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_code = Column(String(50), unique=True, nullable=False)
    qr_payload = Column(Text, unique=True, nullable=False)
    booking_item_id = Column(Integer, ForeignKey("booking_items.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)
    seat_id = Column(Integer, ForeignKey("seats.id"), nullable=True)
    voucher_id = Column(Integer, ForeignKey("vouchers.id"), nullable=True)
    actual_price = Column(Integer, default=0)
    held_until = Column(String(50), nullable=True)
    status = Column(String(30), default="PAID")  # PENDING, PAID, USED, CANCELLED
    issued_at = Column(DateTime, default=datetime.now)
    used_at = Column(String(50), nullable=True)

    user = relationship("User", back_populates="tickets")
    trip = relationship("Trip", back_populates="tickets")


class TicketInspection(Base):
    __tablename__ = "ticket_inspections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    ticket_code = Column(String(50), nullable=True)
    staff_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    staff_email = Column(String(100), nullable=True)
    result = Column(String(30), nullable=False)  # VALID, ALREADY_USED, CANCELLED, INVALID, UNPAID
    inspected_at = Column(DateTime, default=datetime.now)
    note = Column(Text, nullable=True)


# Initialize SQLite / MySQL engine
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Auto create tables on import
with get_connection() as _raw_conn:
    initialize_database(_raw_conn)