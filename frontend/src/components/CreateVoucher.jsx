import { useState } from 'react';
import { createNewVoucher } from '../api';

function CreateVoucher({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    discountType: 'fixed', // 'fixed' (tiền mặt) hoặc 'percentage' (phần trăm)
    discountValue: '',
    minOrder: '',
    maxDiscount: '', 
    expiryDate: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.expiryDate && formData.expiryDate < todayStr) {
      setIsLoading(false);
      setMessage('❌ Ngày hết hạn không thể ở trong quá khứ! Vui lòng chọn từ hôm nay trở đi.');
      return;
    }

    try {
      // Làm sạch giá trị nhập (hỗ trợ nhập cả '20' hoặc '20%')
      const rawValStr = String(formData.discountValue).trim();
      const isPercentInput = rawValStr.endsWith('%') || formData.discountType === 'percentage' || formData.discountType === 'percent';
      const cleanNum = parseFloat(rawValStr.replace(/[^0-9.]/g, '')) || 0;

      const normType = isPercentInput ? 'percent' : 'fixed';

      const payload = {
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim(),
        discount_type: normType,
        discount_value: cleanNum,
        discount_percent: normType === 'percent' ? cleanNum : null,
        min_order_value: formData.minOrder ? Number(String(formData.minOrder).replace(/[^0-9.]/g, '')) : 0,
        max_discount_amount: formData.maxDiscount ? Number(String(formData.maxDiscount).replace(/[^0-9.]/g, '')) : null,
        expiry_date: formData.expiryDate || '2026-12-31'
      };

      await createNewVoucher(payload);
      setIsLoading(false);
      setMessage(`✅ Tạo mã ưu đãi thành công! (Giảm ${cleanNum}${normType === 'percent' ? '%' : ' VNĐ'})`);
      if (onCreated) {
        onCreated(payload);
      }
      // Reset form sau khi tạo
      setFormData({ code: '', title: '', discountType: 'fixed', discountValue: '', minOrder: '', maxDiscount: '', expiryDate: '' });
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      setMessage(`❌ Lỗi tạo voucher: ${error.message || 'Không thể tạo mã'}`);
    }
  };

  // CSS dùng chung cho các ô input và label
  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', marginTop: '4px' };
  const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#334155' };

  return (
    // Lớp nền đen mờ bao phủ toàn màn hình
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Khung nội dung popup */}
      <div style={{ width: '600px', maxWidth: '95%', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Nút X đóng popup */}
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }} title="Đóng">
          ✖
        </button>

        <h2 style={{ color: '#1e3a8a', marginTop: 0, marginBottom: '24px', borderBottom: '2px solid #eff6ff', paddingBottom: '12px' }}>
          ➕ Tạo Mã Ưu Đãi Mới
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Hàng 1: Mã và Tên */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={labelStyle}>Mã Code (VD: SUMMER20)</label>
              <input name="code" value={formData.code} onChange={handleChange} required style={{ ...inputStyle, textTransform: 'uppercase' }} placeholder="Nhập mã code" />
            </div>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={labelStyle}>Tên hiển thị (Mô tả ngắn)</label>
              <input name="title" value={formData.title} onChange={handleChange} required style={inputStyle} placeholder="VD: Giảm 20% chào hè" />
            </div>
          </div>

          {/* Hàng 2: Loại và Giá trị */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={labelStyle}>Loại giảm giá</label>
              <select name="discountType" value={formData.discountType} onChange={handleChange} style={inputStyle}>
                <option value="fixed">Tiền mặt (VNĐ)</option>
                <option value="percent">Phần trăm (%)</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={labelStyle}>
                Giá trị giảm {formData.discountType === 'percent' ? '(%)' : '(VNĐ)'}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  name="discountValue" 
                  type="text" 
                  value={formData.discountValue} 
                  onChange={handleChange} 
                  required 
                  style={{ ...inputStyle, paddingRight: formData.discountType === 'percent' ? '30px' : '10px' }} 
                  placeholder={formData.discountType === 'percent' ? 'VD: 20 hoặc 20%' : 'VD: 50000'} 
                />
                {formData.discountType === 'percent' && (
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-30%)', color: '#64748b', fontWeight: 'bold' }}>%</span>
                )}
              </div>
            </div>
          </div>

          {/* Hàng 3: Điều kiện */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={labelStyle}>Đơn tối thiểu (VNĐ)</label>
              <input name="minOrder" type="number" value={formData.minOrder} onChange={handleChange} required style={inputStyle} placeholder="VD: 200000" min="0" />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={labelStyle}>Giảm tối đa (VNĐ) <span style={{fontWeight: 'normal', color: '#64748b', fontSize: '12px'}}>(Nếu chọn %)</span></label>
              <input name="maxDiscount" type="number" value={formData.maxDiscount} onChange={handleChange} disabled={formData.discountType === 'fixed'} style={{ ...inputStyle, backgroundColor: formData.discountType === 'fixed' ? '#f1f5f9' : 'white', cursor: formData.discountType === 'fixed' ? 'not-allowed' : 'text' }} placeholder="VD: 100000" min="0" />
            </div>
          </div>

          {/* Hàng 4: Thời hạn */}
          <div>
            <label style={labelStyle}>Ngày hết hạn</label>
            <input
              name="expiryDate"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={formData.expiryDate}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          {/* Thông báo kết quả */}
          {message && (
            <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: message.includes('✅') ? '#dcfce7' : '#fee2e2', color: message.includes('✅') ? '#166534' : '#991b1b', fontSize: '14px', fontWeight: '500' }}>
              {message}
            </div>
          )}

          {/* Nút Submit */}
          <button type="submit" disabled={isLoading} style={{ marginTop: '8px', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, transition: '0.2s' }}>
            {isLoading ? 'Đang xử lý...' : 'Tạo Mã Ưu Đãi'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateVoucher;