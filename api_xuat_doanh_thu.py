from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from database import get_connection

import csv
import io
from fastapi.responses import StreamingResponse
from be4_revenue import revenue_report

router = APIRouter(prefix="/api/v1/admin")

@router.get("/revenue/export", summary="Xuất báo cáo doanh thu CSV")
def revenue_export(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    route_id: Optional[int] = Query(None, gt=0),
    trip_id: Optional[int] = Query(None, gt=0),
):
    report = revenue_report(from_date, to_date, route_id, trip_id)
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(["transaction_code", "booking_code", "amount", "provider", "paid_at",
                     "trip_code", "route_name", "origin", "destination", "refunded_amount", "net_revenue"])
    for row in report["transactions"]:
        values = [row.get("transaction_code"), row.get("booking_code"), row.get("amount"),
                         row.get("provider"), row.get("paid_at"), row.get("trip_code"),
                         row.get("route_name"), row.get("origin"), row.get("destination"),
                         row["refunded_amount"], row["net_revenue"]]
        writer.writerow(["'" + value if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@"))
                         else value for value in values])
    headers = {"Content-Disposition": "attachment; filename=revenue_report.csv"}
    return StreamingResponse(iter(["\ufeff" + output.getvalue()]), media_type="text/csv; charset=utf-8", headers=headers)



def register_export(app, authenticated_admin):
    app.include_router(router, dependencies=[Depends(authenticated_admin)])
