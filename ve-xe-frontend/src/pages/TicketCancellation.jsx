import { useState } from 'react';
import { getTicketByCode, cancelTicket, getCurrentUser } from '../api';

const DEMO_TICKETS = {
  'TKT-8892': {
    ticketCode: 'TKT-8892',
    passenger: 'Nguyễn Văn A',
    phone: '0988 123 456',
    route: 'Hà Nội → Thái Nguyên',
    departure: '08:30 - 02/10/2026',
    seat: 'A05',
    bus: 'SmartBus 01',
    price: 80000,
    status: 'ĐÃ THANH TOÁN',
  },
  'TICKET-001': {
    ticketCode: 'TICKET-001',
    passenger: 'Trần Thị B',
    phone: '0977 555 666',
    route: 'Thái Nguyên → Hà Nội',
    departure: '14:00 - 03/10/2026',
    seat: 'B08',
    bus: 'SmartBus 02',
    price: 90000,
    status: 'ĐÃ THANH TOÁN',
  },
};

function TicketCancellation() {
  const [ticketCode, setTicketCode] = useState('');
  const [ticket, setTicket] = useState(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [cancelled, setCancelled] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();

    const code = ticketCode.trim().toUpperCase();

    if (!code) {
      setMessage('Vui lòng nhập mã vé.');
      setTicket(null);
      return;
    }

    try {
      const backendTicket = await getTicketByCode(code);
      if (backendTicket && backendTicket.ticket_code) {
        setTicket({
          ticketCode: backendTicket.ticket_code,
          passenger: backendTicket.passenger_name || 'Hành khách',
          phone: backendTicket.phone || '0912345678',
          route: backendTicket.routeName || backendTicket.route_name || 'Tuyến xe liên tỉnh',
          departure: backendTicket.departureTime || backendTicket.departure_time || '08:00',
          seat: backendTicket.seatNumber || (backendTicket.seat_numbers && backendTicket.seat_numbers[0]) || 'A01',
          bus: 'SmartBus VIP',
          price: backendTicket.total_amount || 120000,
          status: backendTicket.status === 'COMPLETED' ? 'ĐÃ SỬ DỤNG' : (backendTicket.status === 'CANCELLED' ? 'ĐÃ HỦY' : 'ĐÃ THANH TOÁN'),
        });
        setMessage('');
        setCancelled(backendTicket.status === 'CANCELLED');
        setReason('');
        return;
      }
    } catch {
      // Fallback to local demo tickets
    }

    const foundTicket = DEMO_TICKETS[code];

    if (!foundTicket) {
      setMessage('Không tìm thấy vé với mã này. Hãy thử TKT-8892 hoặc TICKET-001.');
      setTicket(null);
      return;
    }

    setTicket(foundTicket);
    setMessage('');
    setCancelled(false);
    setReason('');
  };

  const handleCancel = async () => {
    if (!reason) {
      setMessage('Vui lòng chọn lý do hủy vé.');
      return;
    }

    try {
      const user = getCurrentUser();
      await cancelTicket(ticket.ticketCode, user ? user.id : 1);
    } catch {
      // Continue to local save
    }

    const cancelledTickets = JSON.parse(
      localStorage.getItem('smartbus_cancelled_tickets') || '[]'
    );

    const cancelData = {
      ...ticket,
      reason,
      cancelledAt: new Date().toLocaleString('vi-VN'),
      refundStatus: 'ĐANG XỬ LÝ (Hoàn 100%)',
    };

    localStorage.setItem(
      'smartbus_cancelled_tickets',
      JSON.stringify([...cancelledTickets, cancelData])
    );

    setCancelled(true);
    setMessage('');
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        background: '#f8fafc',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>

        {/* Tiêu đề */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: '13px',
              fontWeight: '700',
            }}
          >
            US30 • QUẢN LÝ VÉ
          </div>

          <h1
            style={{
              fontSize: '30px',
              color: '#1e3a8a',
              margin: '12px 0 8px',
            }}
          >
            🎫 Hủy vé & yêu cầu hoàn tiền
          </h1>

          <p style={{ color: '#64748b', margin: 0 }}>
            Nhập mã vé để kiểm tra và thực hiện yêu cầu hủy vé.
          </p>
        </div>

        {/* Tìm vé */}
        <div
          style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 25px rgba(15,23,42,0.06)',
            marginBottom: '20px',
          }}
        >
          <form onSubmit={handleSearch}>
            <label
              style={{
                display: 'block',
                fontWeight: '700',
                color: '#334155',
                marginBottom: '8px',
              }}
            >
              Mã vé
            </label>

            <div
              style={{
                display: 'flex',
                gap: '10px',
              }}
            >
              <input
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                placeholder="Ví dụ: TKT-8892"
                style={{
                  flex: 1,
                  padding: '13px 15px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />

              <button
                type="submit"
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0 24px',
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                🔍 Tìm vé
              </button>
            </div>

            <div
              style={{
                marginTop: '12px',
                fontSize: '13px',
                color: '#64748b',
              }}
            >
              Mã demo:
              <button
                type="button"
                onClick={() => {
                  setTicketCode('TKT-8892');
                  setTicket(DEMO_TICKETS['TKT-8892']);
                  setMessage('');
                  setCancelled(false);
                  setReason('');
                }}
                
                style={{
                  marginLeft: '8px',
                  border: 'none',
                  background: '#eff6ff',
                  color: '#2563eb',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                TKT-8892
              </button>
            </div>
          </form>
        </div>

        {/* Thông báo */}
        {message && (
          <div
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '14px',
              borderRadius: '10px',
              marginBottom: '20px',
            }}
          >
            ❌ {message}
          </div>
        )}

        {/* Thông tin vé */}
        {ticket && !cancelled && (
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 25px rgba(15,23,42,0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '20px',
                  color: '#1e293b',
                }}
              >
                Thông tin vé
              </h2>

              <span
                style={{
                  background: '#dcfce7',
                  color: '#166534',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
              >
                {ticket.status}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px',
                background: '#f8fafc',
                padding: '18px',
                borderRadius: '12px',
              }}
            >
              <div>
                <b>Mã vé:</b>
                <div>{ticket.ticketCode}</div>
              </div>

              <div>
                <b>Hành khách:</b>
                <div>{ticket.passenger}</div>
              </div>

              <div>
                <b>Số điện thoại:</b>
                <div>{ticket.phone}</div>
              </div>

              <div>
                <b>Tuyến:</b>
                <div>{ticket.route}</div>
              </div>

              <div>
                <b>Thời gian:</b>
                <div>{ticket.departure}</div>
              </div>

              <div>
                <b>Số ghế:</b>
                <div style={{ color: '#2563eb', fontWeight: '700' }}>
                  {ticket.seat}
                </div>
              </div>

              <div>
                <b>Xe:</b>
                <div>{ticket.bus}</div>
              </div>

              <div>
                <b>Giá vé:</b>
                <div style={{ color: '#dc2626', fontWeight: '700' }}>
                  {ticket.price.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>

            {/* Lý do */}
            <div style={{ marginTop: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '8px',
                  color: '#334155',
                }}
              >
                Lý do hủy vé
              </label>

              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  background: '#fff',
                }}
              >
                <option value="">-- Chọn lý do --</option>
                <option value="Thay đổi kế hoạch">
                  Thay đổi kế hoạch
                </option>
                <option value="Không còn nhu cầu di chuyển">
                  Không còn nhu cầu di chuyển
                </option>
                <option value="Đặt nhầm vé">
                  Đặt nhầm vé
                </option>
                <option value="Lý do khác">
                  Lý do khác
                </option>
              </select>
            </div>

            {/* Lưu ý */}
            <div
              style={{
                marginTop: '18px',
                padding: '14px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                color: '#92400e',
                fontSize: '13px',
              }}
            >
              ⚠️ Yêu cầu hoàn tiền sẽ được xử lý sau khi vé được hủy.
              Chính sách hoàn tiền phụ thuộc vào thời điểm hủy vé.
            </div>

            {/* Nút hủy */}
            <button
              onClick={handleCancel}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '14px',
                border: 'none',
                borderRadius: '10px',
                background: '#dc2626',
                color: '#fff',
                fontWeight: '700',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              ❌ Hủy vé & yêu cầu hoàn tiền
            </button>
          </div>
        )}

        {/* Thành công */}
        {cancelled && (
          <div
            style={{
              background: '#fff',
              padding: '35px',
              borderRadius: '16px',
              textAlign: 'center',
              border: '1px solid #bbf7d0',
              boxShadow: '0 8px 25px rgba(15,23,42,0.06)',
            }}
          >
            <div style={{ fontSize: '55px' }}>✅</div>

            <h2
              style={{
                color: '#166534',
                margin: '12px 0',
              }}
            >
              Hủy vé thành công
            </h2>

            <p style={{ color: '#475569' }}>
              Yêu cầu hoàn tiền của bạn đã được ghi nhận.
            </p>

            <div
              style={{
                background: '#f0fdf4',
                padding: '16px',
                borderRadius: '10px',
                marginTop: '20px',
                textAlign: 'left',
              }}
            >
              <div>
                <b>Mã vé:</b> {ticket.ticketCode}
              </div>

              <div style={{ marginTop: '8px' }}>
                <b>Số tiền hoàn dự kiến:</b>{' '}
                {ticket.price.toLocaleString('vi-VN')} đ
              </div>

              <div style={{ marginTop: '8px' }}>
                <b>Trạng thái hoàn tiền:</b>{' '}
                <span style={{ color: '#d97706', fontWeight: '700' }}>
                  ĐANG XỬ LÝ
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setTicket(null);
                setTicketCode('');
                setReason('');
                setCancelled(false);
              }}
              style={{
                marginTop: '20px',
                padding: '11px 20px',
                borderRadius: '9px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Tra cứu vé khác
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketCancellation;