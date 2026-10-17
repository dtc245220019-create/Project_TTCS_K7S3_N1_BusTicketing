"""Unit tests for FAQ & System Guides router (SmartBus)."""

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import database
from api import app
from seed_data import seed_database, seed_rich_demo_data


class FaqApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = Path(tempfile.mkdtemp())
        self.db_path = self.temp / "test_faq.db"
        self.path_patch = patch.object(database, "DATABASE_PATH", self.db_path)
        self.path_patch.start()
        self.client = TestClient(app)
        self.client.__enter__()
        with database.get_connection() as connection:
            database.initialize_database(connection)
            seed_database(connection)
            seed_rich_demo_data(connection)

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.path_patch.stop()
        try:
            os.remove(self.db_path)
            os.rmdir(self.temp)
        except PermissionError:
            pass

    def test_list_all_faqs(self):
        response = self.client.get("/api/v1/faqs")
        self.assertEqual(response.status_code, 200)
        items = response.json()
        self.assertGreaterEqual(len(items), 10)

    def test_get_roles_information(self):
        response = self.client.get("/api/v1/faqs/roles")
        self.assertEqual(response.status_code, 200)
        roles = response.json()
        role_codes = [r["code"] for r in roles]
        self.assertIn("HanhKhach", role_codes)
        self.assertIn("TaiXe", role_codes)
        self.assertIn("PhuXe", role_codes)
        self.assertIn("Admin", role_codes)

    def test_filter_by_role(self):
        res_customer = self.client.get("/api/v1/faqs?role=HanhKhach")
        self.assertEqual(res_customer.status_code, 200)
        customer_items = res_customer.json()
        for item in customer_items:
            self.assertIn(item["role_target"], ["HanhKhach", "ALL"])

        res_driver = self.client.get("/api/v1/faqs?role=TaiXe")
        self.assertEqual(res_driver.status_code, 200)
        driver_items = res_driver.json()
        for item in driver_items:
            self.assertIn(item["role_target"], ["TaiXe", "ALL"])

    def test_get_categories(self):
        response = self.client.get("/api/v1/faqs/categories")
        self.assertEqual(response.status_code, 200)
        categories = response.json()
        self.assertGreaterEqual(len(categories), 5)

    def test_search_faqs(self):
        response = self.client.get("/api/v1/faqs?search=ghế")
        self.assertEqual(response.status_code, 200)
        items = response.json()
        self.assertGreaterEqual(len(items), 1)

    def test_vote_helpful(self):
        # Fetch first faq
        faqs = self.client.get("/api/v1/faqs").json()
        first_id = faqs[0]["id"]
        initial_helpful = faqs[0].get("helpful_count") or 0

        res_vote = self.client.post(f"/api/v1/faqs/{first_id}/helpful")
        self.assertEqual(res_vote.status_code, 200)
        data = res_vote.json()
        self.assertEqual(data["helpful_count"], initial_helpful + 1)

    def test_submit_faq_inquiry(self):
        payload = {
            "full_name": "Nguyen Van B",
            "email": "customer_b@example.com",
            "phone": "0912345678",
            "role_target": "HanhKhach",
            "category": "THANH_TOAN",
            "question": "Tôi có thể thanh toán vé buýt qua ví Apple Pay được không?",
        }
        response = self.client.post("/api/v1/faqs", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("inquiry_id", data)

    def test_get_faq_stats(self):
        response = self.client.get("/api/v1/faqs/stats")
        self.assertEqual(response.status_code, 200)
        stats = response.json()
        self.assertGreater(stats["total_faqs"], 0)
        self.assertEqual(stats["support_hotline"], "1900 6868")


if __name__ == "__main__":
    unittest.main()
