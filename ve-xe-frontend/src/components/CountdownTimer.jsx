import { useState, useEffect } from 'react';

function CountdownTimer({ initialMinutes = 10 }) {
  // Đổi 10 phút ra tổng số giây (10 * 60 = 600 giây)
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);

  useEffect(() => {
    // Nếu hết giờ thì dừng lại không trừ nữa
    if (timeLeft <= 0) return;

    // Thiết lập đếm lùi mỗi 1000ms (1 giây)
    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    // Dọn dẹp bộ đếm khi component bị hủy
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  // Hàm chuyển đổi giây thành dạng Phút:Giây (VD: 09:59)
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="countdown-box">
      {timeLeft > 0 ? (
        <p>
          ⏳ Vé của bạn đang được giữ trong <strong className="timer-text">{formatTime(timeLeft)}</strong>. Vui lòng thanh toán sớm!
        </p>
      ) : (
        <p className="timer-expired">
          ⚠️ Hết thời gian giữ chỗ! Vui lòng chọn lại chuyến xe.
        </p>
      )}
    </div>
  );
}

export default CountdownTimer;