import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Bổ sung import công cụ chuyển trang

function SearchForm() {
  const [diemDi, setDiemDi] = useState('Hồ Chí Minh');
  const [diemDen, setDiemDen] = useState('Đà Lạt');
  const navigate = useNavigate(); // 2. Bổ sung khai báo navigate

  const handleSearch = () => {
    // Chuyển hướng sang trang danh sách chuyến xe & chọn ghế
    navigate('/buses');
  };

  return (
    <main className="hero-section">
      <p className="hero-subtitle">DI CHUYỂN DỄ DÀNG HƠN</p>
      <h1 className="hero-title">Đặt vé xe khách cho hành trình<br/>thật thảnh thơi.</h1>
      <p className="hero-desc">So sánh giá vé, chọn chỗ ngồi yêu thích và bắt đầu chuyến đi của bạn chỉ trong vài phút.</p>

      <div className="search-widget">
        <div className="trip-types">
          <span className="type active">Một chiều</span>
          <span className="type">Khứ hồi</span>
        </div>
        
        <div className="search-fields">
          <div className="field">
            <label>ĐIỂM ĐI</label>
            <input 
              type="text" 
              value={diemDi} 
              onChange={(e) => setDiemDi(e.target.value)} 
            />
          </div>

          <div className="swap-icon">⇌</div>

          <div className="field">
            <label>ĐIỂM ĐẾN</label>
            <input 
              type="text" 
              value={diemDen} 
              onChange={(e) => setDiemDen(e.target.value)} 
            />
          </div>

          <div className="field">
            <label>NGÀY ĐI</label>
            <input type="text" placeholder="Hôm nay, 24 Th9" />
          </div>

          <div className="field">
            <label>NGÀY VỀ</label>
            <input type="text" placeholder="Chọn ngày về" disabled />
          </div>

          <div className="field">
            <label>HÀNH KHÁCH</label>
            <input type="text" placeholder="1 người lớn" />
          </div>

          <button className="search-submit-btn" onClick={handleSearch}>
            Tìm chuyến xe
          </button>
        </div>
      </div>
    </main>
  );
}

export default SearchForm;