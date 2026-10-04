import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser, getNotifications } from '../api';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [location.pathname]);

  // Load notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const u = getCurrentUser();
        const data = await getNotifications(u ? u.id : null);
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(Math.min(data.length, 3));
        }
      } catch (e) {
        // Fallback demo notifications
        setNotifications([
          {
            id: 1,
            type: 'EMAIL',
            title: '[BusTicket] Xác nhận đặt vé thành công #TKT-8892',
            message: 'Tuyến Hà Nội - Thái Nguyên, ghế A05, xuất bến 07:30.',
            created_at: 'Hôm nay',
          },
          {
            id: 2,
            type: 'SMS',
            title: 'SMS Xác nhận đặt vé',
            message: '[BusTicket] Dat ve thanh cong! Ma ve: TKT-8892, Ghe: A05.',
            created_at: 'Hôm nay',
          },
        ]);
        setUnreadCount(2);
      }
    }
    loadNotifications();
  }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar no-print">
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
        <Link to="/cancellation" className={isActive('/cancellation') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🔄</span> Hủy vé & Đổi vé
        </Link>
        <Link to="/verify-ticket" className={isActive('/verify-ticket') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🛡️</span> Soát vé (Tài xế)
        </Link>
      </nav>

      <div className="auth-buttons" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Notification Bell Dropdown (US20) */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              if (!showNotifMenu) setUnreadCount(0);
            }}
            title="Thông báo hệ thống (Email/SMS)"
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              color: 'white',
              transition: 'all 0.2s',
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '1px 5px',
                  minWidth: '16px',
                  textAlign: 'center',
                  border: '2px solid white',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '340px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                border: '1px solid #e2e8f0',
                zIndex: 1000,
                overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#0f172a',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📬</span> Thông báo đặt vé (US20)
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{notifications.length} tin</span>
              </div>

              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    Chưa có thông báo nào
                  </div>
                ) : (
                  notifications.map((n, idx) => (
                    <div
                      key={n.id || idx}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s',
                        cursor: 'pointer',
                        backgroundColor: idx === 0 ? '#f0fdf4' : 'white',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx === 0 ? '#f0fdf4' : 'white')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: n.type === 'EMAIL' ? '#dbeafe' : '#fef3c7',
                            color: n.type === 'EMAIL' ? '#1d4ed8' : '#b45309',
                          }}
                        >
                          {n.type === 'EMAIL' ? '✉️ EMAIL' : '💬 SMS'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {n.created_at ? n.created_at.toString().slice(0, 16) : 'Vừa xong'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '2px' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f8fafc',
                  textAlign: 'center',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  onClick={() => setShowNotifMenu(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>

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