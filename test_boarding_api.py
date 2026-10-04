import tempfile
import unittest
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi.testclient import TestClient
from boarding_api import create_app, connect
from seed_data import seed_database


class BoardingApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "boarding.db"
        self.client = TestClient(create_app(self.path))
        self.client.__enter__()
        with closing(connect(self.path)) as connection:
            seed_database(connection)

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.temp.cleanup()

    def board(self, code="ticket:TICKET-001", **kwargs):
        return self.client.post("/api/v1/tickets/boarding", json={
            "qr_payload": code, "staff_user_id": 2, "trip_id": 1, **kwargs,
        })

    def update(self, sql):
        with closing(connect(self.path)) as connection, connection:
            connection.execute(sql)

    def test_boarding_updates_canonical_and_legacy_status(self):
        response = self.board()
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["valid"])
        self.assertEqual(body["result"], "VALID")
        self.assertEqual(body["canonical_ticket_status"], "USED")
        self.assertEqual(body["boarding_status"], "DaSoat")
        self.assertIsNotNone(body["boarded_at"])
        with closing(connect(self.path)) as connection:
            row = connection.execute("SELECT status, used_at FROM tickets WHERE id=1").fetchone()
            self.assertEqual(row["status"], "USED")
            self.assertIsNotNone(row["used_at"])

    def test_second_boarding_is_rejected_and_status_can_be_read(self):
        self.board()
        response = self.board("SMARTBUS|TICKET-001|route|date|seat")
        self.assertFalse(response.json()["valid"])
        self.assertEqual(response.json()["result"], "ALREADY_USED")
        status = self.client.get("/api/v1/tickets/TICKET-001/boarding?staff_user_id=2")
        self.assertEqual(status.json()["boarding_status"], "DaSoat")
        self.assertEqual(status.json()["canonical_ticket_status"], "USED")

    def test_unpaid_cancelled_wrong_trip_and_unknown(self):
        self.assertEqual(self.board("TICKET-002", trip_id=None).json()["result"], "UNPAID")
        self.assertEqual(self.board("MISSING").json()["reason_code"], "NOT_FOUND")
        self.assertEqual(self.board(trip_id=2).json()["reason_code"], "WRONG_TRIP")
        self.update("UPDATE tickets SET status='CANCELLED' WHERE id=1")
        self.assertEqual(self.board().json()["result"], "CANCELLED")

    def test_permissions_and_expired_ticket(self):
        self.assertEqual(self.board(staff_user_id=1).status_code, 403)
        self.assertEqual(self.board(staff_user_id=999).status_code, 404)
        self.update("UPDATE tickets SET status='EXPIRED' WHERE id=1")
        self.assertEqual(self.board().json()["reason_code"], "EXPIRED")

    def test_driver_assignment_and_inspection_log(self):
        self.update("UPDATE users SET role='DRIVER' WHERE id=2")
        self.update("UPDATE trips SET driver_id=3 WHERE id=1")
        self.assertEqual(self.board().json()["reason_code"], "WRONG_DRIVER")
        self.update("UPDATE trips SET driver_id=2 WHERE id=1")
        self.assertTrue(self.board().json()["valid"])
        with closing(connect(self.path)) as connection:
            count = connection.execute("SELECT COUNT(*) FROM ticket_inspections").fetchone()[0]
            self.assertEqual(count, 2)

    def test_payment_is_required(self):
        self.update("UPDATE payments SET status='FAILED' WHERE id=1")
        self.assertEqual(self.board().json()["result"], "UNPAID")

    def test_concurrent_requests(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: self.board().json()["result"], range(2)))
        self.assertCountEqual(results, ["VALID", "ALREADY_USED"])


if __name__ == "__main__":
    unittest.main(verbosity=2)