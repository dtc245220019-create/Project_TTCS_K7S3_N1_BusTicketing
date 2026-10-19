import { fetchJson } from './client.js';

/**
 * 5. Khuyến mãi & Phí dịch vụ (Vouchers & Fees API)
 */
export function getVouchers() {
  return fetchJson('/api/v1/vouchers');
}

export function applyVoucher(code, orderValue) {
  return fetchJson('/api/v1/vouchers/apply', {
    method: 'POST',
    body: JSON.stringify({ code, order_value: orderValue }),
  });
}

export function createNewVoucher(voucherData) {
  return fetchJson('/api/v1/vouchers', {
    method: 'POST',
    body: JSON.stringify(voucherData),
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
