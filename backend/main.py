"""Main Entry Point for Smart Bus Ticketing System Backend.

Integrates:
- Unified FastAPI application with all 8 functional routers from backend/api
- BackgroundScheduler (Cronjob tự động quét và giải phóng ghế tạm giữ hết hạn)
- Lifespan management
- Seed data on startup
"""

from __future__ import annotations

import os
import sys

# Ensure backend, backend/src, and backend/api are on sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_src_dir = os.path.join(_current_dir, "src")
_api_dir = os.path.join(_current_dir, "api")
for _p in [_current_dir, _src_dir, _api_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

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

# Import core dependencies from backend/src
from database import get_connection, initialize_database
from seed_data import seed_database, seed_rich_demo_data

# Import API application from backend/api
from api import app as api_app


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


# Gán lifespan cho app
api_app.router.lifespan_context = lifespan
app = api_app


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
