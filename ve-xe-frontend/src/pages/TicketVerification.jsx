import { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  getCurrentUser,
  setCurrentUser,
  getRecentInspections,
  verifyTicket,
  getDriverTrips,
  boardPassenger,
} from '../api';

function TicketVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setUser] = useState(getCurrentUser());
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'manifest'
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);

  // Driver manifest state
  const [driverTrips, setDriverTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [boardFeedback, setBoardFeedback] = useState('');

  // Check authorization
  const isAuthorized =
    currentUser &&
    (currentUser.role === 'TaiXe' ||
      currentUser.role === 'PhuXe' ||
      currentUser.role === 'Admin' ||
      currentUser.role === 'QuanTriVien');

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (u && (u.role === 'TaiXe' || u.role === 'PhuXe' || u.role === 'Admin' || u.role === 'QuanTriVien')) {
      loadLogs();
      loadManifestTrips();
    }
  }, []);

  const loadLogs = () => {
    getRecentInspections()
      .then((data) => setRecentLogs(data || []))
      .catch((err) => console.warn('Lỗi tải nhật ký soát vé:', err));
  };

  const loadManifestTrips = async () => {
    setManifestLoading(true);
    try {
      const data = await getDriverTrips();
      const tripsList = data.trips || data || [];
      setDriverTrips(tripsList);
      if (tripsList.length > 0 && !selectedTripId) {
        setSelectedTripId(tripsList[0].id);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách chuyến của tài xế:', err);
    } finally {
      setManifestLoading(false);
    }
  };

  const executeVerify = async (rawCode) => {
    const code = (rawCode || '').trim().replace(/^ticket:/i, '');
    if (!code) return;

    setLoading(true);
    setResult(null);

    try {
      let res = null;
      try {
        res = await verifyTicket(code);
      } catch (apiErr) {
        console.warn('Lỗi verify API:', apiErr);
      }

      if (res && res.result) {
        setResult(res);
        loadLogs();
      } else {
        // Kiểm tra trong danh sách vé đã mua cục bộ (Local tickets)
        const localSaved = JSON.parse(localStorage.getItem('smartbus_purchased_tickets') || '[]');
        const matched = localSaved.find((t) => (t.ticket_code || t.id || '').toUpperCase() === code.toUpperCase());

        if (matched) {
          const isCancelled = matched.status === 'CANCELLED';
          const localRes = {
            valid: !isCancelled,
            result: isCancelled ? 'CANCELLED' : 'VALID',
            ticket_code: matched.ticket_code || matched.id,
            passenger_name: matched.passenger_name || 'Nguyễn Văn A',
            trip: matched.routeName || 'Hồ Chí Minh - Đà Lạt',
            seat_number: matched.seatNumber || 'A05',
            status: isCancelled ? 'CANCELLED' : 'ACTIVE',
            inspected_at: new Date().toLocaleTimeString('vi-VN'),
            message: isCancelled
              ? 'Vé này đã bị hủy, không có hiệu lực lên xe!'
              : 'Vé hợp lệ! Đã xác thực thành công khi khách lên xe.',
          };
          setResult(localRes);

          setRecentLogs((prev) => [
            {
              id: Date.now(),
              ticket_code: localRes.ticket_code,
              result: localRes.result,
              passenger_name: localRes.passenger_name,
              seat_number: localRes.seat_number,
              inspected_at: localRes.inspected_at,
            },
            ...prev,
          ]);
        } else {
          // Kiểm tra trong danh sách vé tháng
          const localPasses = JSON.parse(localStorage.getItem('smartbus_monthly_passes') || '[]');
          const matchedPass = localPasses.find(
            (p) =>
              (p.ticket_code || '').toUpperCase() === code.toUpperCase() ||
              `PASS:${p.id}`.toUpperCase() === code.toUpperCase() ||
              `PASS-${p.id}`.toUpperCase() === code.toUpperCase()
          );

          if (matchedPass) {
            const isExpired = matchedPass.status === 'HetHan';
            const localPassRes = {
              valid: !isExpired,
              result: isExpired ? 'EXPIRED' : 'VALID',
              ticket_code: matchedPass.ticket_code || `PASS-${matchedPass.id}`,
              passenger_name: matchedPass.passenger_name || 'Nguyễn Văn A',
              trip: matchedPass.route_name || `${matchedPass.departure_city || 'Hồ Chí Minh'} - ${matchedPass.arrival_city || 'Đà Lạt'}`,
              seat_number: 'Thẻ Vé Tháng (Tự do ghế)',
              status: matchedPass.status,
              inspected_at: new Date().toLocaleTimeString('vi-VN'),
              message: isExpired
                ? `Thẻ vé tháng đã hết hạn vào ngày ${matchedPass.end_date}!`
                : `Thẻ vé tháng hợp lệ! Tuyến ${matchedPass.route_name || 'Hồ Chí Minh - Đà Lạt'} (Hạn: ${matchedPass.end_date})`,
            };
            setResult(localPassRes);

            setRecentLogs((prev) => [
              {
                id: Date.now(),
                ticket_code: localPassRes.ticket_code,
                result: localPassRes.result,
                passenger_name: localPassRes.passenger_name,
                seat_number: localPassRes.seat_number,
                inspected_at: localPassRes.inspected_at,
              },
              ...prev,
            ]);
          } else {
            setResult({
              valid: false,
              result: 'INVALID',
              ticket_code: code,
              message: `Mã vé "${code}" không tồn tại trên hệ thống hoặc chưa được thanh toán!`,
            });
          }
        }
      }
    } catch (err) {
      setResult({
        valid: false,
        result: 'ERROR',
        message: err.message || 'Lỗi kết nối máy chủ',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.ticketCode) {
      setInputCode(location.state.ticketCode);
      executeVerify(location.state.ticketCode);
    }
  }, [location.state]);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    executeVerify(inputCode);
  };

  const handleQuickTest = (code) => {
    setInputCode(code);
    executeVerify(code);
  };

  const handleBoardPassenger = async (ticketId, passengerName) => {
    try {
      await boardPassenger(ticketId, currentUser?.email || 'taixe.nguyen@smartbus.vn');
      setBoardFeedback(`✅ Đã xác nhận hành khách ${passengerName} (Vé #${ticketId}) lên xe thành công!`);
      // Update manifest locally
      setDriverTrips((prev) =>
        prev.map((trip) => {
          if (trip.id === selectedTripId && trip.passengers) {
            return {
              ...trip,
              passengers: trip.passengers.map((p) =>
                p.ticket_id === ticketId || p.ticket_code === ticketId
                  ? { ...p, status: 'USED', boarded: true }
                  : p
              ),
            };
          }
          return trip;
        })
      );
      loadLogs();
      setTimeout(() => setBoardFeedback(''), 4000);
    } catch (err) {
      setBoardFeedback(`⚠️ Lỗi xác nhận lên xe: ${err.message || 'Không thể cập nhật'}`);
    }
  };

  const switchToDriver = () => {
    const driver = {
      id: 11,
      full_name: 'Trần Văn Tài (Tài Xế)',
      email: 'taixe.nguyen@smartbus.vn',
      role: 'TaiXe',
      phone: '0901234567',
    };
    setCurrentUser(driver);
    setUser(driver);
    loadLogs();
    loadManifestTrips();
  };

  const switchToConductor = () => {
    const conductor = {
      id: 2,
      full_name: 'Lê Phụ Xe (Nhân Viên)',
      email: 'nhanvien@smartbus.vn',
      role: 'PhuXe',
      phone: '0912345678',
    };
    setCurrentUser(conductor);
    setUser(conductor);
    loadLogs();
    loadManifestTrips();
  };

  // ACCESS DENIED VIEW FOR PASSENGERS
  if (!isAuthorized) {
    return (
      <div style={{ maxWidth: '720px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '48px 32px',
            border: '1px solid #fed7aa',
            boxShadow: '0 20px 40px rgba(234, 88, 12, 0.08)',
          }}
        >
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🛡️</div>
          <span
            style={{
              backgroundColor: '#ffedd5',
              color: '#c2410c',
              padding: '4px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '0.5px',
            }}
          >
            403 FORBIDDEN - BẢO MẬT SOÁT VÉ
          </span>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: '16px 0 8px 0' }}>
            Khu Vực Nghiệp Vụ Soát Vé & Quản Lý Lên Xe
          </h2>
          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 28px auto' }}>
            Hệ thống phân quyền đã bảo vệ khu vực này. Tính năng soát vé mã QR và danh sách hành khách lên xe
            chỉ dành riêng cho <b>Tài Xế (`TaiXe`)</b> và <b>Phụ Xe (`PhuXe`)</b>.
            Tài khoản của bạn hiện là: <b style={{ color: '#166534' }}>{currentUser?.role || 'Hành Khách'}</b>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={switchToDriver}
              style={{
                backgroundColor: '#d97706',
                color: 'white',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🚌 Chuyển Sang Tài Khoản: Trần Văn Tài (Tài Xế)
            </button>
            <button
              onClick={switchToConductor}
              style={{
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🎫 Chuyển Sang Tài Khoản: Lê Phụ Xe (Phụ Xe)
            </button>
            <Link
              to="/dashboard"
              style={{
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '14px',
                marginTop: '12px',
              }}
            >
              ← Về trang "Vé Của Tôi" (Hành khách)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedTrip = driverTrips.find((t) => t.id === selectedTripId) || driverTrips[0];
  const manifestPassengers = selectedTrip?.passengers || [];
  const boardedCount = manifestPassengers.filter((p) => p.status === 'USED' || p.status === 'BOARDED' || p.boarded).length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 20px', minHeight: '80vh' }}>
      {/* Role Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: currentUser.role === 'TaiXe' ? '#fffbeb' : '#faf5ff',
          border: `1px solid ${currentUser.role === 'TaiXe' ? '#fde68a' : '#e9d5ff'}`,
          borderRadius: '16px',
          padding: '16px 24px',
          marginBottom: '24px',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '32px' }}>{currentUser.role === 'TaiXe' ? '🚌' : '🎫'}</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: currentUser.role === 'TaiXe' ? '#92400e' : '#6b21a8' }}>
              PHIÊN LÀM VIỆC NGHIỆP VỤ (ACTOR 2 & 3)
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
              {currentUser.full_name} ({currentUser.role === 'TaiXe' ? 'Tài Xế Phụ Trách' : 'Phụ Xe Kiểm Soát'})
            </div>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('scan')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'scan' ? '#2563eb' : 'white',
              color: activeTab === 'scan' ? 'white' : '#475569',
              boxShadow: activeTab === 'scan' ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
            }}
          >
            🛡️ Soát Vé QR
          </button>
          <button
            onClick={() => setActiveTab('manifest')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'manifest' ? '#2563eb' : 'white',
              color: activeTab === 'manifest' ? 'white' : '#475569',
              boxShadow: activeTab === 'manifest' ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
            }}
          >
            📋 Danh Sách Khách Lên Xe ({manifestPassengers.length})
          </button>
        </div>
      </div>

      {boardFeedback && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '10px',
            color: '#166534',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '20px',
          }}
        >
          {boardFeedback}
        </div>
      )}

      {/* TAB 1: SCAN QR & CODE */}
      {activeTab === 'scan' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 6px 0' }}>
              🛡️ Màn Hình Soát Vé Điện Tử Thông Minh
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Quét mã QR hoặc nhập mã vé để đối soát tính hợp lệ theo thời gian thực và ngăn ngừa gian lận vé trùng.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Cột Trái: Ô Quét & Nhập Mã */}
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              <form onSubmit={handleVerify}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', color: '#334155', marginBottom: '8px' }}>
                  Nhập mã vé hoặc Quét mã QR:
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Ví dụ: TKT-HCM-DL-01 hoặc TICKET-001"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '2px solid #cbd5e1',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputCode.trim()}
                    style={{
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      padding: '0 24px',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      cursor: loading || !inputCode.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    {loading ? 'Đang kiểm tra...' : 'Xác Thực'}
                  </button>
                </div>
              </form>

              {/* Nút bấm nhanh để Leader test demo */}
              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                  🧪 Tình Huống Kiểm Thử Demo Nhanh:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickTest('TKT-HCM-DL-01')}
                    style={{
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      border: '1px solid #bbf7d0',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    🟢 Tuyến HCM - Đà Lạt (TKT-HCM-DL-01)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickTest('TKT-PAST-01')}
                    style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    🟡 Vé Quá Khứ / Đã Đi (TKT-PAST-01)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickTest('INVALID-999')}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: '1px solid #fecaca',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    🔴 Vé Không Tồn Tại (INVALID-999)
                  </button>
                </div>
              </div>

              {/* Kết quả soát vé */}
              {result && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '20px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    backgroundColor:
                      result.result === 'VALID' ? '#f0fdf4' : result.result === 'ALREADY_USED' ? '#fffbeb' : '#fef2f2',
                    border: `2px solid ${
                      result.result === 'VALID' ? '#22c55e' : result.result === 'ALREADY_USED' ? '#f59e0b' : '#ef4444'
                    }`,
                  }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>
                    {result.result === 'VALID' ? '✅' : result.result === 'ALREADY_USED' ? '⚠️' : '❌'}
                  </div>
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      margin: '0 0 8px 0',
                      color:
                        result.result === 'VALID' ? '#166534' : result.result === 'ALREADY_USED' ? '#92400e' : '#991b1b',
                    }}
                  >
                    {result.result === 'VALID'
                      ? 'VÉ HỢP LỆ! CHO PHÉP LÊN XE'
                      : result.result === 'ALREADY_USED'
                      ? 'CẢNH BÁO: VÉ ĐÃ ĐƯỢC SOÁT TRƯỚC ĐÓ!'
                      : result.reason || 'VÉ KHÔNG HỢP LỆ'}
                  </h2>

                  <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>{result.message}</p>

                  {result.details && (
                    <div
                      style={{
                        backgroundColor: 'white',
                        padding: '14px',
                        borderRadius: '8px',
                        marginTop: '14px',
                        textAlign: 'left',
                        fontSize: '13px',
                        lineHeight: '1.8',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>👤 <b>Hành khách:</b> {result.details.customer}</div>
                      <div>🚌 <b>Tuyến:</b> {result.details.route}</div>
                      <div>💺 <b>Số ghế:</b> <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{result.details.seat}</span></div>
                      <div>🕒 <b>Giờ xuất phát:</b> {result.details.time}</div>

                      {result.valid && (
                        <button
                          onClick={() => handleBoardPassenger(result.details.ticket_id || result.ticket_code, result.details.customer)}
                          style={{
                            marginTop: '12px',
                            width: '100%',
                            backgroundColor: '#16a34a',
                            color: 'white',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: 'pointer',
                          }}
                        >
                          🚪 Xác Nhận Khách Đã Lên Xe (Check-in Onboard)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cột Phải: Lịch Sử Soát Vé Thời Gian Thực */}
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 14px 0' }}>
                📜 Nhật Ký Soát Vé Gần Đây ({recentLogs.length} lượt)
              </h3>

              <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
                {recentLogs.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                    Chưa có lượt soát vé nào được ghi nhận.
                  </p>
                ) : (
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                        <th style={{ padding: '8px 4px' }}>Mã Vé</th>
                        <th style={{ padding: '8px 4px' }}>Kết Quả</th>
                        <th style={{ padding: '8px 4px' }}>Thời Gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 4px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {log.ticket_code || `ID-${log.ticket_id}`}
                          </td>
                          <td style={{ padding: '10px 4px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor:
                                  log.result === 'VALID' ? '#dcfce7' : log.result === 'ALREADY_USED' ? '#fef3c7' : '#fee2e2',
                                color:
                                  log.result === 'VALID' ? '#166534' : log.result === 'ALREADY_USED' ? '#92400e' : '#991b1b',
                              }}
                            >
                              {log.result}
                            </span>
                          </td>
                          <td style={{ padding: '10px 4px', fontSize: '11px', color: '#64748b' }}>
                            {log.inspected_at?.split('T')[0] || log.inspected_at?.split(' ')[0] || 'Vừa xong'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PASSENGER MANIFEST */}
      {activeTab === 'manifest' && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          }}
        >
          {/* Manifest Controls */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                📋 Danh Sách Hành Khách Lên Xe (Passenger Manifest)
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                Hỗ trợ Tài Xế / Phụ Xe điểm danh và xác nhận khách bước lên xe
              </p>
            </div>

            {/* Trip selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Chọn Chuyến:</span>
              <select
                value={selectedTripId || ''}
                onChange={(e) => setSelectedTripId(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1e293b',
                  outline: 'none',
                }}
              >
                {driverTrips.map((t) => (
                  <option key={t.id} value={t.id}>
                    Chuyến #{t.id}: {t.origin} ➔ {t.destination} ({t.departure_time?.slice(11, 16) || '06:00'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Trip Summary Card */}
          {selectedTrip && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a8a' }}>
                  🚌 Tuyến: {selectedTrip.origin} ➔ {selectedTrip.destination}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  🕒 Giờ khởi hành: <b>{selectedTrip.departure_time?.slice(11, 16) || '06:00'}</b> | Biển số: <b>{selectedTrip.license_plate || '51B-888.99'}</b>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>
                    {manifestPassengers.length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Tổng khách đặt</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>
                    {boardedCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Đã lên xe</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ea580c' }}>
                    {manifestPassengers.length - boardedCount}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Chưa lên xe</div>
                </div>
              </div>
            </div>
          )}

          {/* Passenger Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Số Ghế</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Mã Vé</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Họ Và Tên</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Số Điện Thoại</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Trạng Thái Vé</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Thao Tác Điểm Danh</th>
                </tr>
              </thead>
              <tbody>
                {manifestPassengers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      Chưa có hành khách nào đặt vé trên chuyến này.
                    </td>
                  </tr>
                ) : (
                  manifestPassengers.map((p, idx) => {
                    const isBoarded = p.status === 'USED' || p.status === 'BOARDED' || p.boarded;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              fontWeight: 'bold',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontFamily: 'monospace',
                            }}
                          >
                            {p.seat_number || `A0${idx + 1}`}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {p.ticket_code || `TKT-${p.ticket_id || idx + 100}`}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: '600', color: '#1e293b' }}>
                          {p.customer_name || p.passenger_name || 'Khách hàng'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>
                          {p.customer_phone || p.passenger_phone || '090*******'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 'bold',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: isBoarded ? '#dcfce7' : '#fef3c7',
                              color: isBoarded ? '#166534' : '#92400e',
                            }}
                          >
                            {isBoarded ? '✅ Đã Lên Xe' : '⏳ Chờ Lên Xe (Đã Trả Tiền)'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {isBoarded ? (
                            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>
                              ✓ Đã check-in
                            </span>
                          ) : (
                            <button
                              onClick={() => handleBoardPassenger(p.ticket_code || p.ticket_id, p.customer_name || p.passenger_name)}
                              style={{
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                              }}
                            >
                              🚪 Cho Lên Xe
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketVerification;