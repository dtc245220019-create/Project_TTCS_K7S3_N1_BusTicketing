import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ACTIONS, askBot, isConfigured, parseReply } from '../services/chatbot';
import './ChatWidget.css';

const GREETING =
  'Xin chào! Mình là trợ lý Smart BusTicketing 🚌 Mình có thể giúp bạn tra cứu tuyến, giá vé, cách đặt/hủy/đổi vé hoặc gửi phản ánh.';
const NO_KEY =
  'Chatbot chưa được cấu hình API key. Tạo file ve-xe-frontend/.env.local (xem .env.example), điền VITE_AI_API_KEY rồi chạy lại npm run dev.';
const QUICK = [
  { label: '💰 Giá vé các tuyến', ask: 'Cho mình xem giá vé của các tuyến hiện có' },
  { label: '🔄 Cách hủy / đổi vé', ask: 'Mình muốn hủy hoặc đổi vé thì làm thế nào?' },
  { label: '⏱️ Giữ chỗ hoạt động ra sao?', ask: 'Giữ chỗ hoạt động như thế nào?' },
  { label: '📢 Gửi phản ánh', to: '/feedback' },
];
const initial = () => [{ role: 'bot', text: GREETING, local: true }];

// Hiển thị **in đậm** mà AI hay trả về, không cần thư viện markdown
function RichText({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

function ChatWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initial);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      if (!isConfigured()) throw new Error(NO_KEY);
      const reply = await askBot(next.filter((m) => !m.local));
      const { text: clean, actions } = parseReply(reply);
      setMessages((m) => [
        ...m,
        { role: 'bot', text: clean || 'Mình chưa trả lời được câu này, bạn thử diễn đạt lại nhé.', actions },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: err.message, local: true, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cw-root no-print">
      {open && (
        <section className="cw-panel" role="dialog" aria-label="Trợ lý ảo Smart BusTicketing">
          <header className="cw-head">
            <div className="cw-avatar" aria-hidden="true">🤖</div>
            <div className="cw-head-text">
              <strong>Trợ lý Smart Bus</strong>
              <span><i className="cw-dot" /> Luôn sẵn sàng hỗ trợ</span>
            </div>
            <button type="button" className="cw-icon-btn" title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới" onClick={() => setMessages(initial())}>↺</button>
            <button type="button" className="cw-icon-btn" title="Đóng" aria-label="Đóng khung chat" onClick={() => setOpen(false)}>✕</button>
          </header>

          <div className="cw-body" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`cw-row ${m.role}`}>
                <div className={`cw-bubble ${m.role} ${m.error ? 'error' : ''}`}>
                  <RichText text={m.text} />
                  {m.actions?.length > 0 && (
                    <div className="cw-actions">
                      {m.actions.map((a) => (
                        <button type="button" key={a} onClick={() => go(ACTIONS[a].to)}>{ACTIONS[a].label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="cw-chips">
                {QUICK.map((q) => (
                  <button type="button" key={q.label} onClick={() => (q.to ? go(q.to) : send(q.ask))}>{q.label}</button>
                ))}
              </div>
            )}

            {loading && (
              <div className="cw-row bot">
                <div className="cw-bubble bot cw-typing" aria-label="Bot đang trả lời"><span /><span /><span /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="cw-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              maxLength={500}
              aria-label="Nhập tin nhắn"
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Gửi">➤</button>
          </form>
        </section>
      )}

      <button type="button" className={`cw-fab ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label={open ? 'Đóng trợ lý ảo' : 'Mở trợ lý ảo'}>
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}

export default ChatWidget;
