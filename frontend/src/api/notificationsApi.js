import { fetchJson } from './client.js';

/**
 * 8. Thông báo (Notifications API)
 */
export function getNotifications(userId = null) {
  const url = userId ? `/api/v1/notifications?user_id=${userId}` : '/api/v1/notifications';
  return fetchJson(url);
}
