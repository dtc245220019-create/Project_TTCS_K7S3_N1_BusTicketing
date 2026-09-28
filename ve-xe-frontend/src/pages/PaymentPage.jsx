import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CountdownTimer from '../components/CountdownTimer';
import PaymentForm from '../components/PaymentForm';

function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Booking state passed from BusListPage
  const bookingData = location.state || {
    trip: {
      id: 20,
      trip_code: 'TRIP-HN-TN-01',
      from: 'Hà Nội',
      to: 'Thái Nguyên',
      departureTime: '07:30',
      arrivalTime: '09:30',
      departure_date: 'Hôm nay',
      busType: 'Ghế ngồi cao cấp 29 chỗ',
      license_plate: '29B-123.45',
      price: 120000,
    },
    selectedSeats: ['A05', 'A06'],
    selectedSeatIds: [1, 2],
    heldUntil: null,
    totalAmount: 240000,
    user: { id: 1, full_name: 'Nguyễn Văn A', phone: '0901234567', discount_type: 'HSSV' },
  };

  const [expired, setExpired] = useState(false);

  const handleExpire = () => {
    setExpired(true);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>
      <CountdownTimer initialMinutes={10} heldUntil={bookingData.heldUntil} onExpire={handleExpire} />

      {expired ? (
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '14px', textAlign: 'center', border: '1px solid #fecaca' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '12px' }}>Thời Gian Giữ Chỗ Đã Hết!</h2>
          <p style={{ color: '#64748b' }}>Hệ thống đã tự động giải phóng vị trí ghế đã chọn để nhường quyền ưu tiên cho khách hàng khác.</p>
          <button
            onClick={() => navigate('/buses')}
            style={{
              marginTop: '16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Quay Lại Chọn Ghế Mới
          </button>
        </div>
      ) : (
        <PaymentForm bookingData={bookingData} />
      )}
    </div>
  );
}

export default PaymentPage;