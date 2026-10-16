"""Trips, routes, and smart map router."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from database import get_connection, remove_accents
from routers.common import HoldSeatRequest, log_audit

router = APIRouter(tags=["Trips, Routes & Map"])

@router.get("/api/v1/trips", summary="Tra cứu danh sách chuyến xe (US01)")
def search_trips(
    origin: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
):
    from database import remove_accents

    with get_connection() as connection:
        query = """
            SELECT tr.*, r.name AS route_name, b.license_plate, b.bus_type
            FROM trips tr
            LEFT JOIN routes r ON r.id = tr.route_id
            LEFT JOIN buses b ON b.id = tr.bus_id
            WHERE tr.status = 'SCHEDULED'
        """
        params = []
        if origin and isinstance(origin, str):
            clean_orig = remove_accents(origin)
            query += " AND (clean_str(tr.origin) LIKE ? OR clean_str(r.departure_city) LIKE ?)"
            params.extend([f"%{clean_orig}%", f"%{clean_orig}%"])
        if destination and isinstance(destination, str):
            clean_dest = remove_accents(destination)
            query += " AND (clean_str(tr.destination) LIKE ? OR clean_str(r.arrival_city) LIKE ?)"
            params.extend([f"%{clean_dest}%", f"%{clean_dest}%"])
        if date and isinstance(date, str):
            query += " AND tr.departure_at LIKE ?"
            params.append(f"{date.strip()}%")

        query += " ORDER BY tr.departure_at ASC"
        rows = connection.execute(query, params).fetchall()

        # Nếu không có chuyến nào vào đúng ngày đã chọn nhưng có chuyến trên cùng tuyến,
        # tìm các chuyến xe sắp tới trên tuyến đó để người dùng dễ lựa chọn!
        if len(rows) == 0 and date and isinstance(date, str) and (origin or destination):
            fallback_query = """
                SELECT tr.*, r.name AS route_name, b.license_plate, b.bus_type
                FROM trips tr
                LEFT JOIN routes r ON r.id = tr.route_id
                LEFT JOIN buses b ON b.id = tr.bus_id
                WHERE tr.status = 'SCHEDULED'
            """
            fb_params = []
            if origin and isinstance(origin, str):
                clean_orig = remove_accents(origin)
                fallback_query += " AND (clean_str(tr.origin) LIKE ? OR clean_str(r.departure_city) LIKE ?)"
                fb_params.extend([f"%{clean_orig}%", f"%{clean_orig}%"])
            if destination and isinstance(destination, str):
                clean_dest = remove_accents(destination)
                fallback_query += " AND (clean_str(tr.destination) LIKE ? OR clean_str(r.arrival_city) LIKE ?)"
                fb_params.extend([f"%{clean_dest}%", f"%{clean_dest}%"])
            fallback_query += " ORDER BY tr.departure_at ASC"
            rows = connection.execute(fallback_query, fb_params).fetchall()

        results = []
        for r in rows:
            dest_lower = (r["destination"] or "").lower()
            orig_lower = (r["origin"] or "").lower()
            if "lạt" in dest_lower or "dalat" in dest_lower:
                duration_str = "6 tiếng 30 phút"
            elif "thái nguyên" in dest_lower or "thai nguyen" in dest_lower:
                duration_str = "2 tiếng"
            elif "huế" in dest_lower or "hue" in dest_lower:
                duration_str = "2 tiếng 30 phút"
            else:
                duration_str = "8 tiếng"

            dep_str = str(r["departure_at"] or "").replace("T", " ")
            arr_str = str(r["arrival_at"] or "").replace("T", " ")
            is_departed = False
            try:
                if len(dep_str) >= 16:
                    dep_dt = datetime.strptime(dep_str[:16], "%Y-%m-%d %H:%M")
                    if dep_dt <= datetime.now():
                        is_departed = True
            except Exception:
                pass

            dep_time = dep_str.split(" ")[-1][:5] if " " in dep_str else dep_str[:5]
            arr_time = arr_str.split(" ")[-1][:5] if " " in arr_str else arr_str[:5]
            dep_date = dep_str.split(" ")[0] if " " in dep_str else ""

            effective_status = "DEPARTED" if is_departed else r["status"]
            results.append({
                "id": r["id"],
                "trip_code": r["trip_code"],
                "operator": "Smart Bus Express",
                "busType": r["bus_type"] or "Giường nằm cao cấp",
                "license_plate": r["license_plate"] or "51B-888.88",
                "from": r["origin"],
                "to": r["destination"],
                "departure_at": dep_str,
                "arrival_at": arr_str,
                "departureTime": dep_time,
                "arrivalTime": arr_time,
                "departure_date": dep_date,
                "duration": duration_str,
                "price": r["base_price"],
                "availableSeatsCount": r["available_seats"] if r["available_seats"] is not None else 28,
                "status": effective_status,
                "is_departed": is_departed,
                "can_book": not is_departed and r["status"] == "SCHEDULED",
            })
        return results


@router.get("/api/v1/trips/{trip_id}", summary="Lấy chi tiết chuyến xe")
def get_trip_detail(trip_id: int):
    with get_connection() as connection:
        row = connection.execute(
            """SELECT tr.*, r.name AS route_name, b.license_plate, b.bus_type
               FROM trips tr
               LEFT JOIN routes r ON r.id = tr.route_id
               LEFT JOIN buses b ON b.id = tr.bus_id
               WHERE tr.id = ?""",
            (trip_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")
        return dict(row)


# =============================================================================
# US02 & US03: SƠ ĐỒ GHẾ & TẠM GIỮ CHỖ (SEATS & HOLD SEATS)
# =============================================================================

@router.get("/api/v1/trips/{trip_id}/seats", summary="Lấy sơ đồ ghế và trạng thái (US02)")
def get_trip_seats(trip_id: int):
    with get_connection() as connection:
        trip = connection.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        if not trip:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy chuyến xe {trip_id}")

        seats = connection.execute(
            "SELECT * FROM seats WHERE trip_id = ? ORDER BY seat_number ASC", (trip_id,)
        ).fetchall()

        now = datetime.now()
        seat_list = []
        available_count = 0

        for s in seats:
            seat_status = s["status"]
            held_until = s["held_until"]

            # Kiểm tra nếu hết hạn giữ ghế
            if seat_status == "HELD" and held_until:
                try:
                    expiry = datetime.fromisoformat(held_until)
                    if now > expiry:
                        seat_status = "AVAILABLE"
                        connection.execute(
                            "UPDATE seats SET status = 'AVAILABLE', held_until = NULL WHERE id = ?",
                            (s["id"],),
                        )
                except Exception:
                    pass

            if seat_status == "AVAILABLE":
                available_count += 1

            seat_list.append({
                "id": s["id"],
                "seat_number": s["seat_number"],
                "status": seat_status,
                "deck_or_row": s["deck_or_row"] or ("TangDuoi" if s["seat_number"].startswith("A") else "TangTren"),
                "seat_type": s["seat_type"],
                "held_until": s["held_until"],
            })

        connection.commit()
        return {
            "trip_id": trip["id"],
            "total_seats": len(seats),
            "available_seats": available_count,
            "seats": seat_list,
        }


@router.post("/api/v1/trips/{trip_id}/hold-seats", summary="Tạm giữ ghế 10 phút (US03)")
def hold_seats_endpoint(trip_id: int, payload: HoldSeatRequest):
    if not payload.seat_ids:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất 1 ghế")

    with get_connection() as connection:
        trip = connection.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        if not trip:
            raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")

        dep_str = str(trip["departure_at"] or "")
        try:
            if len(dep_str) >= 16:
                dep_dt = datetime.strptime(dep_str[:16], "%Y-%m-%d %H:%M")
                if dep_dt <= datetime.now():
                    raise HTTPException(status_code=400, detail="Chuyến xe này đã khởi hành (quá giờ đặt vé), không thể giữ chỗ!")
        except HTTPException:
            raise
        except Exception:
            pass

        placeholders = ",".join("?" for _ in payload.seat_ids)
        seats = connection.execute(
            f"SELECT * FROM seats WHERE trip_id = ? AND id IN ({placeholders})",
            [trip_id] + payload.seat_ids,
        ).fetchall()

        if len(seats) != len(payload.seat_ids):
            raise HTTPException(status_code=400, detail="Một số ghế không tồn tại hoặc không thuộc chuyến xe này")

        unavailable = [s["seat_number"] for s in seats if s["status"] != "AVAILABLE"]
        if unavailable:
            raise HTTPException(
                status_code=400,
                detail=f"Các ghế sau đang được giữ hoặc đã đặt: {', '.join(unavailable)}. Vui lòng chọn ghế khác.",
            )

        held_time = (datetime.now() + timedelta(minutes=10)).isoformat()
        for s in seats:
            connection.execute(
                "UPDATE seats SET status = 'HELD', held_until = ? WHERE id = ?",
                (held_time, s["id"]),
            )

        connection.execute(
            "UPDATE trips SET available_seats = available_seats - ? WHERE id = ?",
            (len(seats), trip_id),
        )
        connection.commit()

        return {
            "message": "Tạm giữ ghế thành công trong 10 phút!",
            "held_until": held_time,
            "seat_ids": payload.seat_ids,
            "seats": [s["seat_number"] for s in seats],
        }


# =============================================================================
# US04: AUTHENTICATION (REGISTER & LOGIN)
# =============================================================================



@router.get("/api/v1/routes", summary="Danh sách tuyến xe bus")
def get_routes():
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM routes WHERE status IN ('HoatDong', 'ACTIVE') OR status IS NULL ORDER BY id ASC").fetchall()
        return [dict(r) for r in rows]


@router.get("/api/v1/routes/{route_id}/stops", summary="Danh sách trạm dừng theo tuyến xe")
def get_route_stops(route_id: int):
    with get_connection() as connection:
        rows = connection.execute(
            """SELECT bs.*, rsd.stop_order, rsd.distance_km
               FROM bus_stops bs
               JOIN route_stop_details rsd ON rsd.stop_id = bs.id
               WHERE rsd.route_id = ?
               ORDER BY rsd.stop_order ASC""",
            (route_id,),
        ).fetchall()
        return [dict(r) for r in rows]


@router.get("/api/v1/map/overview", summary="Tổng quan bản đồ mạng lưới xe buýt thông minh")
def get_map_overview():
    with get_connection() as connection:
        routes = connection.execute("SELECT * FROM routes").fetchall()
        buses = connection.execute("SELECT * FROM buses").fetchall()

        route_list = []
        for r in routes:
            stops = connection.execute(
                """SELECT bs.id, bs.name, bs.latitude, bs.longitude, bs.address, bs.city,
                          rsd.stop_order, rsd.distance_km
                   FROM bus_stops bs
                   JOIN route_stop_details rsd ON rsd.stop_id = bs.id
                   WHERE rsd.route_id = ?
                   ORDER BY rsd.stop_order ASC""",
                (r["id"],),
            ).fetchall()
            route_list.append({
                "id": r["id"],
                "name": r["name"],
                "departure_city": r["departure_city"],
                "arrival_city": r["arrival_city"],
                "base_price": r["base_price"],
                "distance_km": r["distance_km"],
                "stops": [dict(s) for s in stops],
            })

        bus_list = [dict(b) for b in buses]
        return {
            "routes": route_list,
            "buses": bus_list,
        }


