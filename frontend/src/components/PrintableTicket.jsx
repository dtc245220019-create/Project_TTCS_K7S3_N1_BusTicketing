import React from 'react';

/**
 * Tra cứu địa chỉ bến xe chuẩn hóa theo tỉnh/thành phố
 */
const TERMINAL_DATABASE = {
  'Hà Nội': {
    name: 'Bến xe Mỹ Đình',
    address: 'Số 20 Phạm Hùng, P. Mỹ Đình 2, Q. Nam Từ Liêm, TP. Hà Nội',
    gate: 'Cổng 03 - Làn A (Tuyến Phía Bắc)',
    hotline: '024 3768 5549',
  },
  'Thái Nguyên': {
    name: 'Bến xe Trung tâm Thái Nguyên',
    address: 'Ngõ 398 Đường Đồng Quang, P. Đồng Quang, TP. Thái Nguyên',
    gate: 'Cổng Trả Khách B1',
    hotline: '0208 3855 685',
  },
  'Hồ Chí Minh': {
    name: 'Bến xe Miền Đông Mới',
    address: 'Số 501 Hoàng Hữu Nam, P. Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    gate: 'Cổng 02 - Làn VIP Cao Tốc',
    hotline: '028 3511 6858',
  },
  'TP. Hồ Chí Minh': {
    name: 'Bến xe Miền Đông Mới',
    address: 'Số 501 Hoàng Hữu Nam, P. Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh',
    gate: 'Cổng 02 - Làn VIP Cao Tốc',
    hotline: '028 3511 6858',
  },
  'Đà Lạt': {
    name: 'Bến xe Liên tỉnh Đà Lạt',
    address: 'Số 01 Tô Hiến Thành, Phường 3, TP. Đà Lạt, Tỉnh Lâm Đồng',
    gate: 'Cổng Trả Khách Trung Tâm',
    hotline: '0263 3822 663',
  },
  'Đà Nẵng': {
    name: 'Bến xe Trung tâm Đà Nẵng',
    address: 'Số 185 Tôn Đức Thắng, P. Hòa Minh, Q. Liên Chiểu, TP. Đà Nẵng',
    gate: 'Cổng 01 - Làn Tuyến Miền Trung',
    hotline: '0236 3767 679',
  },
  'Huế': {
    name: 'Bến xe Phía Nam Huế',
    address: 'Số 97 An Dương Vương, P. An Cựu, TP. Huế, Thừa Thiên Huế',
    gate: 'Cổng Trả Khách H1',
    hotline: '0234 3823 898',
  },
  'Hải Phòng': {
    name: 'Bến xe Vĩnh Niệm',
    address: 'Số 15 Bùi Viện, P. Vĩnh Niệm, Q. Lê Chân, TP. Hải Phòng',
    gate: 'Cổng 02 - Làn Cao Tốc Hà Nội - HP',
    hotline: '0225 3858 888',
  },
};

/**
 * Sinh mã vạch Vector SVG giả lập chuẩn Code 128
 */
function SvgBarcode({ code = 'SMARTBUS128', height = 44 }) {
  // Sinh mảng độ rộng vạch cố định dựa trên ký tự
  const bars = [];
  let currentPos = 0;
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const w1 = (charCode % 3) + 1;
    const s1 = ((charCode >> 1) % 2) + 1;
    const w2 = ((charCode >> 2) % 3) + 1;
    const s2 = ((charCode >> 3) % 2) + 1;

    bars.push({ x: currentPos, width: w1 });
    currentPos += w1 + s1;
    bars.push({ x: currentPos, width: w2 });
    currentPos += w2 + s2;
  }
  // Thêm vạch kết thúc stop bar
  bars.push({ x: currentPos, width: 3 });
  currentPos += 6;

  return (
    <div style={{ textAlign: 'center', margin: '4px 0' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${currentPos} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block', maxWidth: '280px', margin: '0 auto' }}
      >
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y="0"
            width={bar.width}
            height={height}
            fill="#0f172a"
          />
        ))}
      </svg>
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          letterSpacing: '3px',
          color: '#334155',
          fontWeight: '700',
          marginTop: '3px',
        }}
      >
        *{code}*
      </div>
    </div>
  );
}

/**
 * Component hiển thị Thẻ Lên Xe Khách Điện Tử & Form In Chuẩn (US06)
 */
function PrintableTicket({
  ticketCode = 'TKT-A05-DEMO',
  bookingCode = 'BOOK-8892',
  invoiceCode = 'HDDT-2026-9912',
  issuedAt = '14:30 - 05/10/2026',
  fromCity = 'Hà Nội',
  toCity = 'Thái Nguyên',
  departureStation = '',
  departureStationAddress = '',
  arrivalStation = '',
  arrivalStationAddress = '',
  departureTime = '07:30',
  departureDate = 'Hôm nay',
  arrivalTime = '09:15',
  arrivalDate = 'Cùng ngày',
  seatNumber = 'A05',
  busType = 'Ghế ngồi cao cấp 29 chỗ',
  licensePlate = '29B-123.45',
  gate = '',
  passengerName = 'Nguyễn Văn A',
  passengerPhone = '0901234567',
  discountType = 'HSSV',
  originalPrice = '120.000 VNĐ',
  discountAmount = '24.000 VNĐ',
  finalPrice = '96.000 VNĐ',
  paymentMethod = 'VietQR / VNPAY',
  status = 'CONFIRMED',
  qrCodeUrl = '',
  showStub = true,
  className = '',
}) {
  // Tự động phân giải Bến đón / Bến trả nếu chưa có
  const depTerminal = TERMINAL_DATABASE[fromCity] || {
    name: departureStation || `Bến xe Trung tâm ${fromCity}`,
    address: departureStationAddress || `Khu vực đón khách trung tâm ${fromCity}`,
    gate: gate || 'Cổng đón khách 01',
    hotline: '1900 6868',
  };

  const arrTerminal = TERMINAL_DATABASE[toCity] || {
    name: arrivalStation || `Bến xe ${toCity}`,
    address: arrivalStationAddress || `Khu vực trả khách ${toCity}`,
    gate: 'Cổng trả khách A',
    hotline: '1900 6868',
  };

  // Xác định vị trí tầng ghế
  const isDeckB = seatNumber.toUpperCase().startsWith('B');
  const deckName = isDeckB ? 'Tầng 2 (Tầng Trên) - Cửa sổ Panorama' : 'Tầng 1 (Tầng Dưới) - Tiêu chuẩn VIP';

  const finalQrUrl =
    qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=ticket:${ticketCode}&color=0f172a&bgcolor=ffffff`;

  const miniQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=ticket:${ticketCode}&color=0f172a&bgcolor=ffffff`;

  return (
    <div
      className={`smartbus-printable-ticket ${className}`}
      style={{
        width: '100%',
        maxWidth: '780px',
        margin: '0 auto 24px auto',
        backgroundColor: '#ffffff',
        border: '2px solid #1e3a8a',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(30,58,138,0.12)',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: '#0f172a',
        pageBreakInside: 'avoid',
      }}
    >
      {/* ===================================================================== */}
      {/* 1. HEADER THƯƠNG HIỆU NHÀ XE & TIÊU CHUẨN VẬN TẢI                      */}
      {/* ===================================================================== */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)',
          color: '#ffffff',
          padding: '18px 24px',
          borderBottom: '3px solid #f59e0b',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Logo & Slogan */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              🚌
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '0.8px', lineHeight: '1.2' }}>
                SMART <span style={{ color: '#38bdf8' }}>BUSTICKET</span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', letterSpacing: '0.3px', marginTop: '2px' }}>
                HỆ THỐNG VÉ XE KHÁCH LIÊN TỈNH ĐIỆN TỬ THÔNG MINH
              </div>
            </div>
          </div>

          {/* Hotline & Pháp lý */}
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
              <span>Tổng đài hỗ trợ 24/7:</span>
              <strong style={{ fontSize: '16px', color: '#fde047', fontWeight: '900', letterSpacing: '0.5px' }}>
                1900 6868
              </strong>
            </div>
            <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
              Website: www.smartbus.vn | Giấy phép GTVT số: 0108929/GP-GTVT
            </div>
          </div>
        </div>

        {/* Tiêu đề vé & Huy hiệu trạng thái */}
        <div
          style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.18)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '15px',
                fontWeight: '800',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#ffffff',
              }}
            >
              THẺ LÊN XE KHÁCH ĐIỆN TỬ (E-BOARDING PASS)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
              }}
            >
              ✓ ĐÃ THANH TOÁN
            </span>
            <span
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
              }}
            >
              HỢP LỆ LÊN XE
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. DÃY THÔNG SỐ ĐẶT CHỖ & MÃ ĐƠN HÀNG (METADATA STRIP)               */}
      {/* ===================================================================== */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          fontSize: '12px',
        }}
      >
        <div>
          <span style={{ color: '#64748b' }}>Mã vé (Ticket Code):</span>
          <div style={{ fontWeight: '800', fontFamily: 'monospace', color: '#1d4ed8', fontSize: '14px' }}>
            {ticketCode}
          </div>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Mã đặt chỗ (Booking):</span>
          <div style={{ fontWeight: '800', fontFamily: 'monospace', color: '#0f172a', fontSize: '13px' }}>
            #{bookingCode}
          </div>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Tra cứu HĐĐT:</span>
          <div style={{ fontWeight: '700', fontFamily: 'monospace', color: '#475569', fontSize: '13px' }}>
            {invoiceCode}
          </div>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Thời gian phát hành:</span>
          <div style={{ fontWeight: '600', color: '#334155' }}>
            {issuedAt}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. THÂN VÉ: HÀNH TRÌNH CHUYẾN ĐI & MÃ QR SOÁT VÉ                     */}
      {/* ===================================================================== */}
      <div
        style={{
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: '1fr 230px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Cột trái: Lộ trình & Thông tin chi tiết */}
        <div>
          {/* Box Hành trình: Điểm đi -> Điểm đến */}
          <div
            style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '12px',
              padding: '16px 20px',
              border: '1px solid #cbd5e1',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              {/* Điểm đi */}
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#2563eb',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  🟢 ĐIỂM XUẤT PHÁT
                </span>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: '2px 0' }}>
                  {fromCity}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e3a8a' }}>
                  {depTerminal.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {depTerminal.address}
                </div>
              </div>

              {/* Mũi tên & Khoảng cách */}
              <div style={{ textAlign: 'center', padding: '0 16px' }}>
                <div style={{ fontSize: '20px', color: '#2563eb' }}>➔</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Tuyến Cố Định</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Cao Tốc Hiện Đại</div>
              </div>

              {/* Điểm đến */}
              <div style={{ flex: 1, textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#dc2626',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  🔴 ĐIỂM ĐẾN NƠI
                </span>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: '2px 0' }}>
                  {toCity}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e3a8a' }}>
                  {arrTerminal.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {arrTerminal.address}
                </div>
              </div>
            </div>

            {/* Dòng mốc thời gian */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px dashed #cbd5e1',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Giờ xuất bến:</span>
                <div>
                  <strong style={{ fontSize: '18px', color: '#1e3a8a' }}>{departureTime}</strong>
                  <span style={{ color: '#475569', marginLeft: '6px' }}>({departureDate})</span>
                </div>
                <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>
                  📍 {depTerminal.gate}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Dự kiến đến nơi:</span>
                <div>
                  <strong style={{ fontSize: '18px', color: '#334155' }}>{arrivalTime}</strong>
                  <span style={{ color: '#475569', marginLeft: '6px' }}>({arrivalDate})</span>
                </div>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>
                  📍 {arrTerminal.gate}
                </div>
              </div>
            </div>
          </div>

          {/* Hàng thông tin Ghế ngồi & Xe */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '130px 1fr',
              gap: '14px',
              marginBottom: '16px',
            }}
          >
            {/* Box vị trí ghế to bản */}
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8' }}>SỐ GHẾ / GIƯỜNG</span>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e3a8a', lineHeight: '1.1' }}>
                {seatNumber}
              </div>
              <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: '600', marginTop: '2px' }}>
                {isDeckB ? 'Tầng 2' : 'Tầng 1'}
              </span>
            </div>

            {/* Thông tin phương tiện */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Vị trí tầng:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{deckName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Loại xe:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{busType}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Biển kiểm soát:</span>{' '}
                <strong style={{ color: '#1e3a8a', fontFamily: 'monospace', fontSize: '14px' }}>
                  {licensePlate}
                </strong>
              </div>
            </div>
          </div>

          {/* Hàng thông tin hành khách & Tài chính */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              fontSize: '13px',
              lineHeight: '1.7',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ color: '#64748b' }}>Hành khách:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{passengerName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Số điện thoại:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{passengerPhone}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Loại vé:</span>{' '}
                <span style={{ color: '#2563eb', fontWeight: '600' }}>
                  {discountType === 'HSSV'
                    ? 'Học sinh / Sinh viên (-20%)'
                    : discountType === 'NguoiCaoTuoi'
                    ? 'Người cao tuổi (-20%)'
                    : 'Vé tiêu chuẩn'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Phương thức:</span>{' '}
                <span style={{ color: '#475569' }}>{paymentMethod}</span>
              </div>
            </div>

            <div
              style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px dashed #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                <span>Giá gốc: {originalPrice}</span>
                {discountAmount && discountAmount !== '0 VNĐ' && (
                  <span style={{ marginLeft: '10px', color: '#dc2626' }}>
                    | Giảm trừ: -{discountAmount}
                  </span>
                )}
                <span style={{ marginLeft: '10px', color: '#059669' }}>
                  | BH tai nạn hành khách: Đã bao gồm
                </span>
              </div>
              <div>
                <span style={{ fontSize: '13px', color: '#64748b', marginRight: '6px' }}>Đã thanh toán:</span>
                <strong style={{ fontSize: '18px', color: '#16a34a', fontWeight: '900' }}>
                  {finalPrice}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Khung Quét QR Code & Dấu Mộc Xác Thực */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '2px solid #cbd5e1',
            borderRadius: '14px',
            padding: '16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: '800',
              color: '#1e3a8a',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            MÃ QR SOÁT VÉ (US06/US08)
          </div>

          {/* Vùng QR với khung định vị quét góc 4 chiều */}
          <div
            style={{
              position: 'relative',
              padding: '10px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              display: 'inline-block',
            }}
          >
            {/* Corner Target Markers */}
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                width: '16px',
                height: '16px',
                borderTop: '3px solid #2563eb',
                borderLeft: '3px solid #2563eb',
                borderTopLeftRadius: '4px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '16px',
                height: '16px',
                borderTop: '3px solid #2563eb',
                borderRight: '3px solid #2563eb',
                borderTopRightRadius: '4px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '4px',
                left: '4px',
                width: '16px',
                height: '16px',
                borderBottom: '3px solid #2563eb',
                borderLeft: '3px solid #2563eb',
                borderBottomLeftRadius: '4px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                width: '16px',
                height: '16px',
                borderBottom: '3px solid #2563eb',
                borderRight: '3px solid #2563eb',
                borderBottomRightRadius: '4px',
              }}
            />

            <img
              src={finalQrUrl}
              alt={`QR ${ticketCode}`}
              style={{
                width: '160px',
                height: '160px',
                display: 'block',
              }}
            />
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#475569',
              marginTop: '10px',
              lineHeight: '1.4',
              maxWidth: '180px',
            }}
          >
            Xuất trình mã này cho tài xế hoặc phụ xe khi lên xe
          </div>

          {/* Barcode giả lập Code 128 */}
          <div style={{ marginTop: '8px', width: '100%' }}>
            <SvgBarcode code={ticketCode.replace(/[^A-Z0-9]/gi, '') || 'TKT8892'} height={36} />
          </div>

          {/* Dấu mộc điện tử */}
          <div
            style={{
              marginTop: '10px',
              border: '1.5px solid #16a34a',
              borderRadius: '8px',
              padding: '6px 10px',
              backgroundColor: '#f0fdf4',
              fontSize: '10px',
              color: '#15803d',
              fontWeight: '700',
              lineHeight: '1.3',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            <div>✓ KÝ SỐ ĐIỆN TỬ</div>
            <div style={{ fontSize: '9px', fontWeight: '500', color: '#166534' }}>
              SMARTBUS CA VERIFIED
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. CUỐNG VÉ KIỂM SOÁT DÀNH CHO NHÀ XE (BOARDING STUB)                 */}
      {/* ===================================================================== */}
      {showStub && (
        <div style={{ borderTop: '2px dashed #94a3b8', position: 'relative' }}>
          {/* Biểu tượng kéo cắt */}
          <div
            style={{
              position: 'absolute',
              top: '-12px',
              left: '24px',
              backgroundColor: '#ffffff',
              padding: '0 8px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>✂</span>
            <span style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
              ĐƯỜNG CẮT CUỐNG VÉ KIỂM SOÁT (BOARDING STUB - NHÀ XE THU GIỮ)
            </span>
          </div>

          <div
            style={{
              padding: '20px 24px 16px 24px',
              backgroundColor: '#fafaf9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* Mini QR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={miniQrUrl}
                alt="Mini QR"
                style={{
                  width: '64px',
                  height: '64px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  padding: '2px',
                }}
              />
              <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                <div style={{ fontWeight: '800', color: '#1e3a8a' }}>CUỐNG VÉ XE KHÁCH</div>
                <div style={{ fontFamily: 'monospace', fontWeight: '700', color: '#334155' }}>
                  {ticketCode}
                </div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>
                  {fromCity} ➔ {toCity}
                </div>
              </div>
            </div>

            {/* Thông tin hành khách & Giờ */}
            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <div>
                <span style={{ color: '#64748b' }}>Khách:</span>{' '}
                <strong>{passengerName}</strong> ({passengerPhone})
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Giờ xuất bến:</span>{' '}
                <strong>{departureTime}</strong> - {departureDate}
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Biển số xe:</span>{' '}
                <strong style={{ fontFamily: 'monospace' }}>{licensePlate}</strong>
              </div>
            </div>

            {/* Khối ghế nổi bật & Chữ ký */}
            <div style={{ textAlign: 'center', minWidth: '110px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>GHẾ NGỒI</span>
              <div
                style={{
                  fontSize: '26px',
                  fontWeight: '900',
                  color: '#1d4ed8',
                  lineHeight: '1',
                  margin: '2px 0 6px 0',
                }}
              >
                {seatNumber}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  borderTop: '1px solid #cbd5e1',
                  paddingTop: '4px',
                }}
              >
                Ký nhận phụ xe
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. QUY ĐỊNH & ĐIỀU KHOẢN VẬN CHUYỂN HÀNH KHÁCH                        */}
      {/* ===================================================================== */}
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#cbd5e1',
          padding: '12px 24px',
          fontSize: '11px',
          lineHeight: '1.6',
        }}
      >
        <div style={{ fontWeight: '700', color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚠️</span> LƯU Ý QUAN TRỌNG DÀNH CHO HÀNH KHÁCH ĐI XE:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px 16px' }}>
          <div>
            • <b>1. Có mặt tại bến:</b> Vui lòng có mặt tại điểm đón trước ít nhất <b>20-30 phút</b> so với giờ xuất bến để xếp hành lý.
          </div>
          <div>
            • <b>2. Soát vé:</b> Xuất trình mã QR trên vé này (bản in hoặc qua điện thoại) cùng giấy tờ tùy thân hợp lệ khi lên xe.
          </div>
          <div>
            • <b>3. Hành lý:</b> Miễn cước 20kg hành lý tiêu chuẩn. Nghiêm cấm mang theo chất dễ cháy nổ, vũ khí hoặc hàng cấm.
          </div>
          <div>
            • <b>4. Hỗ trợ khẩn cấp:</b> Khiếu nại, quên hành lý hoặc đổi trả vé trước 24h vui lòng gọi <b>1900 6868</b> hoặc truy cập <b>smartbus.vn</b>.
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrintableTicket;
