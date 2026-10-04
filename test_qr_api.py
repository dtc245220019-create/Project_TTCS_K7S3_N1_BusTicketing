import tempfile
import unittest
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
from qr_api import create_app, connect
from seed_data import seed_database


class QRInspectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "test.db"
        self.client = TestClient(create_app(self.path))
        self.client.__enter__()
        with connect(self.path) as connection:
            seed_database(connection)
        connection.close()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.temp.cleanup()

    def scan(self, code="ticket:TICKET-001", **kwargs):
        return self.client.post("/api/v1/tickets/verify", json={
            "qr_payload": code, "staff_user_id": 2, **kwargs,
        })

    def update(self, sql):
        with connect(self.path) as connection:
            connection.execute(sql)
        connection.close()

    def test_valid_qr_details_and_repeat(self):
        response = self.scan().json()
        self.assertTrue(response["valid"])
        self.assertEqual(response["details"]["seat"], "A01")
        self.assertEqual(self.scan("SMARTBUS|TICKET-001|route|date|seat").json()["result"], "ALREADY_USED")

    def test_unpaid_unknown_and_cancelled(self):
        self.assertEqual(self.scan("TICKET-002").json()["result"], "UNPAID")
        self.assertEqual(self.scan("MISSING").json()["result"], "INVALID")
        self.update("UPDATE tickets SET status='DaHuy' WHERE id=1")
        self.assertEqual(self.scan().json()["result"], "CANCELLED")

    def test_payment_required(self):
        self.update("UPDATE payments SET status='FAILED' WHERE id=1")
        self.assertEqual(self.scan().json()["result"], "UNPAID")

    def test_wrong_trip_does_not_consume_ticket(self):
        self.assertEqual(self.scan(trip_id=2).json()["reason_code"], "WRONG_TRIP")
        self.assertEqual(self.scan(trip_id=1).json()["result"], "VALID")

    def test_staff_permissions_and_validation(self):
        self.assertEqual(self.scan(staff_user_id=1).status_code, 403)
        self.assertEqual(self.scan(staff_user_id=999).status_code, 404)
        self.assertEqual(self.scan("ticket: ").status_code, 422)
        self.assertEqual(self.scan(staff_email="admin@example.com").status_code, 422)
        self.assertEqual(self.scan(ticket_code="OTHER").status_code, 422)

    def test_expired_and_cancelled_trip(self):
        self.update("UPDATE tickets SET status='EXPIRED' WHERE id=1")
        self.assertEqual(self.scan().json()["reason_code"], "EXPIRED")
        self.update("UPDATE tickets SET status='PAID' WHERE id=1")
        self.update("UPDATE trips SET status='CANCELLED' WHERE id=1")
        self.assertEqual(self.scan().json()["reason_code"], "TRIP_UNAVAILABLE")

    def test_driver_assignment_and_logs(self):
        self.update("UPDATE users SET role='DRIVER' WHERE id=2")
        self.update("UPDATE trips SET driver_id=3 WHERE id=1")
        self.assertEqual(self.scan().json()["reason_code"], "WRONG_DRIVER")
        self.update("UPDATE trips SET driver_id=2 WHERE id=1")
        self.assertEqual(self.scan().json()["result"], "VALID")
        logs = self.client.get("/api/v1/inspections/recent?staff_user_id=2")
        self.assertEqual(logs.status_code, 200)
        self.assertEqual(len(logs.json()), 2)
        self.assertEqual(self.client.get("/api/v1/inspections/recent?staff_user_id=1").status_code, 403)

    def test_demo_payment_and_concurrent_scans(self):
        self.update("UPDATE payments SET status='SUCCESS' WHERE id=2")
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: self.scan("TICKET-002").json()["result"], range(2)))
        self.assertCountEqual(results, ["VALID", "ALREADY_USED"])


if __name__ == "__main__":
    unittest.main(verbosity=2)