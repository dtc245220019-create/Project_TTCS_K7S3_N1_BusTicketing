"""Main Entry Point for Smart Bus Ticketing System Backend.

Integrates:
- Unified FastAPI application with all 8 User Stories (Including US16: Monthly Pass)
- BackgroundScheduler (Cronjob tự động quét và giải phóng ghế tạm giữ hết hạn)
- Lifespan management
- Seed data on startup
"""

import sys
from datetime import datetime, timedelta
from typing import Optional
from contextlib import asynccontextmanager

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from api import app as api_app
from database import get_connection, initialize_database
from seed_data import seed_database, seed_rich_demo_data

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


# =============================================================================
# PYDANTIC SCHEMAS CHO VÉ THÁNG (US16)
# =============================================================================
class MonthlyPassRegisterRequest(BaseModel):
    user_id: int
    passenger_name: str
    passenger_id_card: str  # CCCD hoặc Mã sinh viên/Học sinh
    route_id: int
    price: Optional[float] = 300000.0


# =============================================================================
# API ENDPOINTS CHO VÉ THÁNG (US16: MONTHLY PASS)
# =============================================================================
@api_app.post("/api/v1/monthly-passes/register", tags=["Vé Tháng"], summary="Đăng ký hoặc gia hạn vé tháng (Tự động +30 ngày)")
def register_or_renew_monthly_pass(req: MonthlyPassRegisterRequest):
    """
    Tự động tính toán hạn sử dụng 30 ngày:
    - Nếu vé hiện tại còn hạn: Cộng tiếp 30 ngày từ ngày hết hạn cũ.
    - Nếu chưa có vé hoặc vé cũ đã hết hạn: Tính 30 ngày bắt đầu từ ngày hôm nay.
    """
    today = datetime.today().date()

    with get_connection() as connection:
        # Kiểm tra tuyến xe có tồn tại không
        route = connection.execute("SELECT id FROM routes WHERE id = ?", (req.route_id,)).fetchone()
        if not route:
            raise HTTPException(status_code=404, detail="Tuyến xe không tồn tại")

        # Kiểm tra vé tháng hiện tại của người dùng đối với tuyến này
        existing_pass = connection.execute(
            """SELECT * FROM monthly_passes 
               WHERE user_id = ? AND route_id = ? 
               ORDER BY id DESC LIMIT 1""",
            (req.user_id, req.route_id),
        ).fetchone()

        if existing_pass:
            try:
                old_end_date = datetime.strptime(existing_pass["end_date"], "%Y-%m-%d").date()
            except Exception:
                old_end_date = today

            # Nếu vé cũ vẫn còn hạn, cộng tiếp 30 ngày từ ngày hết hạn cũ
            if old_end_date >= today:
                start_date = old_end_date
                end_date = old_end_date + timedelta(days=30)
            else:
                start_date = today
                end_date = today + timedelta(days=30)
        else:
            start_date = today
            end_date = today + timedelta(days=30)

        # Lưu thông tin vé tháng vào database
        cursor = connection.cursor()
        cursor.execute(
            """INSERT INTO monthly_passes 
               (user_id, passenger_name, passenger_id_card, route_id, start_date, end_date, price, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'ConHan')""",
            (
                req.user_id,
                req.passenger_name,
                req.passenger_id_card,
                req.route_id,
                start_date.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d"),
                req.price,
            ),
        )
        connection.commit()
        pass_id = cursor.lastrowid

        return {
            "message": "Đăng ký/Gia hạn vé tháng thành công!",
            "pass_info": {
                "id": pass_id,
                "user_id": req.user_id,
                "passenger_name": req.passenger_name,
                "passenger_id_card": req.passenger_id_card,
                "route_id": req.route_id,
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "duration_days": 30,
                "price": req.price,
                "status": "ConHan"
            }
        }


@api_app.get("/api/v1/monthly-passes/user/{user_id}", tags=["Vé Tháng"], summary="Lấy danh sách thẻ vé tháng điện tử của người dùng")
def get_user_monthly_passes(user_id: int):
    with get_connection() as connection:
        rows = connection.execute(
            """SELECT mp.*, r.name as route_name, r.departure_city, r.arrival_city 
               FROM monthly_passes mp
               JOIN routes r ON mp.route_id = r.id
               WHERE mp.user_id = ?
               ORDER BY mp.id DESC""",
            (user_id,),
        ).fetchall()

        today_str = datetime.today().strftime("%Y-%m-%d")
        result = []
        for r in rows:
            item = dict(r)
            # Cập nhật trạng thái hiển thị động nếu hết hạn
            if item["end_date"] < today_str:
                item["status"] = "HetHan"
            result.append(item)

        return result


# =============================================================================
# LIFESPAN & APPLICATION STARTUP
# =============================================================================
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