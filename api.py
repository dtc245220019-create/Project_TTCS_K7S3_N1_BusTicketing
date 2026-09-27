"""Sandbox payment and ticket inspection API for Frontend 1."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import get_connection, initialize_database


app = FastAPI(title="Bus Ticket API - Backend 4", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class PaymentRequest(BaseModel):
    booking_code: str = Field(..., min_length=1)
    amount: int = Field(..., ge=0)
    provider: str = Field(default="SANDBOX", pattern="^(SANDBOX|MOMO|VNPAY)$")


class CallbackRequest(BaseModel):
    status: str = Field(..., pattern="^(SUCCESS|FAILED)$")
    provider_transaction_code: str | None = None


class InspectionRequest(BaseModel):
    ticket_code: str = Field(..., min_length=1)
    staff_email: str = Field(..., min_length=3)


@app.on_event("startup")
def startup() -> None:
    with get_connection() as connection:
        initialize_database(connection)


def _payment(row) -> dict:
    return dict(row)


@app.post("/api/v1/payments", status_code=201)
def create_payment(payload: PaymentRequest):
    booking = payload.booking_code.strip().upper()
    provider = payload.provider.strip().upper()
    if not booking:
        raise HTTPException(status_code=422, detail="booking_code is required")
    transaction = f"TXN-SANDBOX-{uuid4().hex.upper()}"
    with get_connection() as connection:
        connection.execute(
            "INSERT INTO payments (booking_code, transaction_code, amount, provider, status) "
            "VALUES (?, ?, ?, ?, 'PENDING')",
            (booking, transaction, payload.amount, provider),
        )
        connection.commit()
        row = connection.execute(
            "SELECT * FROM payments WHERE transaction_code = ?", (transaction,)
        ).fetchone()
    return _payment(row)


@app.get("/api/v1/payments/{transaction_code}")
def get_payment(transaction_code: str):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM payments WHERE transaction_code = ?", (transaction_code.upper(),)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return _payment(row)


@app.post("/api/v1/payments/{transaction_code}/callback")
def payment_callback(transaction_code: str, payload: CallbackRequest):
    code = transaction_code.upper()
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            "SELECT * FROM payments WHERE transaction_code = ?", (code,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Payment not found")
        if row["status"] != "PENDING":
            if row["status"] == payload.status:
                return _payment(row)
            raise HTTPException(status_code=409, detail="Payment already finalized")
        now = datetime.now(timezone.utc).isoformat() if payload.status == "SUCCESS" else None
        connection.execute(
            "UPDATE payments SET status = ?, provider_transaction_code = ?, paid_at = ? "
            "WHERE transaction_code = ?",
            (payload.status, payload.provider_transaction_code, now, code),
        )
        connection.commit()
        updated = connection.execute(
            "SELECT * FROM payments WHERE transaction_code = ?", (code,)
        ).fetchone()
    return _payment(updated)


@app.post("/api/v1/tickets/verify")
def verify_ticket(payload: InspectionRequest):
    ticket = payload.ticket_code.strip().upper()
    staff = payload.staff_email.strip().lower()
    if not ticket or not staff:
        raise HTTPException(status_code=422, detail="Ticket code and staff email are required")
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        demo_ticket = connection.execute(
            "SELECT * FROM demo_tickets WHERE ticket_code = ?", (ticket,)
        ).fetchone()
        payment = connection.execute(
            "SELECT * FROM payments WHERE booking_code = ? AND status = 'SUCCESS' ORDER BY id DESC LIMIT 1",
            (demo_ticket["booking_code"],),
        ).fetchone() if demo_ticket else None
        if demo_ticket is None:
            result, valid, reason = "INVALID", False, "Ticket not found"
        elif demo_ticket["status"] == "CANCELLED":
            result, valid, reason = "CANCELLED", False, "Ticket cancelled"
        elif payment is not None:
            previous = connection.execute(
                "SELECT 1 FROM ticket_inspections WHERE ticket_code = ? AND result = 'VALID'",
                (ticket,),
            ).fetchone()
            result, valid, reason = (("ALREADY_USED", False, "Ticket already used") if previous
                                     else ("VALID", True, None))
        else:
            result, valid, reason = "UNPAID", False, "Ticket has not been paid"
        connection.execute(
            "INSERT INTO ticket_inspections (ticket_code, staff_email, result, note) VALUES (?, ?, ?, ?)",
            (ticket, staff, result, reason),
        )
        connection.commit()
    return {"valid": valid, "result": result, "reason": reason, "ticket_code": ticket}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8004, reload=True)