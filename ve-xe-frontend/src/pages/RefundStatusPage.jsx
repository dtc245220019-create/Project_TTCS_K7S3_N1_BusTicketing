import { useState } from 'react';

const formatMoney = (value) => {
  if (typeof value === 'number') {
    return `${value.toLocaleString('vi-VN')} VNĐ`;
  }

  if (value !== undefined && value !== null && value !== '') {
    return typeof value === 'string' && value.includes('VNĐ')
      ? value
      : `${Number(value) ? Number(value).toLocaleString('vi-VN') : value} VNĐ`;
  }

  return 'Chưa có thông tin';
};

const getStatusStyle = (status = '') => {
  const normalized = status.toLowerCase();

  if (normalized.includes('thất bại') || normalized.includes('that bai')) {
    return { color: '#b91c1c', background: '#fee2e2' };
  }

  if (normalized.includes('đã hoàn') || normalized.includes('da hoan')) {
    return { color: '#166534', background: '#dcfce7' };
  }

  return { color: '#92400e', background: '#fef3c7' };
};

function RefundStatusPage() {
  const [ticketCode, setTicketCode] = useState('');
  const [refundRecord, setRefundRecord] = useState(null);
  const [message, setMessage] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = (event) => {
    event.preventDefault();
    setSearched(true);
    setRefundRecord(null);

    const code = ticketCode.trim().toUpperCase();

    if (!code) {
      setMessage('Vui lòng nhập mã vé để tra cứu.');
      return;
    }

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
          'Không tìm thấy yêu cầu hoàn tiền theo mã vé này trên trình duyệt hiện tại.'
        );
        return;
      }

      setRefundRecord(matchedRecord);
      setMessage('');
    } catch {
      setMessage('Không thể đọc dữ liệu hoàn tiền. Vui lòng thử lại.');
    }
  };

  const status = refundRecord?.refundStatus || 'ĐANG XỬ LÝ';

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
            Kiểm tra tình trạng hoàn tiền
          </h1>
          <p style={{ color: '#64748b', margin: 0, lineHeight: 1.6 }}>
            Nhập mã vé để xem thông tin và trạng thái yêu cầu hoàn tiền của bạn.
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
            Mã vé
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
              placeholder="Ví dụ: VE123456"
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
              style={{
                padding: '12px 20px',
                border: 'none',
                borderRadius: '9px',
                background: '#2563eb',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Tra cứu
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
                  MÃ VÉ
                </p>
                <h2 style={{ color: '#0f172a', fontSize: '20px', margin: 0 }}>
                  {refundRecord.ticketCode ||
                    refundRecord.ticket_code ||
                    refundRecord.id}
                </h2>
              </div>

              <span
                style={{
                  ...getStatusStyle(status),
                  padding: '8px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                {status}
              </span>
            </div>

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
                    'Chưa có thông tin'}
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
                    'Chưa có thông tin'}
                </p>
              </div>

              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  Ghế
                </p>
                <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>
                  {refundRecord.seat ||
                    refundRecord.seatNumber ||
                    'Chưa có thông tin'}
                </p>
              </div>

              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  Phương thức nhận tiền
                </p>
                <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>
                  {refundRecord.refundMethod || 'Chưa có thông tin'}
                </p>
              </div>

              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  Thời điểm yêu cầu
                </p>
                <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>
                  {refundRecord.cancelledAt || 'Chưa có thông tin'}
                </p>
              </div>

              <div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 6px' }}>
                  Lý do hủy
                </p>
                <p style={{ color: '#0f172a', fontWeight: 600, margin: 0 }}>
                  {refundRecord.reason || 'Chưa có thông tin'}
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <p style={{ color: '#166534', fontSize: '14px', margin: '0 0 6px' }}>
                Số tiền hoàn dự kiến
              </p>
              <p
                style={{
                  color: '#15803d',
                  fontSize: '26px',
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                {formatMoney(
                  refundRecord.refundAmount ??
                    refundRecord.price ??
                    refundRecord.total_amount
                )}
              </p>
            </div>

            <p
              style={{
                color: '#64748b',
                fontSize: '13px',
                lineHeight: 1.6,
                margin: '16px 0 0',
              }}
            >
              Lưu ý: Đây là thông tin được lưu trên trình duyệt hiện tại.
              Trạng thái hiển thị chưa xác nhận rằng tiền đã thực sự được chuyển
              về tài khoản của bạn.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

export default RefundStatusPage;
EOF