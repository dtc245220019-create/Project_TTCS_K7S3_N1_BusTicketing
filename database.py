from __future__ import annotations

import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "data" / "backend_3.db"


SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_code TEXT NOT NULL UNIQUE,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_at TEXT NOT NULL,
    arrival_at TEXT NOT NULL,
    base_price INTEGER NOT NULL CHECK (base_price >= 0),
    status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'DEPARTED', 'CANCELLED'))
);

CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    seat_number TEXT NOT NULL,
    seat_type TEXT NOT NULL DEFAULT 'STANDARD',
    UNIQUE (trip_id, seat_number)
);

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_code TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    trip_id INTEGER NOT NULL REFERENCES trips(id),
    total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
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

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id),
    transaction_code TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    provider TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')),
    provider_transaction_code TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_code TEXT NOT NULL UNIQUE,
    qr_payload TEXT NOT NULL UNIQUE,
    booking_item_id INTEGER NOT NULL UNIQUE REFERENCES booking_items(id),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'USED', 'CANCELLED', 'EXPIRED')),
    issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TEXT
);

CREATE TABLE IF NOT EXISTS ticket_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    staff_user_id INTEGER NOT NULL REFERENCES users(id),
    result TEXT NOT NULL CHECK (result IN ('VALID', 'ALREADY_USED', 'CANCELLED', 'INVALID', 'UNPAID')),
    inspected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT
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


if __name__ == "__main__":
    with get_connection() as connection:
        initialize_database(connection)
    print(f"Database initialized: {DATABASE_PATH}")