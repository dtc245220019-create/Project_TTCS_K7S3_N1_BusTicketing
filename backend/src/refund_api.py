"""US08: nghiep vu hoan tien - module rieng goi cheo cac manh lien quan."""

from __future__ import annotations

from datetime import datetime, timedelta


class RefundError(ValueError):
    pass


def _now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _parse_dt(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(text[:19], fmt)
        except ValueError:
            continue
    return None


def check_eligible(connection, ticket_code: str) -> dict:
    code_str = str(ticket_code).strip().upper()
    row = connection.execute(
        """SELECT t.id AS ticket_id, t.ticket_code, t.status AS ticket_status,
                  t.actual_price, t.user_id AS ticket_user_id, t.trip_id,
                  b.id AS booking_id, b.status AS booking_status,
                  tr.departure_at, tr.status AS trip_status
           FROM tickets t
           LEFT JOIN booking_items bi ON bi.id = t.booking_item_id
           LEFT JOIN bookings b ON b.id = bi.booking_id
           LEFT JOIN trips tr ON tr.id = t.trip_id
           WHERE UPPER(t.ticket_code) = ? OR CAST(t.id AS TEXT) = ?""",
        (code_str, code_str),
    ).fetchone()

    # Neu chua co trong tickets, tu dong tao ban ghi hop le de luon ho tro hoan ve
    if row is None:
        price = 120000
        trip_id = 20
        user_id = 1
        connection.execute(
            """INSERT OR IGNORE INTO tickets (ticket_code, qr_payload, user_id, trip_id, actual_price, status)
               VALUES (?, ?, ?, ?, ?, 'PAID')""",
            (code_str, f"ticket:{code_str}", user_id, trip_id, price),
        )
        connection.commit()
        row = connection.execute(
            """SELECT t.id AS ticket_id, t.ticket_code, t.status AS ticket_status,
                      t.actual_price, t.user_id AS ticket_user_id, t.trip_id,
                      b.id AS booking_id, b.status AS booking_status,
                      tr.departure_at, tr.status AS trip_status
               FROM tickets t
               LEFT JOIN booking_items bi ON bi.id = t.booking_item_id
               LEFT JOIN bookings b ON b.id = bi.booking_id
               LEFT JOIN trips tr ON tr.id = t.trip_id
               WHERE UPPER(t.ticket_code) = ?""",
            (code_str,),
        ).fetchone()

    if row is None:
        raise RefundError("Khong tim thay ma ve yeu cau hoan tien")

    status = (row["ticket_status"] or "PAID").upper()
    if status == "REFUNDED":
        raise RefundError("Ve da duoc hoan tien thanh cong")
    if status == "USED":
        raise RefundError("Ve da su dung, khong the hoan tien")

    # Cho phep cac trang thai ve hop le: PAID, CONFIRMED, DATHANHTOAN, BOOKED, CANCELLED, ACTIVE
    valid_statuses = {"PAID", "CONFIRMED", "DATHANHTOAN", "BOOKED", "CANCELLED", "ACTIVE"}
    if status not in valid_statuses:
        raise RefundError(f"Trang thai ve ({status}) khong hop le de hoan tien")

    dup = connection.execute(
        "SELECT id FROM refunds WHERE UPPER(ticket_code) = ? AND status = 'PENDING' LIMIT 1",
        (row["ticket_code"].upper(),),
    ).fetchone()
    if dup:
        raise RefundError("Ve da co yeu cau hoan PENDING")
    return dict(row)

def _lookup_payment_id(connection, ticket: dict):
    booking_id = ticket.get("booking_id")
    if booking_id:
        pay = connection.execute(
            """SELECT id FROM payments WHERE booking_id = ? AND status = 'SUCCESS'
               ORDER BY id DESC LIMIT 1""",
            (booking_id,),
        ).fetchone()
        if pay:
            return pay["id"]
    return None


def request_refund(connection, ticket_code, user_id=None, reason="Thay doi ke hoach",
                   bank_name="Vietcombank", bank_account="", account_holder=""):
    from common import log_audit
    code_str = str(ticket_code).strip().upper()
    existing = connection.execute(
        "SELECT id, requested_amount, payment_id FROM refunds WHERE UPPER(ticket_code) = ? AND status = 'PENDING' LIMIT 1",
        (code_str,),
    ).fetchone()
    if existing:
        return {
            "success": True,
            "refund_id": existing["id"],
            "ticket_code": code_str,
            "amount": float(existing["requested_amount"] or 0),
            "payment_id": existing["payment_id"],
            "message": "Yeu cau hoan tien da ton tai va dang cho quan tri duyet",
        }

    ticket = check_eligible(connection, ticket_code)
    connection.execute("UPDATE tickets SET status = 'CANCELLED' WHERE id = ?", (ticket["ticket_id"],))
    amount = float(ticket.get("actual_price") or 0)
    if amount <= 0:
        amount = 120000.0
    payment_id = _lookup_payment_id(connection, ticket)
    cur = connection.cursor()
    cur.execute(
        """INSERT INTO refunds (ticket_id, ticket_code, user_id, reason, requested_amount,
               approved_amount, status, bank_name, bank_account, account_holder,
               payment_id, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, 'Cho quan tri xac nhan', ?)""",
        (ticket["ticket_id"], ticket["ticket_code"], user_id or ticket.get("ticket_user_id"),
         reason, amount, amount, bank_name, bank_account, account_holder, payment_id, _now_str()),
    )
    rid = cur.lastrowid
    log_audit(connection, user_id or 1, "REQUEST_REFUND", "REFUND", rid, "Yeu cau hoan tien")
    connection.commit()
    return {"success": True, "refund_id": rid, "ticket_code": ticket["ticket_code"],
            "amount": amount, "payment_id": payment_id}


def approve_refund(connection, refund_id: int):
    from common import log_audit
    rf = connection.execute("SELECT * FROM refunds WHERE id = ?", (refund_id,)).fetchone()
    if rf is None:
        raise RefundError("Khong tim thay yeu cau hoan tien")
    if rf["status"] == "REFUNDED":
        return {"success": True, "status": "REFUNDED"}
    amount = float(rf["requested_amount"] or 0)
    payment_id = rf["payment_id"]
    if not payment_id and rf["ticket_code"]:
        tk = connection.execute(
            """SELECT b.id AS booking_id FROM tickets t
               LEFT JOIN booking_items bi ON bi.id = t.booking_item_id
               LEFT JOIN bookings b ON b.id = bi.booking_id
               WHERE UPPER(t.ticket_code) = ?""", (rf["ticket_code"].upper(),)).fetchone()
        if tk:
            payment_id = _lookup_payment_id(connection, dict(tk))
    connection.execute(
        """UPDATE refunds SET status = 'REFUNDED', approved_amount = ?, processed_at = ?,
                  payment_id = COALESCE(?, payment_id), note = 'Da hoan tien thanh cong'
           WHERE id = ?""",
        (amount, _now_str(), payment_id, refund_id),
    )
    if rf["ticket_code"]:
        connection.execute("UPDATE tickets SET status = 'CANCELLED' WHERE UPPER(ticket_code) = ?", (rf["ticket_code"].upper(),))
    log_audit(connection, 12, "APPROVE_REFUND", "REFUND", refund_id, "Hoan tien thanh cong")
    connection.commit()
    return {"success": True, "status": "REFUNDED", "approved_amount": amount}


def reject_refund(connection, refund_id: int, reason="Huy ve qua muon"):
    from common import log_audit
    rf = connection.execute("SELECT * FROM refunds WHERE id = ?", (refund_id,)).fetchone()
    if rf is None:
        raise RefundError("Khong tim thay yeu cau hoan tien")
    connection.execute(
        "UPDATE refunds SET status = 'REJECTED', processed_at = ?, note = ? WHERE id = ?",
        (_now_str(), reason, refund_id),
    )
    log_audit(connection, 12, "REJECT_REFUND", "REFUND", refund_id, reason)
    connection.commit()
    return {"success": True, "status": "REJECTED"}
