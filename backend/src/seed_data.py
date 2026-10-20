"""Seed data for Smart Bus Ticketing System.

Provides standard test fixture data for unit tests and rich demo data
for live system presentation (Routes, Bus Stops with GPS, Buses, Trips, Users).
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta

from database import DATABASE_PATH, get_connection, initialize_database


def seed_database(connection: sqlite3.Connection) -> None:
    """Repeatable test fixture seed matching unit test expectations."""
    connection.executescript(
        """
        PRAGMA foreign_keys = OFF;
        DELETE FROM refunds;
        DELETE FROM audit_logs;
        DELETE FROM feedbacks;
        DELETE FROM notifications;
        DELETE FROM ticket_inspections;
        DELETE FROM demo_tickets;
        DELETE FROM tickets;
        DELETE FROM payments;
        DELETE FROM booking_items;
        DELETE FROM bookings;
        DELETE FROM seats;
        DELETE FROM trips;
        DELETE FROM monthly_passes;
        DELETE FROM users;
        DELETE FROM sqlite_sequence;
        PRAGMA foreign_keys = ON;
        """
    )

    connection.executemany(
        "INSERT INTO users (id, full_name, email, role, phone) VALUES (?, ?, ?, ?, ?)",
        [
            (1, "Nguyen Van A", "customer@example.com", "CUSTOMER", "0901234567"),
            (2, "Tran Thi B", "staff@example.com", "STAFF", "0907654321"),
            (3, "Admin Demo", "admin@example.com", "ADMIN", "0909998888"),
        ],
    )
    connection.executemany(
        """INSERT INTO trips
        (id, trip_code, origin, destination, departure_at, arrival_at, base_price, status, available_seats)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (1, "TRIP-001", "Ha Noi", "Da Nang", "2026-10-01 08:00", "2026-10-01 20:00", 450000, "SCHEDULED", 35),
            (2, "TRIP-002", "Da Nang", "Ho Chi Minh", "2026-10-02 09:00", "2026-10-02 21:00", 500000, "SCHEDULED", 35),
        ],
    )
    trips = connection.execute("SELECT id FROM trips ORDER BY id").fetchall()
    for trip in trips:
        for i in range(1, 19):
            connection.execute(
                "INSERT INTO seats (trip_id, seat_number, deck_or_row, seat_type, status) VALUES (?, ?, 'TangDuoi', 'STANDARD', 'AVAILABLE')",
                (trip["id"], f"A{i:02d}"),
            )
        for i in range(1, 19):
            connection.execute(
                "INSERT INTO seats (trip_id, seat_number, deck_or_row, seat_type, status) VALUES (?, ?, 'TangTren', 'STANDARD', 'AVAILABLE')",
                (trip["id"], f"B{i:02d}"),
            )

    connection.execute(
        """INSERT INTO bookings
        (id, booking_code, user_id, trip_id, total_amount, status)
        VALUES (1, 'BOOK-PAID-001', 1, 1, 450000, 'PAID')"""
    )
    connection.execute(
        """INSERT INTO bookings
        (id, booking_code, user_id, trip_id, total_amount, status)
        VALUES (2, 'BOOK-PENDING-001', 1, 2, 500000, 'PENDING')"""
    )
    connection.executemany(
        "INSERT INTO booking_items (id, booking_id, seat_id, passenger_name, passenger_id_number) VALUES (?, ?, ?, ?, ?)",
        [(1, 1, 1, "Nguyen Van A", "001234567890"), (2, 2, 37, "Nguyen Van A", "001234567890")],
    )
    connection.execute(
        """INSERT INTO payments
        (id, booking_id, booking_code, transaction_code, amount, provider, status, provider_transaction_code, paid_at)
        VALUES (1, 1, 'BOOK-PAID-001', 'TXN-SANDBOX-001', 450000, 'SANDBOX', 'SUCCESS', 'PROVIDER-001', '2026-09-27 10:00:00')"""
    )
    connection.execute(
        """INSERT INTO payments
        (id, booking_id, booking_code, transaction_code, amount, provider, status)
        VALUES (2, 2, 'BOOK-PENDING-001', 'TXN-SANDBOX-002', 500000, 'SANDBOX', 'PENDING')"""
    )
    connection.execute(
        """INSERT INTO tickets (id, ticket_code, qr_payload, booking_item_id, user_id, trip_id, seat_id, status, actual_price)
        VALUES (1, 'TICKET-001', 'ticket:TICKET-001', 1, 1, 1, 1, 'PAID', 450000)"""
    )
    connection.executemany(
        "INSERT INTO demo_tickets (ticket_code, booking_code, status) VALUES (?, ?, 'ACTIVE')",
        [("TICKET-001", "BOOK-PAID-001"), ("TICKET-002", "BOOK-PENDING-001")],
    )
    connection.commit()


def seed_rich_demo_data(connection: sqlite3.Connection) -> None:
    """Enrich database with Routes, Bus Stops with GPS coordinates, Buses, Trips and Users for Demo."""
    # 1. Routes (Tuyến xe)
    connection.executemany(
        """INSERT OR IGNORE INTO routes (id, name, departure_city, arrival_city, base_price, distance_km, status)
        VALUES (?, ?, ?, ?, ?, ?, 'HoatDong')""",
        [
            (1, "Tuyến 01: TP. Hồ Chí Minh - Đà Lạt", "Hồ Chí Minh", "Đà Lạt", 350000, 305.0),
            (2, "Tuyến 02: Hà Nội - Thái Nguyên", "Hà Nội", "Thái Nguyên", 120000, 80.0),
            (3, "Tuyến 03: Đà Nẵng - Huế", "Đà Nẵng", "Huế", 150000, 100.0),
            (4, "Tuyến 04: Hà Nội - Hải Phòng", "Hà Nội", "Hải Phòng", 140000, 120.0),
        ],
    )

    # 2. Bus Stops (Trạm dừng với tọa độ GPS thực tế phục vụ hiển thị Bản đồ Leaflet/OpenStreetMap)
    connection.executemany(
        """INSERT OR IGNORE INTO bus_stops (id, name, latitude, longitude, address, city)
        VALUES (?, ?, ?, ?, ?, ?)""",
        [
            # Tuyến 01: HCM - Đà Lạt
            (101, "Bến xe Miền Đông Mới", 10.8672, 106.8184, "Khu phố 1, P. Long Bình, TP. Thủ Đức", "Hồ Chí Minh"),
            (102, "Ngã 3 Dầu Giây", 10.9234, 107.1352, "Quốc lộ 1A & QL20, Thống Nhất", "Đồng Nai"),
            (103, "Trạm dừng chân Định Quán", 11.2045, 107.3621, "KM 45 Quốc lộ 20, Huyện Định Quán", "Đồng Nai"),
            (104, "Trạm dừng chân Bảo Lộc", 11.5471, 107.8076, "Trần Phú, TP. Bảo Lộc", "Lâm Đồng"),
            (105, "Bến xe Liên tỉnh Đà Lạt", 11.9365, 108.4452, "Số 01 Tô Hiến Thành, Phường 3, TP. Đà Lạt", "Đà Lạt"),
            
            # Tuyến 02: Hà Nội - Thái Nguyên
            (201, "Bến xe Mỹ Đình", 21.0285, 105.7783, "Số 20 Phạm Hùng, Mỹ Đình 2, Nam Từ Liêm", "Hà Nội"),
            (202, "Cầu Nhật Tân / Võ Nguyên Giáp", 21.0921, 105.8174, "Đường Võ Nguyên Giáp, Đông Anh", "Hà Nội"),
            (203, "Nút giao Sân bay Nội Bài", 21.2187, 105.8042, "Cao tốc Hà Nội - Thái Nguyên", "Hà Nội"),
            (204, "Trạm dừng Phổ Yên", 21.4167, 105.8667, "Thị xã Phổ Yên", "Thái Nguyên"),
            (205, "Bến xe Trung tâm Thái Nguyên", 21.5928, 105.8442, "Đồng Quang, TP. Thái Nguyên", "Thái Nguyên"),

            # Tuyến 03: Đà Nẵng - Huế
            (301, "Bến xe Trung tâm Đà Nẵng", 16.0592, 108.1673, "Tôn Đức Thắng, Hòa Minh, Liên Chiểu", "Đà Nẵng"),
            (302, "Trạm Hải Vân Quan / Lăng Cô", 16.2301, 108.0123, "Thị trấn Lăng Cô, Phú Lộc", "Thừa Thiên Huế"),
            (303, "Bến xe Phía Nam Huế", 16.4498, 107.5912, "An Cựu, TP. Huế", "Thừa Thiên Huế"),
        ],
    )

    # 3. Route Stop Details (Liên kết tuyến xe và trạm dừng theo thứ tự)
    connection.executemany(
        """INSERT OR IGNORE INTO route_stop_details (route_id, stop_id, stop_order, distance_km)
        VALUES (?, ?, ?, ?)""",
        [
            # Tuyến 1: HCM -> Đà Lạt
            (1, 101, 1, 0.0),
            (1, 102, 2, 55.0),
            (1, 103, 3, 110.0),
            (1, 104, 4, 195.0),
            (1, 105, 5, 305.0),
            # Tuyến 2: Hà Nội -> Thái Nguyên
            (2, 201, 1, 0.0),
            (2, 202, 2, 12.0),
            (2, 203, 3, 28.0),
            (2, 204, 4, 55.0),
            (2, 205, 5, 80.0),
            # Tuyến 3: Đà Nẵng -> Huế
            (3, 301, 1, 0.0),
            (3, 302, 2, 40.0),
            (3, 303, 3, 100.0),
        ],
    )

    # 4. Buses (Xe buýt với vị trí GPS hiện tại)
    connection.executemany(
        """INSERT OR IGNORE INTO buses (id, license_plate, bus_type, total_seats, current_lat, current_lng, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            (1, "51B-888.88", "Limousine VIP 22 phòng", 22, 11.2045, 107.3621, "DangChay"),
            (2, "51B-999.99", "Giường nằm 36 chỗ", 36, 10.8672, 106.8184, "SanSang"),
            (3, "29B-123.45", "Ghế ngồi cao cấp 29 chỗ", 29, 21.2187, 105.8042, "DangChay"),
            (4, "43B-777.77", "Limousine 16 chỗ", 16, 16.0592, 108.1673, "SanSang"),
        ],
    )

    # 5. Additional Demo Users (4 Actors: Hành khách, Tài xế, Phụ xe, Quản trị viên)
    connection.executemany(
        """INSERT OR REPLACE INTO users (id, full_name, email, phone, role, discount_type, discount_status, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (1, "Nguyễn Văn A (Khách Hàng)", "customer@example.com", "0901234567", "HanhKhach", "Khong", "DaDuyet", "123456"),
            (2, "Trần Thị B (Phụ Xe / Nhân Viên)", "nhanvien@smartbus.vn", "0907654321", "PhuXe", "Khong", "DaDuyet", "123456"),
            (10, "Nguyễn Văn A (Ưu đãi HSSV)", "nguyenvana@gmail.com", "0912345678", "HanhKhach", "HSSV", "DaDuyet", "123456"),
            (11, "Trần Văn Tài (Tài Xế)", "taixe.nguyen@smartbus.vn", "0988776655", "TaiXe", "Khong", "DaDuyet", "123456"),
            (12, "Lê Quản Lý (Admin)", "admin@smartbus.vn", "0900112233", "Admin", "Khong", "DaDuyet", "123456"),
        ],
    )
    # Cập nhật alias staff@example.com cho user 2 nếu cần
    connection.execute("INSERT OR IGNORE INTO users (id, full_name, email, phone, role, password_hash) VALUES (200, 'Trần Thị B (Staff)', 'staff@example.com', '0907654322', 'PhuXe', '123456')")

    # 6. Additional Trips for Demo (Đặc biệt các chuyến TP. Hồ Chí Minh -> Đà Lạt)
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")

    # Tạo giờ xuất bến linh hoạt theo giờ thực tế để các chuyến trong ngày luôn sẵn sàng đặt vé
    t_past = (now - timedelta(hours=2, minutes=30)).strftime("%Y-%m-%d %H:%M")
    t_past_arr = (now + timedelta(hours=4)).strftime("%Y-%m-%d %H:%M")

    t1_dep = (now + timedelta(hours=1, minutes=15)).strftime("%Y-%m-%d %H:%M")
    t1_arr = (now + timedelta(hours=7, minutes=45)).strftime("%Y-%m-%d %H:%M")

    t2_dep = (now + timedelta(hours=3, minutes=0)).strftime("%Y-%m-%d %H:%M")
    t2_arr = (now + timedelta(hours=9, minutes=30)).strftime("%Y-%m-%d %H:%M")

    t3_dep = (now + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d %H:%M")
    t3_arr = (now + timedelta(hours=12)).strftime("%Y-%m-%d %H:%M")

    t4_dep = (now + timedelta(hours=8)).strftime("%Y-%m-%d %H:%M")
    t4_arr = (now + timedelta(hours=14, minutes=30)).strftime("%Y-%m-%d %H:%M")

    demo_trips = [
        # Chuyến quá khứ (để kiểm tra hành vi chặn đặt vé quá giờ)
        (10, "TRIP-HCM-DL-01-PAST", "Hồ Chí Minh", "Đà Lạt", t_past, t_past_arr, 350000, "DEPARTED", 1, 1, 11, 2, 0),
        # Các chuyến trong ngày hôm nay ở tương lai
        (11, "TRIP-HCM-DL-02", "Hồ Chí Minh", "Đà Lạt", t1_dep, t1_arr, 280000, "SCHEDULED", 2, 1, 11, 2, 36),
        (12, "TRIP-HCM-DL-03", "Hồ Chí Minh", "Đà Lạt", t2_dep, t2_arr, 380000, "SCHEDULED", 4, 1, 11, 2, 16),
        (13, "TRIP-HCM-DL-04", "Hồ Chí Minh", "Đà Lạt", t3_dep, t3_arr, 300000, "SCHEDULED", 2, 1, 11, 2, 36),
        (14, "TRIP-HCM-DL-05", "Hồ Chí Minh", "Đà Lạt", t4_dep, t4_arr, 350000, "SCHEDULED", 1, 1, 11, 2, 22),
        (15, "TRIP-HCM-DL-06", "Hồ Chí Minh", "Đà Lạt", f"{tomorrow} 06:00", f"{tomorrow} 12:30", 320000, "SCHEDULED", 2, 1, 11, 2, 36),
        (16, "TRIP-HCM-DL-07", "Hồ Chí Minh", "Đà Lạt", f"{tomorrow} 13:00", f"{tomorrow} 19:30", 420000, "SCHEDULED", 1, 1, 11, 2, 22),
        (17, "TRIP-HCM-DL-08", "Hồ Chí Minh", "Đà Lạt", f"{tomorrow} 20:00", f"{tomorrow} 02:30", 300000, "SCHEDULED", 2, 1, 11, 2, 36),
        (18, "TRIP-HCM-DL-TOMORROW", "Hồ Chí Minh", "Đà Lạt", f"{tomorrow} 08:30", f"{tomorrow} 15:00", 350000, "SCHEDULED", 1, 1, 11, 2, 22),
        # Tuyến Hà Nội -> Thái Nguyên
        (20, "TRIP-HN-TN-01", "Hà Nội", "Thái Nguyên", t1_dep, t1_arr, 120000, "SCHEDULED", 3, 2, 11, 2, 29),
        (21, "TRIP-HN-TN-02", "Hà Nội", "Thái Nguyên", t3_dep, t3_arr, 120000, "SCHEDULED", 3, 2, 11, 2, 29),
        # Tuyến Đà Nẵng -> Huế
        (30, "TRIP-DN-HUE-01", "Đà Nẵng", "Huế", t2_dep, t2_arr, 150000, "SCHEDULED", 4, 3, 11, 2, 16),
    ]

    for t in demo_trips:
        connection.execute(
            """INSERT INTO trips (id, trip_code, origin, destination, departure_at, arrival_at, base_price, status, bus_id, route_id, driver_id, staff_id, available_seats)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                departure_at=excluded.departure_at,
                arrival_at=excluded.arrival_at,
                status=excluded.status,
                base_price=excluded.base_price,
                available_seats=excluded.available_seats""",
            t,
        )
        trip_id = t[0]
        # Tạo ghế cho chuyến này
        deck_lower = [f"A{i:02d}" for i in range(1, 19)]
        deck_upper = [f"B{i:02d}" for i in range(1, 19)]
        for s in deck_lower:
            connection.execute(
                "INSERT OR IGNORE INTO seats (trip_id, seat_number, deck_or_row, status) VALUES (?, ?, 'TangDuoi', 'AVAILABLE')",
                (trip_id, s),
            )
        for s in deck_upper:
            connection.execute(
                "INSERT OR IGNORE INTO seats (trip_id, seat_number, deck_or_row, status) VALUES (?, ?, 'TangTren', 'AVAILABLE')",
                (trip_id, s),
            )

    # Đảm bảo TẤT CẢ các chuyến xe trong cơ sở dữ liệu đều có đầy đủ ghế Tầng A (TangDuoi) và Tầng B (TangTren)
    all_trips = connection.execute("SELECT id FROM trips").fetchall()
    for tr in all_trips:
        tid = tr["id"]
        for i in range(1, 19):
            connection.execute(
                "INSERT OR IGNORE INTO seats (trip_id, seat_number, deck_or_row, status) VALUES (?, ?, 'TangDuoi', 'AVAILABLE')",
                (tid, f"A{i:02d}"),
            )
            connection.execute(
                "INSERT OR IGNORE INTO seats (trip_id, seat_number, deck_or_row, status) VALUES (?, ?, 'TangTren', 'AVAILABLE')",
                (tid, f"B{i:02d}"),
            )
        # Cập nhật số ghế trống thực tế cho chuyến xe
        avail_count = connection.execute(
            "SELECT COUNT(*) FROM seats WHERE trip_id = ? AND status = 'AVAILABLE'", (tid,)
        ).fetchone()[0]
        connection.execute(
            "UPDATE trips SET available_seats = ? WHERE id = ?", (avail_count, tid)
        )

    # 7. Demo Bookings, Payments & Tickets (Cả vé quá khứ lẫn vé sắp tới)
    # 7.1. Vé đã đi trong quá khứ của User 1 (Khách hàng HSSV)
    connection.execute(
        """INSERT OR IGNORE INTO bookings (id, booking_code, user_id, trip_id, total_amount, status)
        VALUES (8891, 'BOOK-HCM-PAST', 1, 10, 350000, 'PAID')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO booking_items (id, booking_id, seat_id, passenger_name)
        VALUES (8891, 8891, 1, 'Nguyễn Văn A')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO payments (id, booking_id, booking_code, transaction_code, amount, provider, status, paid_at)
        VALUES (8891, 8891, 'BOOK-HCM-PAST', 'TXN-SANDBOX-8891', 350000, 'SANDBOX', 'SUCCESS', '2026-09-25 07:00:00')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO tickets (id, ticket_code, qr_payload, booking_item_id, user_id, trip_id, status, actual_price)
        VALUES (8891, 'TKT-PAST-01', 'ticket:TKT-PAST-01', 8891, 1, 10, 'USED', 350000)"""
    )

    # 7.2. Vé sắp đi ngày mai của User 1 (HCM -> Đà Lạt lúc 08:30)
    connection.execute(
        """INSERT OR IGNORE INTO bookings (id, booking_code, user_id, trip_id, total_amount, status)
        VALUES (8893, 'BOOK-HCM-UPCOMING', 1, 18, 350000, 'PAID')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO booking_items (id, booking_id, seat_id, passenger_name)
        VALUES (8893, 8893, 1, 'Nguyễn Văn A')"""
    )
    connection.execute(
        f"""INSERT OR IGNORE INTO payments (id, booking_id, booking_code, transaction_code, amount, provider, status, paid_at)
        VALUES (8893, 8893, 'BOOK-HCM-UPCOMING', 'TXN-SANDBOX-8893', 350000, 'SANDBOX', 'SUCCESS', '{today} 09:00:00')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO tickets (id, ticket_code, qr_payload, booking_item_id, user_id, trip_id, status, actual_price)
        VALUES (8893, 'TKT-HCM-DL-01', 'ticket:TKT-HCM-DL-01', 8893, 1, 18, 'PAID', 350000)"""
    )

    # 7.3. Vé mẫu của User 10 (TKT-8892 phục vụ test case Boarding US24)
    connection.execute(
        """INSERT OR IGNORE INTO bookings (id, booking_code, user_id, trip_id, total_amount, status)
        VALUES (8892, 'BOOK-TN-01', 10, 20, 120000, 'PAID')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO booking_items (id, booking_id, seat_id, passenger_name)
        VALUES (8892, 8892, 1, 'Nguyễn Văn A')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO payments (id, booking_id, booking_code, transaction_code, amount, provider, status, paid_at)
        VALUES (8892, 8892, 'BOOK-TN-01', 'TXN-SANDBOX-8892', 120000, 'SANDBOX', 'SUCCESS', '2026-09-28 07:00:00')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO tickets (id, ticket_code, qr_payload, booking_item_id, user_id, trip_id, status, actual_price)
        VALUES (8892, 'TKT-8892', 'ticket:TKT-8892', 8892, 10, 20, 'PAID', 120000)"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO demo_tickets (ticket_code, booking_code, status)
        VALUES ('TKT-8892', 'BOOK-TN-01', 'ACTIVE')"""
    )

    # 7.4. Vé quá khứ của User 10
    connection.execute(
        """INSERT OR IGNORE INTO bookings (id, booking_code, user_id, trip_id, total_amount, status)
        VALUES (8894, 'BOOK-TN-PAST', 10, 20, 120000, 'PAID')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO booking_items (id, booking_id, seat_id, passenger_name)
        VALUES (8894, 8894, 1, 'Nguyễn Văn A')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO payments (id, booking_id, booking_code, transaction_code, amount, provider, status, paid_at)
        VALUES (8894, 8894, 'BOOK-TN-PAST', 'TXN-SANDBOX-8894', 120000, 'SANDBOX', 'SUCCESS', '2026-09-15 10:00:00')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO tickets (id, ticket_code, qr_payload, booking_item_id, user_id, trip_id, status, actual_price)
        VALUES (8894, 'TKT-PAST-02', 'ticket:TKT-PAST-02', 8894, 10, 20, 'USED', 120000)"""
    )

    # 7.5. Vé sắp tới của User 10 (HCM -> Đà Lạt ngày mai)
    connection.execute(
        """INSERT OR IGNORE INTO bookings (id, booking_code, user_id, trip_id, total_amount, status)
        VALUES (8895, 'BOOK-HN-UPCOMING', 10, 18, 350000, 'PAID')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO booking_items (id, booking_id, seat_id, passenger_name)
        VALUES (8895, 8895, 3, 'Nguyễn Văn A')"""
    )
    connection.execute(
        f"""INSERT OR IGNORE INTO payments (id, booking_id, booking_code, transaction_code, amount, provider, status, paid_at)
        VALUES (8895, 8895, 'BOOK-HN-UPCOMING', 'TXN-SANDBOX-8895', 350000, 'SANDBOX', 'SUCCESS', '{today} 11:00:00')"""
    )
    connection.execute(
        """INSERT OR IGNORE INTO tickets (id, ticket_code, qr_payload, booking_item_id, user_id, trip_id, status, actual_price)
        VALUES (8895, 'TKT-HCM-DL-10', 'ticket:TKT-HCM-DL-10', 8895, 10, 18, 'PAID', 350000)"""
    )

    # 8. Demo Vouchers (Sprint 2 - BE4)
    demo_vouchers = [
        ("CHAO20", "CHAO20", "Ưu đãi chào mừng bạn mới", "Giảm 20% tối đa 50.000 VNĐ cho khách hàng mới", "percent", 20.0, 20.0, 50000, 50000, 50000, "2026-01-01 00:00:00", "2027-12-31 23:59:59", "2027-12-31", 1, "ACTIVE"),
        ("BUS50", "BUS50", "Khuyến mãi du lịch thả ga", "Giảm ngay 50.000 VNĐ cho đơn từ 100.000 VNĐ", "fixed", 50000.0, 0.0, 100000, 50000, 50000, "2026-01-01 00:00:00", "2027-12-31 23:59:59", "2027-12-31", 1, "ACTIVE"),
        ("GIAM10K", "GIAM10K", "Ưu đãi tiện lợi", "Giảm 10.000 VNĐ cho mọi chuyến đi", "fixed", 10000.0, 0.0, 0, 10000, 10000, "2026-01-01 00:00:00", "2027-12-31 23:59:59", "2027-12-31", 1, "ACTIVE"),
        ("VIP15", "VIP15", "Tri ân thành viên VIP", "Giảm 15% cho hành khách thân thiết", "percent", 15.0, 15.0, 100000, 60000, 60000, "2026-01-01 00:00:00", "2027-12-31 23:59:59", "2027-12-31", 1, "ACTIVE"),
    ]
    for v in demo_vouchers:
        connection.execute(
            """INSERT OR IGNORE INTO vouchers 
               (code, voucher_code, name, description, discount_type, discount_value, discount_percent, min_order_value, max_discount, max_discount_amount, start_date, end_date, expires_at, is_active, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            v,
        )

    # 9. Demo Service Fees (Sprint 2 - BE4)
    demo_fees = [
        (1, "Bảo hiểm hành khách chuyến đi", "Bảo hiểm tai nạn du lịch tiêu chuẩn 50.000.000 VNĐ", "fixed", 5000.0, 1),
        (2, "Phí dịch vụ bến bãi & tiện ích thông minh", "Wifi tốc độ cao, nước uống tinh khiết & khăn lạnh", "fixed", 10000.0, 1),
    ]
    for f in demo_fees:
        connection.execute(
            """INSERT OR IGNORE INTO fees (id, name, description, fee_type, fee_value, is_active)
               VALUES (?, ?, ?, ?, ?, ?)""",
            f,
        )

    # 10. Demo Notifications (Sprint 2 - US20)
    demo_notifications = [
        (1, 10, 8892, "EMAIL", "nguyenvana@gmail.com", "[BusTicket] Xác nhận đặt vé thành công #TKT-8892", "Chúc mừng Quý khách Nguyễn Văn A đã đặt vé thành công cho chuyến Hà Nội - Thái Nguyên. Số ghế: A05. Giờ khởi hành: 07:30.", "SENT"),
        (2, 10, 8892, "SMS", "+8491234567", "[BusTicket] SMS Xác nhận đặt vé", "[BusTicket] Dat ve thanh cong! Ma ve: TKT-8892, Ghe: A05. Cam on quy khach!", "SENT"),
    ]
    for n in demo_notifications:
        connection.execute(
            """INSERT OR IGNORE INTO notifications (id, user_id, ticket_id, type, recipient, title, message, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            n,
        )

    # 11. Demo Monthly Passes (Sprint 2 - US16)
    today = datetime.now().date()
    start_active = today.isoformat()
    end_active = (today + timedelta(days=29)).isoformat()
    start_expired = (today - timedelta(days=60)).isoformat()
    end_expired = (today - timedelta(days=1)).isoformat()

    demo_passes = [
        (1, 10, "Nguyễn Văn A", "001202012345", 2, start_active, end_active, 960000.0, "ConHan"),
        (2, 1, "Nguyen Van A", "0901234567", 1, start_expired, end_expired, 4500000.0, "HetHan"),
    ]
    for p in demo_passes:
        connection.execute(
            """INSERT OR IGNORE INTO monthly_passes (id, user_id, passenger_name, passenger_id_card, route_id, start_date, end_date, price, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            p,
        )

    # 12. Demo Vouchers Phong Phú (Sprint 3 - US18)
    demo_vouchers = [
        (1, "WELCOME10", "WELCOME10", "Giảm 10% khách hàng mới", "Ưu đãi chào mừng thành viên mới", "percent", 10.0, 10.0, 0.0, 50000.0, 50000, 1),
        (2, "VIPBUS20", "VIPBUS20", "Giảm 20% chặng Hồ Chí Minh - Đà Lạt", "Áp dụng cho dòng xe Limousine cao cấp", "percent", 20.0, 20.0, 200000.0, 100000.0, 100000, 1),
        (3, "HSSV50", "HSSV50", "Giảm 50K cho học sinh sinh viên", "Áp dụng khi đi học, về quê cuối tuần", "fixed", 50000.0, 0.0, 150000.0, 50000.0, 50000, 1),
        (4, "HE2026", "HE2026", "Kỳ nghỉ vàng hè 2026", "Giảm 15% cho mọi chuyến xe", "percent", 15.0, 15.0, 0.0, 80000.0, 80000, 1),
    ]
    for v in demo_vouchers:
        connection.execute(
            """INSERT OR IGNORE INTO vouchers (id, code, voucher_code, name, description, discount_type, discount_value, discount_percent, min_order_value, max_discount, max_discount_amount, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            v,
        )

    # 13. Demo Audit Logs (Sprint 3 - US17)
    demo_audit_logs = [
        (1, 12, "DISPATCH_TRIP", "TRIP", 1, "Admin điều phối xe Limousine 51B-888.99 chạy tuyến HCM - Đà Lạt", "2026-10-09 08:30:00"),
        (2, 12, "APPROVE_DISCOUNT", "USER_DISCOUNT", 10, "Duyệt hồ sơ thẻ sinh viên ưu đãi HSSV (-20%) cho Nguyễn Văn A", "2026-10-09 09:15:20"),
        (3, 11, "CHECKIN_TICKET", "TICKET", 1, "Tài xế Trần Văn Tài quét mã QR soát vé thành công tại cửa xe", "2026-10-09 10:00:15"),
        (4, 12, "CREATE_VOUCHER", "VOUCHER", 2, "Admin phát hành mã ưu đãi VIPBUS20 giảm 20%", "2026-10-09 14:22:45"),
        (5, 12, "APPROVE_REFUND", "REFUND", 1, "Chấp thuận hoàn tiền 100% cho vé hủy trước 24h", "2026-10-10 16:45:10"),
    ]
    for al in demo_audit_logs:
        connection.execute(
            """INSERT OR IGNORE INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            al,
        )

    # 14. Demo Feedbacks (Sprint 3)
    demo_feedbacks = [
        (1, 1, 1, 5, 5, "Dịch vụ", "Xe chạy rất êm, bác tài lái cẩn thận, ghế massage sạch sẽ thơm tho!", "Xe chạy rất êm, bác tài lái cẩn thận, ghế massage sạch sẽ thơm tho!", "APPROVED", "2026-10-08 19:30:00"),
        (2, 10, 1, 5, 5, "Thái độ phục vụ", "Phụ xe nhiệt tình, hỗ trợ mang hành lý lên xe chu đáo 10/10.", "Phụ xe nhiệt tình, hỗ trợ mang hành lý lên xe chu đáo 10/10.", "APPROVED", "2026-10-09 11:20:00"),
        (3, 1, 2, 4, 4, "Chung", "Đúng giờ xuất bến, wifi trên xe mượt mà lướt web thoải mái.", "Đúng giờ xuất bến, wifi trên xe mượt mà lướt web thoải mái.", "PENDING", "2026-10-10 15:45:00"),
    ]
    for fb in demo_feedbacks:
        connection.execute(
            """INSERT OR IGNORE INTO feedbacks (id, user_id, trip_id, rating, rating_stars, category, comment, content, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            fb,
        )

    # 15. Demo Refunds (Sprint 3 - US08)
    demo_refunds = [
        (1, 1, 1, 1, "TKT-8892", 1, "Thay đổi kế hoạch cá nhân", 280000.0, 280000.0, "REFUNDED", "Vietcombank", "0123456789", "NGUYEN VAN A", "Đã chuyển khoản hoàn tất", "2026-10-08 10:00:00", "2026-10-08 11:30:00"),
        (2, 2, 2, 2, "TKT-9901", 10, "Bận lịch thi đột xuất tại trường", 300000.0, 300000.0, "REFUNDED", "MB Bank", "9876543210", "NGUYEN VAN A", "Đã duyệt hoàn tiền thành công", "2026-10-10 14:15:00", "2026-10-10 15:00:00"),
    ]
    for rf in demo_refunds:
        connection.execute(
            """INSERT OR IGNORE INTO refunds (id, booking_id, payment_id, ticket_id, ticket_code, user_id, reason, requested_amount, approved_amount, status, bank_name, bank_account, account_holder, note, created_at, processed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            rf,
        )

    # 16. Cập nhật discount_status cho người dùng chờ duyệt (US23)
    connection.execute("""
        UPDATE users 
        SET discount_type = 'Khong', 
            discount_status = 'ChoDuyet',
            student_id = 'SV-BK-2026',
            proof_note = 'Đại học Bách Khoa TP.HCM - Khoa CNTT',
            card_image = 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80'
        WHERE id = 1
    """)
    connection.execute("UPDATE users SET discount_status = 'DaDuyet' WHERE id = 10")
    connection.execute("UPDATE users SET discount_status = 'None', student_id = NULL, card_image = NULL WHERE id NOT IN (1, 10)")

    # 17. Demo FAQs & Hệ thống Hướng dẫn vận hành 4 Role (SmartBus Knowledge Base)
    demo_faqs = [
        # --- HÀNH KHÁCH (CUSTOMER / HanhKhach) ---
        (
            1,
            "DAT_VE",
            "HanhKhach",
            "Làm thế nào để tìm kiếm chuyến xe và chọn chỗ ngồi ưng ý?",
            "Bước 1: Truy cập Trang chủ hoặc mục 'Chuyến xe'.\nBước 2: Chọn Điểm đi, Điểm đến và Ngày khởi hành, sau đó nhấn 'Tìm Chuyến Xe'.\nBước 3: Chọn chuyến xe phù hợp và bấm 'Chọn Ghế'. Hệ thống hiển thị sơ đồ 2 tầng trực quan: Tầng dưới (A01-A18) và Tầng trên (B01-B18).\nBước 4: Bấm vào ghế màu xanh lá (ghế trống) để chọn. Ghế của bạn sẽ chuyển sang màu xanh dương nổi bật.\nBước 5: Nhấn 'Tiến hành thanh toán'. Hệ thống sẽ tự động giữ chỗ trong 10 phút để bạn hoàn tất đơn hàng.",
            "tìm chuyến, chọn ghế, sơ đồ ghế, tầng 1 tầng 2, đặt vé",
            1,
            "🚌",
            1,
            42
        ),
        (
            2,
            "DAT_VE",
            "HanhKhach",
            "Cơ chế 'Tạm giữ ghế 10 phút' hoạt động như thế nào?",
            "Khi bạn chọn ghế và tiến hành đặt vé, hệ thống kích hoạt cơ chế khóa ghế tạm thời (HELD) trong vòng 10 phút. Trong thời gian này, không hành khách nào khác có thể chọn ghế đó. Đồng hồ đếm ngược sẽ hiển thị trên màn hình thanh toán. Nếu sau 10 phút bạn chưa hoàn tất thanh toán, Cronjob tự động của SmartBus sẽ giải phóng ghế về trạng thái TRỐNG (AVAILABLE) để người khác có thể đặt.",
            "giữ chỗ, 10 phút, đếm ngược, hết hạn giữ ghế, tự động nhả ghế",
            2,
            "⏱️",
            1,
            38
        ),
        (
            3,
            "THANH_TOAN",
            "HanhKhach",
            "Hệ thống SmartBus hỗ trợ những phương thức thanh toán nào?",
            "SmartBus tích hợp cổng thanh toán đa kênh an toàn:\n1. Quét mã VietQR chuyển khoản ngân hàng 24/7 (tự động nhận diện giao dịch).\n2. Cổng thanh toán trực tuyến VNPay (hỗ trợ thẻ ATM nội địa và ứng dụng Mobile Banking).\n3. Ví điện tử ZaloPay / MoMo.\n4. Cổng thanh toán Sandbox thử nghiệm tức thì dành cho môi trường Demo.\nSau khi thanh toán thành công, vé điện tử kèm mã QR sẽ được gửi ngay lập tức về hòm thư Email và lưu vào mục 'Vé của tôi'.",
            "thanh toán, vnpay, zalopay, vietqr, sandbox, momo",
            3,
            "💳",
            1,
            56
        ),
        (
            4,
            "VE_THANG",
            "HanhKhach",
            "Làm sao để đăng ký vé tháng xe buýt và nhận ưu đãi giảm giá HSSV?",
            "Bước 1: Vào mục 'Vé tháng' trên thanh điều hướng.\nBước 2: Chọn Tuyến đường bạn thường xuyên đi lại và chọn loại vé (1 tháng, 3 tháng hoặc 1 năm).\nBước 3: Nhập thông tin CCCD và tải lên hình ảnh Thẻ Học sinh - Sinh viên hoặc giấy tờ ưu tiên nếu thuộc diện đối tượng chính sách.\nBước 4: Nhấn 'Đăng ký vé tháng'. Hệ thống sẽ áp dụng mức chiết khấu 30% - 50% ngay sau khi Ban Quản Trị duyệt hồ sơ.\nBước 5: Bạn sẽ nhận mã thẻ vé tháng số hóa kèm mã QR để đi xe không giới hạn số lượt.",
            "vé tháng, đăng ký vé tháng, hssv, học sinh sinh viên, ưu đãi",
            4,
            "🎫",
            1,
            64
        ),
        (
            5,
            "DOI_HUY_VE",
            "HanhKhach",
            "Chính sách đổi vé, đổi ghế hoặc hủy vé hoàn tiền quy định ra sao?",
            "Chính sách hoàn/hủy vé tự động theo quy định của SmartBus:\n• Trước giờ khởi hành trên 24 tiếng: Hoàn 90% giá trị vé (phí xử lý 10%).\n• Trước giờ khởi hành từ 12 đến 24 tiếng: Hoàn 70% giá trị vé (phí xử lý 30%).\n• Dưới 12 tiếng hoặc sau khi xe đã xuất bến: Không hỗ trợ hoàn hủy.\nCách thực hiện: Vào 'Vé của tôi' -> Chọn vé cần thao tác -> Bấm 'Đổi chuyến / Đổi ghế' (miễn phí chênh lệch cùng hạng) hoặc 'Yêu cầu hủy vé & hoàn tiền'. Bạn có thể tra cứu tiến độ hoàn tiền tại mục 'Hoàn tiền'.",
            "hủy vé, đổi vé, hoàn tiền, đổi chuyến, chính sách hoàn",
            5,
            "💸",
            1,
            89
        ),
        (
            6,
            "SOAT_VE_BOARDING",
            "HanhKhach",
            "Khi lên xe buýt tôi cần xuất trình những giấy tờ hoặc mã gì?",
            "Bạn chỉ cần mở điện thoại vào mục 'Vé của tôi' và bấm 'Xem mã QR vé' (hoặc mở email vé điện tử đã được SmartBus gửi). Khi bước lên xe, đưa mã QR trước máy quét của Phụ xe hoặc điện thoại của Tài xế. Hệ thống sẽ phát âm thanh báo 'Hợp lệ' và xác nhận bạn đã lên xe thành công. Nếu điện thoại hết pin, bạn chỉ cần đọc Số điện thoại hoặc Mã vé (ví dụ: TK-XXXX) cho Phụ xe kiểm tra.",
            "lên xe, xuất trình vé, mã qr vé, quét mã, lên trạm",
            6,
            "📱",
            1,
            35
        ),
        (
            7,
            "KY_THUAT",
            "HanhKhach",
            "Làm sao để theo dõi vị trí xe buýt trực tiếp trên bản đồ GPS?",
            "Vào mục 'Bản đồ' trên thanh điều hướng. Bản đồ số sẽ hiển thị trực quan toàn bộ mạng lưới tuyến xe, các trạm dừng dọc hành trình và biểu tượng xe buýt đang di chuyển theo thời gian thực (real-time GPS simulation). Bạn có thể bấm vào từng trạm dừng để xem khoảng cách km và thời gian dự kiến xe sẽ đến đón.",
            "bản đồ, gps, theo dõi xe, vị trí trạm dừng, xe đến trong bao lâu",
            7,
            "🗺️",
            1,
            47
        ),
        (
            8,
            "KY_THUAT",
            "HanhKhach",
            "Tôi có thể liên hệ hỗ trợ hoặc phản ánh chất lượng chuyến đi ở đâu?",
            "Bạn có 3 kênh hỗ trợ nhanh:\n1. Bấm vào biểu tượng Chatbot AI ở góc phải màn hình để được trợ lý ảo giải đáp 24/7 về lịch trình, quy định hành lý và giá vé.\n2. Vào mục 'Đánh giá' để gửi sao và nhận xét chi tiết sau chuyến đi.\n3. Gọi trực tiếp tổng đài chăm sóc khách hàng SmartBus: 1900 6868.",
            "hỗ trợ, liên hệ, chatbot ai, đánh giá dịch vụ, khiếu nại",
            8,
            "💬",
            1,
            29
        ),

        # --- TÀI XẾ (DRIVER / TaiXe) ---
        (
            9,
            "SOAT_VE_BOARDING",
            "TaiXe",
            "Quy trình xem lịch trình chạy xe và điểm danh trước chuyến đi",
            "Bước 1: Chuyển vai trò sang 'Tài Xế' (hoặc đăng nhập bằng tài khoản tài xế).\nBước 2: Truy cập mục 'Lịch trình xe' hoặc 'Lịch sử chuyến'. Bạn sẽ thấy danh sách các chuyến xe được Ban Quản Trị phân công phụ trách trong ngày (mã chuyến, biển số xe, giờ xuất bến, điểm đi, điểm đến).\nBước 3: Kiểm tra thông số xe và xác nhận sẵn sàng xuất bến trước giờ chạy ít nhất 15 phút.",
            "tài xế, lịch trình, phân công, xuất bến, lái xe",
            9,
            "🧭",
            1,
            51
        ),
        (
            10,
            "SOAT_VE_BOARDING",
            "TaiXe",
            "Hướng dẫn Tài xế sử dụng tính năng Soát vé & Check-in tại cửa xe",
            "Bước 1: Vào mục 'Soát vé & Lên xe' trên thanh điều hướng.\nBước 2: Chọn chuyến xe hiện tại đang phục vụ.\nBước 3: Hướng camera điện thoại về phía mã QR trên vé của hành khách (hoặc trên ứng dụng của họ). Hệ thống sẽ tự động quét và kiểm tra tính hợp lệ tức thì.\nBước 4: Nhấn nút 'Xác nhận lên xe' để chuyển trạng thái vé sang 'USED' (Đã lên xe) và đồng bộ trực tiếp lên hệ thống trung tâm.",
            "tài xế, soát vé, check-in, quét qr, cửa xe",
            10,
            "📷",
            1,
            44
        ),
        (
            11,
            "KY_THUAT",
            "TaiXe",
            "Quy trình xử lý sự cố kỹ thuật hoặc tắc đường dọc hành trình",
            "Khi gặp sự cố ngoài ý muốn (xe hỏng hóc, sự cố lốp, tắc đường nghiêm trọng):\n1. Đảm bảo an toàn tuyệt đối cho toàn bộ hành khách trên xe, bật đèn cảnh báo.\n2. Liên hệ ngay Bộ phận Điều phối & Tổng đài điều hành qua Hotline nội bộ.\n3. Thông báo rõ lý do và dự kiến thời gian chậm trễ cho hành khách trên xe để họ an tâm.\n4. Ban điều phối sẽ kích hoạt xe dự phòng hoặc gửi thông báo SMS/Email khẩn cấp tới các hành khách ở trạm kế tiếp.",
            "tài xế, sự cố, hỏng xe, tắc đường, báo cáo sự cố",
            11,
            "⚠️",
            1,
            33
        ),

        # --- PHỤ XE / NHÂN VIÊN SOÁT VÉ (STAFF / PhuXe) ---
        (
            12,
            "SOAT_VE_BOARDING",
            "PhuXe",
            "Hướng dẫn Phụ xe soát vé QR và xử lý khi hành khách quên mã vé",
            "Bước 1: Vào mục 'Soát vé QR' trên thanh menu.\nBước 2: Quét mã QR trên màn hình điện thoại hoặc vé giấy của hành khách.\nBước 3: Nếu khách hết pin hoặc quên mã vé: Bấm chuyển sang tab 'Tra cứu thủ công', nhập Số điện thoại hoặc Họ tên của khách để tìm vé. Nếu vé hiển thị trạng thái 'ĐÃ THANH TOÁN (PAID)', bấm nút 'Xác nhận lên xe'.\nBước 4: Hướng dẫn hành khách về đúng số ghế (tầng 1 hoặc tầng 2) đã ghi rõ trên vé.",
            "phụ xe, soát vé, quên vé, tra cứu sđt, lên xe",
            12,
            "🎟️",
            1,
            62
        ),
        (
            13,
            "DAT_VE",
            "PhuXe",
            "Cách xuất vé trực tiếp cho khách lên xe tại trạm dừng (Bán vé quầy)",
            "Đối với hành khách vãng lai bắt xe dọc đường:\nBước 1: Vào mục 'Bán vé quầy' hoặc 'Chuyến xe'.\nBước 2: Chọn chuyến xe đang chạy, kiểm tra các ghế trống (màu xanh lá).\nBước 3: Nhập thông tin nhanh của khách (Họ tên, SĐT) và chọn ghế theo yêu cầu của khách.\nBước 4: Thu tiền mặt hoặc đưa mã QR tĩnh để khách quét chuyển khoản.\nBước 5: Bấm 'Xuất vé nhanh', hệ thống ghi nhận doanh thu và in hoặc gửi vé điện tử qua SMS/Email cho khách.",
            "phụ xe, bán vé trực tiếp, vé quầy, khách dọc đường, tiền mặt",
            13,
            "💵",
            1,
            49
        ),
        (
            14,
            "VE_THANG",
            "PhuXe",
            "Cách kiểm tra tính hợp lệ của Vé Tháng khi hành khách xuất trình",
            "Hành khách sử dụng vé tháng sẽ xuất trình thẻ cứng hoặc mã QR vé tháng trên điện thoại.\nPhụ xe dùng ứng dụng quét mã QR vé tháng hoặc vào mục 'Vé tháng' nhập mã thẻ. Màn hình sẽ hiển thị: Tên hành khách, Ảnh chân dung, Tuyến đường được phép đi và Ngày hết hạn. Nếu trạng thái là 'CÒN HẠN (ConHan)' và đúng tuyến, mời khách lên xe.",
            "phụ xe, kiểm tra vé tháng, thẻ tháng, hết hạn vé tháng",
            14,
            "🆔",
            1,
            40
        ),

        # --- QUẢN TRỊ VIÊN (ADMIN / QuanTriVien) ---
        (
            15,
            "QUAN_TRI",
            "Admin",
            "Quy trình tạo chuyến xe mới và phân công Tài xế, Phụ xe (Điều phối)",
            "Bước 1: Chuyển vai trò sang 'Quản trị viên' và truy cập mục 'Quản Trị Hệ Thống' (/admin).\nBước 2: Chuyển sang tab 'Điều phối chuyến' hoặc 'Quản lý Chuyến xe'.\nBước 3: Bấm nút '+ Thêm chuyến xe mới'.\nBước 4: Chọn Tuyến đường (Route), Xe buýt (Bus) phụ trách, phân công Tài xế (Driver) và Phụ xe (Staff).\nBước 5: Nhập thời gian khởi hành và kết thúc dự kiến, điều chỉnh giá vé cơ bản nếu cần.\nBước 6: Nhấn 'Lưu chuyến xe'. Hệ thống sẽ tự động khởi tạo danh sách ghế tương ứng với loại xe buýt đã chọn.",
            "admin, tạo chuyến xe, phân công tài xế, điều phối, quản trị",
            15,
            "👑",
            1,
            78
        ),
        (
            16,
            "QUAN_TRI",
            "Admin",
            "Cách phê duyệt hồ sơ giảm giá vé tháng cho Học sinh - Sinh viên (US23)",
            "Bước 1: Vào Admin Dashboard -> Tab 'Hồ sơ Vé Tháng & Giảm giá'.\nBước 2: Hệ thống hiển thị danh sách người dùng có trạng thái 'Chờ duyệt (ChoDuyet)'.\nBước 3: Nhấn 'Xem chi tiết' để kiểm tra hình ảnh Thẻ HSSV hoặc giấy tờ chứng minh.\nBước 4: Nhấn nút 'Duyệt giảm giá' (Chuyển sang 'DaDuyet'). Hệ thống sẽ tự động gửi Email thông báo chúc mừng tới người dùng và kích hoạt chiết khấu 30-50% cho các lần mua vé tháng tiếp theo.",
            "admin, duyệt giảm giá, hssv, duyệt hồ sơ, vé tháng ưu đãi",
            16,
            "🎓",
            1,
            71
        ),
        (
            17,
            "DOI_HUY_VE",
            "Admin",
            "Quy trình thẩm định và phê duyệt yêu cầu Hoàn tiền / Hủy vé (US08)",
            "Bước 1: Vào Admin Dashboard -> Chọn tab 'Quản lý Hoàn tiền'.\nBước 2: Xem danh sách các yêu cầu hoàn tiền đang ở trạng thái 'PENDING'. Hệ thống tính toán sẵn tỷ lệ khấu trừ (10% hoặc 30%) và số tiền đề xuất hoàn dựa trên mốc thời gian khách gửi đơn.\nBước 3: Kiểm tra thông tin STK ngân hàng, Tên người thụ hưởng của khách hàng.\nBước 4: Nhấn 'Phê duyệt hoàn tiền'. Hệ thống ghi nhận trạng thái 'REFUNDED', hủy vé trong cơ sở dữ liệu và kích hoạt thông báo gửi tới khách hàng.",
            "admin, duyệt hoàn tiền, us08, hủy vé, chuyển khoản hoàn tiền",
            17,
            "⚖️",
            1,
            83
        ),
        (
            18,
            "QUAN_TRI",
            "Admin",
            "Cách tạo mã Voucher khuyến mãi và thiết lập chính sách phụ phí (US18)",
            "Bước 1: Tại trang Quản trị, chọn tab 'Voucher & Phụ phí'.\nBước 2: Bấm nút 'Tạo Voucher Mới'.\nBước 3: Nhập Mã khuyến mãi (ví dụ: HE2026, BANMOI, TRIAN), phần trăm giảm giá (%) hoặc số tiền giảm cố định, số lượng phát hành tối đa và ngày hết hạn.\nBước 4: Nhấn 'Kích hoạt Voucher'. Người dùng khi đặt vé có thể nhập mã này tại bước thanh toán để được giảm trừ trực tiếp vào tổng tiền.",
            "admin, tạo voucher, khuyến mãi, mã giảm giá, us18, phụ phí",
            18,
            "🎁",
            1,
            67
        ),
        (
            19,
            "QUAN_TRI",
            "Admin",
            "Hướng dẫn theo dõi Báo cáo Doanh thu, Tỷ lệ lấp đầy ghế và Xuất Excel",
            "Bước 1: Tại Admin Dashboard, chọn tab 'Thống kê & Doanh thu'.\nBước 2: Theo dõi các chỉ số KPI trực quan: Tổng doanh thu, Số vé bán ra, Tỷ lệ lấp đầy ghế bình quân (Occupancy Rate) và Biểu đồ doanh thu theo ngày/tháng.\nBước 3: Chọn khoảng thời gian hoặc lọc theo từng tuyến xe trọng điểm.\nBước 4: Nhấn nút 'Xuất báo cáo Excel / CSV'. Hệ thống sẽ trích xuất toàn bộ dữ liệu tài chính chi tiết để phục vụ báo cáo kế toán và nghiệm thu dự án.",
            "admin, doanh thu, thống kê, tỷ lệ lấp đầy, xuất excel, csv, báo cáo",
            19,
            "📊",
            1,
            95
        ),
        (
            20,
            "QUAN_TRI",
            "Admin",
            "Cách giám sát Nhật ký kiểm toán hệ thống (Audit Logs) để bảo mật",
            "Bước 1: Vào Admin Dashboard -> Tab 'Nhật ký kiểm toán (Audit Logs)'.\nBước 2: Bảng hiển thị toàn bộ hoạt động nhạy cảm trong hệ thống theo dòng thời gian (Ai làm gì? Thời điểm nào? Tác động lên bảng dữ liệu nào? Chi tiết thông số).\nBước 3: Sử dụng thanh lọc để tìm kiếm các hành vi như: Đổi ghế, Phê duyệt hoàn tiền, Tạo voucher, Phân công tài xế nhằm phục vụ công tác thanh tra và kiểm soát rủi ro bảo mật.",
            "admin, audit log, nhật ký kiểm toán, bảo mật, truy vết lịch sử",
            20,
            "🛡️",
            1,
            58
        ),
    ]

    for faq in demo_faqs:
        connection.execute(
            """INSERT OR REPLACE INTO faqs (id, category, role_target, question, answer, keywords, order_num, icon, is_active, helpful_count)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            faq,
        )

    connection.commit()


def main() -> None:
    with get_connection() as connection:
        initialize_database(connection)
        seed_database(connection)
        seed_rich_demo_data(connection)
        print("Database initialized & seeded successfully!")


if __name__ == "__main__":
    main()