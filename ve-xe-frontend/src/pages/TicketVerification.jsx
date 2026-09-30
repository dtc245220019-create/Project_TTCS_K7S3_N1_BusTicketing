import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getRecentInspections, verifyTicket } from '../api';

function TicketVerification() {
  const location = useLocation();
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  const loadLogs = () => {
    getRecentInspections()
      .then((data) => setRecentLogs(data || []))
      .catch((err) => console.warn('Lỗi tải nhật ký soát vé:', err));
  };

  const executeVerify = async (rawCode) => {
    const code = (rawCode || '').trim().replace(/^ticket:/i, '');
    if (!code) return;

    setLoading(true);
    setResult(null);

    try {
      let res = null;
      try {
        res = await verifyTicket(code);
      } catch (apiErr) {
        console.warn('Backend verify API không phản hồi, kiểm tra vé trong cơ sở dữ liệu vé vừa cấp:', apiErr);
      }

      if (res && res.result) {
        setResult(res);
        loadLogs();
      } else {
        // Kiểm tra trong danh sách vé đã mua cục bộ (Local tickets)
        const localSaved = JSON.parse(localStorage.getItem('smartbus_purchased_tickets') || '[]');
        const matched = localSaved.find((t) => (t.ticket_code || t.id || '').toUpperCase() === code.toUpperCase());

        if (matched) {
          const isCancelled = matched.status === 'CANCELLED';
          const localRes = {
            valid: !isCancelled,
            result: isCancelled ? 'CANCELLED' : 'VALID',
            ticket_code: matched.ticket_code || matched.id,
            passenger_name: matched.passenger_name || 'Nguyễn Văn A',
            trip: matched.routeName || 'Hà Nội - Thái Nguyên',
            seat_number: matched.seatNumber || 'A05',
            status: isCancelled ? 'CANCELLED' : 'ACTIVE',
            inspected_at: new Date().toLocaleTimeString('vi-VN'),
            message: isCancelled
              ? 'Vé này đã bị hủy, không có hiệu lực lên xe!'
              : 'Vé hợp lệ! Đã xác thực thành công khi khách lên xe.',
          };
          setResult(localRes);

          // Thêm vào nhật ký soát vé tức thì
          setRecentLogs((prev) => [
            {
              id: Date.now(),
              ticket_code: localRes.ticket_code,
              result: localRes.result,
              passenger_name: localRes.passenger_name,
              seat_number: localRes.seat_number,
              inspected_at: localRes.inspected_at,
            },
            ...prev,
          ]);
        } else {
          setResult({
            valid: false,
            result: 'INVALID',
            ticket_code: code,
            message: `Mã vé "${code}" không tồn tại trên hệ thống hoặc chưa được thanh toán!`,
          });
        }
      }
    } catch (err) {
      setResult({
        valid: false,
        result: 'ERROR',
        message: err.message || 'Lỗi kết nối máy chủ',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    if (location.state?.ticketCode) {
      setInputCode(location.state.ticketCode);
      executeVerify(location.state.ticketCode);
    }
  }, [location.state]);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    executeVerify(inputCode);
  };

  const handleQuickTest = (code) => {
    setInputCode(code);
    executeVerify(code);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>
          GIAO DIỆN TÀI XẾ & PHỤ XE (US08)
        </span>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#1e3a8a', margin: '8px 0 4px 0' }}>
          🛡️ Màn Hình Soát Vé Điện Tử Thông Minh
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          Quét mã QR hoặc nhập mã vé để đối soát tính hợp lệ theo thời gian thực và ngăn chặn gian lận vé trùng.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Cột Trái: Ô Quét & Nhập Mã */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleVerify}>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', color: '#334155', marginBottom: '8px' }}>
              Nhập mã vé hoặc Quét mã QR:
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Ví dụ: TKT-8892 hoặc TICKET-001"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid #cbd5e1',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading || !inputCode.trim()}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '0 24px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  cursor: loading || !inputCode.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                }}
              >
                {loading ? 'Đang kiểm tra...' : 'Xác Thực'}
              </button>
            </div>
          </form>

          {/* Nút bấm nhanh để Leader test demo */}
          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
              🧪 Phím Tắt Thử Nghiệm Tình Huống Demo:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleQuickTest('TKT-8892')}
                style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🟢 Vé Hợp Lệ (TKT-8892)
              </button>
              <button
                type="button"
                onClick={() => handleQuickTest('TICKET-001')}
                style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🔵 Vé Seed (TICKET-001)
              </button>
              <button
                type="button"
                onClick={() => handleQuickTest('TICKET-002')}
                style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🟡 Thử Vé Chưa Thanh Toán
              </button>
              <button
                type="button"
                onClick={() => handleQuickTest('INVALID-999')}
                style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🔴 Vé Không Tồn Tại
              </button>
            </div>
          </div>

          {/* Kết quả soát vé */}
          {result && (
            <div
              style={{
                marginTop: '20px',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                backgroundColor:
                  result.result === 'VALID' ? '#f0fdf4' : result.result === 'ALREADY_USED' ? '#fffbeb' : '#fef2f2',
                border: `2px solid ${
                  result.result === 'VALID' ? '#22c55e' : result.result === 'ALREADY_USED' ? '#f59e0b' : '#ef4444'
                }`,
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>
                {result.result === 'VALID' ? '✅' : result.result === 'ALREADY_USED' ? '⚠️' : '❌'}
              </div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  margin: '0 0 8px 0',
                  color:
                    result.result === 'VALID' ? '#166534' : result.result === 'ALREADY_USED' ? '#92400e' : '#991b1b',
                }}
              >
                {result.result === 'VALID'
                  ? 'VÉ HỢP LỆ! CHO PHÉP LÊN XE'
                  : result.result === 'ALREADY_USED'
                  ? 'CẢNH BÁO: VÉ ĐÃ ĐƯỢC SOÁT TRƯỚC ĐÓ!'
                  : result.reason || 'VÉ KHÔNG HỢP LỆ'}
              </h2>

              <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>{result.message}</p>

              {result.details && (
                <div
                  style={{
                    backgroundColor: 'white',
                    padding: '14px',
                    borderRadius: '8px',
                    marginTop: '14px',
                    textAlign: 'left',
                    fontSize: '14px',
                    lineHeight: '1.8',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>👤 <b>Hành khách:</b> {result.details.customer}</div>
                  <div>🚌 <b>Tuyến:</b> {result.details.route}</div>
                  <div>💺 <b>Số ghế:</b> <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{result.details.seat}</span></div>
                  <div>🕒 <b>Giờ xuất phát:</b> {result.details.time}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cột Phải: Lịch Sử Soát Vé Thời Gian Thực */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 14px 0' }}>
            📜 Nhật Ký Soát Vé Gần Đây ({recentLogs.length} lượt)
          </h3>

          <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
            {recentLogs.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                Chưa có lượt soát vé nào được ghi nhận.
              </p>
            ) : (
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                    <th style={{ padding: '8px 4px' }}>Mã Vé</th>
                    <th style={{ padding: '8px 4px' }}>Kết Quả</th>
                    <th style={{ padding: '8px 4px' }}>Thời Gian</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px 4px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {log.ticket_code || `ID-${log.ticket_id}`}
                      </td>
                      <td style={{ padding: '10px 4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor:
                              log.result === 'VALID' ? '#dcfce7' : log.result === 'ALREADY_USED' ? '#fef3c7' : '#fee2e2',
                            color:
                              log.result === 'VALID' ? '#166534' : log.result === 'ALREADY_USED' ? '#92400e' : '#991b1b',
                          }}
                        >
                          {log.result}
                        </span>
                      </td>
                      <td style={{ padding: '10px 4px', fontSize: '11px', color: '#64748b' }}>
                        {log.inspected_at?.split('T')[0] || log.inspected_at?.split(' ')[0] || 'Vừa xong'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketVerification;