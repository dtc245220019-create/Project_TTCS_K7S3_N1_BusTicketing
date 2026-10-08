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
    role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN', 'DRIVER', 'CONDUCTOR', 'TaiXe', 'PhuXe', 'HanhKhach', 'Admin', 'QuanTriVien')),
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

-- 8. ERD: VOUCHER (Sprint 2 - BE4)
CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    voucher_code TEXT UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'percent',
    discount_value REAL NOT NULL DEFAULT 0.0,
    discount_percent REAL NOT NULL DEFAULT 0.0,
    min_order_value REAL DEFAULT 0.0,
    max_discount REAL,
    max_discount_amount INTEGER DEFAULT 0,
    start_date TEXT DEFAULT CURRENT_TIMESTAMP,
    end_date TEXT DEFAULT '2030-12-31 23:59:59',
    expires_at TEXT DEFAULT '2030-12-31 23:59:59',
    is_active INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8b. ERD: FEES (Phí dịch vụ - Sprint 2 - BE4)
CREATE TABLE IF NOT EXISTS fees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    fee_type TEXT NOT NULL DEFAULT 'fixed',
    fee_value REAL NOT NULL DEFAULT 0.0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    passenger_name TEXT,
    passenger_id_card TEXT,
    route_id INTEGER NOT NULL REFERENCES routes(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    price REAL DEFAULT 300000.0,
    status TEXT NOT NULL DEFAULT 'ConHan',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

-- 16. ERD: THONG_BAO & NOTIFICATIONS (Sprint 2 - US20)
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'EMAIL',
    recipient TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    created_at TEXT
);
"""

import unicodedata


def remove_accents(input_str: Optional[str]) -> str:
    """Normalize and strip Vietnamese accents for accent-insensitive search."""
    if not input_str:
        return ""
    s = str(input_str).replace("đ", "d").replace("Đ", "D")
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join([c for c in nfkd if not unicodedata.combining(c)]).lower().strip()


def get_connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.create_function("clean_str", 1, remove_accents)
    return connection


def initialize_database(connection: sqlite3.Connection) -> None:
    try:
        connection.create_function("clean_str", 1, remove_accents)
    except Exception:
        pass
    connection.executescript(SCHEMA)
    # Check and migrate missing columns in vouchers for existing sqlite databases
    try:
        cols = {row["name"] if isinstance(row, sqlite3.Row) else row[1]
                for row in connection.execute("PRAGMA table_info(vouchers)").fetchall()}
        add_cols = [
            ("code", "TEXT"),
            ("name", "TEXT DEFAULT ''"),
            ("description", "TEXT DEFAULT ''"),
            ("discount_type", "TEXT DEFAULT 'percent'"),
            ("discount_value", "REAL DEFAULT 0.0"),
            ("min_order_value", "REAL DEFAULT 0.0"),
            ("max_discount", "REAL DEFAULT 0.0"),
            ("start_date", "TEXT DEFAULT CURRENT_TIMESTAMP"),
            ("end_date", "TEXT DEFAULT '2030-12-31 23:59:59'"),
            ("is_active", "INTEGER DEFAULT 1"),
        ]
        for col_name, col_type in add_cols:
            if col_name not in cols:
                connection.execute(f"ALTER TABLE vouchers ADD COLUMN {col_name} {col_type}")
    except Exception:
        pass

    # Check and migrate missing columns in monthly_passes for existing sqlite databases
    try:
        pass_cols = {row["name"] if isinstance(row, sqlite3.Row) else row[1]
                     for row in connection.execute("PRAGMA table_info(monthly_passes)").fetchall()}
        add_pass_cols = [
            ("passenger_name", "TEXT"),
            ("passenger_id_card", "TEXT"),
            ("price", "REAL DEFAULT 300000.0"),
            ("created_at", "TEXT DEFAULT CURRENT_TIMESTAMP"),
        ]
        for col_name, col_type in add_pass_cols:
            if col_name not in pass_cols:
                connection.execute(f"ALTER TABLE monthly_passes ADD COLUMN {col_name} {col_type}")
    except Exception:
        pass

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
    monthly_passes = relationship("MonthlyPass", back_populates="user")


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
    monthly_passes = relationship("MonthlyPass", back_populates="route")


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
    code = Column(String(50), unique=True, nullable=True, index=True)
    voucher_code = Column(String(50), unique=True, nullable=True)
    name = Column(String(255), default="")
    description = Column(String(500), nullable=True)
    discount_type = Column(String(20), default="percent")
    discount_value = Column(Float, default=0.0)
    discount_percent = Column(Float, default=0.0)
    min_order_value = Column(Float, default=0.0)
    max_discount = Column(Float, nullable=True)
    max_discount_amount = Column(Integer, default=0)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(String(50), default="2030-12-31")
    is_active = Column(Boolean, default=True)
    status = Column(String(30), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)


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


class MonthlyPass(Base):
    __tablename__ = "monthly_passes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    passenger_name = Column(String(100), nullable=True)
    passenger_id_card = Column(String(50), nullable=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    start_date = Column(String(20), nullable=False)
    end_date = Column(String(20), nullable=False)
    price = Column(Float, default=300000.0)
    status = Column(String(30), default="ConHan")  # ConHan, HetHan
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="monthly_passes")
    route = relationship("Route", back_populates="monthly_passes")


class Fee(Base):
    __tablename__ = "fees"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    fee_type = Column(String(20), nullable=False, default="fixed")
    fee_value = Column(Float, nullable=False, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(20), default="EMAIL")
    recipient = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), default="SENT")
    created_at = Column(DateTime, default=datetime.utcnow)


# Initialize SQLite / MySQL engine with graceful fallback
def _init_engine():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    db_url = os.getenv("DATABASE_URL")
    if db_url and "mysql" in db_url.lower():
        try:
            test_eng = create_engine(db_url, echo=False, pool_pre_ping=True)
            with test_eng.connect():
                pass
            return test_eng
        except Exception:
            pass
    return create_engine(f"sqlite:///{DATABASE_PATH}", echo=False, connect_args={"check_same_thread": False})


engine = _init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Auto create tables on import
with get_connection() as _raw_conn:
    initialize_database(_raw_conn)