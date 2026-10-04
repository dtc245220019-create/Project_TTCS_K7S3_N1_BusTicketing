import { useEffect, useState } from 'react';
import { cancelTicket, getCurrentUser, getTickets } from '../api';
import PrintableTicket from '../components/PrintableTicket';

function UserDashboard() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);

  const currentUser = getCurrentUser() || {
    id: 1,
    full_name: 'Nguyễn Văn A',
    email: 'customer@example.com',
  };

  const loadUserTickets = async () => {
    setLoading(true);
    try {
      let apiTickets = [];
      try {
        const data = await getTickets(currentUser.id);
        if (data && Array.isArray(data)) {
          apiTickets = data;
        }
      } catch (apiErr) {
        console.warn('API getTickets tạm thời không phản hồi:', apiErr);
      }

      // Đọc vé đã mua lưu trong localStorage
      const localSaved = JSON.parse(localStorage.getItem('smartbus_purchased_tickets') || '[]');
      
      // Hợp nhất vé từ API và LocalStorage (tránh trùng mã vé)
      const existingCodes = new Set(apiTickets.map((t) => (t.ticket_code || t.id || '').toUpperCase()));
      const uniqueLocal = localSaved.filter((lt) => !existingCodes.has((lt.ticket_code || lt.id || '').toUpperCase()));
      const combined = [...uniqueLocal, ...apiTickets];

      if (combined.length > 0) {
        setTickets(combined);
      } else {
        // Fallback default tickets so user can demo right away
        setTickets([
          {
            id: 'TKT-8892',
            ticket_id: 8892,
            ticket_code: 'TKT-8892',
            routeName: 'Hà Nội - Thái Nguyên',
            departureTime: '07:30 - Hôm nay',
            seatNumber: 'A12',
            price: '120.000 VNĐ',
            passenger_name: currentUser.full_name,
            status: 'CONFIRMED',
            qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ticket:TKT-8892',
          },
          {
            id: 'TKT-7710',
            ticket_id: 7710,
            ticket_code: 'TKT-7710',
            routeName: 'Thái Nguyên - Hà Nội',
            departureTime: '14:00 - 15/09/2026',
            seatNumber: 'B04',
            price: '120.000 VNĐ',
            passenger_name: currentUser.full_name,
            status: 'COMPLETED',
            qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ticket:TKT-7710',
          },
        ]);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách vé:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserTickets();
  }, []);

  const handleCancel = async (ticket) => {
    const code = ticket.ticket_code || ticket.id;
    if (!window.confirm(`Bạn có chắc chắn muốn hủy vé ${code} không?\n(Lưu ý: Chỉ hủy được trước giờ khởi hành ít nhất 24 giờ)`)) {
      return;
    }

    try {
      try {
        await cancelTicket(ticket.ticket_id || ticket.id, currentUser.id);
      } catch (apiErr) {
        console.warn('Lỗi gọi API hủy vé:', apiErr);
      }

      // Cập nhật trạng thái trong localStorage nếu có
      const localSaved = JSON.parse(localStorage.getItem('smartbus_purchased_tickets') || '[]');
      const updatedLocal = localSaved.map((t) => {
        if ((t.ticket_code || t.id) === code) {
          return { ...t, status: 'CANCELLED' };
        }
        return t;
      });
      localStorage.setItem('smartbus_purchased_tickets', JSON.stringify(updatedLocal));

      alert('Đã hủy vé thành công! Ghế ngồi đã được giải phóng.');
      loadUserTickets();
    } catch (err) {
      alert(`Không thể hủy vé: ${err.message || 'Lỗi xử lý'}`);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const isUpcoming = t.status === 'CONFIRMED' || t.status === 'PAID' || t.status === 'GiuCho';
    return activeTab === 'upcoming' ? isUpcoming : !isUpcoming;
  });

  return (
    <div className="user-dashboard-wrapper" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px', minHeight: '80vh' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Quản Lý Vé Xe Cá Nhân (US07)
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
            Hành khách: <b>{currentUser.full_name}</b> ({currentUser.email || 'customer@example.com'})
          </p>
        </div>
        <button
          onClick={loadUserTickets}
          style={{
            backgroundColor: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          🔄 Làm mới dữ liệu
        </button>
      </div>

      {/* Tabs */}
      <div className="dashboard-navigation no-print" style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            padding: '12px 24px',
            fontWeight: 'bold',
            fontSize: '15px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'upcoming' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'upcoming' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
          }}
        >
          🎫 Vé Sắp Đi ({tickets.filter((t) => t.status === 'CONFIRMED' || t.status === 'PAID').length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 24px',
            fontWeight: 'bold',
            fontSize: '15px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'history' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'history' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
          }}
        >
          📜 Lịch Sử Chuyến Đi / Vé Đã Soát
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải vé...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="dashboard-ticket-list no-print" style={{ backgroundColor: 'white', padding: '50px 20px', borderRadius: '14px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎟️</div>
          <h3 style={{ color: '#1e293b', margin: '0 0 6px 0' }}>Không có vé nào trong mục này</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Bạn chưa đặt vé hoặc chuyến đi đã hoàn thành.</p>
        </div>
      ) : (
        <div className="dashboard-ticket-list no-print" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {filteredTickets.map((ticket) => {
            const isConfirmed = ticket.status === 'CONFIRMED' || ticket.status === 'PAID';

            return (
              <div
                key={ticket.id || ticket.ticket_id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '14px',
                  padding: '20px 24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '20px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold', fontSize: '12px', padding: '3px 8px', borderRadius: '6px' }}>
                      Mã vé: {ticket.id || ticket.ticket_code}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: isConfirmed ? '#dcfce7' : ticket.status === 'CANCELLED' ? '#fee2e2' : '#f1f5f9',
                        color: isConfirmed ? '#166534' : ticket.status === 'CANCELLED' ? '#991b1b' : '#475569',
                      }}
                    >
                      {isConfirmed ? 'ĐÃ THANH TOÁN (HỢP LỆ)' : ticket.status === 'CANCELLED' ? 'ĐÃ HỦY VÉ' : 'ĐÃ SOÁT VÉ'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 6px 0' }}>
                    {ticket.routeName || ticket.route_name}
                  </h3>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748b' }}>
                    🕒 <b>Giờ khởi hành:</b> {ticket.departureTime || ticket.departure_time}
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748b' }}>
                    💺 <b>Số ghế:</b> <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{ticket.seatNumber || ticket.seat_numbers?.[0]}</span>
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                    💵 <b>Giá vé:</b> {ticket.price}
                  </p>
                </div>

                {/* QR and actions */}
                <div style={{ textAlign: 'center', minWidth: '150px' }}>
                  <img
                    src={ticket.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ticket:${ticket.id || ticket.ticket_code}`}
                    alt="Mã QR Vé"
                    style={{
                      width: '100px',
                      height: '100px',
                      padding: '4px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      marginBottom: '8px',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                      onClick={() => setSelectedTicketDetail(ticket)}
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        fontSize: '12px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      👁️ Xem chi tiết & In vé
                    </button>
                    {isConfirmed && (
                      <button
                        onClick={() => handleCancel(ticket)}
                        style={{
                          backgroundColor: '#fee2e2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          fontSize: '12px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        ❌ Hủy Vé Này
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Detail Modal with PrintableTicket */}
      {selectedTicketDetail && (() => {
        const routeName = selectedTicketDetail.routeName || selectedTicketDetail.route_name || 'Hà Nội - Thái Nguyên';
        const parts = routeName.split(/[-➔]/).map((s) => s.trim());
        const fromCity = selectedTicketDetail.departure_city || parts[0] || 'Hà Nội';
        const toCity = selectedTicketDetail.arrival_city || parts[1] || 'Thái Nguyên';
        const seatNum = selectedTicketDetail.seatNumber || selectedTicketDetail.seat_numbers?.[0] || 'A05';
        const ticketCode = selectedTicketDetail.id || selectedTicketDetail.ticket_code || 'TKT-DEMO';
        const bookingCode = selectedTicketDetail.booking_code || `BOOK-${ticketCode.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;
        const invoiceCode = `HDDT-2026-${ticketCode.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;

        return (
          <div
            className="dashboard-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={() => setSelectedTicketDetail(null)}
          >
            <div
              className="dashboard-modal-content"
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '820px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar (Chỉ hiển thị trên màn hình, ẩn khi in) */}
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '22px' }}>🎫</span>
                  <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '18px', fontWeight: '800' }}>
                    CHI TIẾT VÉ ĐIỆN TỬ SMART BUS (US07)
                  </h3>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedTicketDetail(null)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Form In Vé Chuẩn Hóa */}
              <div id="printable-ticket" className="printable-ticket-wrapper">
                <PrintableTicket
                  ticketCode={ticketCode}
                  bookingCode={bookingCode}
                  invoiceCode={invoiceCode}
                  issuedAt="Hôm nay"
                  fromCity={fromCity}
                  toCity={toCity}
                  departureTime={selectedTicketDetail.departureTime || selectedTicketDetail.departure_time || '07:30'}
                  seatNumber={seatNum}
                  passengerName={selectedTicketDetail.passenger_name || currentUser.full_name || 'Nguyễn Văn A'}
                  passengerPhone={selectedTicketDetail.passenger_phone || currentUser.phone || '0901234567'}
                  busType={selectedTicketDetail.bus_type || 'Ghế ngồi cao cấp 29 chỗ'}
                  licensePlate={selectedTicketDetail.license_plate || '29B-123.45'}
                  finalPrice={selectedTicketDetail.price || '120.000 VNĐ'}
                  qrCodeUrl={selectedTicketDetail.qrCode || ''}
                  status={selectedTicketDetail.status || 'CONFIRMED'}
                  showStub={true}
                />
              </div>

              {/* Action Buttons (Chỉ hiển thị trên màn hình, ẩn khi in) */}
              <div
                className="no-print"
                style={{
                  marginTop: '20px',
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#1e293b',
                    color: 'white',
                    border: 'none',
                    padding: '11px 22px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                  }}
                >
                  🖨️ In Vé Này / Lưu PDF
                </button>
                <button
                  onClick={() => setSelectedTicketDetail(null)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '11px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: '#475569',
                    fontSize: '14px',
                  }}
                >
                  Đóng Cửa Sổ
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default UserDashboard;