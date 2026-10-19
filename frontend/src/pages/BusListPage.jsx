import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getCurrentUser,
  getTrips,
  getTripSeats,
  holdSeats,
  getDriverTrips,
  confirmDriverTrip,
} from '../api';

const getDestinationImage = (destination) => {
  const d = (destination || '').toLowerCase();
  if (d.includes('lạt') || d.includes('dalat')) {
    return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&auto=format&fit=crop&q=80';
  }
  if (d.includes('thái nguyên')) {
    return 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=400&auto=format&fit=crop&q=80';
  }
  if (d.includes('huế')) {
    return 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=400&auto=format&fit=crop&q=80';
  }
  if (d.includes('hải phòng')) {
    return 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400&auto=format&fit=crop&q=80';
  }
  if (d.includes('đà nẵng')) {
    return 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&auto=format&fit=crop&q=80';
};

function BusListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentUser = getCurrentUser();
  const isDriver = currentUser && (currentUser.role === 'TaiXe' || currentUser.role === 'DRIVER');
  const isConductor = currentUser && (currentUser.role === 'PhuXe' || currentUser.role === 'CONDUCTOR' || currentUser.role === 'STAFF');

  const originParam = searchParams.get('origin') || '';
  const destinationParam = searchParams.get('destination') || '';
  const dateParam = searchParams.get('date') || '';

  // Customer & View-Only Trips state
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTripId, setActiveTripId] = useState(null);
  const [seatMap, setSeatMap] = useState({ seats: [], total_seats: 0, available_seats: 0 });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [holding, setHolding] = useState(false);

  // Filters
  const [busTypeFilter, setBusTypeFilter] = useState('ALL');
  const [priceSort, setPriceSort] = useState('ASC');

  // Driver-specific state
  const [assignedTrips, setAssignedTrips] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [confirmingTripId, setConfirmingTripId] = useState(null);
  const [driverFeedback, setDriverFeedback] = useState({ text: '', type: 'success' });
  const [driverTab, setDriverTab] = useState('assigned'); // 'assigned' | 'view-all'
  const [expandedPassengerTripId, setExpandedPassengerTripId] = useState(null);

  useEffect(() => {
    setLoading(true);
    const searchParamsObj = {};
    if (originParam) searchParamsObj.origin = originParam;
    if (destinationParam) searchParamsObj.destination = destinationParam;
    if (dateParam) searchParamsObj.date = dateParam;

    getTrips(searchParamsObj)
      .then((data) => {
        setTrips(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách chuyến:', err);
        setTrips([]);
      })
      .finally(() => setLoading(false));

    if (isDriver) {
      loadDriverAssignedTrips();
    }
  }, [originParam, destinationParam, dateParam, isDriver]);

  const loadDriverAssignedTrips = async () => {
    setLoadingAssigned(true);
    try {
      const data = await getDriverTrips(currentUser?.id);
      const list = Array.isArray(data) ? data : (data?.trips || []);
      setAssignedTrips(list);
    } catch (err) {
      console.warn('Lỗi tải chuyến được phân công:', err);
      setAssignedTrips([]);
    } finally {
      setLoadingAssigned(false);
    }
  };

  const showDriverToast = (text, type = 'success') => {
    setDriverFeedback({ text, type });
    setTimeout(() => setDriverFeedback({ text: '', type: 'success' }), 5000);
  };

  const handleDriverConfirm = async (tripId, targetStatus) => {
    setConfirmingTripId(tripId);
    try {
      const res = await confirmDriverTrip(tripId, currentUser?.id, targetStatus);
      showDriverToast(res?.message || `Đã cập nhật trạng thái chuyến xe thành "${targetStatus}"!`);
      loadDriverAssignedTrips();
    } catch (err) {
      showDriverToast(err.message || 'Lỗi khi cập nhật trạng thái phân công', 'error');
    } finally {
      setConfirmingTripId(null);
    }
  };

  const toggleTripSeats = async (tripId) => {
    if (activeTripId === tripId) {
      setActiveTripId(null);
      setSelectedSeats([]);
      return;
    }

    setActiveTripId(tripId);
    setSelectedSeats([]);
    setLoadingSeats(true);
    try {
      const data = await getTripSeats(tripId);
      let seats = data?.seats || [];
      const hasUpper = seats.some((s) => s.seat_number.startsWith('B'));

      if (!hasUpper) {
        const lowerCount = seats.filter((s) => s.seat_number.startsWith('A')).length || 18;
        const upperCount = Math.max(lowerCount, 18);
        const synthB = [];
        for (let i = 1; i <= upperCount; i++) {
          synthB.push({
            id: 1000 + i,
            seat_number: `B${String(i).padStart(2, '0')}`,
            deck_or_row: 'TangTren',
            status: 'AVAILABLE',
          });
        }
        seats = [...seats, ...synthB];
      }

      setSeatMap({ ...data, seats });
    } catch (err) {
      console.warn('Lỗi tải sơ đồ ghế:', err);
      const fallbackSeats = [];
      for (let i = 1; i <= 18; i++) {
        fallbackSeats.push({
          id: i,
          seat_number: `A${String(i).padStart(2, '0')}`,
          deck_or_row: 'TangDuoi',
          status: i === 2 ? 'BOOKED' : 'AVAILABLE',
        });
      }
      for (let i = 1; i <= 18; i++) {
        fallbackSeats.push({
          id: i + 18,
          seat_number: `B${String(i).padStart(2, '0')}`,
          deck_or_row: 'TangTren',
          status: 'AVAILABLE',
        });
      }
      setSeatMap({ trip_id: tripId, total_seats: 36, available_seats: 35, seats: fallbackSeats });
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (isDriver || isConductor) {
      alert(`Tài khoản nhân sự vận hành (${isDriver ? 'Tài xế' : 'Phụ xe'}) không được phép chọn ghế mua vé.`);
      return;
    }
    if (seat.status !== 'AVAILABLE') return;

    const exists = selectedSeats.find((s) => s.id === seat.id);
    if (exists) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const handleContinuePayment = async (trip) => {
    if (isDriver || isConductor) {
      alert('Tài khoản Tài xế và Phụ xe không được phép thực hiện chức năng đặt vé.');
      return;
    }
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất 1 vị trí ghế trước khi thanh toán!');
      return;
    }

    const user = getCurrentUser() || { id: 1, full_name: 'Khách hàng Demo', phone: '0901234567' };
    const seatIds = selectedSeats.map((s) => s.id);

    setHolding(true);
    try {
      const holdRes = await holdSeats(trip.id, seatIds, user.id);

      navigate('/payment', {
        state: {
          trip,
          selectedSeats: selectedSeats.map((s) => s.seat_number),
          selectedSeatIds: seatIds,
          heldUntil: holdRes.held_until,
          unitPrice: trip.price,
          totalAmount: trip.price * selectedSeats.length,
          user,
        },
      });
    } catch (err) {
      alert(`Không thể giữ ghế: ${err.message}`);
      getTripSeats(trip.id).then(setSeatMap);
    } finally {
      setHolding(false);
    }
  };

  // =========================================================================
  // GIAO DIỆN PHÂN QUYỀN DÀNH CHO PHỤ XE (CHỈ RÀ SOÁT VÉ XE)
  // =========================================================================
  if (isConductor) {
    return (
      <div style={{ maxWidth: '820px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            padding: '48px 36px',
            border: '1px solid #e9d5ff',
            boxShadow: '0 20px 40px rgba(168, 85, 247, 0.08)',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎫</div>
          <span
            style={{
              backgroundColor: '#f3e8ff',
              color: '#6b21a8',
              padding: '6px 18px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '0.5px',
            }}
          >
            RBAC: PHỤ XE (TIẾP VIÊN XE)
          </span>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: '20px 0 10px 0' }}>
            Nghiệp Vụ Dành Cho Phụ Xe: Rà Soát Vé & Kiểm Tra Lên Xe
          </h2>
          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, maxWidth: '560px', margin: '0 auto 28px auto' }}>
            Chào bạn <b>{currentUser?.full_name || 'Phụ Xe'}</b>. Theo quy trình nghiệp vụ hệ thống SmartBus,
            phụ xe chỉ có nhiệm vụ <b>rà soát vé xe, kiểm tra QR code và đối soát danh sách hành khách</b> lên xe.
            Phụ xe không có chức năng đặt vé hay giữ chỗ hành khách.
          </p>
          <button
            onClick={() => navigate('/verify-ticket')}
            style={{
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              padding: '14px 30px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span>📱</span> Đến Ngay Trang Soát Vé & Khách Lên Xe ➔
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // GIAO DIỆN PHÂN QUYỀN DÀNH CHO TÀI XẾ (NHẬN CHUYẾN ĐƯỢC GÁN & XÁC NHẬN LÁI)
  // =========================================================================
  if (isDriver) {
    const acceptedCount = assignedTrips.filter((t) => t.driver_status === 'ACCEPTED').length;
    const pendingCount = assignedTrips.filter((t) => t.driver_status === 'ASSIGNED' || !t.driver_status).length;
    const departedCount = assignedTrips.filter((t) => t.driver_status === 'DEPARTED').length;

    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Banner tiêu đề Tài xế */}
        <div
          style={{
            backgroundColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            background: '#0f172a',
            color: 'white',
            borderRadius: '20px',
            padding: '28px 32px',
            marginBottom: '24px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#0f172a',
                  padding: '3px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '800',
                }}
              >
                ROLE: TÀI XẾ (DRIVER)
              </span>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                Hệ thống điều phối xe trực tuyến
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0 }}>
              🚌 Lịch Phân Công Lái Xe & Xác Nhận Chuyến
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: '14px', margin: '6px 0 0 0' }}>
              Tài xế: <b>{currentUser?.full_name || 'Trần Văn Tài'}</b> (Mã NV: #{currentUser?.id || 11}) •
              Nhận chuyến xe được Ban Quản Trị gán và xác nhận nhận lái xe.
            </p>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 18px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Tổng chuyến gán</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#38bdf8' }}>{assignedTrips.length}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 18px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Đã xác nhận lái</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#4ade80' }}>{acceptedCount}</div>
            </div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 18px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Chờ xác nhận</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#fbbf24' }}>{pendingCount}</div>
            </div>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {driverFeedback.text && (
          <div
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: driverFeedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: driverFeedback.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${driverFeedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
            }}
          >
            <span>{driverFeedback.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{driverFeedback.text}</span>
          </div>
        )}

        {/* Driver Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
          <button
            onClick={() => setDriverTab('assigned')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: driverTab === 'assigned' ? '#0284c7' : '#f1f5f9',
              color: driverTab === 'assigned' ? 'white' : '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🚌</span> Chuyến Xe Được Gán Cho Tôi ({assignedTrips.length})
          </button>
          <button
            onClick={() => setDriverTab('view-all')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: driverTab === 'view-all' ? '#0284c7' : '#f1f5f9',
              color: driverTab === 'view-all' ? 'white' : '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>👁️</span> Lịch Trình Toàn Tuyến (Chỉ Xem)
          </button>
        </div>

        {/* TAB 1: DANH SÁCH CHUYẾN XE ĐƯỢC PHÂN CÔNG & XÁC NHẬN LÁI */}
        {driverTab === 'assigned' && (
          <div>
            {loadingAssigned ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Đang tải danh sách phân công chuyến xe...
              </div>
            ) : assignedTrips.length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>Hiện chưa có chuyến xe nào được gán cho bạn</h3>
                <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '440px', margin: '8px auto 0 auto' }}>
                  Ban Quản Trị sẽ điều phối và phân công tài xế trong phần Quản lý chuyến xe. Khi có chuyến mới, thông tin sẽ hiển thị tại đây để bạn xác nhận.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {assignedTrips.map((trip) => {
                  const dStatus = trip.driver_status || 'ASSIGNED';
                  const isAccepted = dStatus === 'ACCEPTED';
                  const isDeparted = dStatus === 'DEPARTED';
                  const isCompleted = dStatus === 'COMPLETED';
                  const isPending = dStatus === 'ASSIGNED';

                  let badgeBg = '#fef3c7';
                  let badgeCol = '#92400e';
                  let badgeText = '🟡 Chờ bạn xác nhận nhận lái';
                  if (isAccepted) {
                    badgeBg = '#dcfce7';
                    badgeCol = '#166534';
                    badgeText = '🟢 Bạn đã xác nhận lái • Sẵn sàng khởi hành';
                  } else if (isDeparted) {
                    badgeBg = '#e0f2fe';
                    badgeCol = '#0369a1';
                    badgeText = '🚀 Chuyến xe đang di chuyển trên đường';
                  } else if (isCompleted) {
                    badgeBg = '#f1f5f9';
                    badgeCol = '#475569';
                    badgeText = '🏁 Đã hoàn thành chuyến';
                  }

                  const isExpanded = expandedPassengerTripId === trip.id;

                  return (
                    <div
                      key={trip.id}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                        padding: '24px 28px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: '#f1f5f9', color: '#334155', padding: '3px 10px', borderRadius: '8px' }}>
                              #{trip.trip_code || trip.id}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: '800', backgroundColor: badgeBg, color: badgeCol, padding: '3px 12px', borderRadius: '20px' }}>
                              {badgeText}
                            </span>
                          </div>
                          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
                            {trip.origin} ➔ {trip.destination}
                          </h2>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            Tuyến: <b>{trip.route_name || `${trip.origin} - ${trip.destination}`}</b>
                          </div>
                        </div>

                        {/* Thông tin phương tiện & Phụ xe */}
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <div style={{ backgroundColor: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>BIỂN SỐ XE</div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{trip.license_plate || '29B-123.45'}</div>
                          </div>
                          <div style={{ backgroundColor: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>PHỤ XE PHỤ TRÁCH</div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#7c3aed' }}>{trip.staff_name || 'Chưa gán phụ xe'}</div>
                          </div>
                          <div style={{ backgroundColor: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>KHÁCH ĐÃ ĐẶT</div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>
                              {trip.total_passengers ?? trip.passengers?.length ?? 0} khách
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Thời gian xuất bến */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '24px',
                          padding: '14px 18px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '12px',
                          marginBottom: '20px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Giờ xuất bến: </span>
                          <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                            ⏰ {trip.departure_at?.slice(0, 16) || 'Hôm nay'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Dự kiến đến: </span>
                          <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                            🏁 {trip.arrival_at?.slice(0, 16) || 'Trong ngày'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Dòng xe: </span>
                          <strong style={{ fontSize: '14px', color: '#334155' }}>
                            {trip.bus_type || 'Giường nằm 36 chỗ'}
                          </strong>
                        </div>
                      </div>

                      {/* Các nút nghiệp vụ dành riêng cho Tài Xế */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {/* Nút 1: Xác nhận nhận lái chuyến */}
                          {isPending && (
                            <button
                              disabled={confirmingTripId === trip.id}
                              onClick={() => handleDriverConfirm(trip.id, 'ACCEPTED')}
                              style={{
                                backgroundColor: '#16a34a',
                                color: 'white',
                                border: 'none',
                                padding: '11px 22px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>✅</span> {confirmingTripId === trip.id ? 'Đang lưu...' : 'Xác Nhận Nhận Lái Chuyến Này'}
                            </button>
                          )}

                          {/* Nút 2: Bắt đầu khởi hành */}
                          {isAccepted && (
                            <button
                              disabled={confirmingTripId === trip.id}
                              onClick={() => handleDriverConfirm(trip.id, 'DEPARTED')}
                              style={{
                                backgroundColor: '#0284c7',
                                color: 'white',
                                border: 'none',
                                padding: '11px 22px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>🚀</span> {confirmingTripId === trip.id ? 'Đang lưu...' : 'Bắt Đầu Khởi Hành (Xuất Bến)'}
                            </button>
                          )}

                          {/* Nút 3: Hoàn thành chuyến */}
                          {isDeparted && (
                            <button
                              disabled={confirmingTripId === trip.id}
                              onClick={() => handleDriverConfirm(trip.id, 'COMPLETED')}
                              style={{
                                backgroundColor: '#475569',
                                color: 'white',
                                border: 'none',
                                padding: '11px 22px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>🏁</span> {confirmingTripId === trip.id ? 'Đang lưu...' : 'Xác Nhận Đến Bến / Hoàn Thành'}
                            </button>
                          )}
                        </div>

                        {/* Nút xem danh sách hành khách */}
                        <button
                          onClick={() => setExpandedPassengerTripId(isExpanded ? null : trip.id)}
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#1e293b',
                            border: '1px solid #cbd5e1',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>👥</span> {isExpanded ? 'Đóng Danh Sách Khách' : `Danh Sách Khách (${trip.passengers?.length || 0})`}
                        </button>
                      </div>

                      {/* Danh sách hành khách mở rộng */}
                      {isExpanded && (
                        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
                            📋 Danh Sách Khách Hàng Trên Chuyến Xe #{trip.trip_code}
                          </h4>
                          {trip.passengers && trip.passengers.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Vị Trí Ghế</th>
                                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Họ Tên Khách</th>
                                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Số Điện Thoại</th>
                                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Mã Vé</th>
                                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>Trạng Thái Soát Vé</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {trip.passengers.map((p, idx) => (
                                    <tr key={p.ticket_id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '8px 12px', fontWeight: '800', color: '#2563eb' }}>{p.seat_number}</td>
                                      <td style={{ padding: '8px 12px', fontWeight: '600' }}>{p.passenger_name}</td>
                                      <td style={{ padding: '8px 12px', color: '#64748b' }}>{p.phone}</td>
                                      <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{p.ticket_code}</td>
                                      <td style={{ padding: '8px 12px' }}>
                                        {p.boarded ? (
                                          <span style={{ color: '#16a34a', fontWeight: '700' }}>✅ Đã lên xe</span>
                                        ) : (
                                          <span style={{ color: '#d97706', fontWeight: '600' }}>⏳ Chờ soát vé</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', padding: '10px 0' }}>
                              Chưa có hành khách nào đặt vé trên chuyến này.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LỊCH TRÌNH TOÀN TUYẾN (CHẾ ĐỘ CHỈ XEM CHO TÀI XẾ) */}
        {driverTab === 'view-all' && (
          <div>
            <div
              style={{
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '14px 20px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              ℹ️ <b>Chế độ tra cứu chỉ xem:</b> Bạn đang ở chế độ xem lịch trình toàn mạng lưới.
              Tài khoản Tài xế không có quyền đặt vé mua chỗ.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {trips.map((trip) => {
                const isOpen = activeTripId === trip.id;
                const lowerSeats = seatMap.seats.filter((s) => s.deck_or_row === 'TangDuoi' || s.seat_number.startsWith('A'));
                const upperSeats = seatMap.seats.filter((s) => s.deck_or_row === 'TangTren' || s.seat_number.startsWith('B'));

                return (
                  <div key={trip.id} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0' }}>
                          {trip.origin} ➔ {trip.destination}
                        </h3>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          Xuất bến: <b>{trip.departureTime || trip.departure_at}</b> • Dòng xe: {trip.busType}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleTripSeats(trip.id)}
                        style={{
                          backgroundColor: isOpen ? '#e2e8f0' : '#f1f5f9',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          padding: '9px 16px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        {isOpen ? 'Đóng Sơ Đồ' : '👁️ Xem Sơ Đồ Chỗ Ngồi (Tham Khảo)'}
                      </button>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                          Trạng thái: Trắng = Trống, Xám = Đã đặt, Vàng = Đang giữ
                        </div>
                        {loadingSeats ? (
                          <div style={{ color: '#64748b', fontSize: '13px' }}>Đang tải sơ đồ...</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                              <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px', textAlign: 'center' }}>Tầng Dưới (Dãy A)</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {lowerSeats.map((seat) => (
                                  <div
                                    key={seat.id}
                                    style={{
                                      backgroundColor: seat.status === 'AVAILABLE' ? 'white' : '#e2e8f0',
                                      color: seat.status === 'AVAILABLE' ? '#0f172a' : '#94a3b8',
                                      border: '1px solid #cbd5e1',
                                      padding: '8px 4px',
                                      textAlign: 'center',
                                      borderRadius: '6px',
                                      fontWeight: '700',
                                      fontSize: '12px',
                                    }}
                                  >
                                    {seat.seat_number}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                              <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px', textAlign: 'center' }}>Tầng Trên (Dãy B)</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {upperSeats.map((seat) => (
                                  <div
                                    key={seat.id}
                                    style={{
                                      backgroundColor: seat.status === 'AVAILABLE' ? 'white' : '#e2e8f0',
                                      color: seat.status === 'AVAILABLE' ? '#0f172a' : '#94a3b8',
                                      border: '1px solid #cbd5e1',
                                      padding: '8px 4px',
                                      textAlign: 'center',
                                      borderRadius: '6px',
                                      fontWeight: '700',
                                      fontSize: '12px',
                                    }}
                                  >
                                    {seat.seat_number}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // GIAO DIỆN HÀNH KHÁCH (ĐẶT VÉ, CHỌN GHẾ 2 TẦNG & THANH TOÁN)
  // =========================================================================
  const filteredTrips = trips
    .filter((t) => (busTypeFilter === 'ALL' ? true : t.busType.includes(busTypeFilter)))
    .sort((a, b) => (priceSort === 'ASC' ? a.price - b.price : b.price - a.price));

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header Info Banner */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px 28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '12px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '20px' }}>
              CHUYẾN XE MỞ BÁN
            </span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Cập nhật thời gian thực
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            {originParam && destinationParam ? `Lịch Trình: ${originParam} ➔ ${destinationParam}` : 'Tất Cả Các Chuyến Xe Đang Khởi Hành'}
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
            Tìm thấy <b>{filteredTrips.length}</b> chuyến xe phù hợp • Sắp xếp và chọn ghế trực quan 2 tầng
          </p>
        </div>

        <button
          onClick={() => navigate('/map')}
          style={{
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            fontWeight: '700',
            padding: '10px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
        >
          <span>🗺️</span> Xem Tuyến Trên Bản Đồ
        </button>
      </div>

      {/* Grid: Filters (270px) + Trip List (1fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Bộ lọc bên trái */}
        <aside
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 18px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            🔍 Bộ Lọc Tìm Kiếm
          </h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
              Loại Xe:
            </label>
            <select
              value={busTypeFilter}
              onChange={(e) => setBusTypeFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e293b',
                outline: 'none',
                backgroundColor: '#f8fafc',
              }}
            >
              <option value="ALL">Tất cả các dòng xe</option>
              <option value="Limousine">Limousine VIP 22 phòng</option>
              <option value="Giường nằm">Giường nằm 36 chỗ</option>
              <option value="Ghế ngồi">Ghế ngồi cao cấp</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
              Sắp Xếp Giá Vé:
            </label>
            <select
              value={priceSort}
              onChange={(e) => setPriceSort(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e293b',
                outline: 'none',
                backgroundColor: '#f8fafc',
              }}
            >
              <option value="ASC">Giá vé: Thấp đến cao</option>
              <option value="DESC">Giá vé: Cao đến thấp</option>
            </select>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5', marginBottom: '12px' }}>
              ⚡ Giữ chỗ an toàn 10 phút, thanh toán tức thì với mã QR động
            </div>
          </div>
        </aside>

        {/* Danh sách chuyến xe */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🚌</div>
              <p style={{ fontWeight: '600' }}>Đang tải danh sách chuyến xe...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center',
                border: '1px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                Không tìm thấy chuyến xe phù hợp
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '380px', margin: '8px auto 0 auto' }}>
                Vui lòng thử điều chỉnh lại bộ lọc hoặc tìm kiếm các tuyến đường khác như: Hà Nội ➔ Thái Nguyên hoặc Hồ Chí Minh ➔ Đà Lạt.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredTrips.map((trip) => {
                const isOpen = activeTripId === trip.id;
                const lowerSeats = seatMap.seats.filter((s) => s.deck_or_row === 'TangDuoi' || s.seat_number.startsWith('A'));
                const upperSeats = seatMap.seats.filter((s) => s.deck_or_row === 'TangTren' || s.seat_number.startsWith('B'));

                return (
                  <div
                    key={trip.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                  >
                    {/* Card Header & Thông tin chuyến */}
                    <div style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          width: '120px',
                          height: '90px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          backgroundColor: '#f1f5f9',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={getDestinationImage(trip.destination)}
                          alt={trip.destination}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '4px',
                            left: '4px',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {trip.destination}
                        </span>
                      </div>

                      {/* Thông tin giờ và tuyến */}
                      <div style={{ flex: '1', minWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                            {trip.busType}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Biển số: {trip.licensePlate}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{trip.departureTime}</div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>{trip.origin}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{trip.duration}</span>
                            <span style={{ color: '#cbd5e1', fontSize: '16px', lineHeight: '10px' }}>➔</span>
                          </div>
                          <div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{trip.arrivalTime}</div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>{trip.destination}</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                          <span>🟢</span> Còn {trip.availableSeats} vị trí ghế trống
                        </div>
                      </div>

                      {/* Giá tiền và Nút chọn chỗ */}
                      <div style={{ textAlign: 'right', minWidth: '160px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Giá vé niêm yết</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#dc2626', marginBottom: '10px' }}>
                          {trip.price.toLocaleString('vi-VN')} VNĐ
                        </div>
                        <button
                          onClick={() => toggleTripSeats(trip.id)}
                          style={{
                            backgroundColor: isOpen ? '#334155' : '#0284c7',
                            color: 'white',
                            border: 'none',
                            fontWeight: '700',
                            padding: '10px 18px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: isOpen ? 'none' : '0 4px 12px rgba(2, 132, 199, 0.25)',
                            transition: 'all 0.15s',
                          }}
                        >
                          <span>{isOpen ? 'Đóng sơ đồ ghế ▲' : 'Chọn vị trí ghế ▼'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Sơ đồ ghế 2 tầng khi mở ra */}
                    {isOpen && (
                      <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                            💺 Sơ Đồ Chỗ Ngồi Chuyến: {trip.origin} ➔ {trip.destination}
                          </h4>

                          {/* Chú thích màu sắc */}
                          <div style={{ display: 'flex', gap: '14px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '14px', height: '14px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '3px' }}></span>
                              Còn trống
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '14px', height: '14px', backgroundColor: '#2563eb', borderRadius: '3px' }}></span>
                              Đang chọn
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '14px', height: '14px', backgroundColor: '#f59e0b', borderRadius: '3px' }}></span>
                              Đang giữ chỗ (10p)
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '14px', height: '14px', backgroundColor: '#cbd5e1', borderRadius: '3px' }}></span>
                              Đã đặt
                            </span>
                          </div>
                        </div>

                        {loadingSeats ? (
                          <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
                            Đang tải sơ đồ ghế thời gian thực...
                          </div>
                        ) : (
                          <div>
                            {/* Layout 2 Tầng Ghế */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                              {/* Tầng Dưới */}
                              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                                <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', marginBottom: '14px', textAlign: 'center' }}>
                                  👇 Tầng Dưới (Dãy A)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                  {lowerSeats.map((seat) => {
                                    const isSelected = selectedSeats.some((s) => s.id === seat.id);
                                    let bg = 'white';
                                    let textCol = '#0f172a';
                                    let borderCol = '#cbd5e1';

                                    if (isSelected) {
                                      bg = '#2563eb';
                                      textCol = 'white';
                                      borderCol = '#1d4ed8';
                                    } else if (seat.status === 'HELD') {
                                      bg = '#fef3c7';
                                      textCol = '#92400e';
                                      borderCol = '#f59e0b';
                                    } else if (seat.status === 'BOOKED') {
                                      bg = '#e2e8f0';
                                      textCol = '#94a3b8';
                                      borderCol = '#cbd5e1';
                                    }

                                    return (
                                      <button
                                        key={seat.id}
                                        disabled={seat.status !== 'AVAILABLE'}
                                        onClick={() => handleSeatClick(seat)}
                                        style={{
                                          backgroundColor: bg,
                                          color: textCol,
                                          border: `1.5px solid ${borderCol}`,
                                          borderRadius: '8px',
                                          padding: '12px 6px',
                                          fontWeight: '800',
                                          fontSize: '13px',
                                          cursor: seat.status === 'AVAILABLE' ? 'pointer' : 'not-allowed',
                                          transition: 'all 0.15s',
                                        }}
                                      >
                                        {seat.seat_number}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Tầng Trên */}
                              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                                <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', marginBottom: '14px', textAlign: 'center' }}>
                                  ☝️ Tầng Trên (Dãy B)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                  {upperSeats.map((seat) => {
                                    const isSelected = selectedSeats.some((s) => s.id === seat.id);
                                    let bg = 'white';
                                    let textCol = '#0f172a';
                                    let borderCol = '#cbd5e1';

                                    if (isSelected) {
                                      bg = '#2563eb';
                                      textCol = 'white';
                                      borderCol = '#1d4ed8';
                                    } else if (seat.status === 'HELD') {
                                      bg = '#fef3c7';
                                      textCol = '#92400e';
                                      borderCol = '#f59e0b';
                                    } else if (seat.status === 'BOOKED') {
                                      bg = '#e2e8f0';
                                      textCol = '#94a3b8';
                                      borderCol = '#cbd5e1';
                                    }

                                    return (
                                      <button
                                        key={seat.id}
                                        disabled={seat.status !== 'AVAILABLE'}
                                        onClick={() => handleSeatClick(seat)}
                                        style={{
                                          backgroundColor: bg,
                                          color: textCol,
                                          border: `1.5px solid ${borderCol}`,
                                          borderRadius: '8px',
                                          padding: '12px 6px',
                                          fontWeight: '800',
                                          fontSize: '13px',
                                          cursor: seat.status === 'AVAILABLE' ? 'pointer' : 'not-allowed',
                                          transition: 'all 0.15s',
                                        }}
                                      >
                                        {seat.seat_number}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Summary Bar */}
                            <div
                              style={{
                                backgroundColor: 'white',
                                padding: '18px 24px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '16px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>Vị trí ghế đã chọn:</div>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>
                                  {selectedSeats.length > 0
                                    ? selectedSeats.map((s) => s.seat_number).join(', ')
                                    : 'Chưa chọn ghế'}
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>Tổng tiền tạm tính:</div>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#dc2626' }}>
                                  {(trip.price * selectedSeats.length).toLocaleString('vi-VN')} VNĐ
                                </div>
                              </div>

                              <button
                                disabled={selectedSeats.length === 0 || holding}
                                onClick={() => handleContinuePayment(trip)}
                                style={{
                                  backgroundColor: selectedSeats.length > 0 ? '#16a34a' : '#94a3b8',
                                  color: 'white',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  fontWeight: '800',
                                  padding: '13px 26px',
                                  borderRadius: '10px',
                                  fontSize: '15px',
                                  cursor: selectedSeats.length > 0 && !holding ? 'pointer' : 'not-allowed',
                                  boxShadow: selectedSeats.length > 0 ? '0 4px 14px rgba(22,163,74,0.3)' : 'none',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {holding ? 'Đang tạm giữ ghế...' : 'Tiếp Tục Thanh Toán ➔'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BusListPage;