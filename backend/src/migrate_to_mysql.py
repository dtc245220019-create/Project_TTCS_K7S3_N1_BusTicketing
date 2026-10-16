"""MySQL Migration Tool for Smart Bus Ticketing System (Sprint 2).

Migrates schema and all live records from SQLite into MySQL Server:
- Users, Routes, Bus Stops, Buses, Trips, Seats (36 seats / trip)
- Vouchers, Fees, Bookings, Booking Items, Payments, Tickets, Inspections, Notifications
"""

import argparse
import os
import sqlite3
import sys
from pathlib import Path

try:
    import pymysql
    from pymysql.constants import CLIENT
except ImportError:
    print("[ERROR] PyMySQL chưa được cài đặt. Vui lòng chạy: pip install pymysql")
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent
SQLITE_DB = BASE_DIR / "data" / "bus_booking.db"
SCHEMA_SQL = BASE_DIR / "schema_mysql.sql"

TABLES_ORDER = [
    "users",
    "routes",
    "bus_stops",
    "route_stop_details",
    "buses",
    "trips",
    "seats",
    "vouchers",
    "fees",
    "bookings",
    "booking_items",
    "payments",
    "tickets",
    "demo_tickets",
    "ticket_inspections",
    "notifications",
    "monthly_passes",
    "incident_reports",
]


def run_migration(host, port, user, password, db_name):
    print("=" * 70)
    print("  🚀 CHƯƠNG TRÌNH DI CHUYỂN DỮ LIỆU SANG MYSQL (SPRINT 2)")
    print("=" * 70)
    print(f"-> MySQL Server : {host}:{port}")
    print(f"-> User         : {user}")
    print(f"-> Database     : {db_name}")
    print(f"-> Nguồn SQLite : {SQLITE_DB}")
    print("-" * 70)

    # 1. Kết nối tới MySQL Server (không chọn db trước để tạo db nếu chưa có)
    try:
        conn_server = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            charset="utf8mb4",
            client_flag=CLIENT.MULTI_STATEMENTS,
            autocommit=True,
        )
        print("[OK] Đã kết nối thành công tới máy chủ MySQL Server!")
    except Exception as e:
        print(f"[THẤT BẠI] Không thể kết nối tới MySQL Server ({host}:{port}): {e}")
        print("\n💡 Gợi ý khắc phục:")
        print("  1. Hãy chắc chắn dịch vụ MySQL (hoặc XAMPP / WampServer) đang BẬT.")
        print("  2. Kiểm tra mật khẩu tài khoản 'root' và cổng kết nối (mặc định 3306).")
        print("  3. Bạn có thể truyền mật khẩu: python migrate_to_mysql.py --password <mat_khau>")
        return False

    with conn_server.cursor() as cur:
        # 2. Tạo Database
        cur.execute(
            f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        )
        cur.execute(f"USE `{db_name}`;")
        print(f"[OK] Cơ sở dữ liệu '{db_name}' đã sẵn sàng!")

        # 3. Chạy Schema MySQL
        if SCHEMA_SQL.exists():
            with open(SCHEMA_SQL, "r", encoding="utf-8") as f:
                schema_content = f.read()
            # Thực thi schema
            for statement in schema_content.split(";"):
                stmt = statement.strip()
                if stmt:
                    try:
                        cur.execute(stmt)
                    except Exception as err:
                        # Bỏ qua lỗi nếu bảng đã tồn tại
                        if "already exists" not in str(err).lower():
                            print(f"[CẢNH BÁO] Lỗi thực thi lệnh: {err}")
            print("[OK] Đã khởi tạo hoàn chỉnh 18 bảng cấu trúc ERD trên MySQL!")

    conn_server.close()

    # 4. Di chuyển dữ liệu từ SQLite sang MySQL
    if not SQLITE_DB.exists():
        print(f"[CẢNH BÁO] Không tìm thấy file SQLite tại {SQLITE_DB}. Khởi tạo bảng rỗng thành công.")
        return True

    sq_conn = sqlite3.connect(SQLITE_DB)
    sq_conn.row_factory = sqlite3.Row

    my_conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db_name,
        charset="utf8mb4",
        autocommit=False,
    )

    print("-" * 70)
    print("-> Bắt đầu đồng bộ bản ghi từng bảng sang MySQL:")

    total_migrated = 0
    with my_conn.cursor() as my_cur:
        # Tắt kiểm tra khóa ngoại tạm thời để nạp dữ liệu sạch
        my_cur.execute("SET FOREIGN_KEY_CHECKS = 0;")

        for table in TABLES_ORDER:
            # Kiểm tra bảng có tồn tại trong SQLite không
            has_table = sq_conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
            ).fetchone()
            if not has_table:
                continue

            rows = sq_conn.execute(f"SELECT * FROM {table}").fetchall()
            if not rows:
                print(f"  • {table:<22} : 0 bản ghi")
                continue

            columns = rows[0].keys()
            cols_str = ", ".join([f"`{c}`" for c in columns])
            placeholders = ", ".join(["%s"] * len(columns))
            insert_sql = f"INSERT IGNORE INTO `{table}` ({cols_str}) VALUES ({placeholders})"

            data_tuples = [tuple(r[c] for c in columns) for r in rows]
            try:
                my_cur.executemany(insert_sql, data_tuples)
                my_conn.commit()
                print(f"  • {table:<22} : ✅ Đã nạp {len(rows):>4} bản ghi")
                total_migrated += len(rows)
            except Exception as e:
                print(f"  • {table:<22} : ⚠️ Lỗi nạp dữ liệu: {e}")

        # Bật lại kiểm tra khóa ngoại
        my_cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
        my_conn.commit()

    sq_conn.close()
    my_conn.close()

    print("-" * 70)
    print(f"🎉 DI CHUYỂN HOÀN TẤT THÀNH CÔNG! Tổng cộng {total_migrated} bản ghi đã lưu vào MySQL `{db_name}`.")
    print("=" * 70)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chuyển đổi CSDL BusTicketing từ SQLite sang MySQL")
    parser.add_argument("--host", default=os.getenv("MYSQL_HOST", "127.0.0.1"), help="MySQL Host (mặc định: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=int(os.getenv("MYSQL_PORT", 3306)), help="MySQL Port (mặc định: 3306)")
    parser.add_argument("--user", default=os.getenv("MYSQL_USER", "root"), help="MySQL User (mặc định: root)")
    parser.add_argument("--password", default=os.getenv("MYSQL_PASSWORD", ""), help="MySQL Password")
    parser.add_argument("--database", default=os.getenv("MYSQL_DB", "smart_bus_ticketing"), help="MySQL Database (mặc định: smart_bus_ticketing)")

    args = parser.parse_args()
    success = run_migration(args.host, args.port, args.user, args.password, args.database)
    if not success:
        sys.exit(1)
