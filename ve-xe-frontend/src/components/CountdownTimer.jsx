import { useState, useEffect } from 'react';

function CountdownTimer({ initialMinutes = 10, heldUntil = null, onExpire = null }) {
  const calculateRemainingSeconds = () => {
    if (heldUntil) {
      const expiry = new Date(heldUntil).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      return diff;
    }
    return initialMinutes * 60;
  };

  const [timeLeft, setTimeLeft] = useState(calculateRemainingSeconds());

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="countdown-box"
      style={{
        backgroundColor: timeLeft > 60 ? '#eff6ff' : '#fef2f2',
        border: `1.5px solid ${timeLeft > 60 ? '#93c5fd' : '#f87171'}`,
        borderRadius: '12px',
        padding: '14px 20px',
        textAlign: 'center',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      {timeLeft > 0 ? (
        <div style={{ color: timeLeft > 60 ? '#1e40af' : '#b91c1c', fontSize: '15px' }}>
          ⏳ Vị trí ghế đang được tạm giữ trong:{' '}
          <strong style={{ fontSize: '20px', fontWeight: '800', marginLeft: '6px' }}>
            {formatTime(timeLeft)}
          </strong>
          <span style={{ fontSize: '13px', display: 'block', marginTop: '4px', opacity: 0.85 }}>
            Vui lòng hoàn tất thanh toán trước khi hết hạn để tránh bị nhả ghế tự động.
          </span>
        </div>
      ) : (
        <div style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: '15px' }}>
          ⚠️ Đã hết thời gian giữ chỗ! Ghế đã được hệ thống tự động giải phóng. Vui lòng quay lại chọn ghế.
        </div>
      )}
    </div>
  );
}

export default CountdownTimer;