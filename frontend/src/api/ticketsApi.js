import { fetchJson } from './client.js';

/**
 * 4. Vé điện tử, Đổi vé, Hủy vé & Soát vé (Tickets & Boarding API)
 */
export function getTickets(userId) {
  return fetchJson(`/api/v1/tickets?user_id=${userId}`);
}

export function getTicketByCode(ticketCode, userId = null) {
  const url = userId ? `/api/v1/tickets/code/${ticketCode}?user_id=${userId}` : `/api/v1/tickets/code/${ticketCode}`;
  return fetchJson(url);
}

export function cancelTicket(ticketId, userId = 1) {
  return fetchJson(`/api/v1/tickets/${ticketId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export function changeTicketSeat(ticketId, newSeatNumber, userId = 1) {
  return fetchJson(`/api/v1/tickets/${ticketId}/change-seat`, {
    method: 'POST',
    body: JSON.stringify({ new_seat_number: newSeatNumber, user_id: userId }),
  });
}

export function changeTicketTrip(ticketId, newTripId, newSeatNumber = null, userId = 1) {
  return fetchJson(`/api/v1/tickets/${ticketId}/change-trip`, {
    method: 'POST',
    body: JSON.stringify({ new_trip_id: newTripId, new_seat_number: newSeatNumber, user_id: userId }),
  });
}

export function verifyTicket(ticketCode, staffEmail = 'taixe.nguyen@smartbus.vn') {
  return fetchJson('/api/v1/tickets/verify', {
    method: 'POST',
    body: JSON.stringify({ ticket_code: ticketCode, staff_email: staffEmail }),
  });
}

export function getRecentInspections() {
  return fetchJson('/api/v1/inspections/recent');
}

export function boardTicket(ticketCode, staffEmail = 'taixe.nguyen@smartbus.vn', tripId = null) {
  return fetchJson('/api/v1/tickets/boarding', {
    method: 'POST',
    body: JSON.stringify({ ticket_code: ticketCode, staff_email: staffEmail, trip_id: tripId }),
  });
}

export function getBoardingStatus(ticketCode, staffEmail = 'taixe.nguyen@smartbus.vn') {
  return fetchJson(`/api/v1/tickets/${ticketCode}/boarding?staff_email=${encodeURIComponent(staffEmail)}`);
}

export function getDriverTrips(driverId = null) {
  const url = driverId ? `/api/v1/driver/trips?driver_id=${driverId}` : '/api/v1/driver/trips';
  return fetchJson(url);
}

export function boardPassenger(ticketId, staffEmail = 'taixe.nguyen@smartbus.vn') {
  return fetchJson('/api/v1/driver/board-passenger', {
    method: 'POST',
    body: JSON.stringify({ ticket_id: ticketId, staff_email: staffEmail }),
  });
}

export function requestRefundTicket(payload) {
  return fetchJson('/api/v1/refunds/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkRefundStatus(refundCode) {
  return fetchJson(`/api/v1/refunds/status/${refundCode}`);
}
