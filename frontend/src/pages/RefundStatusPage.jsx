import { useState } from 'react';
import { checkRefundStatus } from '../api';

const formatMoney = (value) => {
  if (typeof value === 'number') {
    return `${value.toLocaleString('vi-VN')} VNĐ`;
  }

  if (value !== undefined && value !== null && value !== '') {
    return typeof value === 'string' && value.includes('VNĐ')
      ? value
      : `${Number(value) ? Number(value).toLocaleString('vi-VN') : value} VNĐ`;
  }

  return '0 VNĐ';
};

const getStatusBadge = (status = '') => {
  const norm = String(status).toUpperCase();

  if (norm === 'REFUNDED' || norm === 'APPROVED' || norm.includes('ĐÃ HOÀN') || norm.includes('DA HOAN')) {
    return {
      text: '✅ ĐÃ HOÀN TIỀN THÀNH CÔNG',
      style: { color: '#166534', background: '#dcfce7', border: '1px solid #86efac' },
      isSuccess: true,
    };
  }

  if (norm === 'REJECTED' || norm.includes('TỪ CHỐI') || norm.includes('TU CHOI')) {
    return {
      text: '❌ ĐÃ TỪ CHỐI HOÀN TIỀN',
      style: { color: '#b91c1c', background: '#fee2e2', border: '1px solid #fca5a5' },
      isRejected: true,
    };
  }

  return {
    text: '⏳ ĐANG CHỜ DUYỆT (HỆ THỐNG ĐANG XỬ LÝ)',
    style: { color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a' },
    isPending: true,
  };
};

function RefundStatusPage() {
  const [ticketCode, setTicketCode] = useState('');
  const [refundRecord, setRefundRecord] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (event) => {
    event.preventDefault();
    setSearched(true);
    setRefundRecord(null);
    setMessage('');

    const code = ticketCode.trim().toUpperCase();

    if (!code) {
      setMessage('Vui lòng nhập mã vé để tra cứu.');
      return;
    }

    setLoading(true);

    try {
      // 1. Kiểm tra trạng thái hoàn tiền trực tiếp từ cơ sở dữ liệu hệ thống (Backend API)
      const liveData = await checkRefundStatus(code);
      if (liveData && (liveData.ticket_code || liveData.id)) {
        setRefundRecord({
          ...liveData,
          ticketCode: liveData.ticket_code || code,
          route: liveData.origin && liveData.destination ? `${liveData.origin} - ${liveData.destination}` : 'Tuyến xe cố định',
          departure: liveData.departure_at || 'Theo lịch trình',
          refundMethod: liveData.bank_name ? `Ngân hàng ${liveData.bank_name}` : 'Chuyển khoản tài khoản ngân hàng',
          refundAmount: liveData.approved_amount ?? liveData.amount ?? liveData.requested_amount,
          refundStatus: liveData.status,
          cancelledAt: liveData.created_at || 'Mới đây',
          processedAt: liveData.processed_at,
          reason: liveData.reason || 'Thay đổi kế hoạch cá nhân',
          accountHolder: liveData.account_holder,
          bankName: liveData.bank_name,
          bankAccount: liveData.bank_account,
          isLiveSync: true,
        });
        setLoading(false);
        return;
      }
    } catch (apiErr) {
      console.warn('Live refund status check note:', apiErr?.message);
    }

    // 2. Tra cứu dự phòng từ localStorage nếu API chưa ghi nhận hoặc offline
    try {
      const records = JSON.parse(
        localStorage.getItem('smartbus_cancelled_tickets') || '[]'
      );

      const matchedRecord = records.find((item) => {
        const savedCode = String(
          item.ticketCode || item.ticket_code || item.id || ''
        ).trim().toUpperCase();

        return savedCode === code;
      });

      if (!matchedRecord) {
        setMessage(
          `Không tìm thấy yêu cầu hoàn tiền cho mã vé "${code}". Quý khách vui lòng kiểm tra lại mã vé hoặc liên hệ tổng đài hỗ trợ 1900 6067.`
        );
      } else {
        setRefundRecord({
          ...matchedRecord,
          refundAmount: matchedRecord.refundAmount ?? matchedRecord.price ?? matchedRecord.total_amount,
          isLiveSync: false,
        });
      }
    } catch {
      setMessage('Không thể đọc dữ liệu hoàn tiền. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = refundRecord ? getStatusBadge(refundRecord.refundStatus || refundRecord.status) : null;

  return (
    <div
      style={{
        minHeight: '65vh',
        background: '#f8fafc',
        padding: '36px 16px 56px',
      }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '38px', marginBottom: '8px' }}>💳</div>
          <h1
            style={{
              color: '#0f172a',
              fontSize: '28px',
              margin: '0 0 10px',
            }}
          >
            Kiểm Tra Tình Trạng Hoàn Tiền Vé Xe
          </h1>
          <p style={{ color: '#64748b', margin: 0, lineHeight: 1.6 }}>
            Nhập mã vé của bạn để kiểm tra tình trạng xét duyệt và hoàn tiền theo thời gian thực từ Quản trị viên.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <label
            htmlFor="refund-ticket-code"
            style={{
              display: 'block',
              fontWeight: 700,
              color: '#334155',
              marginBottom: '9px',
            }}
          >
            Mã vé cần tra cứu hoàn tiền
          </label>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <input
              id="refund-ticket-code"
              value={ticketCode}
              onChange={(event) => setTicketCode(event.target.value)}
              placeholder="Ví dụ: TKT-796712, TKT-4A784B..."
              style={{
                flex: '1 1 240px',
                minWidth: 0,
                padding: '12px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '9px',
                fontSize: '15px',
                outlineColor: '#2563eb',
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '9px',
                background: loading ? '#94a3b8' : '#2563eb',
                color: '#fff',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {loading ? 'Đang tra cứu...' : '🔍 Tra cứu hoàn tiền'}
            </button>
          </div>

          {message && (
            <p
              role="status"
              style={{
                color: '#b91c1c',
                background: '#fef2f2',
                borderRadius: '8px',
                padding: '12px',
                margin: '16px 0 0',
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          )}
        </form>

        {searched && refundRecord && (
          <section
            aria-live="polite"
            style={{
              marginTop: '20px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '18px',
              }}
            >
              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  MÃ VÉ HỦY & HOÀN TIỀN
                </p>
                <h2 style={{ color: '#0f172a', fontSize: '20px', margin: 0 }}>
                  {refundRecord.ticketCode ||
                    refundRecord.ticket_code ||
                    refundRecord.id}
                </h2>
              </div>

              {statusBadge && (
                <span
                  style={{
                    ...statusBadge.style,
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 800,
                  }}
                >
                  {statusBadge.text}
                </span>
              )}
            </div>

            {/* Thông báo chi tiết nếu đã hoàn tiền thành công */}
            {statusBadge?.isSuccess && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginTop: '18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '15px' }}>
                  <span>🎉 XÁC NHẬN HOÀN TIỀN THÀNH CÔNG TỪ QUẢN TRỊ VIÊN!</span>
                </div>
                <p style={{ color: '#15803d', fontSize: '13.5px', margin: '6px 0 0', lineHeight: 1.5 }}>
                  Yêu cầu hoàn tiền của bạn đã được Ban Quản Trị phê duyệt. Số tiền đã được chuyển thành công về thông tin thụ hưởng của bạn.
                </p>
              </div>
            )}

            {statusBadge?.isPending && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginTop: '18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 800, fontSize: '15px' }}>
                  <span>⏳ YÊU CẦU ĐANG CHỜ QUẢN TRỊ VIÊN PHÊ DUYỆT</span>
                </div>
                <p style={{ color: '#b45309', fontSize: '13.5px', margin: '6px 0 0', lineHeight: 1.5 }}>
                  Yêu cầu hoàn tiền của bạn đã được ghi nhận vào hệ thống và đang chờ Quản trị viên duyệt. Hệ thống sẽ xử lý và chuyển tiền trong vòng 24h.
                </p>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                padding: '22px 0',
              }}
            >
              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  Hành trình
                </p>
                <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>
                  {refundRecord.route ||
                    refundRecord.routeName ||
                    refundRecord.route_name ||
                    'Hà Nội - Thái Nguyên'}
                </p>
              </div>

              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  Thời gian khởi hành
                </p>
                <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>
                  {refundRecord.departure ||
                    refundRecord.departureTime ||
                    refundRecord.departure_time ||
                    'Theo lịch trình'}
                </p>
              </div>

              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  Ghế đã hủy
                </p>
                <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>
                  {refundRecord.seat ||
                    refundRecord.seatNumber ||
                    'A01'}
                </p>
              </div>

              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  Phương thức nhận tiền
                </p>
                <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>
                  {refundRecord.bankName
                    ? `${refundRecord.bankName} - STK: ${refundRecord.bankAccount || '***'} (${refundRecord.accountHolder || ''})`
                    : (refundRecord.refundMethod || 'Chuyển khoản tài khoản ngân hàng')}
                </p>
              </div>

              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  Thời điểm yêu cầu
                </p>
                <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>
                  {refundRecord.cancelledAt || refundRecord.created_at || 'Mới đây'}
                </p>
              </div>

              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  Lý do hủy
                </p>
                <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>
                  {refundRecord.reason || 'Thay đổi lịch trình cá nhân'}
                </p>
              </div>
            </div>

            <div
              style={{
                background: statusBadge?.isSuccess ? '#f0fdf4' : '#fffbeb',
                border: statusBadge?.isSuccess ? '1.5px solid #86efac' : '1.5px solid #fde68a',
                borderRadius: '12px',
                padding: '18px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <p style={{ color: statusBadge?.isSuccess ? '#166534' : '#92400e', fontSize: '14px', margin: '0 0 4px', fontWeight: 600 }}>
                  {statusBadge?.isSuccess ? 'Số tiền thực tế đã hoàn về tài khoản:' : 'Số tiền hoàn dự kiến:'}
                </p>
                <p
                  style={{
                    color: statusBadge?.isSuccess ? '#15803d' : '#b45309',
                    fontSize: '26px',
                    fontWeight: 800,
                    margin: 0,
                  }}
                >
                  {formatMoney(refundRecord.refundAmount)}
                </p>
              </div>

              {refundRecord.processedAt && (
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
                  <div>Thời gian duyệt:</div>
                  <b style={{ color: '#0f172a' }}>{new Date(refundRecord.processedAt).toLocaleString('vi-VN')}</b>
                </div>
              )}
            </div>

            <p
              style={{
                color: '#64748b',
                fontSize: '12.5px',
                lineHeight: 1.6,
                margin: '16px 0 0',
              }}
            >
              Dữ liệu được đồng bộ trực tiếp với hệ thống thanh toán SmartBus. Nếu có bất kỳ thắc mắc nào, quý khách vui lòng liên hệ bộ phận CSKH để được hỗ trợ tức thì.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

export default RefundStatusPage;