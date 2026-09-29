import tempfile
import unittest
import os
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import database
from api import app
from seed_data import seed_database


class SandboxApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = Path(tempfile.mkdtemp())
        self.db_path = self.temp / "test.db"
        self.path_patch = patch.object(database, "DATABASE_PATH", self.db_path)
        self.path_patch.start()
        self.client = TestClient(app)
        self.client.__enter__()
        with database.get_connection() as connection:
            seed_database(connection)

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.path_patch.stop()
        try:
            os.remove(self.db_path)
            os.rmdir(self.temp)
        except PermissionError:
            pass

    def verify(self, code):
        return self.client.post("/api/v1/tickets/verify", json={
            "ticket_code": code, "staff_email": "staff@example.com"
        })

    def test_payment_success_unlocks_existing_demo_ticket(self):
        response = self.client.post("/api/v1/payments", json={
            "booking_code": "BOOK-PENDING-001", "amount": 500000, "provider": "SANDBOX"
        })
        self.assertEqual(response.status_code, 201)
        payment = response.json()
        self.assertEqual(payment["status"], "PENDING")
        url = f'/api/v1/payments/{payment["transaction_code"]}'
        callback = self.client.post(url + "/callback", json={"status": "SUCCESS"})
        self.assertEqual(callback.status_code, 200)
        self.assertIsNotNone(callback.json()["paid_at"])
        self.assertEqual(self.client.get(url).json()["status"], "SUCCESS")
        self.assertEqual(self.verify("TICKET-002").json()["result"], "VALID")
        self.assertEqual(self.verify("TICKET-002").json()["result"], "ALREADY_USED")

    def test_callback_retry_and_conflict(self):
        url = "/api/v1/payments/TXN-SANDBOX-002/callback"
        self.assertEqual(self.client.post(url, json={"status": "FAILED"}).status_code, 200)
        self.assertEqual(self.client.post(url, json={"status": "FAILED"}).status_code, 200)
        self.assertEqual(self.client.post(url, json={"status": "SUCCESS"}).status_code, 409)
        self.assertEqual(self.verify("TICKET-002").json()["result"], "UNPAID")

    def test_ticket_results_and_audit(self):
        self.assertEqual(self.verify("ticket-001").json()["result"], "VALID")
        self.assertEqual(self.verify("TICKET-001").json()["result"], "ALREADY_USED")
        self.assertEqual(self.verify("MISSING").json()["result"], "INVALID")
        with database.get_connection() as connection:
            connection.execute("UPDATE demo_tickets SET status = 'CANCELLED' WHERE ticket_code = 'TICKET-002'")
        self.assertEqual(self.verify("TICKET-002").json()["result"], "CANCELLED")
        with database.get_connection() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM ticket_inspections").fetchone()[0], 4)

    def test_validation_and_missing_payment(self):
        for body in [
            {"booking_code": " ", "amount": 1},
            {"booking_code": "BOOK", "amount": -1},
            {"booking_code": "BOOK", "amount": 1, "provider": "UNKNOWN"},
        ]:
            self.assertEqual(self.client.post("/api/v1/payments", json=body).status_code, 422)
        self.assertEqual(self.client.get("/api/v1/payments/MISSING").status_code, 404)
        self.assertEqual(self.client.post("/api/v1/payments/MISSING/callback", json={"status": "SUCCESS"}).status_code, 404)
        self.assertEqual(self.verify(" ").status_code, 422)

    def test_frontend_cors(self):
        response = self.client.options("/api/v1/payments", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")


if __name__ == "__main__":
    unittest.main()