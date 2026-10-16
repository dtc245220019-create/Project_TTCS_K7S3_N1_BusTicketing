// Dịch vụ Phản ánh (US24).
// Backend dự kiến (nhờ team BE bổ sung):
//   POST /api/v1/feedbacks            body: { user_id, trip_id?, ticket_code?, category, rating_stars, content }
//   GET  /api/v1/feedbacks?user_id=   -> [{ id, category, rating_stars, content, status, admin_reply, created_at, ticket_code }]
// Trong lúc backend chưa có endpoint, phản ánh được lưu tạm ở localStorage để giao diện vẫn demo được.
import { fetchJson } from '../api';

export const CATEGORIES = [
  { id: 'SU_CO', label: 'Sự cố chuyến xe', icon: '🚧' },
  { id: 'THAI_DO', label: 'Thái độ phục vụ', icon: '🤝' },
  { id: 'THANH_TOAN', label: 'Thanh toán / Vé', icon: '💳' },
  { id: 'TIEN_NGHI', label: 'Vệ sinh & tiện nghi', icon: '🧼' },
  { id: 'KHAC', label: 'Góp ý khác', icon: '💡' },
];

export const STATUS = {
  DA_GUI: { label: 'Đã gửi', tone: 'info' },
  DANG_XU_LY: { label: 'Đang xử lý', tone: 'warn' },
  DA_PHAN_HOI: { label: 'Đã phản hồi', tone: 'ok' },
};

const LS_KEY = 'smartbus_feedbacks';
const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
};
const writeLocal = (rows) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {
    /* localStorage đầy hoặc bị chặn: bỏ qua */
  }
};
const ts = (row) => new Date(String(row.created_at).replace(' ', 'T')).getTime() || 0;

// Chỉ rơi về lưu cục bộ khi backend chưa có endpoint / không kết nối được.
// Lỗi nghiệp vụ (400/422...) thì ném ra để người dùng thấy.
const isBackendMissing = (err) => err instanceof TypeError || /404|not found|failed to fetch/i.test(err?.message || '');

export async function submitFeedback(payload) {
  try {
    const res = await fetchJson('/api/v1/feedbacks', { method: 'POST', body: JSON.stringify(payload) });
    return { ...res, synced: true };
  } catch (err) {
    if (!isBackendMissing(err)) throw err;
    const row = {
      id: `local-${Date.now()}`,
      ...payload,
      status: 'DA_GUI',
      admin_reply: null,
      created_at: new Date().toISOString(),
      local: true,
    };
    writeLocal([row, ...readLocal()]);
    return { ...row, synced: false };
  }
}

export async function listFeedbacks(userId) {
  const local = readLocal().filter((r) => r.user_id === userId);
  let remote = [];
  try {
    const data = await fetchJson(`/api/v1/feedbacks?user_id=${userId}`);
    remote = Array.isArray(data) ? data : data.items || [];
  } catch {
    /* backend chưa có endpoint: chỉ hiện bản lưu cục bộ */
  }
  return [...local, ...remote].sort((a, b) => ts(b) - ts(a));
}
