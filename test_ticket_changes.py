import sqlite3
import unittest
from datetime import datetime

from database import SCHEMA
from seed_data import seed_database
from ticket_changes import TicketChangeError, cancel_ticket, change_seat


NOW = datetime(2026, 9, 27, 12)


class TicketChangeTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(SCHEMA)
        seed_database(self.db)

    def tearDown(self):
        self.db.close()

    def test_cancel_ticket(self):
        cancel_ticket(self.db, "TICKET-001", 1, now=NOW)
        self.assertEqual(self.db.execute("SELECT status FROM tickets").fetchone()[0], "CANCELLED")
        self.assertEqual(self.db.execute("SELECT status FROM bookings WHERE id=1").fetchone()[0], "CANCELLED")
        with self.assertRaises(TicketChangeError):
            cancel_ticket(self.db, "TICKET-001", 1, now=NOW)

    def test_change_seat(self):
        change_seat(self.db, "TICKET-001", 1, "A02", now=NOW)
        self.assertEqual(self.db.execute("SELECT seat_id FROM booking_items WHERE id=1").fetchone()[0], 2)

    def test_unauthorized_and_used_ticket(self):
        with self.assertRaises(TicketChangeError):
            cancel_ticket(self.db, "TICKET-001", 2, now=NOW)
        self.db.execute("UPDATE tickets SET status='USED' WHERE id=1")
        self.db.commit()
        with self.assertRaises(TicketChangeError):
            change_seat(self.db, "TICKET-001", 1, "A02", now=NOW)

    def test_occupied_and_invalid_seat(self):
        self.db.execute("INSERT INTO bookings (booking_code,user_id,trip_id,total_amount,status) VALUES ('OTHER',1,1,450000,'PENDING')")
        self.db.execute("INSERT INTO booking_items (booking_id,seat_id,passenger_name) VALUES (3,2,'Other')")
        self.db.commit()
        for seat in ("A02", "Z99", "A01"):
            with self.assertRaises(TicketChangeError):
                change_seat(self.db, "TICKET-001", 1, seat, now=NOW)
        self.assertEqual(self.db.execute("SELECT seat_id FROM booking_items WHERE id=1").fetchone()[0], 1)

    def test_cutoff_and_cancelled_trip(self):
        with self.assertRaises(TicketChangeError):
            cancel_ticket(self.db, "TICKET-001", 1, now=datetime(2026, 9, 30, 8))
        self.db.execute("UPDATE trips SET status='CANCELLED' WHERE id=1")
        self.db.commit()
        with self.assertRaises(TicketChangeError):
            change_seat(self.db, "TICKET-001", 1, "A02", now=NOW)

    def test_multi_ticket_booking_not_cancelled_partially(self):
        self.db.execute("INSERT INTO booking_items (booking_id,seat_id,passenger_name) VALUES (1,2,'Other')")
        self.db.commit()
        with self.assertRaises(TicketChangeError):
            cancel_ticket(self.db, "TICKET-001", 1, now=NOW)
        self.assertEqual(self.db.execute("SELECT status FROM bookings WHERE id=1").fetchone()[0], "PAID")


if __name__ == "__main__":
    unittest.main()