import unittest
import sqlite3

from database import initialize_database
from seed_data import seed_database


class Backend4DatabaseTests(unittest.TestCase):
    def test_seed_is_repeatable(self):
        with sqlite3.connect(":memory:") as connection:
            connection.row_factory = sqlite3.Row
            initialize_database(connection)
            seed_database(connection)
            seed_database(connection)
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM payments").fetchone()[0], 2)
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM ticket_inspections").fetchone()[0], 0)
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM demo_tickets").fetchone()[0], 2)


if __name__ == "__main__":
    unittest.main()