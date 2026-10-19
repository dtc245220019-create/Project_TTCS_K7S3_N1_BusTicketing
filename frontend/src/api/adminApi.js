import { fetchJson, API_BASE_URL } from './client.js';

/**
 * 7. Quản trị hệ thống & Phân quyền (Admin API)
 */
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

export function getAdminRevenue(groupBy = 'month', startDate = null, endDate = null) {
  let url = `/api/v1/admin/revenue?group_by=${groupBy}`;
  if (startDate) url += `&start_date=${startDate}`;
  if (endDate) url += `&end_date=${endDate}`;
  return fetchJson(url);
}

export function getAdminOccupancy() {
  return fetchJson('/api/v1/admin/occupancy');
}

export function getRevenueExportUrl(startDate = null, endDate = null) {
  let url = `${API_BASE_URL}/api/v1/admin/revenue/export`;
  const params = [];
  if (startDate) params.push(`from_date=${startDate}`);
  if (endDate) params.push(`to_date=${endDate}`);
  if (params.length) url += `?${params.join('&')}`;
  return url;
}

export function getPendingDiscounts() {
  return fetchJson('/api/v1/admin/discounts/pending');
}

export function approveDiscount(userId, approved = true, notes = '') {
  return fetchJson(`/api/v1/admin/discounts/${userId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ approved, status: approved ? 'DaDuyet' : 'TuChoi', notes }),
  });
}

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

export function getAuditLogs(limit = 100) {
  return fetchJson(`/api/v1/admin/audit-logs?limit=${limit}`);
}

export function createAdminRoute(payload) {
  return fetchJson('/api/v1/admin/routes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAdminRoutes() {
  return fetchJson('/api/v1/admin/routes');
}

export function createAdminStaff(payload) {
  return fetchJson('/api/v1/admin/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAdminStaff() {
  return fetchJson('/api/v1/admin/staff');
}

export function createAdminTrip(payload) {
  return fetchJson('/api/v1/admin/trips', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function assignTripStaff(tripId, payload) {
  return fetchJson(`/api/v1/admin/trips/${tripId}/assign`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
