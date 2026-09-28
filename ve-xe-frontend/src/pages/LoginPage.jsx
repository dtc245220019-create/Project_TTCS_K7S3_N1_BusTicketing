import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, setCurrentUser } from '../api';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginUser(email, password);
      setCurrentUser(res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (quickEmail, quickRole) => {
    setEmail(quickEmail);
    setPassword('123456');
    // Pre-set user so demo works instantly even before submit
    const mockUser = {
      id: quickRole === 'TaiXe' ? 11 : quickRole === 'Admin' ? 12 : 1,
      full_name: quickRole === 'TaiXe' ? 'Trần Văn Tài (Tài Xế)' : quickRole === 'Admin' ? 'Lê Quản Lý (Admin)' : 'Nguyễn Văn A',
      email: quickEmail,
      role: quickRole,
      discount_type: quickRole === 'HanhKhach' ? 'HSSV' : 'Khong',
    };
    setCurrentUser(mockUser);
    setTimeout(() => {
      navigate('/dashboard');
    }, 200);
  };

  return (
    <div className="auth-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="auth-card" style={{ maxWidth: '440px', width: '100%', backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'center', margin: '0 0 8px 0' }}>
          Đăng Nhập Tài Khoản
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: '0 0 24px 0' }}>
          Truy cập hệ thống đặt vé và quản lý lịch trình xe buýt
        </p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Email hoặc Số điện thoại
            </label>
            <input
              type="text"
              required
              placeholder="Nhập email hoặc SĐT"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Mật khẩu
            </label>
            <input
              type="password"
              required
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-btn"
            style={{
              width: '100%',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>

        {/* 1-Click Demo Accounts */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textAlign: 'center' }}>
            ⚡ 1-Click Đăng Nhập Tài Khoản Demo (Cho Buổi Ra Mắt):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fillQuickAccount('customer@example.com', 'HanhKhach')}
              style={{
                backgroundColor: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              👤 Hành khách: <b>customer@example.com</b> (Ưu đãi HSSV)
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('taixe.nguyen@smartbus.vn', 'TaiXe')}
              style={{
                backgroundColor: '#fffbeb',
                color: '#92400e',
                border: '1px solid #fde68a',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              🚌 Tài xế / Phụ xe: <b>taixe.nguyen@smartbus.vn</b> (Soát vé)
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('admin@smartbus.vn', 'Admin')}
              style={{
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              👑 Quản trị viên: <b>admin@smartbus.vn</b>
            </button>
          </div>
        </div>

        <p className="auth-switch" style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748b' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: '#2563eb', fontWeight: 'bold' }}>
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;