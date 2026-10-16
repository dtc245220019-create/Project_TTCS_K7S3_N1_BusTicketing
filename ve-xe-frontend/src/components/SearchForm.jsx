import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoutes } from '../api';

function SearchForm() {
  const [diemDi, setDiemDi] = useState('Hồ Chí Minh');
  const [diemDen, setDiemDen] = useState('Đà Lạt');
  const [ngayDi, setNgayDi] = useState(new Date().toISOString().split('T')[0]);
  const [routesList, setRoutesList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getRoutes()
      .then((data) => {
        if (Array.isArray(data)) {
          setRoutesList(data);
        }
      })
      .catch(() => {});
  }, []);

  const departureCities = Array.from(
    new Set([
      'Hồ Chí Minh',
      'Hà Nội',
      'Đà Nẵng',
      ...routesList.map((r) => r.departure_city).filter(Boolean),
    ])
  );

  const arrivalCities = Array.from(
    new Set([
      'Đà Lạt',
      'Thái Nguyên',
      'Huế',
      'Hải Phòng',
      'Nha Trang',
      'Cần Thơ',
      'Vũng Tàu',
      ...routesList.map((r) => r.arrival_city).filter(Boolean),
    ])
  );

  const handleSearch = () => {
    navigate(`/buses?origin=${encodeURIComponent(diemDi)}&destination=${encodeURIComponent(diemDen)}&date=${ngayDi}`);
  };

  const handleSwap = () => {
    const temp = diemDi;
    setDiemDi(diemDen);
    setDiemDen(temp);
  };

  return (
    <div className="search-widget" style={{ margin: '0 auto' }}>
      <div className="trip-types">
        <span className="type active">🚌 Chuyến một chiều</span>
        <span
          className="type"
          onClick={() => navigate('/map')}
          style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 'bold' }}
        >
          🗺️ Xem Bản đồ lộ trình & Trạm dừng
        </span>
      </div>

      <div className="search-fields">
        <div className="field">
          <label>ĐIỂM ĐI</label>
          <input
            type="text"
            list="departure-cities-list"
            value={diemDi}
            onChange={(e) => setDiemDi(e.target.value)}
            placeholder="VD: Hồ Chí Minh, Hà Nội..."
          />
          <datalist id="departure-cities-list">
            {departureCities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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
            list="arrival-cities-list"
            value={diemDen}
            onChange={(e) => setDiemDen(e.target.value)}
            placeholder="VD: Đà Lạt, Thái Nguyên..."
          />
          <datalist id="arrival-cities-list">
            {arrivalCities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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
  );
}

export default SearchForm;