import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

function PaymentResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Lấy kết quả từ 2 nguồn:
  // 1. location.state (khi navigate trong app)
  // 2. query params (khi VNPAY callback redirect về)
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Ưu tiên location.state
    if (location.state) {
      setResult(location.state);
      return;
    }

    // Fallback: đọc từ query params
    const status = searchParams.get('status') || 'FAILED';
    const reason = searchParams.get('reason') || 'UNKNOWN';
    const bookingCode = searchParams.get('booking_code') || '';
    const txnCode = searchParams.get('transaction_code') || '';
    const amount = parseInt(searchParams.get('amount') || '0', 10);

    setResult({
      success: status === 'SUCCESS',
      booking_code: bookingCode,
      transaction_code: txnCode,
      amount,
      reason,
    });
  }, [location.state, searchParams]);

  if (!result) {
    return (
      <div style={{ maxWidth: '700px', margin: '60px auto', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: '#64748b' }}>Đang tải kết quả...</p>
      </div>
    );
  }

  const isSuccess = result.success === true;

  // Map reason code → mô tả tiếng Việt
  const reasonMap = {
    USER_CANCELLED: 'Bạn đã hủy giao dịch',
    PAYMENT_FAILED: 'Giao dịch bị từ chối bởi ngân hàng',
    INSUFFICIENT_FUNDS: 'Số dư tài khoản không đủ',
    WRONG_OTP: 'Mã OTP không chính xác',
    TIMEOUT: 'Hết thời gian chờ thanh toán',
    EXPIRED: 'Phiên thanh toán đã hết hạn',
    SERVER_ERROR: 'Lỗi hệ thống, vui lòng thử lại sau',
    UNKNOWN: 'Đã xảy ra lỗi không xác định',
  };

  const failReason = reasonMap[result.reason] || reasonMap.UNKNOWN;

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '0 20px' }}>
      {isSuccess ? (
        <SuccessCard result={result} navigate={navigate} />
      ) : (
        <FailCard result={result} failReason={failReason} navigate={navigate} />
      )}
    </div>
  );
}

// ==========================================
// SUCCESS CARD
// ==========================================
function SuccessCard({ result, navigate }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '40px 32px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      border: '1px solid #bbf7d0',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '72px', marginBottom: '8px' }}>✅</div>

      <h1 style={{
        fontSize: '26px',
        fontWeight: '800',
        color: '#16a34a',
        margin: '0 0 8px 0',
      }}>
        Đặt vé thành công!
      </h1>

      <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '28px' }}>
        Cảm ơn bạn đã sử dụng dịch vụ Smart Bus Ticketing
      </p>

      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '28px',
        textAlign: 'left',
      }}>
        <InfoRow label="Mã đơn hàng" value={`#${result.booking_code || 'N/A'}`} mono />
        <InfoRow label="Mã giao dịch" value={result.transaction_code || 'N/A'} mono />
        <InfoRow
          label="Số tiền"
          value={result.amount ? `${result.amount.toLocaleString('vi-VN')} VNĐ` : 'N/A'}
          highlight
        />
        <InfoRow label="Phương thức" value={result.provider || 'VietQR'} />
      </div>

      <p style={{
        color: '#16a34a',
        fontSize: '14px',
        marginBottom: '24px',
        fontWeight: '600',
      }}>
        📧 Vé điện tử đã được gửi tới email & SMS của bạn
      </p>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={btnStyle('#2563eb')}
        >
          🎫 Xem vé của tôi
        </button>
        <button
          onClick={() => navigate('/')}
          style={btnStyle('#ffffff', '#64748b', '#e2e8f0')}
        >
          🏠 Về trang chủ
        </button>
      </div>
    </div>
  );
}

// ==========================================
// FAILED CARD
// ==========================================
function FailCard({ result, failReason, navigate }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '40px 32px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      border: '1px solid #fecaca',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '72px', marginBottom: '8px' }}>❌</div>

      <h1 style={{
        fontSize: '26px',
        fontWeight: '800',
        color: '#dc2626',
        margin: '0 0 8px 0',
      }}>
        Thanh toán thất bại
      </h1>

      <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '28px' }}>
        Giao dịch của bạn không thể hoàn tất
      </p>

      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '28px',
        textAlign: 'left',
      }}>
        <InfoRow label="Lý do" value={failReason} highlightRed />
        {result.booking_code && (
          <InfoRow label="Mã đơn hàng" value={`#${result.booking_code}`} mono />
        )}
        {result.transaction_code && (
          <InfoRow label="Mã giao dịch" value={result.transaction_code} mono />
        )}
      </div>

      <p style={{
        color: '#64748b',
        fontSize: '13px',
        marginBottom: '24px',
      }}>
        💡 Vui lòng thử lại hoặc liên hệ hotline <b>1900-xxxx</b> nếu cần hỗ trợ
      </p>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/payment')}
          style={btnStyle('#dc2626')}
        >
          🔄 Thử lại
        </button>
        <button
          onClick={() => navigate('/')}
          style={btnStyle('#ffffff', '#64748b', '#e2e8f0')}
        >
          🏠 Về trang chủ
        </button>
      </div>
    </div>
  );
}

// ==========================================
// HELPER COMPONENTS
// ==========================================
function InfoRow({ label, value, mono, highlight, highlightRed }) {
  const valueStyle = {
    fontWeight: '800',
    fontFamily: mono ? 'monospace' : 'inherit',
    color: highlight ? '#16a34a' : highlightRed ? '#dc2626' : '#1e293b',
    fontSize: highlight || highlightRed ? '17px' : '14px',
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px dashed #e2e8f0',
    }}>
      <span style={{ color: '#64748b', fontSize: '13px' }}>{label}:</span>
      <span style={valueStyle}>{value}</span>
    </div>
  );
}

function btnStyle(bg, color = 'white', border = 'none') {
  return {
    backgroundColor: bg,
    color,
    border: `1px solid ${border}`,
    padding: '12px 24px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  };
}

export default PaymentResultPage;