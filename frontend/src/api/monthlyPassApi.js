import { fetchJson } from './client.js';

/**
 * 6. Vé tháng - Đăng ký & Quản lý (Monthly Pass API)
 */
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
