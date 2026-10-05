import { useEffect, useState } from 'react';
import { getCurrentUser, getMonthlyPassPlans, getMonthlyPasses, getRoutes, registerMonthlyPass } from '../api';

function MonthlyPassPage() {
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'my-passes'
  const [routes, setRoutes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [userPasses, setUserPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Form states
  const currentUser = getCurrentUser() || { id: 1, full_name: 'Nguyễn Văn A', email: 'customer@smartbus.vn', phone: '0901234567', discount_type: 'HSSV' };
  const [selectedRouteId, setSelectedRouteId] = useState(2); // Hà Nội - Thái Nguyên
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [passengerName, setPassengerName] = useState(currentUser.full_name || '');
  const [passengerIdCard, setPassengerIdCard] = useState('001202012345');
  const [passengerPhone, setPassengerPhone] = useState(currentUser.phone || '0901234567');
  const [discountType, setDiscountType] = useState(currentUser.discount_type || 'HSSV');
  const [paymentMethod, setPaymentMethod] = useState('MOMO');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modals
  const [showQrModal, setShowQrModal] = useState(null); // pass object
  const [renewingPass, setRenewingPass] = useState(null); // pass object
  const [renewMonths, setRenewMonths] = useState(1);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('MOMO');

  // Load initial data
  useEffect(() => {
    async function initData() {
      setPageLoading(true);
      try {
        // Load routes
        try {
          const rData = await getRoutes();
          if (Array.isArray(rData) && rData.length > 0) {
            setRoutes(rData);
            setSelectedRouteId(rData[0].id);
          }
        } catch {
          setRoutes([
            { id: 2, name: 'Hà Nội - Thái Nguyên', departure_city: 'Hà Nội', arrival_city: 'Thái Nguyên', base_price: 120000, distance_km: 75.0 },
            { id: 1, name: 'Hà Nội - Đà Nẵng', departure_city: 'Hà Nội', arrival_city: 'Đà Nẵng', base_price: 450000, distance_km: 760.0 },
            { id: 3, name: 'Hà Nội - Hải Phòng', departure_city: 'Hà Nội', arrival_city: 'Hải Phòng', base_price: 150000, distance_km: 105.0 },
            { id: 4, name: 'Sài Gòn - Vũng Tàu', departure_city: 'Hồ Chí Minh', arrival_city: 'Vũng Tàu', base_price: 140000, distance_km: 95.0 },
          ]);
        }

        // Load plans
        try {
          const pData = await getMonthlyPassPlans();
          if (pData?.plans) {
            setPlans(pData.plans);
          }
        } catch {
          setPlans([
            { months: 1, duration_days: 30, discount_rate: 0.0, name: 'Gói 1 Tháng (Tiêu chuẩn)', badge: 'Phổ thông' },
            { months: 3, duration_days: 90, discount_rate: 0.08, name: 'Gói 3 Tháng (Tiết kiệm)', badge: 'Tiết kiệm 8%' },
            { months: 6, duration_days: 180, discount_rate: 0.15, name: 'Gói 6 Tháng (Bán niên)', badge: 'Ưu đãi 15%' },
            { months: 12, duration_days: 360, discount_rate: 0.25, name: 'Gói 1 Năm (Toàn niên)', badge: 'Siêu tiết kiệm 25%' },
          ]);
        }

        // Load user passes
        await reloadUserPasses();
      } finally {
        setPageLoading(false);
      }
    }
    initData();
  }, []);

  const reloadUserPasses = async () => {
    try {
      const data = await getMonthlyPasses(currentUser.id);
      if (Array.isArray(data)) {
        setUserPasses(data);
      }
    } catch {
      // Fallback local storage or sample demo
      const local = JSON.parse(localStorage.getItem('smartbus_monthly_passes') || '[]');
      if (local.length > 0) {
        setUserPasses(local);
      } else {
        const today = new Date();
        const endActive = new Date();
        endActive.setDate(today.getDate() + 29);
        setUserPasses([
          {
            id: 1,
            ticket_code: 'PASS-0001',
            qr_payload: 'pass:1',
            route_name: 'Hà Nội - Thái Nguyên',
            departure_city: 'Hà Nội',
            arrival_city: 'Thái Nguyên',
            passenger_name: currentUser.full_name || 'Nguyễn Văn A',
            passenger_id_card: '001202012345',
            start_date: today.toISOString().slice(0, 10),
            end_date: endActive.toISOString().slice(0, 10),
            price: 960000,
            status: 'ConHan',
            days_left: 29,
          },
        ]);
      }
    }
  };

  // Price calculations
  const selectedRoute = routes.find((r) => r.id === Number(selectedRouteId)) || routes[0] || { base_price: 120000 };
  const basePrice = selectedRoute.base_price || 120000;
  const tripsCount = 10 * selectedMonths;
  const fullPrice = basePrice * tripsCount;
  const selectedPlanObj = plans.find((p) => p.months === selectedMonths) || { discount_rate: selectedMonths === 3 ? 0.08 : selectedMonths === 6 ? 0.15 : selectedMonths === 12 ? 0.25 : 0.0 };
  const termDiscount = Math.round(fullPrice * (selectedPlanObj.discount_rate || 0));
  const afterTermPrice = fullPrice - termDiscount;
  const studentDiscount = discountType !== 'Khong' ? Math.round(afterTermPrice * 0.20) : 0;
  const finalTotalPrice = afterTermPrice - studentDiscount;

  // Renew Price calculation
  const calculateRenewPrice = (pass, months) => {
    const route = routes.find((r) => r.id === pass.route_id) || { base_price: 120000 };
    const pBase = route.base_price || 120000;
    const full = pBase * 10 * months;
    const termRate = months === 3 ? 0.08 : months === 6 ? 0.15 : months === 12 ? 0.25 : 0.0;
    const termOff = Math.round(full * termRate);
    const afterTerm = full - termOff;
    const isStudent = (currentUser.discount_type || 'HSSV') !== 'Khong';
    const studentOff = isStudent ? Math.round(afterTerm * 0.20) : 0;
    return afterTerm - studentOff;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!passengerName.trim()) {
      alert('Vui lòng nhập họ và tên hành khách');
      return;
    }
    if (!passengerIdCard.trim()) {
      alert('Vui lòng nhập số CCCD hoặc Mã HSSV');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        user_id: currentUser.id,
        route_id: Number(selectedRouteId),
        months: Number(selectedMonths),
        passenger_name: passengerName.trim(),
        passenger_id_card: passengerIdCard.trim(),
        price: finalTotalPrice,
        payment_method: paymentMethod,
      };

      const res = await registerMonthlyPass(payload);
      const newPass = res.pass || res.pass_info;

      // Update local storage copy
      const local = JSON.parse(localStorage.getItem('smartbus_monthly_passes') || '[]');
      const filtered = local.filter((p) => p.id !== newPass.id);
      localStorage.setItem('smartbus_monthly_passes', JSON.stringify([newPass, ...filtered]));

      setSuccessMessage(`🎉 Chúc mừng! Bạn đã đăng ký thẻ vé tháng thành công! Mã thẻ: ${newPass.ticket_code || 'PASS-' + newPass.id}`);
      await reloadUserPasses();
      setActiveTab('my-passes');
      setShowQrModal(newPass);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi đăng ký vé tháng. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!renewingPass) return;

    setLoading(true);
    try {
      const renewPrice = calculateRenewPrice(renewingPass, renewMonths);
      const payload = {
        user_id: currentUser.id,
        route_id: renewingPass.route_id,
        months: Number(renewMonths),
        pass_id: renewingPass.id,
        price: renewPrice,
        payment_method: renewPaymentMethod,
      };

      const res = await registerMonthlyPass(payload);
      const updatedPass = res.pass || res.pass_info;

      alert(`✅ Gia hạn thành công thêm ${renewMonths * 30} ngày sử dụng! Hạn mới: ${updatedPass.end_date}`);
      setRenewingPass(null);
      await reloadUserPasses();
    } catch (err) {
      alert(`Lỗi gia hạn: ${err.message || 'Không thể gia hạn vé'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="monthly-pass-page" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px', minHeight: '85vh' }}>
      {/* Hero Header */}
      <div className="no-print" style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '6px 16px', borderRadius: '999px', color: '#0284c7', fontWeight: '700', fontSize: '13px', marginBottom: '12px' }}>
          <span>✨ TÍNH NĂNG MỚI (SPRINT 2 - US16)</span>
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
          Thẻ Vé Tháng Xe Buýt Điện Tử
        </h1>
        <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '650px', margin: '0 auto' }}>
          Tiết kiệm tối đa lên đến <b>25%</b> theo gói + <b>giảm thêm 20% cho Học sinh - Sinh viên</b>. Di chuyển không giới hạn lượt đi trên mọi chuyến xe trong tháng!
        </p>

        {/* Tab switchers */}
        <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '6px', borderRadius: '14px', marginTop: '24px', border: '1px solid #e2e8f0', gap: '6px' }}>
          <button
            onClick={() => setActiveTab('register')}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '14px',
              transition: 'all 0.2s',
              background: activeTab === 'register' ? '#2563eb' : 'transparent',
              color: activeTab === 'register' ? '#ffffff' : '#64748b',
              boxShadow: activeTab === 'register' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
            }}
          >
            🎫 Đăng Ký Thẻ Vé Mới
          </button>
          <button
            onClick={() => setActiveTab('my-passes')}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '14px',
              transition: 'all 0.2s',
              background: activeTab === 'my-passes' ? '#2563eb' : 'transparent',
              color: activeTab === 'my-passes' ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'my-passes' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
            }}
          >
            <span>🪪 Thẻ Của Tôi</span>
            {userPasses.length > 0 && (
              <span style={{ background: activeTab === 'my-passes' ? '#ffffff' : '#2563eb', color: activeTab === 'my-passes' ? '#2563eb' : '#ffffff', borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: '800' }}>
                {userPasses.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: '600' }}>{successMessage}</div>
          <button onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#065f46' }}>✕</button>
        </div>
      )}

      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: '600' }}>⚠️ {errorMessage}</div>
          <button onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#991b1b' }}>✕</button>
        </div>
      )}

      {/* TAB 1: FORM ĐĂNG KÝ VÉ THÁNG */}
      {activeTab === 'register' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '32px', alignItems: 'start' }}>
          {/* Left Form */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '28px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📝</span> Thông Tin Đăng Ký Vé Tháng
            </h2>

            <form onSubmit={handleRegisterSubmit}>
              {/* Step 1: Chọn tuyến */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  1. Chọn Tuyến Đường Di Chuyển Thường Xuyên
                </label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '15px', color: '#0f172a', fontWeight: '600', outline: 'none', background: '#f8fafc' }}
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.departure_city} ➔ {r.arrival_city}) • {r.base_price.toLocaleString('vi-VN')} đ/lượt
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Chọn gói kỳ hạn */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  2. Chọn Kỳ Hạn Thẻ Vé Tháng
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { m: 1, name: '1 Tháng', days: '30 ngày', off: 'Giá chuẩn', badge: 'Phổ thông' },
                    { m: 3, name: '3 Tháng', days: '90 ngày', off: 'Giảm 8%', badge: 'Khuyên dùng' },
                    { m: 6, name: '6 Tháng', days: '180 ngày', off: 'Giảm 15%', badge: 'Ưu đãi' },
                    { m: 12, name: '1 Năm', days: '360 ngày', off: 'Giảm 25%', badge: 'Tiết kiệm nhất' },
                  ].map((pkg) => {
                    const isSelected = selectedMonths === pkg.m;
                    return (
                      <div
                        key={pkg.m}
                        onClick={() => setSelectedMonths(pkg.m)}
                        style={{
                          border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                          borderRadius: '14px',
                          padding: '14px',
                          cursor: 'pointer',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          transition: 'all 0.2s',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '800', fontSize: '15px', color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                            {pkg.name}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: '700', background: isSelected ? '#2563eb' : '#f1f5f9', color: isSelected ? '#ffffff' : '#64748b', padding: '2px 8px', borderRadius: '6px' }}>
                            {pkg.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{pkg.days} đi lại thỏa thích</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: pkg.m > 1 ? '#059669' : '#64748b', marginTop: '4px' }}>
                          {pkg.off}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Thông tin hành khách */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  3. Thông Tin Chủ Thẻ
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Họ và tên *</label>
                    <input
                      type="text"
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>CCCD / Mã SV *</label>
                    <input
                      type="text"
                      value={passengerIdCard}
                      onChange={(e) => setPassengerIdCard(e.target.value)}
                      placeholder="001202012345"
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Số điện thoại</label>
                    <input
                      type="text"
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      placeholder="0901234567"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Đối tượng ưu đãi</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#ffffff' }}
                    >
                      <option value="HSSV">Học sinh / Sinh viên (Giảm 20%)</option>
                      <option value="NguoiCaoTuoi">Người cao tuổi (Giảm 20%)</option>
                      <option value="Khong">Khách thông thường (Không giảm)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 4: Phương thức thanh toán */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  4. Phương Thức Thanh Toán Trực Tuyến
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'MOMO', label: 'Ví MoMo', icon: '🟣' },
                    { id: 'VNPAY', label: 'VNPay', icon: '🔵' },
                    { id: 'ZALOPAY', label: 'ZaloPay', icon: '🟢' },
                    { id: 'VIETQR', label: 'VietQR', icon: '🟡' },
                  ].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setPaymentMethod(p.id)}
                      style={{
                        border: paymentMethod === p.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '10px 6px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: paymentMethod === p.id ? '#eff6ff' : '#ffffff',
                      }}
                    >
                      <div style={{ fontSize: '18px' }}>{p.icon}</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)',
                  color: '#ffffff',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '800',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? 'Đang kích hoạt thẻ...' : `Thanh Toán & Kích Hoạt Thẻ (${finalTotalPrice.toLocaleString('vi-VN')} đ)`}
              </button>
            </form>
          </div>

          {/* Right Summary Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Visual Live Pass Preview */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%)',
                color: '#ffffff',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.4)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              {/* Background watermark */}
              <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '140px', opacity: 0.08, pointerEvents: 'none' }}>
                🚌
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px' }}>🚌</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '0.5px' }}>SMART BUS PASS</div>
                    <div style={{ fontSize: '10px', color: '#93c5fd', textTransform: 'uppercase' }}>Thẻ Đi Xe Buýt Điện Tử</div>
                  </div>
                </div>
                <div style={{ background: '#10b981', color: '#ffffff', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '999px', letterSpacing: '0.5px' }}>
                  XÁC THỰC KỸ THUẬT SỐ
                </div>
              </div>

              {/* Route */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '11px', color: '#93c5fd', fontWeight: '600', textTransform: 'uppercase' }}>Chặng đường áp dụng</div>
                <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>
                  {selectedRoute.departure_city} ➔ {selectedRoute.arrival_city}
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Tuyến: {selectedRoute.name} ({selectedRoute.distance_km || 75} km)</div>
              </div>

              {/* Passenger & Expiry info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '14px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#93c5fd', textTransform: 'uppercase' }}>Chủ thẻ</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px' }}>{passengerName || 'Chưa nhập tên'}</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>ID: {passengerIdCard || '001202012345'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#93c5fd', textTransform: 'uppercase' }}>Thời hạn thẻ</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px' }}>{selectedMonths * 30} ngày</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Kỳ hạn: Gói {selectedMonths} tháng</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.1)', padding: '10px 14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '12px', color: '#e2e8f0' }}>Tiêu chuẩn di chuyển:</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8' }}>KHÔNG GIỚI HẠN LƯỢT</span>
              </div>
            </div>

            {/* Price Breakdown Calculation Box */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '14px' }}>
                📊 Chi Tiết Giá Cước & Khuyến Mãi
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                <span>Giá vé đơn lẻ chuẩn ({basePrice.toLocaleString('vi-VN')} đ × {tripsCount} lượt):</span>
                <span>{fullPrice.toLocaleString('vi-VN')} đ</span>
              </div>

              {termDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#059669', marginBottom: '8px' }}>
                  <span>Chiết khấu kỳ hạn dài ({selectedPlanObj.badge}):</span>
                  <span>- {termDiscount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              {studentDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#059669', marginBottom: '8px' }}>
                  <span>Ưu đãi đối tượng ({discountType === 'HSSV' ? 'HSSV -20%' : 'Người cao tuổi -20%'}):</span>
                  <span>- {studentDiscount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>Tổng thanh toán:</span>
                <span style={{ fontWeight: '900', fontSize: '22px', color: '#2563eb' }}>
                  {finalTotalPrice.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px', textAlign: 'center' }}>
                💡 Vé tháng chỉ tính tương đương 10 lượt đi vé lẻ nhưng được sử dụng trọn vẹn 30 ngày không giới hạn.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DANH SÁCH VÉ THÁNG CỦA TÔI */}
      {activeTab === 'my-passes' && (
        <div>
          {userPasses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎫</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Bạn chưa có thẻ vé tháng nào</h3>
              <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: '0 auto 20px' }}>
                Đăng ký ngay thẻ vé tháng để nhận ưu đãi lên đến 25% và thoải mái di chuyển mỗi ngày mà không cần mua vé từng chặng.
              </p>
              <button
                onClick={() => setActiveTab('register')}
                style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
              >
                Đăng Ký Ngay
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
              {userPasses.map((pass) => {
                const isActive = pass.status === 'ConHan';
                const daysLeft = pass.days_left !== undefined ? pass.days_left : 30;

                return (
                  <div
                    key={pass.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Card Header Transit Design */}
                    <div
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)'
                          : 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
                        color: '#ffffff',
                        padding: '20px',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '13px' }}>
                          <span>🚌</span> SMART BUS PASS
                        </div>
                        <span
                          style={{
                            background: isActive ? '#10b981' : '#ef4444',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '999px',
                          }}
                        >
                          {isActive ? `CÒN HẠN (${daysLeft} NGÀY)` : 'HẾT HẠN'}
                        </span>
                      </div>

                      <div style={{ fontSize: '18px', fontWeight: '900', marginBottom: '2px' }}>
                        {pass.route_name || `${pass.departure_city} - ${pass.arrival_city}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#e0f2fe' }}>
                        Chủ thẻ: <b>{pass.passenger_name}</b> • {pass.passenger_id_card || 'ID N/A'}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '14px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Ngày bắt đầu:</div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{pass.start_date}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Ngày hết hạn:</div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: isActive ? '#059669' : '#dc2626' }}>{pass.end_date}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748b' }}>
                          <span>Mã vé tháng:</span>
                          <span style={{ fontWeight: '800', color: '#1e293b' }}>{pass.ticket_code || `PASS-${pass.id}`}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                          <span>Cước thanh toán:</span>
                          <span style={{ fontWeight: '800', color: '#2563eb' }}>{Number(pass.price || 0).toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                          onClick={() => setShowQrModal(pass)}
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '10px',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>🔍</span> Mã QR Lên Xe
                        </button>

                        <button
                          onClick={() => {
                            setRenewingPass(pass);
                            setRenewMonths(1);
                          }}
                          style={{
                            background: '#1d4ed8',
                            color: '#ffffff',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>🔄</span> Gia Hạn Thẻ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* QR MODAL */}
      {showQrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', maxWidth: '380px', width: '100%', textAlign: 'center', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button
              onClick={() => setShowQrModal(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '999px', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800', marginBottom: '12px' }}>
              <span>✓</span> THẺ VÉ THÁNG HỢP LỆ
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>
              {showQrModal.route_name || `${showQrModal.departure_city} - ${showQrModal.arrival_city}`}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Hành khách: <b>{showQrModal.passenger_name}</b> (Hạn đến {showQrModal.end_date})
            </p>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', display: 'inline-block', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=pass:${showQrModal.id}`}
                alt="QR Code Vé Tháng"
                style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }}
              />
            </div>

            <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
              MÃ THẺ: {showQrModal.ticket_code || `PASS-${showQrModal.id}`}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '20px' }}>
              Xuất trình mã QR này cho tài xế hoặc phụ xe quét khi lên xe buýt.
            </div>

            <button
              onClick={() => window.print()}
              style={{ width: '100%', background: '#0f172a', color: '#ffffff', padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <span>🖨️</span> In Thẻ Vé Tháng
            </button>
          </div>
        </div>
      )}

      {/* RENEW MODAL */}
      {renewingPass && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', maxWidth: '440px', width: '100%', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button
              onClick={() => setRenewingPass(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '999px', fontSize: '16px', cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔄</span> Gia Hạn Thẻ Vé Tháng
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px 0' }}>
              Gia hạn cho: <b>{renewingPass.passenger_name}</b> ({renewingPass.route_name})
            </p>

            <form onSubmit={handleRenewSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  Chọn số tháng muốn gia hạn thêm:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRenewMonths(m)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '10px',
                        border: renewMonths === m ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: renewMonths === m ? '#eff6ff' : '#ffffff',
                        fontWeight: '700',
                        fontSize: '13px',
                        color: renewMonths === m ? '#1d4ed8' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {m} Tháng
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                  <span>Ngày hết hạn hiện tại:</span>
                  <b>{renewingPass.end_date}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                  <span>Thời gian cộng dồn thêm:</span>
                  <b style={{ color: '#059669' }}>+{renewMonths * 30} ngày</b>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>Cước gia hạn:</span>
                  <span style={{ fontWeight: '900', fontSize: '18px', color: '#2563eb' }}>
                    {calculateRenewPrice(renewingPass, renewMonths).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Phương thức thanh toán:
                </label>
                <select
                  value={renewPaymentMethod}
                  onChange={(e) => setRenewPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="MOMO">Ví MoMo Sandbox</option>
                  <option value="VNPAY">Cổng VNPay Sandbox</option>
                  <option value="ZALOPAY">Cổng ZaloPay Sandbox</option>
                  <option value="VIETQR">Chuyển khoản VietQR</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Đang xử lý...' : 'Xác Nhận Gia Hạn Thẻ'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonthlyPassPage;
