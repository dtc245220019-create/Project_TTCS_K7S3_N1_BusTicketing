from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from database import get_connection

from be4_revenue import parse_report_date

router = APIRouter(prefix="/api/v1/admin")

@router.get("/occupancy/trips/{trip_id}", summary="Tỷ lệ lấp đầy của một chuyến")
def trip_occupancy(trip_id: int):
    with get_connection() as c:
        row = c.execute(
            """SELECT tr.id, tr.trip_code, tr.route_id, tr.origin, tr.destination,
                      tr.departure_at, tr.status,
                      COALESCE(b.total_seats, (SELECT COUNT(*) FROM seats sx WHERE sx.trip_id=tr.id), 0) AS total_seats,
                      (SELECT COUNT(*) FROM tickets tk
                       WHERE tk.trip_id=tr.id AND tk.status IN ('PAID','USED','DaThanhToan','DaSoat')) AS sold_seats
               FROM trips tr LEFT JOIN buses b ON b.id=tr.bus_id WHERE tr.id=?""", (trip_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Không tìm thấy chuyến xe")
        result = dict(row)
        result["occupancy_rate"] = round(result["sold_seats"] * 100 / result["total_seats"], 2) if result["total_seats"] else 0
        return result

@router.get("/occupancy", summary="Báo cáo tỷ lệ lấp đầy")
def occupancy_report(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    route_id: Optional[int] = Query(None, gt=0),
):
    start = parse_report_date(from_date, "from_date")
    end = parse_report_date(to_date, "to_date", end_of_day=True)
    if start and end and start > end:
        raise HTTPException(422, "from_date không được sau to_date")
    conditions, params = ["1=1"], []
    if start:
        conditions.append("datetime(tr.departure_at) >= datetime(?)")
        params.append(start.isoformat(sep=" "))
    if end:
        conditions.append("datetime(tr.departure_at) <= datetime(?)")
        params.append(end.isoformat(sep=" "))
    if route_id:
        conditions.append("tr.route_id=?")
        params.append(route_id)
    with get_connection() as c:
        rows = [dict(row) for row in c.execute(
            f"""SELECT tr.id, tr.trip_code, tr.route_id, tr.origin, tr.destination,
                       tr.departure_at, tr.status,
                       COALESCE(b.total_seats, (SELECT COUNT(*) FROM seats sx WHERE sx.trip_id=tr.id), 0) AS total_seats,
                       (SELECT COUNT(*) FROM tickets tk WHERE tk.trip_id=tr.id
                        AND tk.status IN ('PAID','USED','DaThanhToan','DaSoat')) AS sold_seats
                FROM trips tr LEFT JOIN buses b ON b.id=tr.bus_id
                WHERE {' AND '.join(conditions)} ORDER BY datetime(tr.departure_at) DESC""", params
        ).fetchall()]
    for row in rows:
        row["occupancy_rate"] = round(row["sold_seats"] * 100 / row["total_seats"], 2) if row["total_seats"] else 0
    return {"count": len(rows), "trips": rows}



def register_occupancy(app, authenticated_admin):
    app.include_router(router, dependencies=[Depends(authenticated_admin)])
