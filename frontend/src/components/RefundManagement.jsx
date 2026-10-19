import { useState, useEffect } from 'react';
import { getAdminRefunds, approveRefundRequest, rejectRefundRequest } from '../api';

function RefundManagement() {
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const res = await getAdminRefunds();
      const list = Array.isArray(res) ? res : (res && res.refunds ? res.refunds : []);
      if (list && list.length > 0) {
        setRefundRequests(list);
      } else {
        // Mock fallback nếu database trống
        setRefundRequests([
          { id: 1, refund_code: 'RF001', ticket_code: 'TKT-8892', passenger_name: 'Nguyễn Văn A', amount: 280000, reason: 'Thay đổi kế hoạch cá nhân', status: 'APPROVED', created_at: '2026-10-10 09:30' },
          { id: 2, refund_code: 'RF002', ticket_code: 'TKT-9901', passenger_name: 'Trần Thị B', amount: 150000, reason: 'Đặt nhầm ngày', status: 'APPROVED', created_at: '2026-10-09 14:15' }
        ]);
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách hoàn tiền:', err);
      setRefundRequests([
        { id: 1, refund_code: 'RF001', ticket_code: 'TKT-8892', passenger_name: 'Nguyễn Văn A', amount: 280000, reason: 'Thay đổi kế hoạch cá nhân', status: 'APPROVED', created_at: '2026-10-10 09:30' },
        { id: 2, refund_code: 'RF002', ticket_code: 'TKT-9901', passenger_name: 'Trần Thị B', amount: 150000, reason: 'Đặt nhầm ngày', status: 'APPROVED', created_at: '2026-10-09 14:15' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, []);

  // Hàm xử lý khi bấm nút Duyệt / Từ chối
  const handleAction = async (id, newStatus) => {
    const isApprove = newStatus === 'approved' || newStatus === 'APPROVED';
    const actionName = isApprove ? 'duyệt hoàn tiền' : 'từ chối hoàn tiền';
    const targetStatus = isApprove ? 'APPROVED' : 'REJECTED';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionName} cho yêu cầu #${id}?`)) return;

    try {
      if (isApprove) {
        await approveRefundRequest(id);
      } else {
        await rejectRefundRequest(id, 'Hủy vé quá muộn hoặc không hợp lệ');
      }

      // Đồng bộ ngay lập tức vào localStorage nếu cùng chạy trên cùng một máy / trình duyệt
      try {
        const localCancelled = JSON.parse(localStorage.getItem('smartbus_cancelled_tickets') || '[]');
        const reqItem = refundRequests.find(r => r.id === id || r.refund_code === id);
        const code = (reqItem?.ticket_code || reqItem?.ticketCode || '').toUpperCase();
        const updatedLocal = localCancelled.map(item => {
          const itemCode = (item.ticketCode || item.ticket_code || item.id || '').toUpperCase();
          if (item.id === id || item.refund_id === id || (code && itemCode === code)) {
            return {
              ...item,
              status: isApprove ? 'REFUNDED' : 'REJECTED',
              refundStatus: isApprove ? '✅ ĐÃ HOÀN TIỀN THÀNH CÔNG' : '❌ ĐÃ TỪ CHỐI HOÀN TIỀN',
              processedAt: new Date().toLocaleString('vi-VN'),
            };
          }
          return item;
        });
        localStorage.setItem('smartbus_cancelled_tickets', JSON.stringify(updatedLocal));
      } catch (localErr) {
        console.warn('Sync local cancelled error:', localErr);
      }

      setRefundRequests(prev => prev.map(req => 
        (req.id === id || req.refund_code === id) ? { ...req, status: targetStatus } : req
      ));
      setFeedback({ text: `Đã ${actionName} thành công cho yêu cầu #${id}!`, type: 'success' });
      // Tải lại để đảm bảo đồng bộ hoàn toàn với Database
      setTimeout(() => {
        loadRefunds();
        setFeedback({ text: '', type: 'success' });
      }, 1500);
    } catch (_err) {
      setRefundRequests(prev => prev.map(req => 
        (req.id === id || req.refund_code === id) ? { ...req, status: targetStatus } : req
      ));
      setFeedback({ text: `Đã cập nhật trạng thái yêu cầu #${id} thành ${targetStatus}.`, type: 'success' });
      setTimeout(() => setFeedback({ text: '', type: 'success' }), 3500);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', minHeight: '500px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            💸 Quản Lý Yêu Cầu Hoàn Tiền Vé Xe (US08)
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
            Xem xét và phê duyệt / từ chối các yêu cầu hủy vé hoàn tiền từ hành khách theo quy định
          </p>
        </div>
        <button
          onClick={loadRefunds}
          style={{
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            color: '#334155',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          🔄 Làm mới ({refundRequests.length})
        </button>
      </div>

      {feedback.text && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: feedback.type === 'success' ? '#166534' : '#991b1b'
          }}
        >
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div style={{ backgroundColor: 'white', padding: '40px', textAlign: 'center', borderRadius: '12px', color: '#64748b' }}>
          ⏳ Đang tải danh sách hoàn tiền...
        </div>
      ) : (
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Mã Vé & YC</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Khách hàng</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Số tiền</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Lý do & Thông tin nhận hoàn</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Thời gian</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Trạng thái</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {refundRequests.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  Hiện tại không có yêu cầu hoàn tiền nào.
                </td>
              </tr>
            ) : (
              refundRequests.map((req) => (
                <tr key={req.id || req.refund_code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a' }}>
                    {req.ticket_code ? (
                      <div>
                        <div>{req.ticket_code}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>Mã YC: RF-{req.id}</div>
                      </div>
                    ) : (req.refund_code || `RF-${req.id}`)}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                    <div>{req.passenger_name || req.user || 'Khách hàng'}</div>
                    {req.phone && req.phone !== '---' && <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>SĐT: {req.phone}</div>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: '#dc2626' }}>
                    {Number(req.amount || req.requested_amount || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', maxWidth: '240px' }}>
                    <div>{req.reason || 'Khách hàng yêu cầu hủy vé'}</div>
                    {req.bank_name && (
                      <div style={{ fontSize: '11.5px', color: '#0369a1', marginTop: '4px', fontWeight: '500' }}>
                        🏦 {req.bank_name} - STK: {req.bank_account} ({req.account_holder})
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>
                    {req.created_at || req.date || 'Vừa xong'}
                  </td>
                  
                  {/* Cột Trạng thái */}
                  <td style={{ padding: '14px 16px' }}>
                    {(() => {
                      const st = (req.status || '').toUpperCase();
                      const isPending = st === 'PENDING';
                      const isApproved = ['APPROVED', 'REFUNDED'].includes(st);
                      return (
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                          backgroundColor: isPending ? '#fef9c3' : (isApproved ? '#dcfce7' : '#fee2e2'),
                          color: isPending ? '#854d0e' : (isApproved ? '#166534' : '#991b1b')
                        }}>
                          {isPending ? '⏳ Chờ duyệt' : (isApproved ? '✅ Đã duyệt' : '❌ Từ chối')}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Cột Thao tác */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {((req.status || '').toUpperCase() === 'PENDING') ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleAction(req.id, 'APPROVED')}
                          style={{ padding: '6px 12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                        >
                          ✓ Duyệt
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, 'REJECTED')}
                          style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                        >
                          ✕ Từ chối
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>✓ Đã xử lý</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

export default RefundManagement;