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
        DELETE FROM ticket_inspections;
        DELETE FROM demo_tickets;
        DELETE FROM tickets;
        DELETE FROM payments;
        DELETE FROM booking_items;
        DELETE FROM bookings;
        DELETE FROM seats;
        DELETE FROM trips;
        DELETE FROM users;
        DELETE FROM sqlite_sequence;
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

    # 5. Additional Demo Users
    connection.executemany(
        """INSERT OR IGNORE INTO users (id, full_name, email, phone, role, discount_type, discount_status, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (10, "Nguyễn Văn A", "nguyenvana@gmail.com", "0912345678", "HanhKhach", "HSSV", "DaDuyet", "123456"),
            (11, "Trần Văn Tài (Tài Xế)", "taixe.nguyen@smartbus.vn", "0988776655", "TaiXe", "Khong", "DaDuyet", "123456"),
            (12, "Lê Quản Lý", "admin@smartbus.vn", "0900112233", "Admin", "Khong", "DaDuyet", "123456"),
        ],
    )

    # 6. Additional Trips for Demo
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    demo_trips = [
        (10, "TRIP-HCM-DL-01", "Hồ Chí Minh", "Đà Lạt", f"{today} 08:00", f"{today} 16:00", 350000, "SCHEDULED", 1, 1, 11, 18),
        (11, "TRIP-HCM-DL-02", "Hồ Chí Minh", "Đà Lạt", f"{today} 13:30", f"{today} 21:30", 280000, "SCHEDULED", 2, 1, 11, 32),
        (12, "TRIP-HCM-DL-03", "Hồ Chí Minh", "Đà Lạt", f"{today} 22:00", f"{tomorrow} 06:00", 400000, "SCHEDULED", 1, 1, 11, 20),
        (20, "TRIP-HN-TN-01", "Hà Nội", "Thái Nguyên", f"{today} 07:30", f"{today} 09:30", 120000, "SCHEDULED", 3, 2, 11, 25),
        (21, "TRIP-HN-TN-02", "Hà Nội", "Thái Nguyên", f"{today} 14:00", f"{today} 16:00", 120000, "SCHEDULED", 3, 2, 11, 28),
        (30, "TRIP-DN-HUE-01", "Đà Nẵng", "Huế", f"{today} 09:00", f"{today} 11:30", 150000, "SCHEDULED", 4, 3, 11, 14),
    ]

    for t in demo_trips:
        connection.execute(
            """INSERT OR IGNORE INTO trips (id, trip_code, origin, destination, departure_at, arrival_at, base_price, status, bus_id, route_id, driver_id, available_seats)
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

    # 7. Demo Bookings, Payments & Tickets
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

    connection.commit()


def main() -> None:
    with get_connection() as connection:
        initialize_database(connection)
        seed_database(connection)
        seed_rich_demo_data(connection)
        print("Database initialized & seeded successfully!")


if __name__ == "__main__":
    main()