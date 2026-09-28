import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentUser, getTrips, getTripSeats, holdSeats } from '../api';

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
    getTrips({ origin: originParam, destination: destinationParam, date: dateParam })
      .then((data) => {
        if (data.length === 0) {
          // Fallback load all available trips if specific query has 0 results
          return getTrips();
        }
        return data;
      })
      .then((data) => setTrips(data))
      .catch((err) => {
        console.error('Lỗi tải danh sách chuyến:', err);
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
      setSeatMap(data);
    } catch (err) {
      console.error('Lỗi tải sơ đồ ghế:', err);
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
      // Refresh seat map
      getTripSeats(trip.id).then(setSeatMap);
    } finally {
      setHolding(false);
    }
  };

  // Filter & sort
  const filteredTrips = trips
    .filter((t) => (busTypeFilter === 'ALL' ? true : t.busType.includes(busTypeFilter)))
    .sort((a, b) => (priceSort === 'ASC' ? a.price - b.price : b.price - a.price));

  return (
    <div className="bus-page-wrapper" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Header Info */}
      <div className="page-header-info" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 6px 0' }}>
          {originParam && destinationParam ? `Chuyến xe: ${originParam} ➔ ${destinationParam}` : 'Tất cả các chuyến xe đang mở bán'}
        </h2>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
          Tìm thấy <b>{filteredTrips.length}</b> chuyến xe phù hợp • Sắp xếp và chọn ghế trực quan
        </p>
      </div>

      {/* Grid: Filters (280px) + List (1fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Bộ lọc bên trái */}
        <aside
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 16px 0' }}>
            🔍 Bộ Lọc Tìm Kiếm
          </h3>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>
              Loại Xe:
            </label>
            <select
              value={busTypeFilter}
              onChange={(e) => setBusTypeFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">Tất cả xe</option>
              <option value="Limousine">Limousine VIP</option>
              <option value="Giường nằm">Giường nằm 36 chỗ</option>
              <option value="Ghế ngồi">Ghế ngồi cao cấp</option>
            </select>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>
              Sắp Xếp Giá Vé:
            </label>
            <select
              value={priceSort}
              onChange={(e) => setPriceSort(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="ASC">Giá từ thấp đến cao</option>
              <option value="DESC">Giá từ cao đến thấp</option>
            </select>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <button
              onClick={() => navigate('/map')}
              style={{
                width: '100%',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontWeight: 'bold',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              🗺️ Xem Tuyến Trên Bản Đồ
            </button>
          </div>
        </aside>

        {/* Danh sách chuyến xe */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <p>Đang tải danh sách chuyến xe...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '16px', color: '#64748b' }}>Không tìm thấy chuyến xe nào theo tiêu chí đã chọn.</p>
              <button
                onClick={() => navigate('/buses')}
                style={{
                  marginTop: '12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Xem tất cả chuyến xe
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredTrips.map((trip) => {
                const isExpanded = activeTripId === trip.id;
                const lowerSeats = seatMap.seats.filter((s) => s.seat_number.startsWith('A'));
                const upperSeats = seatMap.seats.filter((s) => s.seat_number.startsWith('B'));

                return (
                  <div
                    key={trip.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '14px',
                      border: isExpanded ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Trip Main Card */}
                    <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                            {trip.busType}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Biển số: <b>{trip.license_plate}</b></span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>{trip.departureTime}</div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>{trip.from}</div>
                          </div>
                          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                            <div>➔</div>
                            <div>{trip.duration}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>{trip.arrivalTime}</div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>{trip.to}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#059669', fontWeight: '600' }}>
                          🟢 Còn {trip.availableSeatsCount} chỗ trống
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Giá vé 1 khách</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626', marginBottom: '10px' }}>
                          {trip.price.toLocaleString('vi-VN')} VNĐ
                        </div>
                        <button
                          onClick={() => toggleTripSeats(trip.id)}
                          style={{
                            backgroundColor: isExpanded ? '#475569' : '#2563eb',
                            color: 'white',
                            border: 'none',
                            fontWeight: 'bold',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'background 0.2s',
                          }}
                        >
                          {isExpanded ? 'Đóng sơ đồ ghế ▲' : 'Chọn chỗ & Đặt vé ▼'}
                        </button>
                      </div>
                    </div>

                    {/* Sơ Đồ Ghế Mở Rộng (US02 & US03) */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', padding: '24px' }}>
                        <h4 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#1e3a8a', fontWeight: 'bold' }}>
                          💺 Sơ Đồ Chỗ Ngồi Chuyến Xe: {trip.from} ➔ {trip.to}
                        </h4>

                        {/* Chú thích màu sắc */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', fontSize: '13px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white' }} />
                            <span>Còn trống</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#2563eb' }} />
                            <span>Đang chọn</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#f59e0b' }} />
                            <span>Đang giữ chỗ (10p)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#94a3b8' }} />
                            <span>Đã bán</span>
                          </div>
                        </div>

                        {loadingSeats ? (
                          <p style={{ color: '#64748b' }}>Đang tải sơ đồ ghế...</p>
                        ) : (
                          <div>
                            {/* Layout 2 Tầng: Tầng Dưới & Tầng Trên */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '20px' }}>
                              {/* Tầng Dưới */}
                              <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b', marginBottom: '12px', textAlign: 'center' }}>
                                  👇 Tầng Dưới (Dãy A)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                  {lowerSeats.map((seat) => {
                                    const isSelected = selectedSeats.some((s) => s.id === seat.id);
                                    let bg = 'white';
                                    let textCol = '#1e293b';
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
                                          fontWeight: 'bold',
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
                              <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b', marginBottom: '12px', textAlign: 'center' }}>
                                  ☝️ Tầng Trên (Dãy B)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                  {upperSeats.map((seat) => {
                                    const isSelected = selectedSeats.some((s) => s.id === seat.id);
                                    let bg = 'white';
                                    let textCol = '#1e293b';
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
                                          fontWeight: 'bold',
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

                            {/* Thanh Tóm Tắt & Nút Đặt Chỗ */}
                            <div
                              style={{
                                backgroundColor: 'white',
                                padding: '16px 20px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '16px',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>Ghế đang chọn:</div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a' }}>
                                  {selectedSeats.length > 0
                                    ? selectedSeats.map((s) => s.seat_number).join(', ')
                                    : 'Chưa chọn ghế nào'}
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>Tổng tiền tạm tính:</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                                  {(trip.price * selectedSeats.length).toLocaleString('vi-VN')} VNĐ
                                </div>
                              </div>

                              <button
                                disabled={selectedSeats.length === 0 || holding}
                                onClick={() => handleContinuePayment(trip)}
                                style={{
                                  backgroundColor: selectedSeats.length > 0 ? '#16a34a' : '#94a3b8',
                                  color: 'white',
                                  border: 'none',
                                  fontWeight: 'bold',
                                  padding: '12px 24px',
                                  borderRadius: '8px',
                                  fontSize: '15px',
                                  cursor: selectedSeats.length > 0 && !holding ? 'pointer' : 'not-allowed',
                                  boxShadow: selectedSeats.length > 0 ? '0 4px 12px rgba(22,163,74,0.3)' : 'none',
                                }}
                              >
                                {holding ? 'Đang giữ ghế...' : 'Tiếp Tục Thanh Toán ➔'}
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