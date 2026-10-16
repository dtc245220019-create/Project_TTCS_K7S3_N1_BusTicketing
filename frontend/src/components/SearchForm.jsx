import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SearchForm() {
  const [diemDi, setDiemDi] = useState('Hồ Chí Minh');
  const [diemDen, setDiemDen] = useState('Đà Lạt');
  const [ngayDi, setNgayDi] = useState(new Date().toISOString().split('T')[0]);
  const navigate = useNavigate();

  const handleSearch = () => {
    navigate(`/buses?origin=${encodeURIComponent(diemDi)}&destination=${encodeURIComponent(diemDen)}&date=${ngayDi}`);
  };

  const handleSwap = () => {
    const temp = diemDi;
    setDiemDi(diemDen);
    setDiemDen(temp);
  };

  return (
    <div className="hero-section">
      <p className="hero-subtitle">HỆ THỐNG ĐẶT VÉ XE BUÝT THÔNG MINH (SMART BUS TICKETING)</p>
      <h1 className="hero-title">
        Đặt vé xe buýt trực tuyến cho hành trình<br />thật thảnh thơi.
      </h1>
      <p className="hero-desc">
        Tra cứu chuyến xe theo thời gian thực, chọn chỗ ngồi trên sơ đồ 2 tầng trực quan, giữ chỗ tự động và nhận vé QR điện tử ngay lập tức.
      </p>

      <div className="search-widget">
        <div className="trip-types">
          <span className="type active">🚌 Chuyến một chiều</span>
          <span className="type" onClick={() => navigate('/map')} style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 'bold' }}>
            🗺️ Xem Bản đồ lộ trình & Trạm dừng
          </span>
        </div>

        <div className="search-fields">
          <div className="field">
            <label>ĐIỂM ĐI</label>
            <input
              type="text"
              value={diemDi}
              onChange={(e) => setDiemDi(e.target.value)}
              placeholder="VD: Hồ Chí Minh, Hà Nội..."
            />
          </div>

          <div
            className="swap-icon"
            onClick={handleSwap}
            title="Đổi chiều đi - về"
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            ⇌
          </div>

          <div className="field">
            <label>ĐIỂM ĐẾN</label>
            <input
              type="text"
              value={diemDen}
              onChange={(e) => setDiemDen(e.target.value)}
              placeholder="VD: Đà Lạt, Thái Nguyên..."
            />
          </div>

          <div className="field">
            <label>NGÀY ĐI</label>
            <input
              type="date"
              value={ngayDi}
              onChange={(e) => setNgayDi(e.target.value)}
            />
          </div>

          <div className="field">
            <label>LOẠI XE</label>
            <select
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '14px',
                fontWeight: '500',
                padding: '4px 0',
              }}
            >
              <option value="all">Tất cả loại xe</option>
              <option value="limousine">Limousine VIP</option>
              <option value="giuong_nam">Giường nằm 36 chỗ</option>
            </select>
          </div>

          <button className="search-submit-btn" onClick={handleSearch}>
            Tìm chuyến xe
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchForm;