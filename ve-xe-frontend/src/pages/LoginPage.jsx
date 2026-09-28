import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    alert(`Đăng nhập thành công với tài khoản: ${email}`);
    navigate('/'); // Đăng nhập xong quay về trang chủ
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleLogin}>
        <h2>Đăng nhập</h2>
        
        <div className="form-group">
          <label>Email hoặc Số điện thoại</label>
          <input 
            type="text" 
            required 
            placeholder="Nhập email hoặc SĐT"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Mật khẩu</label>
          <input 
            type="password" 
            required 
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="auth-btn">Đăng nhập</button>

        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;