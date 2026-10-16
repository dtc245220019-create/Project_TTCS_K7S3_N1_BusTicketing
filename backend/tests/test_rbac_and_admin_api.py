import pytest
from fastapi.testclient import TestClient
from api import app
from database import get_connection, initialize_database
from seed_data import seed_database, seed_rich_demo_data

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    with get_connection() as conn:
        initialize_database(conn)
        seed_database(conn)
        seed_rich_demo_data(conn)

def test_admin_stats_endpoint():
    res = client.get("/api/v1/admin/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_revenue" in data
    assert "total_trips" in data
    assert "total_users" in data
    assert data["total_users"] >= 4

def test_admin_users_and_role_update():
    # 1. Lấy danh sách users
    res = client.get("/api/v1/admin/users")
    assert res.status_code == 200
    users = res.json()
    assert isinstance(users, list)
    assert len(users) >= 4

    # 2. Cập nhật role người dùng ID 10 thành TaiXe
    put_res = client.put("/api/v1/admin/users/10/role", json={"role": "TaiXe"})
    assert put_res.status_code == 200
    assert put_res.json()["role"] == "TaiXe"

    # 3. Cập nhật lại thành HanhKhach
    put_res2 = client.put("/api/v1/admin/users/10/role", json={"role": "HanhKhach"})
    assert put_res2.status_code == 200
    assert put_res2.json()["role"] == "HanhKhach"

    # 4. Thử cập nhật role không hợp lệ
    bad_res = client.put("/api/v1/admin/users/10/role", json={"role": "SuperHacker"})
    assert bad_res.status_code == 400

def test_driver_trips_and_boarding():
    # 1. Lấy danh sách chuyến xe tài xế
    res = client.get("/api/v1/driver/trips")
    assert res.status_code == 200
    trips = res.json()
    assert isinstance(trips, list)
    assert len(trips) > 0

    # Tuyến HCM - Đà Lạt phải có đủ trong danh sách
    hcm_dl = [t for t in trips if "Đà Lạt" in t["destination"]]
    assert len(hcm_dl) >= 8

    # 2. Test check-in lên xe
    board_res = client.post(
        "/api/v1/driver/board-passenger",
        json={"ticket_id": "TKT-HCM-DL-01", "staff_email": "taixe.nguyen@smartbus.vn"}
    )
    assert board_res.status_code == 200
    assert board_res.json()["boarded"] is True

def test_ticket_verification_role_protection():
    # 1. Tài xế được quyền soát vé
    driver_res = client.post(
        "/api/v1/tickets/verify",
        json={"ticket_code": "TKT-HCM-DL-01", "staff_email": "taixe.nguyen@smartbus.vn"}
    )
    assert driver_res.status_code == 200
    assert driver_res.json()["valid"] is True

    # 2. Hành khách (HanhKhach/CUSTOMER) bị chặn HTTP 403 Forbidden
    cust_res = client.post(
        "/api/v1/tickets/verify",
        json={"ticket_code": "TKT-HCM-DL-01", "staff_email": "customer@example.com"}
    )
    assert cust_res.status_code == 403
    assert "không có quyền soát vé" in cust_res.json()["detail"]
