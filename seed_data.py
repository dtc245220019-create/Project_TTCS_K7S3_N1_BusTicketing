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

    # 6. Additional Trips for Demo (Đặc biệt 8 chuyến TP. Hồ Chí Minh -> Đà Lạt)
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    demo_trips = [
        # 8 Chuyến Hồ Chí Minh -> Đà Lạt trải đều các khung giờ trong ngày
        (10, "TRIP-HCM-DL-01", "Hồ Chí Minh", "Đà Lạt", f"{today} 06:00", f"{today} 12:30", 350000, "SCHEDULED", 1, 1, 11, 22),
        (11, "TRIP-HCM-DL-02", "Hồ Chí Minh", "Đà Lạt", f"{today} 08:00", f"{today} 14:30", 280000, "SCHEDULED", 2, 1, 11, 36),
        (12, "TRIP-HCM-DL-03", "Hồ Chí Minh", "Đà Lạt", f"{today} 10:15", f"{today} 16:45", 380000, "SCHEDULED", 4, 1, 11, 16),
        (13, "TRIP-HCM-DL-04", "Hồ Chí Minh", "Đà Lạt", f"{today} 13:00", f"{today} 19:30", 300000, "SCHEDULED", 2, 1, 11, 36),
        (14, "TRIP-HCM-DL-05", "Hồ Chí Minh", "Đà Lạt", f"{today} 15:30", f"{today} 22:00", 350000, "SCHEDULED", 1, 1, 11, 22),
        (15, "TRIP-HCM-DL-06", "Hồ Chí Minh", "Đà Lạt", f"{today} 18:00", f"{tomorrow} 00:30", 320000, "SCHEDULED", 2, 1, 11, 36),
        (16, "TRIP-HCM-DL-07", "Hồ Chí Minh", "Đà Lạt", f"{today} 21:00", f"{tomorrow} 04:30", 420000, "SCHEDULED", 1, 1, 11, 22),
        (17, "TRIP-HCM-DL-08", "Hồ Chí Minh", "Đà Lạt", f"{today} 23:30", f"{tomorrow} 06:00", 300000, "SCHEDULED", 2, 1, 11, 36),
        (18, "TRIP-HCM-DL-TOMORROW", "Hồ Chí Minh", "Đà Lạt", f"{tomorrow} 08:30", f"{tomorrow} 15:00", 350000, "SCHEDULED", 1, 1, 11, 22),
        # Tuyến Hà Nội -> Thái Nguyên
        (20, "TRIP-HN-TN-01", "Hà Nội", "Thái Nguyên", f"{today} 07:30", f"{today} 09:30", 120000, "SCHEDULED", 3, 2, 11, 29),
        (21, "TRIP-HN-TN-02", "Hà Nội", "Thái Nguyên", f"{today} 14:00", f"{today} 16:00", 120000, "SCHEDULED", 3, 2, 11, 29),
        # Tuyến Đà Nẵng -> Huế
        (30, "TRIP-DN-HUE-01", "Đà Nẵng", "Huế", f"{today} 09:00", f"{today} 11:30", 150000, "SCHEDULED", 4, 3, 11, 16),
    ]

    for t in demo_trips:
        connection.execute(
            """INSERT OR REPLACE INTO trips (id, trip_code, origin, destination, departure_at, arrival_at, base_price, status, bus_id, route_id, driver_id, available_seats)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
        (2, 2, 2, 2, "TKT-9901", 10, "Bận lịch thi đột xuất tại trường", 300000.0, 300000.0, "PENDING", "MB Bank", "9876543210", "NGUYEN VAN A", "Chờ kế toán xác nhận ủy nhiệm chi", "2026-10-10 14:15:00", None),
    ]
    for rf in demo_refunds:
        connection.execute(
            """INSERT OR IGNORE INTO refunds (id, booking_id, payment_id, ticket_id, ticket_code, user_id, reason, requested_amount, approved_amount, status, bank_name, bank_account, account_holder, note, created_at, processed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            rf,
        )

    # 16. Cập nhật discount_status cho người dùng chờ duyệt (US23)
    connection.execute("UPDATE users SET discount_status = 'ChoDuyet' WHERE id IN (1, 3)")
    connection.execute("UPDATE users SET discount_status = 'DaDuyet' WHERE id = 10")

    connection.commit()


def main() -> None:
    with get_connection() as connection:
        initialize_database(connection)
        seed_database(connection)
        seed_rich_demo_data(connection)
        print("Database initialized & seeded successfully!")


if __name__ == "__main__":
    main()