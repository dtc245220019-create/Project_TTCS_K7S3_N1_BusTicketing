"""Main Entry Point for Smart Bus Ticketing System Backend.

Integrates:
- Unified FastAPI application with all User Stories
- BackgroundScheduler (Cronjob tự động quét và giải phóng ghế tạm giữ hết hạn)
- Lifespan management
- Seed data on startup
"""
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from contextlib import asynccontextmanager
from datetime import datetime
import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

# Import ứng dụng chính từ api.py
from api import app as api_app
from database import get_connection, initialize_database
from seed_data import seed_database, seed_rich_demo_data

# =============================================================================
# ĐĂNG KÝ TẤT CẢ CÁC ROUTER/MODULE TRONG DỰ ÁN
# =============================================================================
# 1. Module Thông báo (US20)
try:
    from notification import router as notification_router
    api_app.include_router(notification_router)
except (ImportError, AttributeError):
    pass

# 2. Module Soát vé / Test API
try:
    from test_api import router as test_api_router
    api_app.include_router(test_api_router)
except (ImportError, AttributeError):
    pass

# 3. Module Thay đổi / Hủy vé
try:
    from ticket_changes import router as ticket_changes_router
    api_app.include_router(ticket_changes_router)
except (ImportError, AttributeError):
    pass

# 4. Module Test Ticket Changes (nếu có)
try:
    from test_ticket_changes import router as test_ticket_changes_router
    api_app.include_router(test_ticket_changes_router)
except (ImportError, AttributeError):
    pass


# =============================================================================
# BACKGROUND JOB (CRONJOB TỰ ĐỘNG GIẢI PHÓNG GHẾ HẾT HẠN - US03)
# =============================================================================
def release_expired_seats_job():
    """Background Job quét và giải phóng tất cả ghế HELD đã hết hạn trong DB."""
    try:
        now_str = datetime.now().isoformat()
        with get_connection() as connection:
            expired_seats = connection.execute(
                "SELECT id, trip_id, seat_number FROM seats WHERE status = 'HELD' AND held_until < ?",
                (now_str,),
            ).fetchall()

            if expired_seats:
                affected_trips = {s["trip_id"] for s in expired_seats}
                for s in expired_seats:
                    connection.execute(
                        "UPDATE seats SET status = 'AVAILABLE', held_until = NULL WHERE id = ?",
                        (s["id"],),
                    )

                for trip_id in affected_trips:
                    avail_count = connection.execute(
                        "SELECT COUNT(*) FROM seats WHERE trip_id = ? AND status = 'AVAILABLE'",
                        (trip_id,),
                    ).fetchone()[0]
                    connection.execute(
                        "UPDATE trips SET available_seats = ? WHERE id = ?",
                        (avail_count, trip_id),
                    )

                connection.commit()
                print(f"[{datetime.now().strftime('%H:%M:%S')}] [CRONJOB] Da giai phong {len(expired_seats)} ghe het han giu!")
    except Exception as e:
        print(f"Loi Cronjob giai phong ghe: {e}")


scheduler = BackgroundScheduler()
scheduler.add_job(release_expired_seats_job, "interval", seconds=10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo database và dữ liệu mẫu nếu chưa có
    with get_connection() as connection:
        initialize_database(connection)
        user_count = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if user_count == 0:
            seed_database(connection)
            seed_rich_demo_data(connection)
            print("-> Da nap thanh cong bo du lieu mau ban dau!")
        else:
            seed_rich_demo_data(connection)

    # Khởi chạy scheduler
    scheduler.start()
    print("-> Background Scheduler (Cronjob tu dong nha ghe US03) da khoi chay thanh cong!")
    yield
    scheduler.shutdown()
    print("-> Background Scheduler da tat an toan.")


# Gán lifespan và export app
api_app.router.lifespan_context = lifespan
app = api_app

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)