import React, { useState } from 'react';

function RefundManagement() {
  // Dữ liệu giả lập ban đầu để thiết kế giao diện (sau này sẽ thay bằng gọi API)
  const [refundRequests, setRefundRequests] = useState([
    { id: 'RF001', user: 'Nguyễn Văn A', amount: 250000, reason: 'Hủy chuyến do ốm', status: 'pending', date: '10/10/2026' },
    { id: 'RF002', user: 'Trần Thị B', amount: 150000, reason: 'Đặt nhầm ngày', status: 'approved', date: '09/10/2026' },
    { id: 'RF003', user: 'Lê Văn C', amount: 300000, reason: 'Đổi lịch trình', status: 'rejected', date: '08/10/2026' }
  ]);

  // Hàm xử lý khi bấm nút Duyệt / Từ chối
  const handleAction = (id, newStatus) => {
    const actionName = newStatus === 'approved' ? 'duyệt' : 'từ chối';
    if (window.confirm(`Bạn có chắc chắn muốn ${actionName} yêu cầu hoàn tiền này?`)) {
      // Cập nhật lại state để giao diện thay đổi (sau này thay bằng API gọi xuống backend)
      setRefundRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: newStatus } : req
      ));
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '24px', marginTop: 0 }}>
        💸 Quản Lý Yêu Cầu Hoàn Tiền
      </h2>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '14px' }}>Mã YC</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '14px' }}>Khách hàng</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '14px' }}>Số tiền (VNĐ)</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '14px' }}>Lý do</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '14px' }}>Ngày YC</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '14px' }}>Trạng thái</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', color: '#475569', fontSize: '14px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {refundRequests.map((req) => (
              <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '500' }}>{req.id}</td>
                <td style={{ padding: '14px 16px', fontSize: '14px' }}>{req.user}</td>
                <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                  {req.amount.toLocaleString('vi-VN')}đ
                </td>
                <td style={{ padding: '14px 16px', fontSize: '14px', color: '#64748b' }}>{req.reason}</td>
                <td style={{ padding: '14px 16px', fontSize: '14px', color: '#64748b' }}>{req.date}</td>
                
                {/* Cột Trạng thái */}
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                    backgroundColor: req.status === 'pending' ? '#fef08a' : req.status === 'approved' ? '#bbf7d0' : '#fecaca',
                    color: req.status === 'pending' ? '#854d0e' : req.status === 'approved' ? '#166534' : '#991b1b'
                  }}>
                    {req.status === 'pending' ? 'Chờ duyệt' : req.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                  </span>
                </td>

                {/* Cột Thao tác */}
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  {req.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleAction(req.id, 'approved')}
                        style={{ padding: '6px 12px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        Duyệt
                      </button>
                      <button 
                        onClick={() => handleAction(req.id, 'rejected')}
                        style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        Từ chối
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Đã xử lý</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RefundManagement;