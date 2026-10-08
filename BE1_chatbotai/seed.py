from app.database import get_connection

def seed():
    conn = get_connection()
    cur = conn.cursor()

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        departure_city TEXT NOT NULL,
        arrival_city TEXT NOT NULL,
        base_price INTEGER NOT NULL,
        distance_km REAL DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_code TEXT NOT NULL UNIQUE,
        route_id INTEGER,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        departure_at TEXT NOT NULL,
        arrival_at TEXT,
        base_price INTEGER NOT NULL,
        status TEXT DEFAULT 'SCHEDULED',
        available_seats INTEGER DEFAULT 0,
        FOREIGN KEY(route_id) REFERENCES routes(id)
    );

    CREATE TABLE IF NOT EXISTS vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT,
        description TEXT,
        discount_percent INTEGER DEFAULT 0,
        max_discount INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_code TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        trip_id INTEGER,
        seat_number TEXT,
        status TEXT DEFAULT 'BOOKED',
        actual_price INTEGER DEFAULT 0,
        issued_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(trip_id) REFERENCES trips(id)
    );

    CREATE TABLE IF NOT EXISTS monthly_passes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        passenger_name TEXT,
        route_id INTEGER,
        start_date TEXT,
        end_date TEXT,
        price INTEGER,
        status TEXT DEFAULT 'ACTIVE',
        FOREIGN KEY(route_id) REFERENCES routes(id)
    );
    """)

    cur.execute("SELECT COUNT(*) FROM routes")
    if cur.fetchone()[0] == 0:
        cur.executemany("""
            INSERT INTO routes
            (name, departure_city, arrival_city, base_price, distance_km)
            VALUES (?, ?, ?, ?, ?)
        """, [
            ("Hà Nội - Thái Nguyên", "Hà Nội", "Thái Nguyên", 80000, 80),
            ("Hà Nội - Hải Phòng", "Hà Nội", "Hải Phòng", 120000, 120),
            ("Hà Nội - Đà Nẵng", "Hà Nội", "Đà Nẵng", 450000, 760),
            ("TP.HCM - Đà Lạt", "TP.HCM", "Đà Lạt", 280000, 310),
        ])

    cur.execute("SELECT COUNT(*) FROM trips")
    if cur.fetchone()[0] == 0:
        cur.executemany("""
            INSERT INTO trips
            (trip_code, route_id, origin, destination, departure_at,
             arrival_at, base_price, available_seats)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            ("HN-TN-001", 1, "Hà Nội", "Thái Nguyên",
             "2026-10-08 08:00", "2026-10-08 10:00", 80000, 18),
            ("HN-TN-002", 1, "Hà Nội", "Thái Nguyên",
             "2026-10-08 14:00", "2026-10-08 16:00", 80000, 25),
            ("HN-HP-001", 2, "Hà Nội", "Hải Phòng",
             "2026-10-08 09:00", "2026-10-08 11:30", 120000, 12),
            ("HN-DN-001", 3, "Hà Nội", "Đà Nẵng",
             "2026-10-08 20:00", "2026-10-09 08:00", 450000, 8),
            ("HCM-DL-001", 4, "TP.HCM", "Đà Lạt",
             "2026-10-08 21:00", "2026-10-09 05:30", 280000, 15),
        ])

    cur.execute("SELECT COUNT(*) FROM vouchers")
    if cur.fetchone()[0] == 0:
        cur.executemany("""
            INSERT INTO vouchers
            (code, name, description, discount_percent, max_discount)
            VALUES (?, ?, ?, ?, ?)
        """, [
            ("WELCOME10", "Welcome 10%", "Giảm 10% cho khách hàng mới", 10, 50000),
            ("BUS20", "Bus 20%", "Giảm 20% cho đơn đủ điều kiện", 20, 80000),
        ])

    conn.commit()
    conn.close()
    print("Database seeded successfully.")

if __name__ == "__main__":
    seed()
