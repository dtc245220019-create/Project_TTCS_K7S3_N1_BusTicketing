import { fetchJson } from './client.js';

/**
 * 3. Đơn hàng & Cổng thanh toán (Payments & Orders API)
 */
export function createOrder(orderPayload) {
  return fetchJson('/api/v1/payments/create-order', {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });
}

export function getPaymentStatus(transactionCode) {
  return fetchJson(`/api/v1/payments/${transactionCode}`);
}

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
