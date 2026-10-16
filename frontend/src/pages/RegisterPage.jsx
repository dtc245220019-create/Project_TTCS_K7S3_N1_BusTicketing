import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, setCurrentUser } from '../api';

function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [discountType, setDiscountType] = useState('Khong');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await registerUser({
        full_name: fullName,
        email,
        phone,
        password,
        role: 'HanhKhach',
        discount_type: discountType,
      });

      setCurrentUser({
        id: res.id,
        full_name: res.full_name,
        email: res.email,
        role: 'HanhKhach',
        discount_type: discountType,
      });

      alert('Đăng ký tài khoản thành công! Bạn đã được tự động đăng nhập.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Đăng ký không thành công');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexWrap: 'wrap' }}>
      
      {/* Cột trái: Giao diện trang chủ (Hero Section) */}
      <div style={{
        flex: '1 1 50%',
        background: 'linear-gradient(135deg, #f4f7fb 0%, #e2ebf7 100%)',
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
          fontSize: '30px', // Có thể tăng lên 48px nếu muốn giống hệt Login
          fontWeight: '900', 
          color: '#0f172a', 
          lineHeight: '1.15', 
          marginBottom: '16px', 
          letterSpacing: '-1px' 
        }}>
          Đi xe buýt dễ dàng hơn <br />
          cùng <span style={{ color: '#0066ff' }}>SmartBus.</span>
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

      {/* Cột phải: Form đăng ký */}
      <div style={{
        flex: '1 1 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'center', margin: '0 0 8px 0' }}>
            Đăng Ký Tài Khoản
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: '0 0 24px 0' }}>
            Tạo tài khoản để nhận ưu đãi giảm 20% giá vé và lưu lịch sử chuyến đi
          </p>

          {error && (
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                Họ và tên
              </label>
              <input
                type="text"
                required
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                Địa chỉ Email
              </label>
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                Số điện thoại
              </label>
              <input
                type="tel"
                required
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                Mật khẩu
              </label>
              <input
                type="password"
                required
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
                Đối tượng ưu đãi
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
              >
                <option value="Khong">Không ưu đãi</option>
                <option value="HSSV">Học sinh / Sinh viên (Giảm 20%)</option>
                <option value="NguoiCaoTuoi">Người cao tuổi (&gt; 60 tuổi - Giảm 20%)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-btn"
              style={{
                width: '100%',
                backgroundColor: '#16a34a', // Nút xanh lá nổi bật
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký Ngay'}
            </button>
          </form>

          <p className="auth-switch" style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748b' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;