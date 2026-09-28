function Footer() {
  return (
    <footer
      style={{
        backgroundColor: '#0b1329',
        color: '#94a3b8',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '48px 24px 28px 24px',
        marginTop: '60px',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '32px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '36px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: '800', fontSize: '18px', marginBottom: '12px' }}>
            <span>🚌</span> Smart BusTicketing
          </div>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1' }}>
            Hệ thống đặt vé xe buýt / xe khách trực tuyến thông minh. Lộ trình GPS chuẩn xác, thanh toán đa phương thức và vé điện tử mã QR tức thì.
          </p>
        </div>

        <div>
          <h4 style={{ color: 'white', fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '14px' }}>
            Tuyến Trọng Điểm
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', lineHeight: '2' }}>
            <li><a href="/buses?origin=Hồ%20Chí%20Minh&destination=Đà%20Lạt" style={{ color: '#cbd5e1' }}>TP. Hồ Chí Minh ➔ Đà Lạt</a></li>
            <li><a href="/buses?origin=Hà%20Nội&destination=Thái%20Nguyên" style={{ color: '#cbd5e1' }}>Hà Nội ➔ Thái Nguyên</a></li>
            <li><a href="/buses?origin=Đà%20Nẵng&destination=Huế" style={{ color: '#cbd5e1' }}>Đà Nẵng ➔ Huế</a></li>
            <li><a href="/buses?origin=Hà%20Nội&destination=Hải%20Phòng" style={{ color: '#cbd5e1' }}>Hà Nội ➔ Hải Phòng</a></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: 'white', fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '14px' }}>
            Liên Hệ & Hỗ Trợ 24/7
          </h4>
          <p style={{ fontSize: '14px', margin: '0 0 6px 0', color: '#cbd5e1' }}>📧 hotro@smartbus.vn</p>
          <p style={{ fontSize: '14px', margin: '0 0 10px 0', color: '#cbd5e1' }}>📍 Số 20 Phạm Hùng, Nam Từ Liêm, Hà Nội</p>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Tổng đài đặt vé miễn phí:</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#38bdf8', marginTop: '2px' }}>1900 6868</div>
        </div>

        <div>
          <h4 style={{ color: 'white', fontSize: '14px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '14px' }}>
            Cổng Thanh Toán
          </h4>
          <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '12px' }}>
            Hỗ trợ đa dạng phương thức thanh toán bảo mật:
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Ví MoMo', 'VNPAY-QR', 'ZaloPay', 'Thẻ ATM', 'Visa/Master'].map((item, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                  fontWeight: '600',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1240px', margin: '0 auto', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
        © 2026 Smart BusTicketing — Đồ án Thực tập Cơ sở K7S3 Nhóm 01. Bản quyền thuộc về Leader Gia Bảo & Nhóm phát triển.
      </div>
    </footer>
  );
}

export default Footer;