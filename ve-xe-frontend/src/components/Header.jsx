import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="navbar">
      <div className="logo">
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span className="logo-icon">🚌</span> Đặt Vé Xe Bus
        </Link>
      </div>
      <nav className="nav-links">
        <Link to="/">Trang chủ</Link>
        <a href="#">Lịch trình</a>
        <a href="#">Ưu đãi</a>
      </nav>
      <Link to="/login">
        <button className="login-btn">Đăng nhập</button>
      </Link>
    </header>
  );
}

export default Header;