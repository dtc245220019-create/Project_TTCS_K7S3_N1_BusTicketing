import { useEffect, useState } from 'react';
import { cancelTicket, getCurrentUser, getTickets } from '../api';

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
      const data = await getTickets(currentUser.id);
      if (data && data.length > 0) {
        setTickets(data);
      } else {
        // Fallback default tickets so user can demo right away
        setTickets([
          {
            id: 'TKT-8892',
            ticket_id: 8892,
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
    if (!window.confirm(`Bạn có chắc chắn muốn hủy vé ${ticket.id || ticket.ticket_code} không?\n(Lưu ý: Chỉ hủy được trước giờ khởi hành ít nhất 24 giờ)`)) {
      return;
    }

    try {
      await cancelTicket(ticket.ticket_id || ticket.id, currentUser.id);
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
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
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
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
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
        <div style={{ backgroundColor: 'white', padding: '50px 20px', borderRadius: '14px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎟️</div>
          <h3 style={{ color: '#1e293b', margin: '0 0 6px 0' }}>Không có vé nào trong mục này</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Bạn chưa đặt vé hoặc chuyến đi đã hoàn thành.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
                      👁️ Xem chi tiết
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

      {/* Ticket Detail Modal */}
      {selectedTicketDetail && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedTicketDetail(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '18px' }}>🚌 VÉ ĐIỆN TỬ SMART BUS</h3>
              <button onClick={() => setSelectedTicketDetail(null)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img
                src={selectedTicketDetail.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=ticket:${selectedTicketDetail.id || selectedTicketDetail.ticket_code}`}
                alt="QR Code"
                style={{ width: '150px', height: '150px', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '10px' }}
              />
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e293b', marginTop: '6px', fontFamily: 'monospace' }}>
                {selectedTicketDetail.id || selectedTicketDetail.ticket_code}
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', fontSize: '13px', lineHeight: '1.8' }}>
              <div>📍 <b>Tuyến:</b> {selectedTicketDetail.routeName || selectedTicketDetail.route_name}</div>
              <div>🕒 <b>Khởi hành:</b> {selectedTicketDetail.departureTime || selectedTicketDetail.departure_time}</div>
              <div>💺 <b>Số ghế:</b> {selectedTicketDetail.seatNumber || selectedTicketDetail.seat_numbers?.[0]}</div>
              <div>👤 <b>Hành khách:</b> {selectedTicketDetail.passenger_name || currentUser.full_name}</div>
              <div>💵 <b>Giá vé:</b> {selectedTicketDetail.price}</div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => window.print()}
                style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🖨️ In Vé
              </button>
              <button
                onClick={() => setSelectedTicketDetail(null)}
                style={{ flex: 1, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;