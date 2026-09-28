// Centralized API Service for Smart Bus Ticketing
const API_BASE_URL = 'http://127.0.0.1:8000';

export async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || data.message || `Lỗi yêu cầu: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error);
    throw error;
  }
}

// 1. Chuyến xe (Trips)
export function getTrips(params = {}) {
  const query = new URLSearchParams();
  if (params.origin) query.append('origin', params.origin);
  if (params.destination) query.append('destination', params.destination);
  if (params.date) query.append('date', params.date);
  return fetchJson(`/api/v1/trips?${query.toString()}`);
}

export function getTripDetail(tripId) {
  return fetchJson(`/api/v1/trips/${tripId}`);
}

// 2. Sơ đồ ghế & Tạm giữ (Seats & Lock)
export function getTripSeats(tripId) {
  return fetchJson(`/api/v1/trips/${tripId}/seats`);
}

export function holdSeats(tripId, seatIds, userId = 1) {
  return fetchJson(`/api/v1/trips/${tripId}/hold-seats`, {
    method: 'POST',
    body: JSON.stringify({ seat_ids: seatIds, user_id: userId }),
  });
}

// 3. Đơn hàng & Thanh toán (Orders & Payments)
export function createOrder(orderPayload) {
  return fetchJson('/api/v1/payments/create-order', {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });
}

export function getPaymentStatus(transactionCode) {
  return fetchJson(`/api/v1/payments/${transactionCode}`);
}

// 4. Vé điện tử & Quản lý vé cá nhân (Tickets & Dashboard)
export function getTickets(userId) {
  return fetchJson(`/api/v1/tickets?user_id=${userId}`);
}

export function getTicketByCode(ticketCode, userId = null) {
  const url = userId ? `/api/v1/tickets/code/${ticketCode}?user_id=${userId}` : `/api/v1/tickets/code/${ticketCode}`;
  return fetchJson(url);
}

export function cancelTicket(ticketId, userId) {
  return fetchJson(`/api/v1/tickets/${ticketId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

// 5. Soát vé (Driver Verification)
export function verifyTicket(ticketCode, staffEmail = 'taixe.nguyen@smartbus.vn') {
  return fetchJson('/api/v1/tickets/verify', {
    method: 'POST',
    body: JSON.stringify({ ticket_code: ticketCode, staff_email: staffEmail }),
  });
}

export function getRecentInspections() {
  return fetchJson('/api/v1/inspections/recent');
}

// 6. Tài khoản & Xác thực (Auth)
export function loginUser(email, password) {
  return fetchJson('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function registerUser(userData) {
  return fetchJson('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

// 7. Bản đồ mạng lưới xe buýt (Smart Map)
export function getMapOverview() {
  return fetchJson('/api/v1/map/overview');
}

export function getRouteStops(routeId) {
  return fetchJson(`/api/v1/routes/${routeId}/stops`);
}

// Storage helpers
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('smartbus_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('smartbus_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('smartbus_user');
  }
}
