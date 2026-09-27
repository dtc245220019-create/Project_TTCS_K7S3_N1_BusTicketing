from __future__ import annotations

import sqlite3
from pathlib import Path


DATABASE_PATH = Path(__file__).resolve().parent / "data" / "backend_4.db"

SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_code TEXT NOT NULL,
    transaction_code TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    provider TEXT NOT NULL DEFAULT 'SANDBOX',
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')),
    provider_transaction_code TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS demo_tickets (
    ticket_code TEXT PRIMARY KEY,
    booking_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED'))
);
CREATE TABLE IF NOT EXISTS ticket_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_code TEXT NOT NULL,
    staff_email TEXT NOT NULL,
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