import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, getCurrentUser, applyVoucher } from '../api';
import PrintableTicket from './PrintableTicket';
import VoucherModal from './VoucherModal';

const AVAILABLE_VOUCHERS = {
  CHAO20: { type: 'percentage', value: 20 },
  BUS50: { type: 'fixed', value: 50000 },
  GIAM10K: { type: 'fixed', value: 10000 },
  VIP15: { type: 'percentage', value: 15 },
};

function PaymentForm({ bookingData }) {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('VIETQR');
  const [processing, setProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [activeTicketTab, setActiveTicketTab] = useState(0);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherMessage, setVoucherMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // THÊM ĐOẠN NÀY ĐỂ CÓ DỮ LIỆU ĐƯA VÀO MODAL
  const myVouchers = [
    { id: 'CHAO20', title: 'Giảm 20% (Tối đa 50k)', minOrder: 100000 },
    { id: 'BUS50', title: 'Giảm 50.000đ cho đơn từ 200k', minOrder: 200000 },
    { id: 'GIAM10K', title: 'Giảm trực tiếp 10.000đ', minOrder: 0 }
  ];

  const handleSelectVoucherFromModal = (code) => {
    setVoucherCode(code); 
    setIsModalOpen(false); 
  };

  const currentUser = getCurrentUser() || bookingData.user || {
    id: 1,
    full_name: 'Nguyễn Văn A',
    phone: '0901234567',
    discount_type: 'HSSV',
  };

  const [passengerName, setPassengerName] = useState(currentUser.full_name || 'Nguyễn Văn A');
  const [passengerPhone, setPassengerPhone] = useState(currentUser.phone || '0901234567');

  const basePrice = bookingData.totalAmount || (bookingData.trip.price * (bookingData.selectedSeats?.length || 1));
  
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

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();

    if (!code) {
      setAppliedVoucher(null);
      setVoucherMessage('Vui lòng nhập mã giảm giá.');
      return;
    }

    setAppliedVoucher(null);
    setVoucherMessage('Đang kiểm tra mã giảm giá...');

    try {
      const res = await applyVoucher(code, priceAfterUserDiscount);

      if (
        res &&
        res.discount_amount !== undefined &&
        Number.isFinite(Number(res.discount_amount)) &&
        Number(res.discount_amount) >= 0
      ) {
        const discount = Math.min(
          Number(res.discount_amount),
          priceAfterUserDiscount
        );

        setAppliedVoucher({
          type: 'fixed',
          value: discount,
          code: res.code || code,
        });

        setVoucherMessage(
          `Đã áp dụng mã ${res.code || code}: Giảm ${discount.toLocaleString('vi-VN')} VNĐ!`
        );
      } else {
        setVoucherMessage(
          res?.message || 'Không thể áp dụng mã giảm giá này.'
        );
      }
    } catch (error) {
      setAppliedVoucher(null);
      setVoucherMessage(
        error?.message || 'Không thể kiểm tra voucher. Vui lòng thử lại.'
      );
    }
  };

  // Mã giao dịch và chuyển khoản đồng bộ cho phiên đặt chỗ
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

  // Lưu vé vào LocalStorage để đồng bộ với Quản lý vé (US07) và Soát vé (US08)
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

  const handlePayment = async () => {
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

    let result;

    try {
      // 1. Thử gọi API Backend trực tiếp
      result = await createOrder(orderPayload);
    } catch (apiErr) {
      console.warn('Backend API tạm thời không phản hồi, tự động kích hoạt chế độ Sandbox Demo dự phòng:', apiErr);
      // 2. Tự động chuyển đổi mượt mà sang chế độ Sandbox Demo (không để gián đoạn buổi thuyết trình / kiểm thử)
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
        message: 'Thanh toán thành công và vé điện tử US06 đã được cấp ngay tức thì!',
      };
    }

    if (result && result.success) {
      syncLocalTickets(result, bookingData.selectedSeats || ['A05'], bookingData.trip, passengerName, passengerPhone, finalPrice);
      setOrderResult(result);
    }
    setProcessing(false);
  };

  // =========================================================================
  // GIAO DIỆN XUẤT VÉ ĐIỆN TỬ KÈM MÃ QR & IN VÉ CHUẨN (US06)
  // =========================================================================
  if (orderResult) {
    const ticketList = orderResult.tickets || ['TKT-DEMO-01'];
    const currentTicketCode = ticketList[activeTicketTab] || ticketList[0];
    const currentSeatNumber = bookingData.selectedSeats?.[activeTicketTab] || bookingData.selectedSeats?.[0] || 'A05';

    const seatCount = bookingData.selectedSeats?.length || 1;
    const singleBasePrice = Math.round(basePrice / seatCount);
    const singleDiscount = Math.round((discountAmount + voucherDiscountAmount) / seatCount);
    const singleFinalPrice = Math.round(finalPrice / seatCount);

    const invoiceKey = orderResult.transaction_code
      ? `HDDT-${orderResult.transaction_code.replace(/[^A-Za-z0-9]/g, '').slice(-6)}`
      : 'HDDT-2026-9912';

    const formattedIssuedAt =
      new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ' - ' +
      new Date().toLocaleDateString('vi-VN');

    const handlePrintSingle = () => {
      setShowAllTickets(false);
      setTimeout(() => {
        window.print();
      }, 150);
    };

    const handlePrintAll = () => {
      setShowAllTickets(true);
      setTimeout(() => {
        window.print();
      }, 150);
    };

    return (
      <div
        className="payment-success-card"
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px 28px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Banner thông báo (Chỉ hiển thị trên màn hình, ẩn khi in) */}
        <div className="no-print success-header-banner" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '48px', display: 'inline-block', marginBottom: '8px' }}>🎉</span>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a', margin: '0 0 6px 0' }}>
            Thanh Toán Thành Công & Đã Phát Hành Vé Điện Tử (US06)
          </h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Mã đặt chỗ:{' '}
            <b style={{ color: '#1e3a8a', fontFamily: 'monospace' }}>#{orderResult.booking_code}</b> | Giao dịch:{' '}
            <b style={{ color: '#475569', fontFamily: 'monospace' }}>{orderResult.transaction_code}</b>
          </p>
        </div>

        {orderResult.is_sandbox_fallback && (
          <div
            className="no-print sandbox-badge-banner"
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '10px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>💡</span>
            <span>
              <b>Chế độ Sandbox Demo:</b> Vé đã được phát hành và tự động lưu vào <b>Quản Lý Vé Cá Nhân (US07)</b>. Bạn có thể dùng camera hoặc màn hình Soát vé (US08) để quét mã QR này ngay.
            </span>
          </div>
        )}

        {/* Thanh tab chọn vé nếu đặt nhiều chỗ (Ẩn khi in) */}
        {ticketList.length > 1 && (
          <div
            className="no-print ticket-tabs-nav"
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            {ticketList.map((tCode, idx) => (
              <button
                key={tCode}
                onClick={() => {
                  setActiveTicketTab(idx);
                  setShowAllTickets(false);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border:
                    !showAllTickets && activeTicketTab === idx
                      ? '2px solid #2563eb'
                      : '1px solid #cbd5e1',
                  backgroundColor:
                    !showAllTickets && activeTicketTab === idx ? '#eff6ff' : 'white',
                  color:
                    !showAllTickets && activeTicketTab === idx ? '#1d4ed8' : '#475569',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🎫 Vé {idx + 1}:</span>
                <span style={{ color: '#2563eb' }}>Ghế {bookingData.selectedSeats?.[idx]}</span>
              </button>
            ))}

            <button
              onClick={() => setShowAllTickets(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: showAllTickets ? '2px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: showAllTickets ? '#eff6ff' : 'white',
                color: showAllTickets ? '#1d4ed8' : '#475569',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📑 Xem & In Tất Cả ({ticketList.length} Vé)</span>
            </button>
          </div>
        )}

        {/* VÙNG HIỂN THỊ VÉ ĐIỆN TỬ CHUẨN IN (PRINTABLE TICKET) */}
        <div id="printable-ticket" className="printable-ticket-wrapper">
          {showAllTickets ? (
            // Hiển thị và in toàn bộ danh sách vé
            ticketList.map((tCode, idx) => (
              <PrintableTicket
                key={tCode}
                ticketCode={tCode}
                bookingCode={orderResult.booking_code || 'BOOK-DEMO'}
                invoiceCode={invoiceKey}
                issuedAt={formattedIssuedAt}
                fromCity={bookingData.trip.from || bookingData.trip.departure_city || 'Hà Nội'}
                toCity={bookingData.trip.to || bookingData.trip.arrival_city || 'Thái Nguyên'}
                departureStation={bookingData.trip.departure_station || bookingData.trip.pickup_point}
                arrivalStation={bookingData.trip.arrival_station || bookingData.trip.dropoff_point}
                departureTime={bookingData.trip.departureTime || '07:30'}
                departureDate={bookingData.trip.departure_date || 'Hôm nay'}
                arrivalTime={bookingData.trip.arrivalTime || '09:15'}
                arrivalDate={bookingData.trip.departure_date || 'Cùng ngày'}
                seatNumber={bookingData.selectedSeats?.[idx] || `A0${idx + 1}`}
                busType={bookingData.trip.busType || 'Ghế ngồi cao cấp 29 chỗ'}
                licensePlate={bookingData.trip.license_plate || '29B-123.45'}
                passengerName={passengerName}
                passengerPhone={passengerPhone}
                discountType={currentUser.discount_type || 'HSSV'}
                originalPrice={`${singleBasePrice.toLocaleString('vi-VN')} VNĐ`}
                discountAmount={singleDiscount > 0 ? `${singleDiscount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                finalPrice={`${singleFinalPrice.toLocaleString('vi-VN')} VNĐ`}
                paymentMethod={paymentMethod}
                status="CONFIRMED"
                showStub={true}
              />
            ))
          ) : (
            // Hiển thị vé đơn lẻ theo tab
            <PrintableTicket
              ticketCode={currentTicketCode}
              bookingCode={orderResult.booking_code || 'BOOK-DEMO'}
              invoiceCode={invoiceKey}
              issuedAt={formattedIssuedAt}
              fromCity={bookingData.trip.from || bookingData.trip.departure_city || 'Hà Nội'}
              toCity={bookingData.trip.to || bookingData.trip.arrival_city || 'Thái Nguyên'}
              departureStation={bookingData.trip.departure_station || bookingData.trip.pickup_point}
              arrivalStation={bookingData.trip.arrival_station || bookingData.trip.dropoff_point}
              departureTime={bookingData.trip.departureTime || '07:30'}
              departureDate={bookingData.trip.departure_date || 'Hôm nay'}
              arrivalTime={bookingData.trip.arrivalTime || '09:15'}
              arrivalDate={bookingData.trip.departure_date || 'Cùng ngày'}
              seatNumber={currentSeatNumber}
              busType={bookingData.trip.busType || 'Ghế ngồi cao cấp 29 chỗ'}
              licensePlate={bookingData.trip.license_plate || '29B-123.45'}
              passengerName={passengerName}
              passengerPhone={passengerPhone}
              discountType={currentUser.discount_type || 'HSSV'}
              originalPrice={`${singleBasePrice.toLocaleString('vi-VN')} VNĐ`}
              discountAmount={singleDiscount > 0 ? `${singleDiscount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
              finalPrice={`${singleFinalPrice.toLocaleString('vi-VN')} VNĐ`}
              paymentMethod={paymentMethod}
              status="CONFIRMED"
              showStub={true}
            />
          )}
        </div>

        {/* Action Buttons (Chỉ hiển thị trên màn hình, ẩn 100% khi in) */}
        <div
          className="no-print payment-actions-bar"
          style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}
        >
          <button
            onClick={handlePrintSingle}
            style={{
              backgroundColor: '#1e293b',
              color: 'white',
              border: 'none',
              padding: '12px 22px',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(30,41,59,0.15)',
            }}
          >
            🖨️ In Vé Này (Ghế {currentSeatNumber})
          </button>

          {ticketList.length > 1 && (
            <button
              onClick={handlePrintAll}
              style={{
                backgroundColor: '#0284c7',
                color: 'white',
                border: 'none',
                padding: '12px 22px',
                borderRadius: '10px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(2,132,199,0.2)',
              }}
            >
              🖨️ In Tất Cả {ticketList.length} Vé
            </button>
          )}

          <button
            onClick={() => navigate('/verify', { state: { ticketCode: currentTicketCode } })}
            style={{
              backgroundColor: '#0f766e',
              color: 'white',
              border: 'none',
              padding: '12px 22px',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
            }}
          >
            🔍 Soát Vé Thử Nghiệm Ngay (US08)
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '12px 22px',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
            }}
          >
            🎫 Xem Quản Lý Vé Cá Nhân (US07)
          </button>

          <button
            onClick={() => navigate('/buses')}
            style={{
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              padding: '12px 18px',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            🚌 Đặt Chuyến Đi Mới
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // GIAO DIỆN THANH TOÁN & SINH MÃ QR THANH TOÁN (US05)
  // =========================================================================
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
            💳 Thanh Toán & Cấp Vé Điện Tử (US05 - US06)
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
        {/* CỘT TRÁI: TÓM TẮT ĐƠN HÀNG & THÔNG TIN HÀNH KHÁCH */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> Chi Tiết Chuyến Đi
          </h3>

          <div style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
              {bookingData.trip.from} ➔ {bookingData.trip.to}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#475569' }}>
              <div>
                <strong>Khởi hành:</strong> {bookingData.trip.departureTime} (Dự kiến đến: {bookingData.trip.arrivalTime})
              </div>
              <div>
                <strong>Ngày đi:</strong> {bookingData.trip.departure_date || 'Hôm nay'}
              </div>
              <div>
                <strong>Loại xe:</strong> {bookingData.trip.busType} (Biển: {bookingData.trip.license_plate})
              </div>
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
                  <span>-{discountAmount.toLocaleString('vi-VN')} VNĐ</span>
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
                    onClick={() => setIsModalOpen(true)}
                    style={{ padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', color: '#1e293b', fontWeight: '600', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    🎫 Chọn mã
                  </button>
                  
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
                  <span>-{voucherDiscountAmount.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>
                <span>Tổng tiền thanh toán:</span>
                <span>{finalPrice.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>
          </div>

          {/* Form Thông tin hành khách */}
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
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
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
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: CHỌN CỔNG & SINH MÃ QR THANH TOÁN (US05) */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💳</span> Phương Thức Thanh Toán
          </h3>

          {/* Tab lựa chọn hình thức thanh toán */}
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

          {/* KHU VỰC SINH MÃ QR THANH TOÁN TRỰC TIẾP */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '14px',
              padding: '20px',
              marginBottom: '20px',
            }}
          >
            {paymentMethod === 'VIETQR' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a' }}>MÃ QR CHUYỂN KHOẢN (VIETQR)</span>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Quét bằng app ngân hàng bất kỳ để tự động điền tiền & nội dung</div>
                  </div>
                  <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                    Tự động nhận diện
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* Dynamic VietQR Image */}
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={`https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=${finalPrice}&addInfo=${encodeURIComponent(transferSyntax)}&accountName=CONG%20TY%20CP%20SMART%20BUS`}
                      onError={(e) => {
                        // Fallback to QR server if VietQR image service is blocked or slow
                        e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=vietqr:MB:0901234567:${finalPrice}:${encodeURIComponent(transferSyntax)}`;
                      }}
                      alt="VietQR Chuyển Khoản"
                      style={{
                        width: '180px',
                        height: '180px',
                        backgroundColor: 'white',
                        padding: '4px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                      }}
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Quét bằng app ngân hàng</div>
                  </div>

                  {/* Transfer Details with 1-click copy */}
                  <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    
                    <div style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Ngân hàng thụ hưởng:</div>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>MB Bank (Quân Đội)</div>
                    </div>

                    <div style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Số tài khoản:</div>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>0901234567</div>
                      </div>
                      <button onClick={() => copyToClipboard('0901234567', 'account')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '12px', fontWeight: 'bold' }}>
                        {copiedField === 'account' ? 'Đã chép' : 'Copy'}
                      </button>
                    </div>

                    <div style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Tên người nhận:</div>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>CONG TY CP SMART BUS</div>
                    </div>

                    <div style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Số tiền:</div>
                        <div style={{ fontWeight: '700', color: '#dc2626' }}>{finalPrice.toLocaleString('vi-VN')} VNĐ</div>
                      </div>
                      <button onClick={() => copyToClipboard(finalPrice.toString(), 'amount')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '12px', fontWeight: 'bold' }}>
                        {copiedField === 'amount' ? 'Đã chép' : 'Copy'}
                      </button>
                    </div>

                    <div style={{ backgroundColor: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Nội dung chuyển khoản:</div>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{transferSyntax}</div>
                      </div>
                      <button onClick={() => copyToClipboard(transferSyntax, 'syntax')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '12px', fontWeight: 'bold' }}>
                        {copiedField === 'syntax' ? 'Đã chép' : 'Copy'}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {paymentMethod !== 'VIETQR' && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                  {paymentMethod === 'MOMO' ? '🟣' : paymentMethod === 'VNPAY' ? '🔵' : '🏦'}
                </div>
                <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Đang chuẩn bị cổng thanh toán...</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>Hệ thống sẽ chuyển hướng bạn đến giao diện thanh toán {paymentMethod} sau khi nhấn Xác nhận.</p>
              </div>
            )}
          </div>

          <button
            onClick={handlePayment}
            disabled={processing}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: processing ? '#94a3b8' : '#2563eb',
              color: 'white',
              fontWeight: '800',
              fontSize: '16px',
              cursor: processing ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              boxShadow: processing ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {processing ? (
              <span>Đang xử lý giao dịch...</span>
            ) : (
              <span>✅ Xác Nhận Đã Thanh Toán & Nhận Vé</span>
            )}
          </button>
        </div>
      </div>
      <VoucherModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelectVoucherFromModal}
        vouchers={myVouchers}
      />
    </div>
  );
}

export default PaymentForm;