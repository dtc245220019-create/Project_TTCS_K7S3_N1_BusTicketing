function Header() {
  return (
    <header className="navbar">
      <div className="logo">
        <span className="logo-icon">B</span> Đặt vé xe Bus
      </div>
      <nav className="nav-links">
        <a href="#">Trang chủ</a>
        <a href="#">Lịch trình</a>
        <a href="#">Ưu đãi</a>
      </nav>
      <button className="login-btn">Đăng nhập</button>
    </header>
  );
}

export default Header;