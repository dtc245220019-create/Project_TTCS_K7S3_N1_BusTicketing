import sqlite3

from database import get_connection, initialize_database


def seed_database(connection: sqlite3.Connection) -> None:
    connection.executescript("DELETE FROM ticket_inspections; DELETE FROM demo_tickets; DELETE FROM payments; DELETE FROM sqlite_sequence;")
    connection.execute("""INSERT INTO payments
        (booking_code, transaction_code, amount, provider, status, provider_transaction_code, paid_at)
        VALUES ('BOOK-PAID-001', 'TXN-SANDBOX-001', 450000, 'SANDBOX', 'SUCCESS', 'PROVIDER-001', '2026-09-27 10:00:00')""")
    connection.execute("""INSERT INTO payments
        (booking_code, transaction_code, amount, provider, status)
        VALUES ('BOOK-PENDING-001', 'TXN-SANDBOX-002', 500000, 'SANDBOX', 'PENDING')""")
    connection.executemany(
        "INSERT INTO demo_tickets (ticket_code, booking_code) VALUES (?, ?)",
        [("TICKET-001", "BOOK-PAID-001"), ("TICKET-002", "BOOK-PENDING-001")],
    )
    connection.commit()


if __name__ == "__main__":
    with get_connection() as connection:
        initialize_database(connection)
        seed_database(connection)
        print(f"Backend 4 seed completed: {connection.execute('SELECT COUNT(*) FROM payments').fetchone()[0]} payments")