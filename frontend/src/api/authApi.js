import { fetchJson } from './client.js';

/**
 * 1. Tài khoản & Xác thực (Auth API)
 */
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
