import pytest
from fastapi.testclient import TestClient
from api import app
from database import get_connection, initialize_database
from seed_data import seed_database, seed_rich_demo_data

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_sprint3_test_db():
    with get_connection() as conn:
        initialize_database(conn)
        seed_database(conn)
        seed_rich_demo_data(conn)


def test_audit_logs_endpoint():
    res = client.get("/api/v1/admin/audit-logs")
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    assert len(logs) >= 1


def test_discount_approval_flow():
    # 1. Danh sách chờ duyệt
    res = client.get("/api/v1/admin/discounts/pending")
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 1

    # 2. Duyệt ưu đãi HSSV cho user #1
    approve_res = client.put(
        "/api/v1/admin/discounts/1/approve",
        json={"admin_id": 12, "status": "DaDuyet", "discount_type": "HSSV", "note": "Hồ sơ hợp lệ"}
    )
    assert approve_res.status_code == 200
    data = approve_res.json()
    assert data["discount_status"] == "DaDuyet"
    assert data["discount_type"] == "HSSV"


def test_revenue_and_occupancy_report():
    # 1. Báo cáo doanh thu
    res = client.get("/api/v1/admin/revenue")
    assert res.status_code == 200
    rev = res.json()
    assert "gross_revenue" in rev
    assert "total_revenue" in rev

    # 2. Xuất CSV
    csv_res = client.get("/api/v1/admin/revenue/export")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]

    # 3. Tỷ lệ lấp đầy
    occ_res = client.get("/api/v1/admin/occupancy")
    assert occ_res.status_code == 200
    occ = occ_res.json()
    assert "trips" in occ
    assert len(occ["trips"]) >= 1


def test_feedbacks_api():
    # 1. Tạo phản ánh
    create_res = client.post(
        "/api/v1/feedbacks",
        json={
            "user_id": 1,
            "trip_id": 1,
            "rating": 5,
            "category": "Dịch vụ",
            "comment": "Chuyến xe tuyệt vời, rất hài lòng!"
        }
    )
    assert create_res.status_code == 201

    # 2. Lấy danh sách phản ánh
    list_res = client.get("/api/v1/feedbacks")
    assert list_res.status_code == 200
    fbs = list_res.json()
    assert len(fbs) >= 1


def test_refunds_and_vouchers_api():
    # 1. Danh sách vouchers
    v_res = client.get("/api/v1/vouchers")
    assert v_res.status_code == 200
    vouchers = v_res.json()
    assert len(vouchers) >= 1

    # 2. Tạo voucher mới (mã duy nhất để idempotent)
    import uuid
    unique_code = f"TEST_{uuid.uuid4().hex[:6].upper()}"
    new_v = client.post(
        "/api/v1/vouchers",
        json={"code": unique_code, "name": "Mã Test", "discount_percent": 15.0}
    )
    assert new_v.status_code == 201

    # 3. Quản lý hoàn tiền
    rf_res = client.get("/api/v1/admin/refunds")
    assert rf_res.status_code == 200
    rfs = rf_res.json()
    assert len(rfs) >= 1


def test_chatbot_ai_endpoint():
    res = client.post(
        "/api/v1/chatbot/chat",
        json={"message": "Tôi muốn tìm chuyến xe đi Đà Lạt"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Đà Lạt" in data["message"] or "chuyến" in data["message"]
