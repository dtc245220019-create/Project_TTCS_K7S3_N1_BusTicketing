import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchForm from '../components/SearchForm';

function HomePage() {
  const navigate = useNavigate();
  const [filterRegion, setFilterRegion] = useState('ALL');

  const destinationRoutes = [
    {
      id: 1,
      name: 'Đà Lạt — Thành Phố Ngàn Hoa',
      region: 'SOUTH',
      from: 'Hồ Chí Minh',
      to: 'Đà Lạt',
      price: '350.000 VNĐ',
      duration: '8 tiếng',
      distance: '305 km',
      tripsPerDay: 14,
      busType: 'Limousine VIP 22 phòng',
      badge: '🔥 BÁN CHẠY NHẤT',
      badgeColor: '#dc2626',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
      description: 'Hòa mình vào không khí se lạnh, đồi thông bạt ngàn và thung lũng sương mù thơ mộng.',
    },
    {
      id: 2,
      name: 'Thái Nguyên — Xứ Trà Đệ Nhất Danh',
      region: 'NORTH',
      from: 'Hà Nội',
      to: 'Thái Nguyên',
      price: '120.000 VNĐ',
      duration: '2 tiếng',
      distance: '80 km',
      tripsPerDay: 20,
      busType: 'Ghế ngồi cao cấp 29 chỗ',
      badge: '🍵 DU LỊCH & CÔNG TÁC',
      badgeColor: '#16a34a',
      image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
      description: 'Khám phá đồi chè Tân Cương xanh ngát, hồ Núi Cốc và di tích lịch sử ATK Định Hóa.',
    },
    {
      id: 3,
      name: 'Huế — Di Sản Cố Đô Cổ Kính',
      region: 'CENTRAL',
      from: 'Đà Nẵng',
      to: 'Huế',
      price: '150.000 VNĐ',
      duration: '2.5 tiếng',
      distance: '100 km',
      tripsPerDay: 16,
      busType: 'Limousine Chuyên cơ 16 chỗ',
      badge: '👑 DI SẢN VĂN HÓA',
      badgeColor: '#7c3aed',
      image: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&auto=format&fit=crop&q=80',
      description: 'Trải nghiệm vượt đèo Hải Vân ngắm vịnh Lăng Cô, thưởng ngoạn Sông Hương và Đại Nội cổ kính.',
    },
    {
      id: 4,
      name: 'Hải Phòng — Thành Phố Hoa Phượng Đỏ',
      region: 'NORTH',
      from: 'Hà Nội',
      to: 'Hải Phòng',
      price: '140.000 VNĐ',
      duration: '1.5 tiếng',
      distance: '120 km',
      tripsPerDay: 24,
      busType: 'Xe buýt cao tốc VIP',
      badge: '⚓ KHÁM PHÁ VỊNH ĐẢO',
      badgeColor: '#0284c7',
      image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80',
      description: 'Hành trình nhanh chóng qua cao tốc 5B đến Cảng biển sôi động, ẩm thực Food Tour và đảo Cát Bà.',
    },
    {
      id: 5,
      name: 'Đà Nẵng — Thành Phố Cầu Vàng Biển Xanh',
      region: 'CENTRAL',
      from: 'Hà Nội',
      to: 'Đà Nẵng',
      price: '450.000 VNĐ',
      duration: '12 tiếng',
      distance: '760 km',
      tripsPerDay: 8,
      busType: 'Giường nằm VIP chất lượng cao',
      badge: '⭐ ĐƯỢC YÊU THÍCH NHẤT',
      badgeColor: '#ea580c',
      image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&auto=format&fit=crop&q=80',
      description: 'Chiêm ngưỡng Cầu Rồng phun lửa, bãi biển Mỹ Khê quyến rũ và đỉnh Bà Nà Hills tuyệt đẹp.',
    },
    {
      id: 6,
      name: 'TP. Hồ Chí Minh — Đô Thị Năng Động Bậc Nhất',
      region: 'SOUTH',
      from: 'Đà Nẵng',
      to: 'Hồ Chí Minh',
      price: '500.000 VNĐ',
      duration: '14 tiếng',
      distance: '900 km',
      tripsPerDay: 6,
      busType: 'Limousine phòng nằm cao cấp',
      badge: '🏙️ TRUNG TÂM KINH TẾ',
      badgeColor: '#2563eb',
      image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&auto=format&fit=crop&q=80',
      description: 'Trải nghiệm nhịp sống đô thị hiện đại, các khu phố đi bộ sầm uất và ẩm thực đa sắc màu.',
    },
  ];

  const filteredRoutes = destinationRoutes.filter(
    (r) => filterRegion === 'ALL' || r.region === filterRegion
  );

  return (
    <div className="smartbus-home">
      <section className="smartbus-hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">✧ &nbsp; Hành trình xanh. Trải nghiệm thông minh.</span>
            <h1>Đi xe buýt<br />dễ dàng hơn<br />cùng <span>SmartBus.</span></h1>
            <p>Đặt vé trực tuyến, lên xe bằng QR và theo dõi hành trình.<br className="desktop-break" /> Một trải nghiệm liền mạch, từ điểm đi đến điểm đến.</p>
            <div className="hero-actions">
              <button className="hero-primary" onClick={() => navigate('/buses')}>Tra cứu chuyến xe <span>→</span></button>
              <button className="hero-secondary" onClick={() => navigate('/map')}>Theo dõi xe <span>→</span></button>
            </div>
            <div className="hero-benefits"><span>✓ &nbsp;Dễ sử dụng</span><span>✓ &nbsp;Vé điện tử tiện lợi</span><span>✓ &nbsp;Thông tin rõ ràng</span></div>
          </div>
          <div className="hero-visual">
            <div className="visual-label">01 - SMARTBUS</div>
            <div className="bus-status"><span className="status-pulse"/><div><strong>Xe đến trong 5 phút</strong><small>Mô phỏng theo dõi tuyến 01</small></div></div>
            <div className="bus-code">20A-123.45</div>
            <div className="ticket-float"><span className="ticket-icon">▦</span><div><strong>Vé của bạn đã sẵn sàng</strong><small>Quét QR và lên xe thật dễ dàng</small></div><span className="demo-tag">Demo ✓</span></div>
          </div>
        </div>
      </section>
      <div className="home-search-wrap"><SearchForm /></div>



      {/* CÁC ĐỊA ĐIỂM & CHẶNG ĐI HẤP DẪN (KÈM HÌNH ẢNH SỐNG ĐỘNG) */}
      <section style={{ maxWidth: '1240px', margin: '48px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              HÀNH TRÌNH TIÊU BIỂU
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>
              Khám Phá Các Chặng Xe & Điểm Đến Yêu Thích
            </h2>
            <p style={{ color: '#64748b', margin: '6px 0 0 0', fontSize: '14px' }}>
              Hình ảnh chân thực các điểm du lịch nổi tiếng, đầy đủ cự ly, thời gian di chuyển và mức giá tốt nhất
            </p>
          </div>

          {/* Region Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', backgroundColor: 'white', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'NORTH', label: 'Miền Bắc' },
              { id: 'CENTRAL', label: 'Miền Trung' },
              { id: 'SOUTH', label: 'Miền Nam' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterRegion(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: filterRegion === tab.id ? '1px solid #bfdbfe' : '1px solid transparent',
                  backgroundColor: filterRegion === tab.id ? '#eff6ff' : 'transparent',
                  color: filterRegion === tab.id ? '#1d4ed8' : '#64748b',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Destination Cards Grid (3 Columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '26px' }}>
          {filteredRoutes.map((route) => (
            <div
              key={route.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '18px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 16px 32px rgba(15, 23, 42, 0.12)';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.05)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              {/* Image Container with Badges */}
              <div style={{ position: 'relative', height: '210px', overflow: 'hidden' }}>
                <img
                  src={route.image}
                  alt={route.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.4s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: route.badgeColor,
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {route.badge}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  🚌 {route.tripsPerDay} chuyến/ngày
                </div>

                {/* Bottom image gradient bar */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '24px 16px 8px 16px',
                    background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 100%)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    {route.from} ➔ {route.to}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    📏 {route.distance} • 🕒 {route.duration}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', lineHeight: '1.3' }}>
                    {route.name}
                  </h3>
                  <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                    {route.description}
                  </p>
                  <div style={{ display: 'inline-block', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', marginBottom: '16px' }}>
                    {route.busType}
                  </div>
                </div>

                {/* Price and Action */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '14px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>
                      Giá vé từ
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626' }}>
                      {route.price}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      navigate(
                        `/buses?origin=${encodeURIComponent(route.from)}&destination=${encodeURIComponent(route.to)}`
                      )
                    }
                    style={{
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: '1px solid #1d4ed8',
                      fontWeight: '700',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#1d4ed8';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Chọn Vé Ngay ➔
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;