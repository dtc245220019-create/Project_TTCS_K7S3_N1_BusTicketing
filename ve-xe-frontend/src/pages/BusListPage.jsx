import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CountdownTimer from '../components/CountdownTimer';

function BusListPage() {
  const navigate = useNavigate();

  // Giả lập danh sách nhiều chuyến xe trả về từ Backend
  const busTrips = [
    {
      id: 1,
      operator: 'Phương Trang Limousine',
      busType: 'Giường nằm VIP 22 chỗ',
      departureTime: '08:00 AM',
      arrivalTime: '18:00 PM',
      price: 350000,
      availableSeatsCount: 10,
    },
    {
      id: 2,
      operator: 'Nhà xe Thành Bưởi',
      busType: 'Xe giường nằm 36 chỗ',
      departureTime: '13:30 PM',
      arrivalTime: '23:30 PM',
      price: 280000,
      availableSeatsCount: 15,
    },
    {
      id: 3,
      operator: 'An Anh Express',
      busType: 'Limousine Chuyên Cơ Mặt Đất 9 chỗ',
      departureTime: '22:00 PM',
      arrivalTime: '08:00 AM (+1 ngày)',
      price: 400000,
      availableSeatsCount: 5,
    },
  ];

  // Sơ đồ ghế mẫu
  const seatsData = [
    { id: 'A1', status: 'available' }, { id: 'A2', status: 'available' },
    { id: 'A3', status: 'booked' },    { id: 'A4', status: 'available' },
    { id: 'A5', status: 'available' }, { id: 'A6', status: 'available' },
    { id: 'A7', status: 'booked' },    { id: 'A8', status: 'available' },
  ];

  // Lưu chuyến xe đang được mở sơ đồ ghế
  const [activeBusId, setActiveBusId] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);

  // Bật / Tắt sơ đồ ghế của từng chuyến xe
  const toggleBusSeats = (busId) => {
    if (activeBusId === busId) {
      setActiveBusId(null); // Bấm lại lần nữa thì đóng
    } else {
      setActiveBusId(busId); // Mở sơ đồ chọn ghế cho xe này
      setSelectedSeats([]); // Reset lại danh sách ghế đang chọn
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
    <div className="bus-list-container">
      <h2>🚌 Các chuyến xe từ Hồ Chí Minh ➔ Đà Lạt</h2>
      <p className="sub-title">Khởi hành: Hôm nay, 25/09/2026</p>

      {/* Hiển thị danh sách từng chuyến xe */}
      {busTrips.map((bus) => (
        <div key={bus.id} className="bus-card" style={{ marginBottom: '20px' }}>
          <div className="bus-info-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#00b0ff', margin: '0 0 5px 0' }}>{bus.operator}</h3>
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>{bus.busType}</p>
              <p style={{ margin: '8px 0 0 0' }}>
                ⏰ Giờ chạy: <strong>{bus.departureTime}</strong> ➔ Đến: <strong>{bus.arrivalTime}</strong>
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '20px', color: '#d9534f', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                {bus.price.toLocaleString()} VNĐ
              </p>
              <button 
                className="continue-btn"
                onClick={() => toggleBusSeats(bus.id)}
                style={{ backgroundColor: activeBusId === bus.id ? '#ff9800' : '#00b0ff' }}
              >
                {activeBusId === bus.id ? 'Đóng chọn ghế' : 'Chọn chuyến'}
              </button>
            </div>
          </div>

          {/* Sơ đồ chọn ghế chỉ hiện ra khi bấm nút "Chọn chuyến" ở xe tương ứng */}
          {activeBusId === bus.id && (
            <div className="seat-selection" style={{ marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
              <CountdownTimer initialMinutes={10} />
              <h4>Sơ đồ chọn chỗ ngồi ({bus.operator})</h4>

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
                <p>Ghế đã chọn: <strong>{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn'}</strong></p>
                <p>Tổng tiền: <strong className="total-text">{(selectedSeats.length * bus.price).toLocaleString()} VNĐ</strong></p>
                <button className="continue-btn" onClick={handleContinuePayment}>
                  Tiếp tục thanh toán ➔
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default BusListPage;