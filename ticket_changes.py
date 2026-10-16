"""US05: cancel a paid ticket or change its seat on the same trip."""

from datetime import datetime, timedelta
import sqlite3


class TicketChangeError(ValueError):
    pass


def _ticket(connection, ticket_code, user_id, now):
    row = connection.execute(
        """SELECT t.id, t.status AS ticket_status, b.id AS booking_id,
                  b.status AS booking_status, b.trip_id, b.total_amount,
                  bi.id AS item_id, bi.seat_id, tr.departure_at, tr.status AS trip_status
           FROM tickets t JOIN booking_items bi ON bi.id = t.booking_item_id
           JOIN bookings b ON b.id = bi.booking_id
           JOIN trips tr ON tr.id = b.trip_id
           WHERE t.ticket_code = ? AND b.user_id = ?""",
        (ticket_code, user_id),
    ).fetchone()
    if row is None:
        raise TicketChangeError("Ticket not found or not owned by user")
    if row["ticket_status"] != "PAID" or row["booking_status"] != "PAID":
        raise TicketChangeError("Only paid, unused tickets can be changed")
    if row["trip_status"] != "SCHEDULED":
        raise TicketChangeError("Trip is not scheduled")
    departure = datetime.fromisoformat(row["departure_at"])
    if now >= departure - timedelta(hours=24):
        raise TicketChangeError("Changes close 24 hours before departure")
    return row


def cancel_ticket(connection: sqlite3.Connection, ticket_code: str, user_id: int, *, now=None) -> None:
    """Cancel a single-ticket booking. Refunds must be handled separately."""
    now = now or datetime.now()
    with connection:
        connection.execute("BEGIN IMMEDIATE")
        row = _ticket(connection, ticket_code, user_id, now)
        count = connection.execute(
            "SELECT COUNT(*) FROM booking_items WHERE booking_id = ?", (row["booking_id"],)
        ).fetchone()[0]
        if count != 1:
            raise TicketChangeError("Multi-ticket bookings are not supported yet")
        connection.execute("UPDATE tickets SET status = 'CANCELLED' WHERE id = ?", (row["id"],))
        connection.execute("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?", (row["booking_id"],))


def change_seat(connection: sqlite3.Connection, ticket_code: str, user_id: int,
                new_seat_number: str, *, now=None) -> None:
    """Change seat on the same trip; price and payment are unchanged."""
    now = now or datetime.now()
    with connection:
        connection.execute("BEGIN IMMEDIATE")
        row = _ticket(connection, ticket_code, user_id, now)
        seat = connection.execute(
            "SELECT id FROM seats WHERE trip_id = ? AND seat_number = ?",
            (row["trip_id"], new_seat_number),
        ).fetchone()
        if seat is None or seat["id"] == row["seat_id"]:
            raise TicketChangeError("New seat does not exist or is unchanged")
        occupied = connection.execute(
            """SELECT 1 FROM booking_items bi
               JOIN bookings b ON b.id = bi.booking_id
               WHERE bi.seat_id = ? AND b.status IN ('PENDING', 'PAID') LIMIT 1""",
            (seat["id"],),
        ).fetchone()
        if occupied:
            raise TicketChangeError("Seat is occupied")
        connection.execute(
            "UPDATE booking_items SET seat_id = ? WHERE id = ?", (seat["id"], row["item_id"])
        )