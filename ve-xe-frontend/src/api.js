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

// 8. Khuyến mãi & Phí dịch vụ (Sprint 2 - BE4)
export function getVouchers() {
  return fetchJson('/api/v1/vouchers');
}

export function applyVoucher(code, orderValue) {
  return fetchJson('/api/v1/vouchers/apply', {
    method: 'POST',
    body: JSON.stringify({ code, order_value: orderValue }),
  });
}

export function getFees() {
  return fetchJson('/api/v1/fees');
}

export function calculateFee(feeId, orderValue) {
  return fetchJson('/api/v1/fees/calculate', {
    method: 'POST',
    body: JSON.stringify({ fee_id: feeId, order_value: orderValue }),
  });
}

// 9. Cổng thanh toán VNPay & ZaloPay (Sprint 2 - BE1)
export function createVnpayPayment(amount, orderInfo = 'Thanh toan ve xe', bookingCode = null) {
  return fetchJson('/api/v1/payments/vnpay/create', {
    method: 'POST',
    body: JSON.stringify({ amount, order_info: orderInfo, booking_code: bookingCode }),
  });
}

export function createZalopayPayment(amount, bookingCode = null) {
  return fetchJson('/api/v1/payments/zalopay/create', {
    method: 'POST',
    body: JSON.stringify({ amount, booking_code: bookingCode }),
  });
}

// 10. Xác nhận lên xe sau khi soát vé (Sprint 2 - US24)
export function boardTicket(ticketCode, staffEmail = 'taixe.nguyen@smartbus.vn', tripId = null) {
  return fetchJson('/api/v1/tickets/boarding', {
    method: 'POST',
    body: JSON.stringify({ ticket_code: ticketCode, staff_email: staffEmail, trip_id: tripId }),
  });
}

export function getBoardingStatus(ticketCode, staffEmail = 'taixe.nguyen@smartbus.vn') {
  return fetchJson(`/api/v1/tickets/${ticketCode}/boarding?staff_email=${encodeURIComponent(staffEmail)}`);
}

// 11. Thông báo tức thì (Sprint 2 - US20)
export function getNotifications(userId = null) {
  const url = userId ? `/api/v1/notifications?user_id=${userId}` : '/api/v1/notifications';
  return fetchJson(url);
}

// 12. Danh sách tuyến xe (Routes)
export function getRoutes() {
  return fetchJson('/api/v1/routes');
}

// 13. Vé tháng - Đăng ký & Quản lý (Sprint 2 - US16)
export function getMonthlyPassPlans() {
  return fetchJson('/api/v1/monthly-passes/plans');
}

export function getMonthlyPasses(userId = null) {
  const url = userId ? `/api/v1/monthly-passes?user_id=${userId}` : '/api/v1/monthly-passes';
  return fetchJson(url);
}

export function registerMonthlyPass(payload) {
  return fetchJson('/api/v1/monthly-passes/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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

// 14. Quản trị hệ thống & Phân quyền RBAC (Sprint 2 - Admin Hub)
export function getAdminUsers() {
  return fetchJson('/api/v1/admin/users');
}

export function updateUserRole(userId, role) {
  return fetchJson(`/api/v1/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export function getAdminStats() {
  return fetchJson('/api/v1/admin/stats');
}

export function getAdminTrips() {
  return fetchJson('/api/v1/admin/trips');
}

export function updateTripStatus(tripId, status = null, driverId = null) {
  return fetchJson(`/api/v1/admin/trips/${tripId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, driver_id: driverId }),
  });
}

// 15. Nghiệp vụ Tài xế & Danh sách hành khách (Driver Manifest)
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

// 16. Báo cáo Doanh thu & Tỷ lệ lấp đầy ghế & Xuất CSV (Sprint 3 - US17/Revenue)
export function getAdminRevenue(groupBy = 'month', startDate = null, endDate = null) {
  let url = `/api/v1/admin/revenue?group_by=${groupBy}`;
  if (startDate) url += `&start_date=${startDate}`;
  if (endDate) url += `&end_date=${endDate}`;
  return fetchJson(url);
}

export function getAdminOccupancy() {
  return fetchJson('/api/v1/admin/occupancy');
}

export function getRevenueExportUrl() {
  return `${API_BASE_URL}/api/v1/admin/revenue/export`;
}

// 17. Duyệt hồ sơ ưu đãi sinh viên / linh hoạt (Sprint 3 - US23)
export function getPendingDiscounts() {
  return fetchJson('/api/v1/admin/discounts/pending');
}

export function approveDiscount(userId, approved = true, notes = '') {
  return fetchJson(`/api/v1/admin/discounts/${userId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ approved, notes }),
  });
}

// 18. Quản lý Vouchers (Sprint 3 - US18)
export function createNewVoucher(voucherData) {
  return fetchJson('/api/v1/vouchers', {
    method: 'POST',
    body: JSON.stringify(voucherData),
  });
}

// 19. Quản lý Hủy vé & Hoàn tiền (Sprint 3 - US08)
export function getAdminRefunds() {
  return fetchJson('/api/v1/admin/refunds');
}

export function approveRefundRequest(id, note = '') {
  return fetchJson(`/api/v1/admin/refunds/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function rejectRefundRequest(id, note = '') {
  return fetchJson(`/api/v1/admin/refunds/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
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

// 20. Quản lý Phản ánh & Đánh giá Feedbacks (Sprint 3 - US24)
export function getFeedbacksList() {
  return fetchJson('/api/v1/feedbacks');
}

export function updateFeedbackStatus(feedbackId, status) {
  return fetchJson(`/api/v1/feedbacks/${feedbackId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function submitFeedbackForm(feedbackData) {
  return fetchJson('/api/v1/feedbacks', {
    method: 'POST',
    body: JSON.stringify(feedbackData),
  });
}

// 21. Audit Logs - Nhật ký hoạt động kiểm toán (Sprint 3 - US17)
export function getAuditLogs(limit = 100) {
  return fetchJson(`/api/v1/admin/audit-logs?limit=${limit}`);
}
