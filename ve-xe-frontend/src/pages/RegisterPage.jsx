import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    alert(`Đăng ký thành công tài khoản: ${formData.fullName}`);
    navigate('/login');
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleRegister}>
        <h2>Đăng ký tài khoản</h2>
        
        <div className="form-group">
          <label>Họ và tên</label>
          <input 
            type="text" 
            name="fullName"
            required 
            placeholder="Nguyễn Văn A"
            value={formData.fullName}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            name="email"
            required 
            placeholder="example@gmail.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Số điện thoại</label>
          <input 
            type="tel" 
            name="phone"
            required 
            placeholder="0987654321"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Mật khẩu</label>
          <input 
            type="password" 
            name="password"
            required 
            placeholder="Tạo mật khẩu"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="auth-btn">Đăng ký</button>

        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;