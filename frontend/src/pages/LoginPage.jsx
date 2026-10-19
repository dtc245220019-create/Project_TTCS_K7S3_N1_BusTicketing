import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, setCurrentUser, forgotPassword, resetPassword } from '../api';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: nhập email, 2: nhập OTP + mật khẩu mới
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Vui lòng nhập Email hoặc SĐT đã đăng ký');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotMsg('');
    try {
      const res = await forgotPassword(forgotEmail);
      setForgotMsg(`Mã OTP xác thực đã được tạo: ${res.otp_demo || '123456'}. Vui lòng nhập mã và mật khẩu mới.`);
      setOtpCode(res.otp_demo || '123456');
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message || 'Không tìm thấy tài khoản với email này.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode) {
      setForgotError('Vui lòng nhập mã OTP xác thực');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('Mật khẩu nhập lại không khớp');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      await resetPassword(forgotEmail, otpCode, newPassword);
      alert('Khôi phục mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.');
      setEmail(forgotEmail);
      setPassword(newPassword);
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotMsg('');
    } catch (err) {
      setForgotError(err.message || 'Đặt lại mật khẩu thất bại, vui lòng kiểm tra lại OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

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
    const mockUser = {
      id: quickRole === 'TaiXe' ? 11 : quickRole === 'PhuXe' ? 2 : quickRole === 'Admin' ? 12 : 1,
      full_name:
        quickRole === 'TaiXe'
          ? 'Trần Văn Tài (Tài Xế)'
          : quickRole === 'PhuXe'
          ? 'Lê Phụ Xe (Nhân Viên)'
          : quickRole === 'Admin'
          ? 'Lê Quản Lý (Admin)'
          : 'Nguyễn Văn A (Hành Khách)',
      email: quickEmail,
      role: quickRole,
      discount_type: quickRole === 'HanhKhach' ? 'HSSV' : 'Khong',
    };
    setCurrentUser(mockUser);
    setTimeout(() => {
      if (quickRole === 'Admin') navigate('/admin');
      else if (quickRole === 'TaiXe' || quickRole === 'PhuXe') navigate('/verify-ticket');
      else navigate('/dashboard');
    }, 200);
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', flexWrap: 'wrap' }}>
      
      {/* Cột trái: Giao diện trang chủ (Hero Section) */}
      <div style={{
        flex: '1 1 50%',
        background: 'linear-gradient(135deg, #f4f7fb 0%, #e2ebf7 100%)', // Màu nền xanh nhạt giống trang chủ
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 8%',
        position: 'relative',
        minWidth: '300px'
      }}>
        
        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: '#e0e7ff',
          color: '#2563eb',
          padding: '6px 14px',
          borderRadius: '999px',
          fontSize: '13px',
          fontWeight: '600',
          marginBottom: '24px',
          width: 'fit-content'
        }}>
          <span style={{ marginRight: '6px' }}>✨</span> Hành trình xanh. Trải nghiệm thông minh.
        </div>

        {/* Tiêu đề chính */}
        <h1 style={{ 
          fontSize: '30px', 
          fontWeight: '900', 
          color: '#0f172a', 
          lineHeight: '1.15', 
          marginBottom: '16px', 
          letterSpacing: '-1px' 
        }}>
          Đi xe buýt dễ dàng hơn cùng <span style={{ color: '#0066ff' }}>SmartBus.</span>
        </h1>

        
        
        {/* Hình ảnh xe buýt đặt dưới nội dung */}
        <img 
          src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1500&q=85" 
          alt="Trải nghiệm SmartBus" 
          style={{ 
            width: '100%', 
            maxWidth: '550px', 
            borderRadius: '24px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            objectFit: 'cover'
          }} 
        />

        
      </div>

      {/* Cột phải: Form đăng nhập (Giữ nguyên) */}
      <div style={{
        flex: '1 1 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        backgroundColor: '#ffffff'
      }}>
        <div className="auth-card" style={{ maxWidth: '440px', width: '100%', backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'center', margin: '0 0 8px 0' }}>
            Đăng Nhập
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotEmail(email || '');
                    setForgotStep(1);
                    setForgotError('');
                    setForgotMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>
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
                backgroundColor: '#16a34a',
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
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>👤 1. Hành khách: <b>customer@example.com</b></span>
                <span style={{ fontSize: '11px', color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>HSSV -20%</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('taixe.nguyen@smartbus.vn', 'TaiXe')}
                style={{
                  backgroundColor: '#fffbeb',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>🚌 2. Tài xế: <b>taixe.nguyen@smartbus.vn</b></span>
                <span style={{ fontSize: '11px', color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>Soát vé & Khách</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('nhanvien@smartbus.vn', 'PhuXe')}
                style={{
                  backgroundColor: '#faf5ff',
                  color: '#6b21a8',
                  border: '1px solid #e9d5ff',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>🎫 3. Phụ xe / Quầy: <b>nhanvien@smartbus.vn</b></span>
                <span style={{ fontSize: '11px', color: '#7e22ce', backgroundColor: '#f3e8ff', padding: '2px 6px', borderRadius: '4px' }}>Soát vé QR</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@smartbus.vn', 'Admin')}
                style={{
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>👑 4. Quản trị viên: <b>admin@smartbus.vn</b></span>
                <span style={{ fontSize: '11px', color: '#1e40af', backgroundColor: '#dbeafe', padding: '2px 6px', borderRadius: '4px' }}>Toàn quyền RBAC</span>
              </button>
            </div>
          </div>

          <p className="auth-switch" style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748b' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: '#0066ff', fontWeight: 'bold', textDecoration: 'none' }}>
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>

      {/* MODAL KHÔI PHỤC MẬT KHẨU (QUÊN MẬT KHẨU) */}
      {showForgotModal && (
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
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            position: 'relative',
          }}>
            <button
              onClick={() => setShowForgotModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '22px',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              ×
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔐</div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                Khôi Phục Mật Khẩu
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                {forgotStep === 1
                  ? 'Nhập email hoặc SĐT để nhận mã xác thực OTP'
                  : 'Nhập mã OTP xác thực và thiết lập mật khẩu mới'}
              </p>
            </div>

            {forgotError && (
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                ⚠️ {forgotError}
              </div>
            )}

            {forgotMsg && (
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                ℹ️ {forgotMsg}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Email hoặc Số điện thoại tài khoản
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: customer@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      color: '#475569',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      fontWeight: '700',
                      cursor: forgotLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {forgotLoading ? 'Đang gửi mã...' : 'Gửi Mã Xác Thực OTP →'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                    Mã xác nhận OTP (6 số)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Nhập 6 số OTP (Demo: 123456)"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', letterSpacing: '4px', fontWeight: 'bold', fontSize: '16px', textAlign: 'center' }}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                    Xác nhận lại mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      color: '#475569',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    ← Nhập lại email
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#16a34a',
                      color: 'white',
                      fontWeight: '700',
                      cursor: forgotLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {forgotLoading ? 'Đang lưu...' : 'Xác Nhận Đặt Lại Mật Khẩu'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;