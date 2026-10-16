import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ACTIONS, askBot, isConfigured, parseReply } from '../services/chatbot';
import './ChatWidget.css';

const GREETING =
  'Xin chào! Mình là SmartBus AI 🤖 Trợ lý ảo đặt vé & chăm sóc khách hàng 24/7. Bạn có thể hỏi mình về lịch trình xe, giá vé, cơ chế giữ chỗ 10 phút, mã giảm giá, hoặc quy định đổi/hủy vé nhé!';
const NO_KEY =
  'Hệ thống AI đang tạm thời bảo trì kết nối. Vui lòng thử lại sau ít giây!';
const QUICK = [
  { label: '🚌 Chuyến đi Đà Lạt', ask: 'Có chuyến nào đi Đà Lạt không?' },
  { label: '🔄 Cách hủy vé & hoàn tiền 100%', ask: 'Tôi muốn hủy chuyến và nhận lại tiền vé thì làm sao?' },
  { label: '⏱️ Cơ chế giữ chỗ 10 phút', ask: 'Giữ chỗ hoạt động như thế nào?' },
  { label: '🎁 Mã giảm giá & Ưu đãi HSSV', ask: 'Hôm nay có voucher hay ưu đãi sinh viên nào không?' },
  { label: '💳 Hướng dẫn thanh toán', ask: 'Hệ thống hỗ trợ những phương thức thanh toán nào?' },
  { label: '📢 Gửi phản ánh chất lượng', to: '/feedback' },
];
const initial = () => [{ role: 'bot', text: GREETING, local: true }];

// Hiển thị định dạng văn bản đẹp mắt: in đậm, code, xuống dòng
function RichText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="cw-rich-text">
      {lines.map((line, lineIdx) => {
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.9em' }}>{part.slice(1, -1)}</code>;
          }
          return part;
        });

        if (!line.trim()) {
          return <div key={lineIdx} style={{ height: '6px' }} />;
        }

        return (
          <div key={lineIdx} style={{ margin: '2px 0', lineHeight: 1.5 }}>
            {parts}
          </div>
        );
      })}
    </div>
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
