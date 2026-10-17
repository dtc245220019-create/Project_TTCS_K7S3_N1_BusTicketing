import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from api import app
from database import get_connection

client = TestClient(app)


def test_admin_create_and_list_routes():
    route_name = f"Test Route Sài Gòn - Phan Thiết {datetime.now().strftime('%H%M%S')}"
    payload = {
        "name": route_name,
        "departure_city": "Hồ Chí Minh",
        "arrival_city": "Phan Thiết",
        "base_price": 220000,
        "distance_km": 200,
        "status": "ACTIVE",
    }
    res = client.post("/api/v1/admin/routes", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["success"] is True
    assert data["route"]["name"] == route_name

    list_res = client.get("/api/v1/admin/routes")
    assert list_res.status_code == 200
    routes = list_res.json()
    assert any(r["id"] == data["route"]["id"] for r in routes)


def test_admin_create_staff_and_duplicate_handling():
    unique_suffix = datetime.now().strftime("%Y%m%d%H%M%S%f")
    driver_email = f"driver_{unique_suffix}@smartbus.vn"

    payload = {
        "full_name": "Tài Xế Nghiệm Thu Sprint 3",
        "email": driver_email,
        "phone": "0987654321",
        "role": "TaiXe",
        "password": "secretpassword",
    }
    res = client.post("/api/v1/admin/staff", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["success"] is True
    assert data["staff"]["email"] == driver_email
    assert data["staff"]["role"] == "TaiXe"

    # Test duplicate email rejection
    dup_res = client.post("/api/v1/admin/staff", json=payload)
    assert dup_res.status_code == 400
    assert "đã được sử dụng" in dup_res.text

    # Test listing staff
    staff_list_res = client.get("/api/v1/admin/staff")
    assert staff_list_res.status_code == 200
    staff_list = staff_list_res.json()
    assert any(s["email"] == driver_email for s in staff_list)


def test_admin_create_trip_and_assign_staff():
    # 1. Get or create a route
    routes_res = client.get("/api/v1/admin/routes")
    routes = routes_res.json()
    route_id = routes[0]["id"] if routes else 1

    dep_time = (datetime.now() + timedelta(days=2, hours=3)).strftime("%Y-%m-%d %H:%M")
    arr_time = (datetime.now() + timedelta(days=2, hours=9)).strftime("%Y-%m-%d %H:%M")

    # 2. Create trip
    trip_payload = {
        "route_id": route_id,
        "departure_at": dep_time,
        "arrival_at": arr_time,
        "bus_id": 1,
        "base_price": 250000,
    }
    trip_res = client.post("/api/v1/admin/trips", json=trip_payload)
    assert trip_res.status_code == 201, trip_res.text
    trip_data = trip_res.json()
    trip_id = trip_data["trip"]["id"]
    assert trip_id > 0

    # Verify seats are generated for this trip
    with get_connection() as conn:
        seat_count = conn.execute("SELECT COUNT(*) FROM seats WHERE trip_id = ?", (trip_id,)).fetchone()[0]
        assert seat_count == 36

    # 3. Assign driver & staff
    assign_payload = {
        "driver_id": 11,
        "staff_id": 2,
    }
    assign_res = client.put(f"/api/v1/admin/trips/{trip_id}/assign", json=assign_payload)
    assert assign_res.status_code == 200, assign_res.text
    assign_data = assign_res.json()
    assert assign_data["success"] is True
    assert assign_data["trip"]["driver_id"] == 11
    assert assign_data["trip"]["staff_id"] == 2


def test_reject_past_departure_hold_and_booking():
    # Insert a past trip directly to test booking rejection
    past_dep = (datetime.now() - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M")
    with get_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO trips (trip_code, origin, destination, departure_at, arrival_at, base_price, status, bus_id, route_id, available_seats)
               VALUES (?, 'Hồ Chí Minh', 'Đà Lạt', ?, '2026-10-10 18:00', 300000, 'SCHEDULED', 1, 1, 28)""",
            (f"PAST-TRIP-{datetime.now().strftime('%H%M%S')}", past_dep),
        )
        trip_id = cursor.lastrowid
        seat_cursor = conn.execute("INSERT INTO seats (trip_id, seat_number, deck_or_row, status) VALUES (?, 'A01', 'TangDuoi', 'AVAILABLE')", (trip_id,))
        seat_id = seat_cursor.lastrowid
        conn.commit()

    # Try to hold seats on past trip
    hold_res = client.post(
        f"/api/v1/trips/{trip_id}/hold-seats",
        json={"seat_ids": [seat_id], "user_id": 1},
    )
    assert hold_res.status_code == 400
    assert "đã khởi hành" in hold_res.text

    # Try to book order on past trip
    order_res = client.post(
        "/api/v1/payments/create-order",
        json={
            "trip_id": trip_id,
            "seat_numbers": ["A01"],
            "passenger_name": "Test Passenger",
            "passenger_phone": "0988776655",
            "total_amount": 300000,
            "user_id": 1,
        },
    )
    assert order_res.status_code == 400
    assert "đã khởi hành" in order_res.text


def test_reject_voucher_with_past_expiry():
    past_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
    voucher_payload = {
        "code": f"PASTVOUCHER{datetime.now().strftime('%H%M%S')}",
        "title": "Mã quá hạn test",
        "discount_type": "percent",
        "discount_value": 15,
        "expiry_date": past_date,
    }
    res = client.post("/api/v1/vouchers", json=voucher_payload)
    assert res.status_code == 400
    assert "quá khứ" in res.text


def test_occupancy_rates_clamped():
    res = client.get("/api/v1/admin/occupancy")
    assert res.status_code == 200
    data = res.json()
    assert "trips" in data
    for t in data["trips"]:
        assert 0.0 <= t["occupancy_rate"] <= 100.0


def test_refund_approval_cancels_ticket():
    unique_code = f"TKREF{datetime.now().strftime('%H%M%S')}"
    # Insert ticket and refund
    with get_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO tickets (ticket_code, qr_payload, trip_id, seat_id, user_id, actual_price, status)
               VALUES (?, ?, 1, 1, 1, 200000, 'PAID')""",
            (unique_code, f"QR_{unique_code}"),
        )
        ticket_id = cursor.lastrowid
        rf_cursor = conn.execute(
            """INSERT INTO refunds (ticket_code, user_id, reason, requested_amount, status, created_at)
               VALUES (?, 1, 'Lý do đổi lịch', 200000, 'PENDING', '2026-10-10 11:00:00')""",
            (unique_code,),
        )
        refund_id = rf_cursor.lastrowid
        conn.commit()

    # Approve refund
    app_res = client.post(f"/api/v1/admin/refunds/{refund_id}/approve")
    assert app_res.status_code == 200
    app_data = app_res.json()
    assert app_data["status"] in ("APPROVED", "REFUNDED")

    # Verify ticket is cancelled
    with get_connection() as conn:
        t_row = conn.execute("SELECT status FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        assert t_row["status"] == "CANCELLED"
        rf_row = conn.execute("SELECT status FROM refunds WHERE id = ?", (refund_id,)).fetchone()
        assert rf_row["status"] in ("APPROVED", "REFUNDED")
