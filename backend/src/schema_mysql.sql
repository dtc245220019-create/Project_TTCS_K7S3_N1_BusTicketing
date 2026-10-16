-- =====================================================================
-- SMART BUS TICKETING - FULL MYSQL DATABASE SCHEMA (SPRINT 2)
-- Architecture: 18 Entities matching 100% of ERD & Sprint 2 Features
-- Compatible with MySQL 8.0+ and MariaDB 10.4+
-- =====================================================================

CREATE DATABASE IF NOT EXISTS smart_bus_ticketing
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_bus_ticketing;

-- 1. NGUOI_DUNG & USERS
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) DEFAULT '0901234567',
    password_hash VARCHAR(255) DEFAULT 'pbkdf2:sha256:123456',
    role VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER',
    discount_type VARCHAR(30) DEFAULT 'Khong',
    discount_status VARCHAR(30) DEFAULT 'ChoDuyet',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TUYEN_XE & ROUTES
CREATE TABLE IF NOT EXISTS routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    departure_city VARCHAR(100) NOT NULL,
    arrival_city VARCHAR(100) NOT NULL,
    base_price INT NOT NULL DEFAULT 0,
    distance_km DOUBLE DEFAULT 0.0,
    status VARCHAR(30) NOT NULL DEFAULT 'HoatDong',
    INDEX idx_route_cities (departure_city, arrival_city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TRAM_DUNG & BUS_STOPS
CREATE TABLE IF NOT EXISTS bus_stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. CHI_TIET_TUYEN_TRAM
CREATE TABLE IF NOT EXISTS route_stop_details (
    route_id INT NOT NULL,
    stop_id INT NOT NULL,
    stop_order INT NOT NULL,
    distance_km DOUBLE NOT NULL DEFAULT 0.0,
    PRIMARY KEY (route_id, stop_id),
    CONSTRAINT fk_rsd_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    CONSTRAINT fk_rsd_stop FOREIGN KEY (stop_id) REFERENCES bus_stops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. XE_BUYT & BUSES
CREATE TABLE IF NOT EXISTS buses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    license_plate VARCHAR(50) NOT NULL UNIQUE,
    bus_type VARCHAR(100) DEFAULT 'Giường nằm 36 chỗ',
    total_seats INT NOT NULL DEFAULT 36,
    current_lat DOUBLE DEFAULT 0.0,
    current_lng DOUBLE DEFAULT 0.0,
    status VARCHAR(30) NOT NULL DEFAULT 'SanSang'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. CHUYEN_XE & TRIPS
CREATE TABLE IF NOT EXISTS trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_code VARCHAR(50) NOT NULL UNIQUE,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_at VARCHAR(50) NOT NULL,
    arrival_at VARCHAR(50) NOT NULL,
    base_price INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    bus_id INT NULL,
    route_id INT NULL,
    driver_id INT NULL,
    available_seats INT DEFAULT 36,
    CONSTRAINT fk_trip_bus FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE SET NULL,
    CONSTRAINT fk_trip_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
    CONSTRAINT fk_trip_driver FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_trip_route_time (origin, destination, departure_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. GHE_NGOI & SEATS
CREATE TABLE IF NOT EXISTS seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    bus_id INT NULL,
    seat_number VARCHAR(20) NOT NULL,
    seat_type VARCHAR(30) NOT NULL DEFAULT 'STANDARD',
    deck_or_row VARCHAR(30) DEFAULT 'TangDuoi',
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    held_until VARCHAR(50) NULL,
    UNIQUE KEY uq_trip_seat (trip_id, seat_number),
    CONSTRAINT fk_seat_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_bus FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE SET NULL,
    INDEX idx_seat_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. MA_GIAM_GIA & VOUCHERS (Sprint 2 - BE4)
CREATE TABLE IF NOT EXISTS vouchers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percent',
    discount_value DOUBLE NOT NULL,
    min_order_value DOUBLE DEFAULT 0,
    max_discount DOUBLE NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_voucher_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. PHI_DICH_VU & FEES (Sprint 2 - BE4)
CREATE TABLE IF NOT EXISTS fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(500) NULL,
    fee_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
    fee_value DOUBLE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. DON_DAT_VE & BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_code VARCHAR(50) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    trip_id INT NOT NULL,
    total_amount INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE RESTRICT,
    INDEX idx_booking_code (booking_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. CHI_TIET_DAT_VE & BOOKING_ITEMS
CREATE TABLE IF NOT EXISTS booking_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    seat_id INT NOT NULL,
    passenger_name VARCHAR(100) NOT NULL,
    passenger_id_number VARCHAR(50) NULL,
    UNIQUE KEY uq_booking_seat (booking_id, seat_id),
    CONSTRAINT fk_bi_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_seat FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. GIAO_DICH_THANH_TOAN & PAYMENTS (US17 / US18)
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NULL,
    booking_code VARCHAR(50) NULL,
    transaction_code VARCHAR(100) NOT NULL UNIQUE,
    amount INT NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'SANDBOX',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    provider_transaction_code VARCHAR(100) NULL,
    paid_at VARCHAR(50) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    INDEX idx_payment_txn (transaction_code),
    INDEX idx_payment_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. VE_DIEN_TU & TICKETS (US06 / US24)
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_code VARCHAR(50) NOT NULL UNIQUE,
    qr_payload TEXT NOT NULL,
    booking_item_id INT NULL,
    user_id INT NULL,
    trip_id INT NULL,
    seat_id INT NULL,
    voucher_id INT NULL,
    actual_price INT NOT NULL DEFAULT 0,
    held_until VARCHAR(50) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PAID',
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at VARCHAR(50) NULL,
    CONSTRAINT fk_ticket_bi FOREIGN KEY (booking_item_id) REFERENCES booking_items(id) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_seat FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL,
    INDEX idx_ticket_code (ticket_code),
    INDEX idx_ticket_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. DEMO_TICKETS (Test Compatibility)
CREATE TABLE IF NOT EXISTS demo_tickets (
    ticket_code VARCHAR(50) PRIMARY KEY,
    booking_code VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. NHAT_KY_SOAT_VE & TICKET_INSPECTIONS (US08 / US24 / US25)
CREATE TABLE IF NOT EXISTS ticket_inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NULL,
    ticket_code VARCHAR(50) NULL,
    staff_user_id INT NULL,
    staff_email VARCHAR(100) NULL,
    result VARCHAR(30) NOT NULL,
    inspected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT NULL,
    CONSTRAINT fk_insp_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
    CONSTRAINT fk_insp_staff FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_insp_time (inspected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. THONG_BAO & NOTIFICATIONS (Sprint 2 - US20)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO',
    channel VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_noti_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_noti_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. VE_THANG & MONTHLY_PASSES
CREATE TABLE IF NOT EXISTS monthly_passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    passenger_name VARCHAR(100) NULL,
    passenger_id_card VARCHAR(50) NULL,
    route_id INT NOT NULL,
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50) NOT NULL,
    price DECIMAL(12, 2) DEFAULT 300000.00,
    status VARCHAR(30) NOT NULL DEFAULT 'ConHan',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_mp_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. BAO_CAO_SU_CO & INCIDENT_REPORTS
CREATE TABLE IF NOT EXISTS incident_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    driver_id INT NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    description TEXT,
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'ChoXuLy',
    CONSTRAINT fk_ir_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    CONSTRAINT fk_ir_driver FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
