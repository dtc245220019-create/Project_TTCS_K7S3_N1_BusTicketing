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

export function forgotPassword(email) {
  return fetchJson('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(email, otp_code, new_password) {
  return fetchJson('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp_code, new_password }),
  });
}

export function updateProfile(profileData) {
  return fetchJson('/api/v1/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

export function registerDiscount(payload) {
  return fetchJson('/api/v1/auth/verify-discount', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getProfile(userId = 1) {
  return fetchJson(`/api/v1/auth/me?user_id=${userId}`);
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
