// Dịch vụ Chatbot AI (US25) - gọi thẳng API của nhà cung cấp AI từ trình duyệt.
// Cấu hình bằng biến môi trường trong ve-xe-frontend/.env.local (xem .env.example).
// LƯU Ý: key đặt ở frontend sẽ nằm trong bundle => chỉ phù hợp demo/đồ án.
// Khi triển khai thật nên chuyển lời gọi này về backend (proxy) để giấu key.
import { fetchJson } from '../api';

const env = import.meta.env;
const PROVIDER = (env.VITE_AI_PROVIDER || 'gemini').toLowerCase();
const API_KEY = env.VITE_AI_API_KEY || '';
const MODEL = env.VITE_AI_MODEL || (PROVIDER === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
const BASE_URL = (env.VITE_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const MAX_TURNS = 10; // chỉ gửi 10 lượt gần nhất để tiết kiệm token

export const isConfigured = () => Boolean(API_KEY);

// Nút hành động bot có thể gắn vào câu trả lời (bot chèn [[TÊN]] ở cuối câu)
export const ACTIONS = {
  FEEDBACK: { label: '📢 Gửi phản ánh', to: '/feedback' },
  TRIPS: { label: '🚌 Tìm chuyến xe', to: '/buses' },
  TICKETS: { label: '🎫 Vé của tôi', to: '/dashboard' },
};

// ====== Kiến thức nền của bot (sửa tại đây khi nghiệp vụ thay đổi) ======
const KNOWLEDGE = `Bạn là trợ lý ảo của hệ thống đặt vé xe buýt/xe khách trực tuyến "Smart BusTicketing".
Quy tắc trả lời:
- Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn (tối đa 5-6 câu), đi thẳng vào ý.
- Chỉ hỗ trợ các vấn đề của hệ thống vé xe. Câu hỏi ngoài lề thì từ chối nhẹ nhàng và đưa về chủ đề vé xe.
- TUYỆT ĐỐI không bịa giờ chạy, giá vé, số ghế hay chính sách. Không có dữ liệu thì nói rõ và hướng dẫn người dùng xem ở mục "Chuyến xe".
- Không yêu cầu hay nhắc lại mật khẩu, số thẻ, mã OTP của người dùng.

Nghiệp vụ hệ thống:
- Đặt vé: vào "Chuyến xe & Chọn ghế", chọn chuyến, chọn ghế trên sơ đồ (tầng dưới dãy A, tầng trên dãy B), rồi thanh toán.
- Giữ chỗ: ghế được giữ 10 phút, hết thời gian chưa thanh toán thì ghế tự động được nhả.
- Thanh toán: VNPay, ZaloPay, Momo, chuyển khoản ngân hàng; vé điện tử kèm mã QR được gửi sau khi thanh toán thành công.
- Ưu đãi: học sinh, sinh viên (HSSV) được giảm 20% giá vé.
- Hủy vé: chỉ hủy được trước giờ khởi hành ít nhất 24 giờ, hoàn tiền 100%. Thực hiện trong mục "Vé của tôi" > tab "Hủy / Đổi Vé".
- Soát vé: tài xế/phụ xe quét mã QR trên vé khi hành khách lên xe.
- Phản ánh/khiếu nại/góp ý về chuyến đi: gửi ở trang "Gửi phản ánh".

Cuối câu trả lời, nếu phù hợp có thể chèn ĐÚNG MỘT mã hành động để hệ thống hiện nút bấm:
[[FEEDBACK]] khi người dùng muốn phản ánh/khiếu nại/góp ý; [[TRIPS]] khi muốn tìm/đặt chuyến; [[TICKETS]] khi muốn xem/hủy/đổi vé đã mua.`;

let routeCtx = null;
async function loadRouteContext() {
  if (routeCtx !== null) return routeCtx;
  try {
    const routes = await fetchJson('/api/v1/routes');
    routeCtx = routes
      .map((r) => `- ${r.departure_city} - ${r.arrival_city}: giá gốc ${Number(r.base_price).toLocaleString('vi-VN')} VNĐ, dài ${r.distance_km} km`)
      .join('\n');
  } catch {
    return ''; // backend chưa chạy: bỏ qua, không cache để lần sau thử lại
  }
  return routeCtx;
}

// Gộp các lượt liên tiếp cùng vai trò, bỏ lượt bot đứng đầu, giữ MAX_TURNS lượt cuối
function normalize(history) {
  const merged = [];
  for (const m of history.slice(-MAX_TURNS)) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.text += `\n${m.text}`;
    else merged.push({ role: m.role, text: m.text });
  }
  while (merged.length && merged[0].role !== 'user') merged.shift();
  return merged;
}

async function post(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Không kết nối được tới dịch vụ AI. Kiểm tra mạng rồi thử lại nhé.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;
  const detail = data?.error?.message || '';
  if (res.status === 429) throw new Error('AI đang quá tải hoặc đã hết lượt miễn phí, bạn thử lại sau ít phút nhé.');
  if (res.status === 404) throw new Error(`Không tìm thấy model "${MODEL}". Hãy đổi VITE_AI_MODEL sang model đang có.`);
  if ([400, 401, 403].includes(res.status) && /api.?key|permission|unauthor|invalid|credential/i.test(detail)) {
    throw new Error('API key không hợp lệ hoặc không có quyền. Kiểm tra lại VITE_AI_API_KEY trong .env.local.');
  }
  throw new Error(detail || `Dịch vụ AI lỗi (${res.status}).`);
}

async function callGemini(system, turns) {
  const data = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((t) => ({ role: t.role === 'bot' ? 'model' : 'user', parts: [{ text: t.text }] })),
        generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
      }),
    }
  );
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
}

async function callOpenAI(system, turns) {
  const data = await post(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        ...turns.map((t) => ({ role: t.role === 'bot' ? 'assistant' : 'user', content: t.text })),
      ],
    }),
  });
  return (data.choices?.[0]?.message?.content || '').trim();
}

// history: [{ role: 'user' | 'bot', text }] -> chuỗi trả lời của AI
export async function askBot(history) {
  const turns = normalize(history);
  if (!turns.length) return '';
  const routes = await loadRouteContext();
  const system = routes ? `${KNOWLEDGE}\n\nCác tuyến đang hoạt động (dữ liệu thật từ hệ thống):\n${routes}` : KNOWLEDGE;
  return PROVIDER === 'openai' ? callOpenAI(system, turns) : callGemini(system, turns);
}

// Tách mã hành động [[...]] khỏi nội dung
export function parseReply(text) {
  const actions = [];
  const clean = (text || '')
    .replace(/\[\[(FEEDBACK|TRIPS|TICKETS)\]\]/g, (_, k) => {
      if (!actions.includes(k)) actions.push(k);
      return '';
    })
    .trim();
  return { text: clean, actions };
}
