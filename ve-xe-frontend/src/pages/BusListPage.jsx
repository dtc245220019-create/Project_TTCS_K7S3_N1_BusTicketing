import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CountdownTimer from '../components/CountdownTimer';

function BusListPage() {
  const navigate = useNavigate();

  // Danh sách chuyến xe mẫu
  const busTrips = [
    {
      id: 1,
      operator: 'Phương Trang Limousine',
      busType: 'Giường nằm VIP 22 chỗ',
      tag: 'BÁN CHẠY NHẤT',
      departureTime: '08:00',
      arrivalTime: '16:00',
      duration: '8 tiếng',
      from: 'TP. Hồ Chí Minh',
      to: 'Đà Lạt',
      price: 350000,
      availableSeatsCount: 10,
    },
    {
      id: 2,
      operator: 'Nhà xe Thành Bưởi',
      busType: 'Xe giường nằm 36 chỗ',
      tag: 'GIÁ TỐT',
      departureTime: '13:30',
      arrivalTime: '21:30',
      duration: '8 tiếng',
      from: 'TP. Hồ Chí Minh',
      to: 'Đà Lạt',
      price: 280000,
      availableSeatsCount: 15,
    },
    {
      id: 3,
      operator: 'An Anh Express',
      busType: 'Limousine Chuyên Cơ 9 chỗ',
      tag: 'ĐÓN TẬN NƠI',
      departureTime: '22:00',
      arrivalTime: '06:00',
      duration: '8 tiếng (+1 ngày)',
      from: 'TP. Hồ Chí Minh',
      to: 'Đà Lạt',
      price: 400000,
      availableSeatsCount: 5,
    },
  ];

  const seatsData = [
    { id: 'A1', status: 'available' }, { id: 'A2', status: 'available' },
    { id: 'A3', status: 'booked' },    { id: 'A4', status: 'available' },
    { id: 'A5', status: 'available' }, { id: 'A6', status: 'available' },
    { id: 'A7', status: 'booked' },    { id: 'A8', status: 'available' },
  ];

  const [activeBusId, setActiveBusId] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);

  const toggleBusSeats = (busId) => {
    if (activeBusId === busId) {
      setActiveBusId(null);
    } else {
      setActiveBusId(busId);
      setSelectedSeats([]);
    }
  };

  const toggleSeat = (seatId, status) => {
    if (status === 'booked') return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const handleContinuePayment = () => {
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ghế trước khi thanh toán!');
      return;
    }
    navigate('/payment');
  };

  return (
    <div className="bus-page-wrapper">
      {/* Tiêu đề trang */}
      <div className="page-header-info">
        <h2>Xe từ TP. Hồ Chí Minh đi Đà Lạt</h2>
        <p>Khởi hành: Hôm nay, 25/09/2026 — Tìm thấy {busTrips.length} chuyến xe</p>
      </div>

      {/* Bố cục 2 Cột */}
      <div className="bus-layout-grid">
        
        {/* CỘT 1: BỘ LỌC BÊN TRÁI */}
        <aside className="filter-sidebar">
          <div className="filter-title">Bộ lọc tìm kiếm</div>

          <div className="filter-group">
            <label className="group-label">Giờ đi</label>
            <label className="filter-option">
              <input type="checkbox" /> Sáng (06:00 - 12:00)
            </label>
            <label className="filter-option">
              <input type="checkbox" /> Chiều (12:00 - 18:00)
            </label>
            <label className="filter-option">
              <input type="checkbox" /> Tối (18:00 - 24:00)
            </label>
          </div>

          <div className="filter-group">
            <label className="group-label">Loại xe</label>
            <label className="filter-option">
              <input type="checkbox" /> Limousine VIP
            </label>
            <label className="filter-option">
              <input type="checkbox" /> Giường nằm tiêu chuẩn
            </label>
          </div>

          <div className="filter-group">
            <label className="group-label">Nhà xe</label>
            <label className="filter-option">
              <input type="checkbox" /> Phương Trang
            </label>
            <label className="filter-option">
              <input type="checkbox" /> Thành Bưởi
            </label>
            <label className="filter-option">
              <input type="checkbox" /> An Anh Express
            </label>
          </div>
        </aside>

        {/* CỘT 2: DANH SÁCH CHUYẾN XE BÊN PHẢI */}
        <main className="trip-list-container">
          {busTrips.map((bus) => (
            <div key={bus.id} className="trip-card">
              
              {/* Header Thẻ Xe */}
              <div className="trip-card-header">
                <div>
                  <h3 className="operator-name">{bus.operator}</h3>
                  <span className="bus-type-badge">{bus.busType}</span>
                  {bus.tag && <span className="trip-tag">{bus.tag}</span>}
                </div>

                <div className="trip-price-section">
                  <div className="trip-price">{bus.price.toLocaleString()} VNĐ</div>
                  <button 
                    className={`select-seat-btn ${activeBusId === bus.id ? 'active' : ''}`}
                    onClick={() => toggleBusSeats(bus.id)}
                  >
                    {activeBusId === bus.id ? 'Đóng chọn ghế' : 'Chọn chuyến'}
                  </button>
                </div>
              </div>

              {/* Trục thời gian (Timeline) */}
              <div className="trip-timeline">
                <div className="time-box">
                  <div className="time">{bus.departureTime}</div>
                  <div className="place">{bus.from}</div>
                </div>

                <div className="timeline-line">
                  <span className="duration-tag">{bus.duration}</span>
                </div>

                <div className="time-box" style={{ textAlign: 'right' }}>
                  <div className="time">{bus.arrivalTime}</div>
                  <div className="place">{bus.to}</div>
                </div>
              </div>

              {/* Sơ đồ chọn ghế mở ra khi click */}
              {activeBusId === bus.id && (
                <div className="seat-picker-container">
                  <CountdownTimer initialMinutes={10} />
                  <h4 style={{ margin: '10px 0 5px 0', fontSize: '14px', color: 'var(--primary)' }}>
                    Chọn chỗ ngồi — {bus.operator}
                  </h4>

                  <div className="seat-legend">
                    <span><i className="seat-demo available"></i> Trống</span>
                    <span><i className="seat-demo selected"></i> Đang chọn</span>
                    <span><i className="seat-demo booked"></i> Đã bán</span>
                  </div>

                  <div className="seat-grid">
                    {seatsData.map((seat) => {
                      let seatClass = 'seat-btn';
                      if (seat.status === 'booked') seatClass += ' booked';
                      else if (selectedSeats.includes(seat.id)) seatClass += ' selected';

                      return (
                        <button
                          key={seat.id}
                          className={seatClass}
                          onClick={() => toggleSeat(seat.id, seat.status)}
                        >
                          {seat.id}
                        </button>
                      );
                    })}
                  </div>

                  <div className="booking-summary">
                    <p>Chỗ đã chọn: <strong>{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn'}</strong></p>
                    <p>Tổng tiền: <strong style={{ color: 'var(--accent)', fontSize: '16px' }}>{(selectedSeats.length * bus.price).toLocaleString()} VNĐ</strong></p>
                    <button className="continue-btn" onClick={handleContinuePayment}>
                      Tiếp tục thanh toán ➔
                    </button>
                  </div>
                </div>
              )}

            </div>
          ))}
        </main>

      </div>
    </div>
  );
}

export default BusListPage;