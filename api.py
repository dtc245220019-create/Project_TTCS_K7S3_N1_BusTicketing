from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from database import get_connection

from datetime import datetime

def parse_report_date(value: Optional[str], field_name: str, *, end_of_day: bool = False):
    """Parse an admin report date using the backend's local-naive datetime convention."""
    if value is None:
        return None
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise HTTPException(422, f"{field_name} phải có định dạng YYYY-MM-DD") from exc
    if end_of_day:
        parsed = parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
    return parsed

router = APIRouter(prefix="/api/v1/admin")

@router.get("/revenue", summary="Báo cáo doanh thu theo kỳ, tuyến hoặc chuyến")
def revenue_report(
    from_date: Optional[str] = Query(None, description="Ngày bắt đầu, định dạng YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="Ngày kết thúc, định dạng YYYY-MM-DD"),
    route_id: Optional[int] = Query(None, gt=0),
    trip_id: Optional[int] = Query(None, gt=0),
):
    start = parse_report_date(from_date, "from_date")
    end = parse_report_date(to_date, "to_date", end_of_day=True)
    if start and end and start > end:
        raise HTTPException(422, "from_date không được sau to_date")

    conditions = ["p.status = 'SUCCESS'"]
    params = []
    if start:
        conditions.append("datetime(p.paid_at) >= datetime(?)")
        params.append(start.isoformat(sep=" "))
    if end:
        conditions.append("datetime(p.paid_at) <= datetime(?)")
        params.append(end.isoformat(sep=" "))
    if route_id:
        conditions.append("t.route_id = ?")
        params.append(route_id)
    if trip_id:
        conditions.append("t.id = ?")
        params.append(trip_id)

    where = " AND ".join(conditions)
    query = f"""
        SELECT p.id, p.transaction_code, p.booking_code, p.amount, p.provider,
               p.status, p.paid_at, p.created_at,
               b.id AS booking_id, b.trip_id,
               t.trip_code, t.origin, t.destination, t.route_id,
               r.name AS route_name,
               (SELECT COALESCE(SUM(f.approved_amount),0) FROM refunds f
                WHERE f.payment_id=p.id AND f.status='REFUNDED') AS refunded_amount
        FROM payments p
        LEFT JOIN bookings b ON b.id = p.booking_id
        LEFT JOIN trips t ON t.id = b.trip_id
        LEFT JOIN routes r ON r.id = t.route_id
        WHERE {where}
        ORDER BY datetime(COALESCE(p.paid_at, p.created_at)) DESC, p.id DESC
    """
    with get_connection() as c:
        rows = [dict(row) for row in c.execute(query, params).fetchall()]
        by_day = [dict(row) for row in c.execute(
            f"""
            SELECT substr(p.paid_at, 1, 10) AS date,
                   COUNT(*) AS transaction_count,
                   COALESCE(SUM(p.amount), 0) AS revenue
            FROM payments p
            LEFT JOIN bookings b ON b.id = p.booking_id
            LEFT JOIN trips t ON t.id = b.trip_id
            WHERE {where}
            GROUP BY substr(p.paid_at, 1, 10)
            ORDER BY date DESC
            """, params).fetchall()]

    refunded = sum(row["refunded_amount"] for row in rows)
    for row in rows:
        row["net_revenue"] = row["amount"] - row["refunded_amount"]
    for day in by_day:
        day["gross_revenue"] = day["revenue"]
        day["refunded_amount"] = sum(row["refunded_amount"] for row in rows
                                     if (row["paid_at"] or "")[:10] == (day["date"] or ""))
        day["revenue"] -= day["refunded_amount"]
    return {
        "filters": {
            "from_date": from_date,
            "to_date": to_date,
            "route_id": route_id,
            "trip_id": trip_id,
        },
        "transaction_count": len(rows),
        "gross_revenue": sum(row["amount"] or 0 for row in rows),
        "refunded_amount": refunded,
        "total_revenue": sum(row["amount"] or 0 for row in rows) - refunded,
        "by_day": by_day,
        "transactions": rows,
    }



def register_revenue(app, authenticated_admin):
    app.include_router(router, dependencies=[Depends(authenticated_admin)])


@router.get("/summary")
def summary():
    with get_connection() as c:
        result = {table: c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                  for table in ("users", "trips", "tickets", "payments")}
        result["revenue"] = c.execute("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status='SUCCESS'").fetchone()[0]
        result["gross_revenue"] = result["revenue"]
        result["refunded_amount"] = c.execute("SELECT COALESCE(SUM(approved_amount),0) FROM refunds WHERE status='REFUNDED'").fetchone()[0]
        result["revenue"] -= result["refunded_amount"]
        result["payment_statuses"] = [dict(r) for r in c.execute("SELECT status, COUNT(*) AS count, SUM(amount) AS amount FROM payments GROUP BY status")]
        return result

