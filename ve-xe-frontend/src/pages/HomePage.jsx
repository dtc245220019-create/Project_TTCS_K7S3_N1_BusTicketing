import { useNavigate } from 'react-router-dom';
import SearchForm from '../components/SearchForm';

function HomePage() {
  const navigate = useNavigate();

  const popularRoutes = [
    {
      from: 'Hồ Chí Minh',
      to: 'Đà Lạt',
      price: '350.000đ',
      duration: '8 tiếng',
      type: 'Limousine VIP 22 phòng',
      image: '🌲',
    },
    {
      from: 'Hà Nội',
      to: 'Thái Nguyên',
      price: '120.000đ',
      duration: '2 tiếng',
      type: 'Ghế ngồi cao cấp 29 chỗ',
      image: '🍵',
    },
    {
      from: 'Đà Nẵng',
      to: 'Huế',
      price: '150.000đ',
      duration: '2.5 tiếng',
      type: 'Limousine 16 chỗ',
      image: '🏰',
    },
    {
      from: 'Hà Nội',
      to: 'Hải Phòng',
      price: '140.000đ',
      duration: '1.5 tiếng',
      type: 'Xe buýt cao tốc VIP',
      image: '⚓',
    },
  ];

  return (
    <div>
      <SearchForm />

      {/* Banner Khám Phá Bản Đồ GPS */}
      <section style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            borderRadius: '16px',
            padding: '28px 36px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 10px 25px rgba(37, 99, 235, 0.25)',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div style={{ maxWidth: '650px' }}>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
              🌟 TÍNH NĂNG MỚI ĐƯỢC TÍCH HỢP
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '12px 0 8px 0' }}>
              Bản Đồ Lộ Trình & Trạm Dừng Xe Buýt Thông Minh
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '15px', lineHeight: '1.5' }}>
              Theo dõi toàn diện các trạm dừng trên tuyến, tọa độ GPS thực tế, khoảng cách từng chặng (CHI_TIET_TUYEN_TRAM) và vị trí xe khách đang di chuyển trực tiếp trên bản đồ Leaflet.
            </p>
          </div>
          <button
            onClick={() => navigate('/map')}
            style={{
              backgroundColor: '#f59e0b',
              color: '#1e3a8a',
              border: 'none',
              fontWeight: 'bold',
              padding: '14px 28px',
              borderRadius: '10px',
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'transform 0.1s',
            }}
          >
            🗺️ Khám Phá Bản Đồ Ngay
          </button>
        </div>
      </section>

      {/* Tuyến Xe Phổ Biến */}
      <section style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
              Tuyến Đường Phổ Biến Trong Tuần
            </h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
              Chọn nhanh hành trình yêu thích và xem sơ đồ ghế còn trống
            </p>
          </div>
          <button
            onClick={() => navigate('/buses')}
            style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Xem tất cả chuyến ➔
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {popularRoutes.map((r, i) => (
            <div
              key={i}
              onClick={() => navigate(`/buses?origin=${encodeURIComponent(r.from)}&destination=${encodeURIComponent(r.to)}`)}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '20px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{r.image}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 6px 0' }}>
                {r.from} ➔ {r.to}
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
                {r.type} • {r.duration}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Giá chỉ từ</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>{r.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8 User Story Features Overview */}
      <section className="features" style={{ maxWidth: '1200px', margin: '50px auto 40px auto', padding: '0 20px' }}>
        <div className="feature-item" style={{ textAlign: 'left', padding: '24px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚡</div>
          <h4>US01-US03: Giữ Ghế Tự Động</h4>
          <p>Chọn ghế trực quan 2 tầng (A01-B18), giữ chỗ trong 10 phút kèm đồng hồ đếm ngược.</p>
        </div>
        <div className="feature-item" style={{ textAlign: 'left', padding: '24px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💳</div>
          <h4>US05-US06: Thanh Toán & QR</h4>
          <p>Cổng Sandbox MoMo, VNPay, ZaloPay, Thẻ ATM. Sinh vé điện tử và mã QR động ngay tức thì.</p>
        </div>
        <div className="feature-item" style={{ textAlign: 'left', padding: '24px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🛡️</div>
          <h4>US07-US08: Quản Lý & Soát Vé</h4>
          <p>Khách hàng hủy vé dễ dàng. Tài xế quét mã QR kiểm tra vé hợp lệ, chống vé trùng theo thời gian thực.</p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;