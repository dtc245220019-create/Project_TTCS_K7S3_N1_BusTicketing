import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser } from '../api';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [location.pathname]);

  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      <div className="logo">
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="logo-icon" style={{ fontSize: '24px' }}>🚌</span>
          <span style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px' }}>
            Smart <span style={{ color: '#38bdf8' }}>BusTicketing</span>
          </span>
        </Link>
      </div>

      <nav className="nav-links">
        <Link to="/" className={isActive('/') ? 'active' : ''}>
          Trang chủ
        </Link>
        <Link to="/map" className={isActive('/map') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🗺️</span> Bản đồ chặng
        </Link>
        <Link to="/buses" className={isActive('/buses') ? 'active' : ''}>
          Chuyến xe & Chọn ghế
        </Link>
        <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
          Vé của tôi
        </Link>
        <Link to="/verify-ticket" className={isActive('/verify-ticket') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🛡️</span> Soát vé (Tài xế)
        </Link>
      </nav>

      <div className="auth-buttons" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{user.full_name}</div>
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    backgroundColor: user.role === 'TaiXe' ? '#f59e0b' : user.role === 'Admin' ? '#ef4444' : '#10b981',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                >
                  {user.role === 'TaiXe' ? 'Tài xế' : user.role === 'Admin' ? 'Quản lý' : 'Hành khách'}
                </span>
                {user.discount_type && user.discount_type !== 'Khong' && (
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white' }}>
                    {user.discount_type} (-20%)
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/login">
              <button className="login-btn" style={{ padding: '8px 16px', borderRadius: '8px' }}>
                Đăng nhập
              </button>
            </Link>
            <Link to="/register">
              <button
                style={{
                  backgroundColor: 'white',
                  color: '#1d4ed8',
                  fontWeight: 'bold',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Đăng ký
              </button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;