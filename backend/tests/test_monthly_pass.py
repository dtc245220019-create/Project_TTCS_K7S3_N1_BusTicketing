import os
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import database
from api import app
from seed_data import seed_database, seed_rich_demo_data

ROUTE_HN_TN = 2        # Hà Nội - Thái Nguyên, giá gốc 120.000
USER_HSSV = 10         # Nguyễn Văn A, có ưu đãi HSSV
USER_NORMAL = 1        # Nguyen Van A, không ưu đãi


class MonthlyPassTests(unittest.TestCase):
    def setUp(self):
        self.temp = Path(tempfile.mkdtemp())
        self.db_path = self.temp / "test.db"
        self.path_patch = patch.object(database, "DATABASE_PATH", self.db_path)
        self.path_patch.start()
        self.client = TestClient(app)
        self.client.__enter__()
        with database.get_connection() as connection:
            seed_database(connection)
            seed_rich_demo_data(connection)
            connection.execute("DELETE FROM monthly_passes")
            connection.commit()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.path_patch.stop()
        try:
            os.remove(self.db_path)
            os.rmdir(self.temp)
        except PermissionError:
            pass

    def register(self, user_id, months, pass_id=None, route_id=ROUTE_HN_TN):
        return self.client.post("/api/v1/monthly-passes/register", json={
            "user_id": user_id, "route_id": route_id, "months": months, "pass_id": pass_id,
        })

    def test_register_new_pass_with_student_discount(self):
        res = self.register(USER_HSSV, 1)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["action"], "NEW")
        self.assertEqual(data["amount"], 960000)            # 120k x 10 lượt, -20% HSSV
        self.assertEqual(data["pass"]["status"], "ConHan")
        self.assertEqual(data["pass"]["days_left"], 29)

    def test_price_for_long_plans(self):
        self.assertEqual(self.register(USER_HSSV, 3).json()["amount"], 2649600)    # -8% rồi -20%
        other = self.register(USER_NORMAL, 6).json()
        self.assertEqual(other["amount"], 6120000)                                  # -15%, không HSSV

    def test_duplicate_active_pass_is_rejected(self):
        self.assertEqual(self.register(USER_HSSV, 1).status_code, 201)
        self.assertEqual(self.register(USER_HSSV, 1).status_code, 409)

    def test_renew_active_pass_extends_from_old_end_date(self):
        first = self.register(USER_HSSV, 1).json()["pass"]
        res = self.register(USER_HSSV, 3, pass_id=first["id"])
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["action"], "RENEW")
        self.assertEqual(res.json()["pass"]["days_left"], 29 + 90)

    def test_renew_expired_pass_restarts_from_today(self):
        first = self.register(USER_HSSV, 1).json()["pass"]
        old_end = (datetime.now().date() - timedelta(days=20)).isoformat()
        with database.get_connection() as connection:
            connection.execute("UPDATE monthly_passes SET end_date = ? WHERE id = ?", (old_end, first["id"]))
            connection.commit()
        res = self.register(USER_HSSV, 1, pass_id=first["id"]).json()
        self.assertEqual(res["pass"]["status"], "ConHan")
        self.assertEqual(res["pass"]["days_left"], 29)

    def test_cannot_renew_someone_elses_pass(self):
        first = self.register(USER_HSSV, 1).json()["pass"]
        self.assertEqual(self.register(USER_NORMAL, 1, pass_id=first["id"]).status_code, 404)

    def test_invalid_months_rejected(self):
        self.assertEqual(self.register(USER_HSSV, 2).status_code, 400)

    def test_list_passes_only_returns_own(self):
        self.register(USER_HSSV, 1)
        mine = self.client.get("/api/v1/monthly-passes", params={"user_id": USER_HSSV}).json()
        others = self.client.get("/api/v1/monthly-passes", params={"user_id": USER_NORMAL}).json()
        self.assertEqual(len(mine), 1)
        self.assertEqual(others, [])


if __name__ == "__main__":
    unittest.main()
