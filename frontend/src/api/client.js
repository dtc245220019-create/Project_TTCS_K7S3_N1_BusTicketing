/**
 * Base HTTP Client for Smart Bus Ticketing Frontend
 */
export const API_BASE_URL = 'http://127.0.0.1:8000';

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

// Re-export modular APIs for backwards compatibility
export * from './authApi.js';
export * from './tripsApi.js';
export * from './paymentsApi.js';
export * from './ticketsApi.js';
export * from './vouchersApi.js';
export * from './monthlyPassApi.js';
export * from './adminApi.js';
export * from './notificationsApi.js';
export * from './feedbackApi.js';
export * from './faqApi.js';
