"""HTTP API for Frontend 3 (e-ticket, cancellation and QR inspection)."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from database import get_connection, initialize_database
from ticket_changes import TicketChangeError, cancel_ticket, change_seat


app = FastAPI(title="Bus Ticket API - Backend 3", version="1.0.0")


class CancelRequest(BaseModel):
    user_id: int = Field(..., gt=0)


class ChangeSeatRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    new_seat_number: str = Field(..., min_length=1)


class VerifyRequest(BaseModel):
    ticket_code: str = Field(..., min_length=1)
    staff_user_id: int = Field(..., gt=0)


def _ticket_query():
    return """
        SELECT t.id AS ticket_id, t.ticket_code, t.qr_payload, t.status,
               b.id AS booking_id, b.booking_code, b.total_amount,
               tr.origin AS departure_city, tr.destination AS arrival_city,
               tr.origin || ' - ' || tr.destination AS route_name,
               tr.departure_at AS departure_time, tr.arrival_at AS arrival_time,
               s.seat_number
        FROM tickets t
        JOIN booking_items bi ON bi.id = t.booking_item_id
        JOIN bookings b ON b.id = bi.booking_id
        JOIN trips tr ON tr.id = b.trip_id
        JOIN seats s ON s.id = bi.seat_id
    """


def _serialize_ticket(row: Any) -> dict[str, Any]:
    return {
        "ticket_id": row["ticket_id"],
        "ticket_code": row["ticket_code"],
        "booking_id": row["booking_id"],
        "booking_code": row["booking_code"],
        "route_name": row["route_name"],
        "departure_city": row["departure_city"],
        "arrival_city": row["arrival_city"],
        "departure_time": row["departure_time"],
        "arrival_time": row["arrival_time"],
        "seat_numbers": [row["seat_number"]],
        "price": row["total_amount"],
        "status": "CONFIRMED" if row["status"] == "PAID" else row["status"],
        "qr_payload": row["qr_payload"],
    }


def _find_ticket(connection, ticket_code: str):
    return connection.execute(
        _ticket_query() + " WHERE t.ticket_code = ?", (ticket_code,)
    ).fetchone()


@app.on_event("startup")
def startup() -> None:
    with get_connection() as connection:
        initialize_database(connection)


@app.get("/api/v1/tickets")
def list_tickets(user_id: int = Query(..., gt=0)):
    with get_connection() as connection:
        rows = connection.execute(
            _ticket_query() + " WHERE b.user_id = ? ORDER BY tr.departure_at",
            (user_id,),
        ).fetchall()
    return [_serialize_ticket(row) for row in rows]


@app.get("/api/v1/tickets/code/{code}")
def get_ticket_by_code(code: str, user_id: int = Query(..., gt=0)):
    with get_connection() as connection:
        row = connection.execute(
            _ticket_query() + " WHERE t.ticket_code = ? AND b.user_id = ?",
            (code.strip().upper(), user_id),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _serialize_ticket(row)


@app.get("/api/v1/tickets/{ticket_id}/download")
def download_ticket(ticket_id: int, user_id: int = Query(..., gt=0)):
    with get_connection() as connection:
        row = connection.execute(
            _ticket_query() + " WHERE t.id = ? AND b.user_id = ?", (ticket_id, user_id)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    # Return ticket data for the frontend to render/export; PDF generation is
    # intentionally left to the client because no PDF dependency is required.
    return _serialize_ticket(row)


@app.post("/api/v1/tickets/{ticket_id}/cancel")
def cancel_ticket_endpoint(ticket_id: int, payload: CancelRequest):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT ticket_code FROM tickets WHERE id = ?", (ticket_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Ticket not found")
        try:
            cancel_ticket(connection, row["ticket_code"], payload.user_id)
        except TicketChangeError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        updated = _find_ticket(connection, row["ticket_code"])
    return _serialize_ticket(updated)


@app.post("/api/v1/tickets/{ticket_id}/change-seat")
def change_seat_endpoint(ticket_id: int, payload: ChangeSeatRequest):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT ticket_code FROM tickets WHERE id = ?", (ticket_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Ticket not found")
        try:
            change_seat(connection, row["ticket_code"], payload.user_id,
                        payload.new_seat_number.strip().upper())
        except TicketChangeError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        updated = _find_ticket(connection, row["ticket_code"])
    return _serialize_ticket(updated)


@app.post("/api/v1/tickets/verify")
def verify_ticket(payload: VerifyRequest):
    code = payload.ticket_code.strip().upper()
    with get_connection() as connection:
        staff = connection.execute(
            "SELECT role FROM users WHERE id = ?", (payload.staff_user_id,)
        ).fetchone()
        if staff is None or staff["role"] not in ("STAFF", "ADMIN"):
            raise HTTPException(status_code=403, detail="Staff access required")

        row = _find_ticket(connection, code)
        if row is None:
            result = "INVALID"
            return {"valid": False, "result": result, "reason": "Ticket not found", "code": code}

        if row["status"] == "PAID":
            result = "VALID"
            valid = True
            reason = None
        elif row["status"] == "USED":
            result = "ALREADY_USED"
            valid = False
            reason = "Ticket already used"
        elif row["status"] in ("CANCELLED", "EXPIRED"):
            result = "CANCELLED"
            valid = False
            reason = "Ticket cancelled or expired"
        else:
            result = "UNPAID"
            valid = False
            reason = "Ticket has not been paid"

        connection.execute(
            "INSERT INTO ticket_inspections (ticket_id, staff_user_id, result, note) "
            "VALUES (?, ?, ?, ?)",
            (row["ticket_id"], payload.staff_user_id, result, reason),
        )
        if valid:
            connection.execute(
                "UPDATE tickets SET status = 'USED', used_at = CURRENT_TIMESTAMP WHERE id = ?",
                (row["ticket_id"],),
            )
        connection.commit()
    return {"valid": valid, "result": result, "reason": reason, "ticket": _serialize_ticket(row), "code": code}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="127.0.0.1", port=8003, reload=True)