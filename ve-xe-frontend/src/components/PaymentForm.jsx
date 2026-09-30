import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, getCurrentUser } from '../api';

const AVAILABLE_VOUCHERS = {
  CHAO20: { type: 'percentage', value: 20 },
  BUS50: { type: 'fixed', value: 50000 },
};

function PaymentForm({ bookingData }) {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('MOMO');
  const [processing, setProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherMessage, setVoucherMessage] = useState('');

  const currentUser = getCurrentUser() || bookingData.user || {
    id: 1,
    full_name: 'Nguyễn Văn A',
    phone: '0901234567',
    discount_type: 'HSSV',
  };

  const [passengerName, setPassengerName] = useState(currentUser.full_name || 'Nguyễn Văn A');
  const [passengerPhone, setPassengerPhone] = useState(currentUser.phone || '0901234567');

  const basePrice = bookingData.totalAmount || (bookingData.trip.price * bookingData.selectedSeats.length);
  // Ưu đãi giảm 20% cho HSSV / Người cao tuổi
  const hasDiscount = currentUser.discount_type === 'HSSV' || currentUser.discount_type === 'NguoiCaoTuoi';
  const discountAmount = hasDiscount ? Math.round(basePrice * 0.2) : 0;
  const priceAfterUserDiscount = basePrice - discountAmount;
  const voucherDiscountAmount = appliedVoucher
    ? appliedVoucher.type === 'percentage'
      ? Math.round(priceAfterUserDiscount * appliedVoucher.value / 100)
      : Math.min(appliedVoucher.value, priceAfterUserDiscount)
    : 0;
  const finalPrice = Math.max(0, priceAfterUserDiscount - voucherDiscountAmount);

  const handleApplyVoucher = () => {
    const code = voucherCode.trim().toUpperCase();
    const voucher = AVAILABLE_VOUCHERS[code];

    if (!code || !voucher) {
      setAppliedVoucher(null);
      setVoucherMessage(code ? 'Mã giảm giá không hợp lệ.' : 'Vui lòng nhập mã giảm giá.');
      return;
    }

    setAppliedVoucher({ ...voucher, code });
    setVoucherMessage(`Đã áp dụng mã ${code}.`);
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const orderPayload = {
        user_id: currentUser.id,
        trip_id: bookingData.trip.id,
        seat_numbers: bookingData.selectedSeats,
        passenger_name: passengerName,
        passenger_phone: passengerPhone,
        total_amount: finalPrice,
        payment_method: paymentMethod,
      };

      const result = await createOrder(orderPayload);
      setOrderResult(result);
    } catch (err) {
      alert(`Lỗi xử lý thanh toán: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (orderResult) {
    const tickets = orderResult.tickets || [];
    const currentTicket = tickets[activeTicketIndex] || tickets[0];
    const currentSeat = bookingData.selectedSeats[activeTicketIndex] || bookingData.selectedSeats[0];
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ticket:${currentTicket}`;

    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
        <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: '#16a34a', margin: '0 0 8px 0' }}>
          Thanh Toán Thành Công & Đã Phát Hành Vé!
        </h2>
        <p style={{ color: '#64748b', margin: '0 0 24px 0', fontSize: '15px' }}>
          Đơn đặt vé của bạn đã được xác nhận. Vé điện tử kèm mã QR thông minh sẵn sàng sử dụng khi lên xe.
        </p>

        {tickets.length > 1 && (
          <div role="tablist" aria-label="Vé trong đơn hàng" style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {tickets.map((ticket, index) => (
              <button
                key={ticket}
                type="button"
                role="tab"
                aria-selected={activeTicketIndex === index}
                onClick={() => setActiveTicketIndex(index)}
                style={{
                  padding: '8px 12px',
                  border: activeTicketIndex === index ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: activeTicketIndex === index ? '#eff6ff' : 'white',
                  color: activeTicketIndex === index ? '#1d4ed8' : '#475569',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Vé {index + 1} · Ghế {bookingData.selectedSeats[index] || index + 1}
              </button>
            ))}
          </div>
        )}

        {/* E-Ticket Card Preview */}
        <div
          style={{
            maxWidth: '500px',
            margin: '0 auto 28px auto',
            border: '2px dashed #3b82f6',
            borderRadius: '16px',
            padding: '24px',
            backgroundColor: '#f8fafc',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a' }}>🚌 SMART BUS TICKET</span>
            <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
              ĐÃ THANH TOÁN
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '16px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Tuyến xe:</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
                {bookingData.trip.from} ➔ {bookingData.trip.to}
              </div>

              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Hành khách:</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{passengerName}</div>

              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Vị trí ghế:</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>
                {currentSeat}
              </div>

              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Mã vé:</div>
              <div style={{ fontSize: '15px', fontFamily: 'monospace', fontWeight: 'bold', color: '#475569' }}>
                {currentTicket}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <img
                src={qrUrl}
                alt={`Mã QR vé ${currentTicket}`}
                style={{ width: '130px', height: '130px', border: '1px solid #cbd5e1', padding: '4px', borderRadius: '8px', backgroundColor: 'white' }}
              />
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Quét khi lên xe</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '15px',
            }}
          >
            🎫 Xem Trong Quản Lý Vé
          </button>
          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '15px',
            }}
          >
            🖨️ In Vé Điện Tử
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
      }}
    >
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 20px 0' }}>
        💳 Thanh Toán & Xác Nhận Đặt Vé (US05)
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        {/* Tóm tắt thông tin đơn hàng */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', marginBottom: '14px' }}>
            📋 Chi Tiết Chuyến Đi
          </h3>

          <div style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '15px' }}>
              <strong>Tuyến đường:</strong> {bookingData.trip.from} ➔ {bookingData.trip.to}
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
              <strong>Khởi hành:</strong> {bookingData.trip.departureTime} (Dự kiến đến: {bookingData.trip.arrivalTime})
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>
              <strong>Loại xe:</strong> {bookingData.trip.busType} (Biển số: {bookingData.trip.license_plate})
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '15px' }}>
              <strong>Ghế đã chọn:</strong>{' '}
              <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '16px' }}>
                {bookingData.selectedSeats.join(', ')}
              </span>{' '}
              ({bookingData.selectedSeats.length} vé)
            </p>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: '#64748b' }}>
                <span>Giá vé niêm yết:</span>
                <span>{basePrice.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              {hasDiscount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                  <span>Ưu đãi {currentUser.discount_type} (-20%):</span>
                  <span>- {discountAmount.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0', padding: '12px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                <label htmlFor="voucher-code" style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Mã giảm giá</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="voucher-code"
                    type="text"
                    value={voucherCode}
                    onChange={(event) => {
                      setVoucherCode(event.target.value);
                      setAppliedVoucher(null);
                      setVoucherMessage('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleApplyVoucher();
                    }}
                    placeholder="Nhập mã ưu đãi"
                    aria-describedby="voucher-message"
                    style={{ minWidth: 0, flex: 1, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', textTransform: 'uppercase' }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    style={{ padding: '0 14px', border: 'none', borderRadius: '6px', backgroundColor: '#1e293b', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Áp dụng
                  </button>
                </div>
                <p id="voucher-message" role="status" aria-live="polite" style={{ minHeight: '16px', margin: 0, color: appliedVoucher ? '#15803d' : '#64748b', fontSize: '12px' }}>
                  {voucherMessage || 'Mã thử nghiệm: CHAO20 hoặc BUS50.'}
                </p>
              </div>
              {appliedVoucher && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                  <span>Voucher {appliedVoucher.code}:</span>
                  <span>- {voucherDiscountAmount.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                <span>Tổng thanh toán:</span>
                <span>{finalPrice.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>
          </div>

          {/* Thông tin người đi */}
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', marginBottom: '14px' }}>
            👤 Thông Tin Hành Khách
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Họ và Tên:
              </label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Số Điện Thoại Nhận Vé:
              </label>
              <input
                type="text"
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* Phương thức thanh toán Sandbox */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', marginBottom: '14px' }}>
            💳 Chọn Cổng Thanh Toán Trực Tuyến
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {[
              { id: 'MOMO', name: 'Ví Điện Tử MoMo (Sandbox)', icon: '🟣', desc: 'Thanh toán tức thì qua ví điện tử MoMo' },
              { id: 'VNPAY', name: 'Cổng VNPAY / Quét Mã QR Ngân Hàng', icon: '🔵', desc: 'Hỗ trợ tất cả ứng dụng Mobile Banking' },
              { id: 'ZALOPAY', name: 'Ví Điện Tử ZaloPay', icon: '🟢', desc: 'Xác thực nhanh không cần nhập số thẻ' },
              { id: 'BANK', name: 'Thẻ ATM Nội Địa / Internet Banking', icon: '🏦', desc: 'Chuyển khoản trực tiếp bảo mật' },
            ].map((method) => (
              <label
                key={method.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: paymentMethod === method.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: paymentMethod === method.id ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="payment_gateway"
                  value={method.id}
                  checked={paymentMethod === method.id}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span style={{ fontSize: '24px' }}>{method.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{method.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{method.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', color: '#92400e', marginBottom: '20px' }}>
            ℹ️ Môi trường thử nghiệm Sandbox: Giao dịch được giả lập thanh toán thành công tự động, kích hoạt và cấp vé điện tử ngay tức thì.
          </div>

          <button
            onClick={handlePayment}
            disabled={processing}
            style={{
              width: '100%',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: processing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
            }}
          >
            {processing ? 'Đang kết nối cổng thanh toán...' : `Xác Nhận Thanh Toán (${finalPrice.toLocaleString('vi-VN')} VNĐ)`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentForm;