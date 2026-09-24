import { useState } from 'react';

function PaymentForm() {
  const [paymentMethod, setPaymentMethod] = useState('momo');

  const handlePayment = () => {
    alert(`Đang kết nối cổng thanh toán: ${paymentMethod.toUpperCase()}`);
  };

  return (
    <div className="payment-container">
      <h2>💳 Thanh toán đơn hàng</h2>
      
      {/* Tóm tắt thông tin chuyến đi */}
      <div className="order-summary">
        <h3>Tóm tắt chuyến đi</h3>
        <p><strong>Chuyến xe:</strong> Hà Nội ➔ Đà Lạt</p>
        <p><strong>Ngày khởi hành:</strong> 24/09/2026</p>
        <p><strong>Ghế đã chọn:</strong> A05, A06</p>
        <p className="total-price"><strong>Tổng tiền:</strong> 600.000 VNĐ</p>
      </div>

      {/* Chọn phương thức thanh toán */}
      <div className="payment-methods">
        <h3>Phương thức thanh toán</h3>
        <label className="method-item">
          <input 
            type="radio" 
            name="payment" 
            value="momo" 
            checked={paymentMethod === 'momo'} 
            onChange={(e) => setPaymentMethod(e.target.value)} 
          />
          <span>Ví MoMo</span>
        </label>

        <label className="method-item">
          <input 
            type="radio" 
            name="payment" 
            value="vnpay" 
            checked={paymentMethod === 'vnpay'} 
            onChange={(e) => setPaymentMethod(e.target.value)} 
          />
          <span>VNPAY / Chuyển khoản QR Ngân hàng</span>
        </label>
      </div>

      <button className="pay-btn" onClick={handlePayment}>
        Thanh toán ngay
      </button>
    </div>
  );
}

export default PaymentForm;