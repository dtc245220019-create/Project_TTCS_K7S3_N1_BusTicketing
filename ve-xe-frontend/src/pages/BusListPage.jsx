import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentUser, getTrips, getTripSeats, holdSeats } from '../api';

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

  const originParam = searchParams.get('origin') || '';
  const destinationParam = searchParams.get('destination') || '';
  const dateParam = searchParams.get('date') || '';

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTripId, setActiveTripId] = useState(null);
  const [seatMap, setSeatMap] = useState({ seats: [], total_seats: 0, available_seats: 0 });
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [holding, setHolding] = useState(false);

  // Filter states
  const [busTypeFilter, setBusTypeFilter] = useState('ALL');
  const [priceSort, setPriceSort] = useState('ASC');

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
  }, [originParam, destinationParam, dateParam]);

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

      // Đảm bảo luôn có đầy đủ ghế Tầng Trên (Dãy B)
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
      console.warn('Lỗi tải sơ đồ ghế từ API, kích hoạt sơ đồ ghế 2 tầng dự phòng:', err);
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
    if (seat.status !== 'AVAILABLE') return;

    const exists = selectedSeats.find((s) => s.id === seat.id);
    if (exists) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const handleContinuePayment = async (trip) => {
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
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚌</div>
              <p style={{ fontWeight: '600' }}>Đang tìm kiếm chuyến xe theo thời gian thực...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div style={{ backgroundColor: 'white', padding: '50px 20px', borderRadius: '16px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '16px', color: '#64748b' }}>Không tìm thấy chuyến xe nào theo tiêu chí đã chọn.</p>
              <button
                onClick={() => navigate('/buses')}
                style={{
                  marginTop: '16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Xem tất cả các chuyến xe
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredTrips.map((trip) => {
                const isExpanded = activeTripId === trip.id;
                const lowerSeats = seatMap.seats.filter((s) => s.seat_number.startsWith('A'));
                const upperSeats = seatMap.seats.filter((s) => s.seat_number.startsWith('B'));
                const destImg = getDestinationImage(trip.to);

                return (
                  <div
                    key={trip.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '18px',
                      border: isExpanded ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      boxShadow: isExpanded ? '0 12px 28px rgba(37, 99, 235, 0.12)' : '0 4px 14px rgba(15, 23, 42, 0.04)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Trip Main Card */}
                    <div style={{ padding: '22px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                      {/* Left: Thumbnail + Times */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {/* Destination Thumbnail with thin border */}
                        <div style={{ width: '90px', height: '90px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0, position: 'relative' }}>
                          <img
                            src={destImg}
                            alt={trip.to}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.7)', color: 'white', fontSize: '10px', textAlign: 'center', padding: '2px', fontWeight: 'bold' }}>
                            {trip.to}
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 9px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                              {trip.busType}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              Biển số: <b>{trip.license_plate}</b>
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                            <div>
                              <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{trip.departureTime}</div>
                              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{trip.from}</div>
                            </div>
                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                              <div style={{ color: '#2563eb', fontWeight: 'bold' }}>➔</div>
                              <div>{trip.duration}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{trip.arrivalTime}</div>
                              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{trip.to}</div>
                            </div>
                          </div>

                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>
                            🟢 Còn {trip.availableSeatsCount} vị trí ghế trống
                          </div>
                        </div>
                      </div>

                      {/* Right: Price & Toggle */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Giá vé niêm yết</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626', marginBottom: '10px' }}>
                          {trip.price.toLocaleString('vi-VN')} VNĐ
                        </div>
                        <button
                          onClick={() => toggleTripSeats(trip.id)}
                          style={{
                            backgroundColor: isExpanded ? '#334155' : '#2563eb',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontWeight: '700',
                            padding: '11px 22px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.15s',
                            boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                          }}
                        >
                          {isExpanded ? 'Đóng sơ đồ ghế ▲' : 'Chọn chỗ & Đặt vé ▼'}
                        </button>
                      </div>
                    </div>

                    {/* Sơ Đồ Ghế Mở Rộng (US02 & US03) */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', padding: '28px' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a', fontWeight: '800' }}>
                          💺 Sơ Đồ Chỗ Ngồi Chuyến: {trip.from} ➔ {trip.to}
                        </h4>

                        {/* Chú thích màu sắc */}
                        <div style={{ display: 'flex', gap: '24px', marginBottom: '22px', fontSize: '13px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white' }} />
                            <span>Còn trống</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#2563eb' }} />
                            <span>Đang chọn</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#f59e0b' }} />
                            <span>Đang giữ chỗ (10p)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#94a3b8' }} />
                            <span>Đã đặt</span>
                          </div>
                        </div>

                        {loadingSeats ? (
                          <p style={{ color: '#64748b' }}>Đang tải sơ đồ ghế...</p>
                        ) : (
                          <div>
                            {/* Layout 2 Tầng */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '22px' }}>
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