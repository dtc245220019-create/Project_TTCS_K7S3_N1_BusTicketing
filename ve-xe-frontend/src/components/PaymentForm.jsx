import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, getCurrentUser } from '../api';

function PaymentForm({ bookingData }) {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('VIETQR');
  const [processing, setProcessing] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  const currentUser = getCurrentUser() || bookingData.user || {
    id: 1,
    full_name: 'Nguyễn Văn A',
    phone: '0901234567',
    discount_type: 'HSSV',
  };

  const [passengerName, setPassengerName] = useState(currentUser.full_name || 'Nguyễn Văn A');
  const [passengerPhone, setPassengerPhone] = useState(currentUser.phone || '0901234567');

  const basePrice = bookingData.totalAmount || (bookingData.trip.price * (bookingData.selectedSeats?.length || 1));
  const hasDiscount = currentUser.discount_type === 'HSSV' || currentUser.discount_type === 'NguoiCaoTuoi';
  const discountAmount = hasDiscount ? Math.round(basePrice * 0.2) : 0;
  const finalPrice = basePrice - discountAmount;

  const tripCodeClean = (bookingData.trip.trip_code || 'HN-TN').replace(/[^a-zA-Z0-9]/g, '');
  const seatsClean = (bookingData.selectedSeats || ['A05']).join('');
  const transferSyntax = `BUS ${tripCodeClean} ${seatsClean}`;

  const copyToClipboard = (text, fieldName) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    }
  };

  const syncLocalTickets = (result, seats, trip, name, phone, price) => {
    try {
      const existing = JSON.parse(localStorage.getItem('smartbus_purchased_tickets') || '[]');
      const newItems = (result.tickets || []).map((tCode, idx) => ({
        id: tCode,
        ticket_code: tCode,
        ticket_id: tCode,
        booking_code: result.booking_code,
        routeName: `${trip.from} - ${trip.to}`,
        departure_city: trip.from,
        arrival_city: trip.to,
        departureTime: `${trip.departureTime || '07:30'} - ${trip.departure_date || 'Hôm nay'}`,
        seatNumber: seats[idx] || `A0${idx + 1}`,
        price: `${Math.round(price / (seats.length || 1)).toLocaleString('vi-VN')} VNĐ`,
        passenger_name: name,
        passenger_phone: phone,
        bus_type: trip.busType || 'Ghế ngồi VIP',
        license_plate: trip.license_plate || '29B-123.45',
        status: 'CONFIRMED',
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ticket:${tCode}`,
      }));
      const merged = [...newItems, ...existing];
      localStorage.setItem('smartbus_purchased_tickets', JSON.stringify(merged));
    } catch (e) {
      console.warn('Lỗi lưu vé vào localStorage:', e);
    }
  };

  // NHẬN THAM SỐ forceFailFlag ĐỂ TEST FAIL
  const handlePayment = async (forceFailFlag = false) => {
    setProcessing(true);

    const orderPayload = {
      user_id: currentUser.id || 1,
      trip_id: bookingData.trip.id,
      seat_numbers: bookingData.selectedSeats || ['A05'],
      passenger_name: passengerName,
      passenger_phone: passengerPhone,
      total_amount: finalPrice,
      payment_method: paymentMethod,
    };

    let result = null;

    // NẾU LÀ TEST FAIL → CHUYỂN THẲNG SANG TRANG FAILED
    if (forceFailFlag) {
      setTimeout(() => {
        navigate('/payment/result', {
          state: {
            success: false,
            reason: 'PAYMENT_FAILED',
            booking_code: '',
            transaction_code: '',
            amount: finalPrice,
            provider: paymentMethod,
          },
        });
        setProcessing(false);
      }, 500);
      return;
    }

    try {
      result = await createOrder(orderPayload);
    } catch (apiErr) {
      console.warn('Backend API không phản hồi, dùng Sandbox Demo:', apiErr);
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const demoBookingCode = `BOOK-${randomSuffix}`;
      const demoTxnCode = `TXN-${paymentMethod}-${randomSuffix}`;
      const demoTickets = (bookingData.selectedSeats || ['A05']).map((s) => `TKT-${s}-${randomSuffix}`);

      result = {
        success: true,
        is_sandbox_fallback: true,
        booking_code: demoBookingCode,
        transaction_code: demoTxnCode,
        tickets: demoTickets,
        message: 'Thanh toán thành công và vé điện tử đã được cấp ngay tức thì!',
      };
    }

    if (result && result.success) {
      syncLocalTickets(result, bookingData.selectedSeats || ['A05'], bookingData.trip, passengerName, passengerPhone, finalPrice);

      navigate('/payment/result', {
        state: {
          success: true,
          booking_code: result.booking_code,
          transaction_code: result.transaction_code,
          amount: finalPrice,
          provider: paymentMethod,
          tickets: result.tickets,
          is_sandbox_fallback: result.is_sandbox_fallback,
          trip: bookingData.trip,
          seats: bookingData.selectedSeats,
          passenger_name: passengerName,
          passenger_phone: passengerPhone,
        },
      });
    } else {
      navigate('/payment/result', {
        state: {
          success: false,
          reason: result?.reason || 'PAYMENT_FAILED',
          booking_code: result?.booking_code || '',
          transaction_code: result?.transaction_code || '',
          amount: finalPrice,
          provider: paymentMethod,
        },
      });
    }

    setProcessing(false);
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e3a8a', margin: 0 }}>
            💳 Thanh Toán & Chọn Phương Thức
          </h2>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
            Quét mã QR thanh toán tức thì hoặc chọn phương thức phù hợp để hoàn tất đặt vé.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #bfdbfe' }}>
            🔒 Bảo Mật SSL 256-Bit
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> Chi Tiết Chuyến Đi
          </h3>

          <div style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
              {bookingData.trip.from} ➔ {bookingData.trip.to}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#475569' }}>
              <div><strong>Khởi hành:</strong> {bookingData.trip.departureTime} (Dự kiến đến: {bookingData.trip.arrivalTime})</div>
              <div><strong>Ngày đi:</strong> {bookingData.trip.departure_date || 'Hôm nay'}</div>
              <div><strong>Loại xe:</strong> {bookingData.trip.busType} (Biển: {bookingData.trip.license_plate})</div>
              <div>
                <strong>Ghế đã chọn:</strong>{' '}
                <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '15px' }}>
                  {bookingData.selectedSeats?.join(', ')}
                </span>{' '}
                ({bookingData.selectedSeats?.length || 1} vé)
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: '#64748b' }}>
                <span>Giá vé gốc:</span>
                <span>{basePrice.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              {hasDiscount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                  <span>Ưu đãi {currentUser.discount_type} (-20%):</span>
                  <span>- {discountAmount.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>
                <span>Tổng tiền thanh toán:</span>
                <span>{finalPrice.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👤</span> Thông Tin Hành Khách Nhận Vé
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Họ và tên hành khách:
              </label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Số điện thoại nhận vé & SMS:
              </label>
              <input
                type="text"
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💳</span> Phương Thức Thanh Toán
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { id: 'VIETQR', label: 'Quét Mã VietQR', icon: '🟢', sub: 'Mọi ứng dụng Ngân hàng' },
              { id: 'MOMO', label: 'Ví MoMo', icon: '🟣', sub: 'Thanh toán tức thì' },
              { id: 'VNPAY', label: 'Cổng VNPAY', icon: '🔵', sub: 'Quét QR VNPAY-QR' },
              { id: 'BANK', label: 'Thẻ ATM / Banking', icon: '🏦', sub: 'Nội địa & Visa/Master' },
            ].map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: paymentMethod === m.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: paymentMethod === m.id ? '#eff6ff' : 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '13px', color: paymentMethod === m.id ? '#1d4ed8' : '#1e293b' }}>
                  <span>{m.icon}</span> {m.label}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{m.sub}</div>
              </button>
            ))}
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
            {paymentMethod === 'VIETQR' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a' }}>MÃ QR CHUYỂN KHOẢN (VIETQR)</span>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Quét bằng app ngân hàng bất kỳ</div>
                  </div>
                  <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>Tự động</span>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={`https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=${finalPrice}&addInfo=${encodeURIComponent(transferSyntax)}&accountName=CONG%20TY%20CP%20SMART%20BUS`}
                      onError={(e) => {
                        e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=vietqr:MB:0901234567:${finalPrice}:${encodeURIComponent(transferSyntax)}`;
                      }}
                      alt="VietQR"
                      style={{ width: '180px', height: '180px', backgroundColor: 'white', padding: '4px', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Quét bằng app ngân hàng</div>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Ngân hàng:</div>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>MB Bank</div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Số TK:</div>
                        <div style={{ fontWeight: '800', fontFamily: 'monospace', color: '#2563eb' }}>0901 234 567</div>
                      </div>
                      <button type="button" onClick={() => copyToClipboard('0901234567', 'stk')} style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {copiedField === 'stk' ? '✓ Đã chép' : 'Sao chép'}
                      </button>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Nội dung:</div>
                        <div style={{ fontWeight: '800', fontFamily: 'monospace', color: '#16a34a' }}>{transferSyntax}</div>
                      </div>
                      <button type="button" onClick={() => copyToClipboard(transferSyntax, 'syntax')} style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {copiedField === 'syntax' ? '✓ Đã chép' : 'Sao chép'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'MOMO' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#a21caf', marginBottom: '14px' }}>🟣 CỔNG VÍ MOMO</div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2|99|0901234567|SMARTBUS|${finalPrice}|${encodeURIComponent(transferSyntax)}`}
                  alt="QR MoMo"
                  style={{ width: '170px', height: '170px', backgroundColor: 'white', padding: '6px', borderRadius: '12px', border: '2px solid #f472b6' }}
                />
                <div style={{ marginTop: '10px', fontSize: '13px' }}>Ví MoMo: <b>0901 234 567</b></div>
              </div>
            )}

            {paymentMethod === 'VNPAY' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284c7', marginBottom: '14px' }}>🔵 CỔNG VNPAY-QR</div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=vnpay:smartbus:${finalPrice}:${encodeURIComponent(transferSyntax)}`}
                  alt="QR VNPAY"
                  style={{ width: '170px', height: '170px', backgroundColor: 'white', padding: '6px', borderRadius: '12px', border: '2px solid #38bdf8' }}
                />
              </div>
            )}

            {paymentMethod === 'BANK' && (
              <div style={{ fontSize: '13px', color: '#475569' }}>
                <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>🏦 Hướng dẫn chuyển khoản:</div>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Ngân hàng: <b>MB Bank - 0901 234 567</b></li>
                  <li>Số tiền: <b style={{ color: '#dc2626' }}>{finalPrice.toLocaleString('vi-VN')} VNĐ</b></li>
                  <li>Nội dung: <b style={{ color: '#2563eb' }}>{transferSyntax}</b></li>
                </ul>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handlePayment(false)}
              disabled={processing}
              style={{
                width: '100%',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '800',
                cursor: processing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
              }}
            >
              {processing ? '⏳ Đang xử lý...' : `✓ Xác Nhận Thanh Toán (${finalPrice.toLocaleString('vi-VN')} VNĐ)`}
            </button>

            <button
              type="button"
              onClick={() => handlePayment(false)}
              disabled={processing}
              style={{
                width: '100%',
                backgroundColor: '#f8fafc',
                color: '#2563eb',
                border: '1.5px dashed #93c5fd',
                padding: '10px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: processing ? 'not-allowed' : 'pointer',
              }}
            >
              ⚡ Mô Phỏng Thanh Toán Siêu Tốc (Sandbox Demo)
            </button>

            <button
              type="button"
              onClick={() => handlePayment(true)}
              disabled={processing}
              style={{
                width: '100%',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1.5px dashed #fca5a5',
                padding: '10px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: processing ? 'not-allowed' : 'pointer',
              }}
            >
              🧪 Test Trường Hợp Thất Bại (Demo)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentForm;