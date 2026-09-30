import unittest

from database import DATABASE_PATH, get_connection, initialize_database
from seed_data import seed_database


class DatabaseSeedTests(unittest.TestCase):
    def test_seed_can_run_twice_and_preserves_references(self):
        with get_connection() as connection:
            initialize_database(connection)
            seed_database(connection)
            seed_database(connection)
            for table, expected in {
                "users": 3,
                "trips": 2,
                "seats": 72,
                "bookings": 2,
                "booking_items": 2,
                "payments": 2,
                "tickets": 1,
                "ticket_inspections": 0,
            }.items():
                self.assertEqual(connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0], expected)
            self.assertEqual(connection.execute("PRAGMA foreign_keys").fetchone()[0], 1)
            self.assertEqual(connection.execute("PRAGMA foreign_key_check").fetchall(), [])
            self.assertEqual(
                connection.execute("SELECT status FROM tickets WHERE ticket_code = 'TICKET-001'").fetchone()[0],
                "PAID",
            )
        self.assertTrue(DATABASE_PATH.is_file())


if __name__ == "__main__":
    unittest.main()