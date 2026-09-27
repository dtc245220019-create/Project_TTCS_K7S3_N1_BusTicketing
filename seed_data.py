from __future__ import annotations

import sqlite3

from database import get_connection, initialize_database


def seed_database(connection: sqlite3.Connection) -> None:
    # Seed is repeatable: running it rebuilds only the local development database.
    connection.executescript(
        """
        DELETE FROM ticket_inspections;
        DELETE FROM tickets;
        DELETE FROM payments;
        DELETE FROM booking_items;
        DELETE FROM bookings;
        DELETE FROM seats;
        DELETE FROM trips;
        DELETE FROM users;
        DELETE FROM sqlite_sequence;
        """
    )

    connection.executemany(
        "INSERT INTO users (full_name, email, role) VALUES (?, ?, ?)",
        [
            ("Nguyen Van A", "customer@example.com", "CUSTOMER"),
            ("Tran Thi B", "staff@example.com", "STAFF"),
            ("Admin Demo", "admin@example.com", "ADMIN"),
        ],
    )
    connection.executemany(
        """INSERT INTO trips
        (trip_code, origin, destination, departure_at, arrival_at, base_price, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            ("TRIP-001", "Ha Noi", "Da Nang", "2026-10-01 08:00", "2026-10-01 20:00", 450000, "SCHEDULED"),
            ("TRIP-002", "Da Nang", "Ho Chi Minh", "2026-10-02 09:00", "2026-10-02 21:00", 500000, "SCHEDULED"),
        ],
    )
    trips = connection.execute("SELECT id FROM trips ORDER BY id").fetchall()
    for trip in trips:
        connection.executemany(
            "INSERT INTO seats (trip_id, seat_number, seat_type) VALUES (?, ?, ?)",
            [(trip["id"], f"A{i:02d}", "STANDARD") for i in range(1, 6)],
        )

    connection.execute(
        """INSERT INTO bookings
        (booking_code, user_id, trip_id, total_amount, status)
        VALUES ('BOOK-PAID-001', 1, 1, 450000, 'PAID')"""
    )
    connection.execute(
        """INSERT INTO bookings
        (booking_code, user_id, trip_id, total_amount, status)
        VALUES ('BOOK-PENDING-001', 1, 2, 500000, 'PENDING')"""
    )
    connection.executemany(
        "INSERT INTO booking_items (booking_id, seat_id, passenger_name, passenger_id_number) VALUES (?, ?, ?, ?)",
        [(1, 1, "Nguyen Van A", "001234567890"), (2, 6, "Nguyen Van A", "001234567890")],
    )
    connection.execute(
        """INSERT INTO payments
        (booking_id, transaction_code, amount, provider, status, provider_transaction_code, paid_at)
        VALUES (1, 'TXN-SANDBOX-001', 450000, 'SANDBOX', 'SUCCESS', 'PROVIDER-001', '2026-09-27 10:00:00')"""
    )
    connection.execute(
        """INSERT INTO payments
        (booking_id, transaction_code, amount, provider, status)
        VALUES (2, 'TXN-SANDBOX-002', 500000, 'SANDBOX', 'PENDING')"""
    )
    connection.execute(
        """INSERT INTO tickets (ticket_code, qr_payload, booking_item_id, status)
        VALUES ('TICKET-001', 'ticket:TICKET-001', 1, 'PAID')"""
    )
    connection.commit()


def main() -> None:
    with get_connection() as connection:
        initialize_database(connection)
        seed_database(connection)
        counts = {
            table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in ("users", "trips", "seats", "bookings", "payments", "tickets")
        }
    print("Seed completed")
    for table, count in counts.items():
        print(f"- {table}: {count}")


if __name__ == "__main__":
    main()