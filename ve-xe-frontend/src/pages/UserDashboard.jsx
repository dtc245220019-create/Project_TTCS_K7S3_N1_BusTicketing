import React, { useState } from 'react';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [tickets, setTickets] = useState([
    {
      id: 'TKT-8892',
      routeName: 'Hà Nội - Thái Nguyên',
      departureTime: '08:00 - 28/09/2026',
      seatNumber: 'A12',
      price: '120.000 VNĐ',
      status: 'CONFIRMED',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TKT-8892'
    },
    {
      id: 'TKT-7710',
      routeName: 'Thái Nguyên - Hà Nội',
      departureTime: '14:00 - 15/08/2026',
      seatNumber: 'B04',
      price: '120.000 VNĐ',
      status: 'COMPLETED',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TKT-7710'
    }
  ]);

  const handleCancelTicket = (ticketId) => {
    if (window.confirm(`Bạn có chắc chắn muốn hủy vé ${ticketId} không?`)) {
      setTickets(tickets.filter(t => t.id !== ticketId));
      alert('Đã gửi yêu cầu hủy vé thành công!');
    }
  };

  const filteredTickets = tickets.filter(t => 
    activeTab === 'upcoming' ? t.status === 'CONFIRMED' : t.status === 'COMPLETED'
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-blue-900">Quản Lý Vé Cá Nhân</h1>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-6 font-semibold ${activeTab === 'upcoming' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Vé Sắp Đi
        </button>
        <button
          className={`py-2 px-6 font-semibold ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('history')}
        >
          Lịch Sử Chuyến Đi
        </button>
      </div>

      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Không có dữ liệu vé nào.</p>
        ) : (
          filteredTickets.map((ticket) => (
            <div key={ticket.id} className="bg-white p-5 rounded-xl shadow-md flex justify-between items-center border">
              <div>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Mã vé: {ticket.id}
                </span>
                <h2 className="text-lg font-bold mt-2 text-gray-800">{ticket.routeName}</h2>
                <p className="text-sm text-gray-600 mt-1">🕒 Giờ khởi hành: {ticket.departureTime}</p>
                <p className="text-sm text-gray-600">💺 Số ghế: <span className="font-bold text-blue-600">{ticket.seatNumber}</span></p>
                <p className="text-sm text-gray-600">💵 Giá vé: {ticket.price}</p>
              </div>

              <div className="text-center">
                {ticket.status === 'CONFIRMED' && (
                  <>
                    <img src={ticket.qrCode} alt="QR Code" className="w-24 h-24 mx-auto mb-2 border p-1 rounded bg-white shadow-sm" />
                    <button
                      onClick={() => handleCancelTicket(ticket.id)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs py-1.5 px-4 rounded transition"
                    >
                      Hủy Vé
                    </button>
                  </>
                )}
                {ticket.status === 'COMPLETED' && (
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded">
                    Đã hoàn thành
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}