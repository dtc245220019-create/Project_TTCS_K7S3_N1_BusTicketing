import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, setCurrentUser, getNotifications, getProfile } from '../api';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isHome = location.pathname === '/';
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    const cur = getCurrentUser();
    setUser(cur);
    if (cur && cur.id) {
      getProfile(cur.id)
        .then((prof) => {
          const fresh = prof?.user || (prof?.id ? prof : null);
          if (fresh) {
            const merged = { ...cur, ...fresh };
            setCurrentUser(merged);
            setUser(merged);
          }
        })
        .catch(() => {});
    }
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
      } catch (_e) {
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

  const handleActorSwitch = (targetRole) => {
    let newUser;
    if (targetRole === 'HanhKhach') {
      getProfile(1)
        .then((prof) => {
          const fresh = prof?.user || (prof?.id ? prof : null);
          const usr = fresh ? { ...fresh, role: 'HanhKhach' } : {
            id: 1,
            full_name: 'Nguyễn Văn A (Hành Khách)',
            email: 'customer@example.com',
            role: 'HanhKhach',
            discount_type: 'HSSV',
            discount_status: 'DaDuyet',
          };
          setCurrentUser(usr);
          setUser(usr);
          navigate('/dashboard');
        })
        .catch(() => {
          const usr = {
            id: 1,
            full_name: 'Nguyễn Văn A (Hành Khách)',
            email: 'customer@example.com',
            role: 'HanhKhach',
            discount_type: 'HSSV',
            discount_status: 'DaDuyet',
          };
          setCurrentUser(usr);
          setUser(usr);
          navigate('/dashboard');
        });
      return;
    } else if (targetRole === 'TaiXe') {
      newUser = {
        id: 11,
        full_name: 'Trần Văn Tài (Tài Xế)',
        email: 'taixe.nguyen@smartbus.vn',
        role: 'TaiXe',
        discount_type: 'Khong',
      };
      setCurrentUser(newUser);
      setUser(newUser);
      navigate('/buses');
    } else if (targetRole === 'PhuXe') {
      newUser = {
        id: 2,
        full_name: 'Lê Phụ Xe (Nhân Viên)',
        email: 'nhanvien@smartbus.vn',
        role: 'PhuXe',
        discount_type: 'Khong',
      };
      setCurrentUser(newUser);
      setUser(newUser);
      navigate('/verify-ticket');
    } else if (targetRole === 'Admin') {
      newUser = {
        id: 12,
        full_name: 'Lê Quản Lý (Admin)',
        email: 'admin@smartbus.vn',
        role: 'Admin',
        discount_type: 'Khong',
      };
      setCurrentUser(newUser);
      setUser(newUser);
      navigate('/admin');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className={`navbar no-print ${isHome ? 'navbar-home' : 'navbar-inner-page'}`}>
     <div className="header-brand-group">
        <button
          className="sidebar-toggle"
          type="button"
          aria-label="Mở menu dọc"
          onClick={() => setShowSidebar((open) => !open)}
          title="Mở menu dọc"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
  
        <div className="logo">
          <Link to="/" className="brand-link" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-icon" style={{ fontSize: '24px' }}>🚌</span>
            <span className="brand-name" style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px' }}>
              Smart&nbsp;
              <span style={{ color: '#38bdf8' }} >BusTicketing</span>
            </span>
          </Link>
        </div>
      </div>

      <nav className="nav-links">
        <Link to="/" className={isActive('/') ? 'active' : ''}>
          Trang chủ
        </Link>

        {/* Link theo quyền của 4 Actor */}
        {(!user || user.role === 'HanhKhach') && (
          <>
            <Link to="/map" className={isActive('/map') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🗺️</span> Bản đồ
            </Link>
            <Link to="/buses" className={isActive('/buses') ? 'active' : ''}>
              Chuyến xe
            </Link>
            <Link to="/monthly-pass" className={isActive('/monthly-pass') || isActive('/ve-thang') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🎫</span> Vé tháng
            </Link>
            <Link to="/dashboard" className={isActive('/dashboard') || isActive('/cancellation') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🎟️</span> Vé của tôi
            </Link>
            <Link to="/feedback" className={isActive('/feedback') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>💬</span> Đánh giá
            </Link>
            <Link to="/tra-cuu-hoan-tien" className={isActive('/tra-cuu-hoan-tien') || isActive('/refund-status') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>💸</span> Hoàn tiền
            </Link>
          </>
        )}

        {user && user.role === 'TaiXe' && (
          <>
            <Link to="/buses" className={isActive('/buses') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fef08a' }}>
              <span>🚌</span> Chuyến Xe Được Phân Công & Nhận Lái
            </Link>
            <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
              Lịch sử chuyến
            </Link>
          </>
        )}

        {user && user.role === 'PhuXe' && (
          <>
            <Link to="/verify-ticket" className={isActive('/verify-ticket') ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(168, 85, 247, 0.25)', border: '1px solid #a855f7', color: '#f3e8ff', fontWeight: 'bold' }}>
              <span>🎫</span> Rà Soát Vé Xe (Soát vé & QR)
            </Link>
          </>
        )}

        {user && (user.role === 'Admin' || user.role === 'QuanTriVien') && (
          <>
            <Link to="/buses" className={isActive('/buses') ? 'active' : ''}>
              Điều phối chuyến
            </Link>
            <Link to="/monthly-pass" className={isActive('/monthly-pass') ? 'active' : ''}>
              Vé tháng
            </Link>
            <Link to="/verify-ticket" className={isActive('/verify-ticket') ? 'active' : ''}>
              Soát vé
            </Link>
            <Link
              to="/admin"
              className={isActive('/admin') ? 'active' : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid #ef4444',
                color: '#fecaca',
                fontWeight: 'bold',
              }}
            >
              <span>👑</span> Quản Trị Hệ Thống
            </Link>
          </>
        )}

        {/* Chức năng FAQ tinh gọn cho thanh ngang */}
        <Link
          to="/faq"
          className={isActive('/faq') || isActive('/huong-dan') ? 'active' : ''}
          style={{ fontWeight: '700' }}
        >
          FAQ
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
                            backgroundColor: n.title?.includes('⏰') || n.title?.includes('Nhắc nhở')
                              ? '#fef3c7'
                              : n.type === 'EMAIL'
                              ? '#dbeafe'
                              : '#fef3c7',
                            color: n.title?.includes('⏰') || n.title?.includes('Nhắc nhở')
                              ? '#b45309'
                              : n.type === 'EMAIL'
                              ? '#1d4ed8'
                              : '#b45309',
                          }}
                        >
                          {n.title?.includes('⏰') || n.title?.includes('Nhắc nhở') ? '⏰ SẮP KHỞI HÀNH' : n.type === 'EMAIL' ? '✉️ EMAIL' : '💬 SMS'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {n.created_at ? n.created_at.toString().slice(0, 16) : 'Vừa xong'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: n.title?.includes('⏰') ? '#b45309' : '#1e293b', marginBottom: '2px' }}>
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

        {/* Quick Actor Switcher for Demo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold' }}>Actor:</span>
          <select
            value={user?.role || 'HanhKhach'}
            onChange={(e) => handleActorSwitch(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              color: 'white',
              borderRadius: '8px',
              padding: '5px 8px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="HanhKhach" style={{ color: '#0f172a' }}>👤 Hành Khách</option>
            <option value="TaiXe" style={{ color: '#0f172a' }}>🚌 Tài Xế</option>
            <option value="PhuXe" style={{ color: '#0f172a' }}>🎫 Phụ Xe / Quầy</option>
            <option value="Admin" style={{ color: '#0f172a' }}>👑 Quản Trị Viên</option>
          </select>
        </div>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              to="/dashboard?tab=profile"
              title="Nhấn để xem Trang thông tin khách hàng & đối tượng ưu đãi"
              style={{ textAlign: 'right', textDecoration: 'none', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                <span>👤</span> {user.full_name}
              </div>
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    backgroundColor:
                      user.role === 'TaiXe'
                        ? '#f59e0b'
                        : user.role === 'PhuXe'
                        ? '#a855f7'
                        : (user.role === 'Admin' || user.role === 'QuanTriVien')
                        ? '#ef4444'
                        : '#10b981',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                >
                  {user.role === 'TaiXe'
                    ? 'Tài xế'
                    : user.role === 'PhuXe'
                    ? 'Phụ xe'
                    : (user.role === 'Admin' || user.role === 'QuanTriVien')
                    ? 'Quản trị'
                    : 'Hành khách'}
                </span>
                {user.discount_type && user.discount_type !== 'Khong' && (
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white' }}>
                    {user.discount_type} {user.discount_status === 'ChoDuyet' ? '(Chờ duyệt)' : '(-20%)'}
                  </span>
                )}
              </div>
            </Link>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '600',
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
      {showSidebar && (
        <>
          <button className="sidebar-backdrop" aria-label="Đóng menu" onClick={() => setShowSidebar(false)} />
          <aside className="smartbus-sidebar" aria-label="Điều hướng chính">
            <div className="sidebar-heading">
              <span className="sidebar-bus-icon">🚌</span>
              <div><strong>SmartBus</strong><small>Di chuyển thông minh</small></div>
              <button className="sidebar-close" onClick={() => setShowSidebar(false)} aria-label="Đóng">×</button>
            </div>
            <div className="sidebar-section-label">MENU CHÍNH</div>
            {[
              ['/', '🏠', 'Trang chủ'],
              ...(user?.role === 'PhuXe'
                ? [
                    ['/verify-ticket', '🎫', 'Rà soát vé xe (Soát vé & QR)'],
                    ['/faq', '💡', 'FAQ & Hướng dẫn'],
                  ]
                : user?.role === 'TaiXe'
                ? [
                    ['/buses', '🚌', 'Chuyến xe phân công & Nhận lái'],
                    ['/dashboard', '🎟️', 'Lịch sử chuyến'],
                    ['/faq', '💡', 'FAQ & Hướng dẫn'],
                  ]
                : (user?.role === 'Admin' || user?.role === 'QuanTriVien')
                ? [
                    ['/admin', '⚙️', 'Quản trị hệ thống'],
                    ['/buses', '🚌', 'Điều phối chuyến'],
                    ['/verify-ticket', '📱', 'Soát vé QR'],
                    ['/faq', '💡', 'FAQ & Hướng dẫn'],
                  ]
                : [
                    ['/dashboard?tab=profile', '👤', 'Thông tin khách hàng'],
                    ['/buses', '🚌', 'Tra cứu & Đặt chuyến xe'],
                    ['/map', '🗺️', 'Bản đồ & theo dõi xe'],
                    ['/monthly-pass', '🎫', 'Vé tháng'],
                    ['/dashboard', '🎟️', 'Vé của tôi'],
                    ['/feedback', '💌', 'Đánh giá & góp ý'],
                    ['/tra-cuu-hoan-tien', '💸', 'Tra cứu hoàn tiền'],
                    ['/faq', '💡', 'FAQ & Hướng dẫn'],
                  ]
              ),
            ].map(([path, icon, label]) => (
              <Link key={path} to={path} onClick={() => setShowSidebar(false)} className={`sidebar-link ${location.pathname === path ? 'active' : ''}`}>
                <span className="sidebar-link-icon">{icon}</span><span>{label}</span><span className="sidebar-chevron">›</span>
              </Link>
            ))}
            <div className="sidebar-help-card"><strong>Hành trình thuận tiện hơn</strong><p>Tra cứu chuyến, quản lý vé và theo dõi xe tại một nơi.</p></div>
          </aside>
        </>
      )}

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(4px)',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '420px',
            width: '100%',
            padding: '28px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              margin: '0 auto 16px auto',
            }}>
              🚪
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              Xác Nhận Đăng Xuất
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản <b>{user?.full_name}</b> không? Phiên làm việc của bạn sẽ kết thúc.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  flex: 1,
                  boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                }}
              >
                Đăng Xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;