import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, getTickets } from '../api';
import { CATEGORIES, STATUS, listFeedbacks, submitFeedback } from '../services/feedbackApi';
import './FeedbackPage.css';

const RATING_LABELS = ['', 'Rất tệ', 'Chưa tốt', 'Bình thường', 'Tốt', 'Rất tốt'];
const MIN_LEN = 10;
const MAX_LEN = 500;

const fmtDate = (v) => {
  const d = new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};
const ticketLabel = (t) => {
  const code = t.ticket_code || t.id;
  const route = t.routeName || t.route_name || '';
  return route ? `${code} · ${route}` : `${code}`;
};

function Stars({ value, onChange, readOnly = false, size = 'lg' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className={`fb-stars ${size}`} role={readOnly ? 'img' : 'radiogroup'} aria-label={`Đánh giá ${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) =>
        readOnly ? (
          <span key={n} className={n <= value ? 'on' : ''}>★</span>
        ) : (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} sao - ${RATING_LABELS[n]}`}
            className={n <= shown ? 'on' : ''}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        )
      )}
      {!readOnly && <em>{RATING_LABELS[shown] || 'Chọn mức độ hài lòng'}</em>}
    </div>
  );
}

function FeedbackPage() {
  const user = getCurrentUser();
  const [tickets, setTickets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [category, setCategory] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoadingList(true);
    setHistory(await listFeedbacks(user.id));
    setLoadingList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    reload();
    getTickets(user.id).then((r) => setTickets(Array.isArray(r) ? r : r.items || [])).catch(() => setTickets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const submit = async (e) => {
    e.preventDefault();
    setNotice(null);
    const text = content.trim();
    if (!category) return setError('Vui lòng chọn loại phản ánh.');
    if (!rating) return setError('Vui lòng chọn mức độ hài lòng (số sao).');
    if (text.length < MIN_LEN) return setError(`Nội dung cần ít nhất ${MIN_LEN} ký tự để chúng tôi hiểu rõ vấn đề.`);
    setError('');
    setSubmitting(true);
    try {
      const picked = tickets.find((t) => String(t.ticket_code || t.id) === ticketCode);
      const res = await submitFeedback({
        user_id: user.id,
        trip_id: picked?.trip_id ?? null,
        ticket_code: ticketCode || null,
        category,
        rating_stars: rating,
        content: text,
      });
      setNotice({ synced: res.synced });
      setCategory('');
      setTicketCode('');
      setRating(0);
      setContent('');
      await reload();
    } catch (err) {
      setError(err.message || 'Không gửi được phản ánh, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="fb-page">
        <section className="fb-hero"><div className="fb-hero-inner"><h1>📢 Gửi phản ánh</h1><p>Mọi góp ý của bạn giúp chuyến đi tốt hơn.</p></div></section>
        <div className="fb-gate">
          <div className="fb-gate-icon">🔒</div>
          <h2>Đăng nhập để gửi phản ánh</h2>
          <p>Chúng tôi cần biết tài khoản của bạn để phản hồi và theo dõi tiến độ xử lý.</p>
          <Link to="/login" className="fb-btn">Đăng nhập ngay</Link>
        </div>
      </div>
    );
  }

  const catOf = (id) => CATEGORIES.find((c) => c.id === id);

  return (
    <div className="fb-page">
      <section className="fb-hero">
        <div className="fb-hero-inner">
          <span className="fb-chip">Phản hồi trong 24 giờ làm việc</span>
          <h1>📢 Gửi phản ánh</h1>
          <p>Gặp sự cố hay có góp ý về chuyến đi? Hãy cho chúng tôi biết, mỗi phản ánh đều được ghi nhận và theo dõi.</p>
        </div>
      </section>

      <div className="fb-container">
        <form className="fb-card fb-form" onSubmit={submit} noValidate>
          {notice && (
            <div className="fb-success" role="status">
              <strong>✅ Đã gửi phản ánh thành công!</strong>
              <span>{notice.synced ? 'Chúng tôi sẽ xử lý và phản hồi sớm nhất.' : 'Máy chủ chưa sẵn sàng nên phản ánh được lưu tạm trên thiết bị này.'}</span>
            </div>
          )}

          <h2 className="fb-step"><b>1</b> Loại phản ánh</h2>
          <div className="fb-cats" role="radiogroup" aria-label="Loại phản ánh">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} role="radio" aria-checked={category === c.id} className={`fb-cat ${category === c.id ? 'selected' : ''}`} onClick={() => setCategory(c.id)}>
                <span>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>

          <h2 className="fb-step"><b>2</b> Chuyến đi liên quan <small>(không bắt buộc)</small></h2>
          <select className="fb-select" value={ticketCode} onChange={(e) => setTicketCode(e.target.value)} aria-label="Chuyến đi liên quan">
            <option value="">Không gắn với vé cụ thể</option>
            {tickets.map((t) => (
              <option key={t.id || t.ticket_code} value={t.ticket_code || t.id}>{ticketLabel(t)}</option>
            ))}
          </select>

          <h2 className="fb-step"><b>3</b> Mức độ hài lòng</h2>
          <Stars value={rating} onChange={setRating} />

          <h2 className="fb-step"><b>4</b> Nội dung</h2>
          <textarea
            className="fb-textarea"
            rows={5}
            maxLength={MAX_LEN}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Mô tả cụ thể: chuyện gì đã xảy ra, vào thời điểm nào, trên xe/biển số nào (nếu có)..."
            aria-label="Nội dung phản ánh"
          />
          <div className="fb-counter">{content.length}/{MAX_LEN}</div>

          {error && <div className="fb-error" role="alert">⚠️ {error}</div>}
          <button type="submit" className="fb-btn block" disabled={submitting}>{submitting ? 'Đang gửi...' : 'Gửi phản ánh →'}</button>
        </form>

        <aside className="fb-side">
          <h2 className="fb-h2">Phản ánh của tôi</h2>
          {loadingList ? (
            <div className="fb-skeleton" />
          ) : history.length === 0 ? (
            <div className="fb-empty"><span>📭</span><p>Bạn chưa gửi phản ánh nào.</p></div>
          ) : (
            <ul className="fb-list">
              {history.map((f) => {
                const st = STATUS[f.status] || STATUS.DA_GUI;
                const cat = catOf(f.category);
                return (
                  <li key={f.id} className="fb-item">
                    <div className="fb-item-top">
                      <span className="fb-item-cat">{cat ? `${cat.icon} ${cat.label}` : 'Phản ánh'}</span>
                      <span className={`fb-badge ${st.tone}`}>{st.label}</span>
                    </div>
                    <Stars value={f.rating_stars || 0} readOnly size="sm" />
                    <p className="fb-item-text">{f.content}</p>
                    <div className="fb-item-meta">
                      <span>{fmtDate(f.created_at)}{f.ticket_code ? ` · ${f.ticket_code}` : ''}</span>
                      {f.local && <span className="fb-local" title="Chưa đồng bộ lên máy chủ">Lưu tạm</span>}
                    </div>
                    {f.admin_reply && <div className="fb-reply"><strong>Phản hồi từ Smart Bus:</strong> {f.admin_reply}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

export default FeedbackPage;
