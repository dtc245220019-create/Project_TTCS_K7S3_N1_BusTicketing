import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCurrentUser,
  setCurrentUser,
  getAdminUsers,
  updateUserRole,
  getAdminStats,
  getAdminTrips,
  updateTripStatus,
  getAdminRevenue,
  getAdminOccupancy,
  getRevenueExportUrl,
  getPendingDiscounts,
  approveDiscount,
  getVouchers,
  getFeedbacksList,
  updateFeedbackStatus,
  getAuditLogs,
} from '../api';
import CreateVoucher from '../components/CreateVoucher';
import RefundManagement from '../components/RefundManagement';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [currentUser, setUser] = useState(getCurrentUser());
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState('users'); 
  // 'users' | 'trips' | 'revenue' | 'discounts' | 'vouchers' | 'refunds' | 'feedbacks' | 'audit' | 'overview'

  // User tab states
  const [searchUser, setSearchUser] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [updatingUserId, setUpdatingUserId] = useState(null);

  // Revenue & Occupancy tab states
  const [revenueData, setRevenueData] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [revenueGroupBy, setRevenueGroupBy] = useState('month');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Discounts tab states
  const [pendingDiscounts, setPendingDiscounts] = useState([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);

  // Vouchers tab states
  const [vouchers, setVouchers] = useState([]);
  const [showCreateVoucher, setShowCreateVoucher] = useState(false);

  // Feedbacks tab states
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState('ALL');

  // Audit tab states
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // Notification feedback
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: 'success' });

  const isAdmin =
    currentUser &&
    (currentUser.role === 'Admin' ||
      currentUser.role === 'QuanTriVien' ||
      currentUser.role === 'ADMIN');

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (u && (u.role === 'Admin' || u.role === 'QuanTriVien' || u.role === 'ADMIN')) {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, []);

  // Tải dữ liệu bổ sung khi chuyển tab
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'revenue') {
      loadRevenueAndOccupancy();
    } else if (activeTab === 'discounts') {
      loadPendingDiscounts();
    } else if (activeTab === 'vouchers') {
      loadVouchers();
    } else if (activeTab === 'feedbacks') {
      loadFeedbacks();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, revenueGroupBy]);

  const showToast = (text, type = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg({ text: '', type: 'success' }), 4000);
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, tripsRes] = await Promise.allSettled([
        getAdminStats(),
        getAdminUsers(),
        getAdminTrips(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value.stats || statsRes.value);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value) {
        setUsers(usersRes.value.users || usersRes.value || []);
      }
      if (tripsRes.status === 'fulfilled' && tripsRes.value) {
        setTrips(tripsRes.value.trips || tripsRes.value || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueAndOccupancy = async () => {
    setLoadingAnalytics(true);
    try {
      const [revRes, occRes] = await Promise.allSettled([
        getAdminRevenue(revenueGroupBy),
        getAdminOccupancy(),
      ]);
      if (revRes.status === 'fulfilled' && revRes.value) {
        setRevenueData(revRes.value);
      }
      if (occRes.status === 'fulfilled' && occRes.value) {
        setOccupancyData(occRes.value);
      }
    } catch (e) {
      console.warn('Lỗi load analytics:', e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadPendingDiscounts = async () => {
    setLoadingDiscounts(true);
    try {
      const res = await getPendingDiscounts();
      if (res && res.pending_users) {
        setPendingDiscounts(res.pending_users);
      } else {
        setPendingDiscounts([]);
      }
    } catch (e) {
      console.warn('Lỗi tải danh sách ưu đãi:', e);
    } finally {
      setLoadingDiscounts(false);
    }
  };

  const loadVouchers = async () => {
    try {
      const res = await getVouchers();
      if (res && res.vouchers) {
        setVouchers(res.vouchers);
      }
    } catch (e) {
      console.warn('Lỗi tải danh sách vouchers:', e);
    }
  };

  const loadFeedbacks = async () => {
    try {
      const res = await getFeedbacksList();
      if (res && res.feedbacks) {
        setFeedbacks(res.feedbacks);
      }
    } catch (e) {
      console.warn('Lỗi tải feedbacks:', e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await getAuditLogs(100);
      if (res && res.audit_logs) {
        setAuditLogs(res.audit_logs);
      }
    } catch (e) {
      console.warn('Lỗi tải audit logs:', e);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingUserId(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showToast(`Đã phân quyền thành công! Người dùng #${userId} hiện có vai trò: ${newRole}.`);
    } catch (err) {
      showToast(`Lỗi cập nhật vai trò: ${err.message || 'Không thể lưu'}`, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleTripStatusChange = async (tripId, newStatus) => {
    try {
      await updateTripStatus(tripId, newStatus);
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, status: newStatus } : t))
      );
      showToast(`Đã cập nhật trạng thái chuyến #${tripId} thành "${newStatus}".`);
    } catch (err) {
      showToast(`Lỗi đổi trạng thái chuyến: ${err.message || 'Không thể lưu'}`, 'error');
    }
  };

  const handleApproveDiscount = async (userId, approved) => {
    const actionLabel = approved ? 'Duyệt' : 'Từ chối';
    if (!window.confirm(`Bạn có chắc muốn ${actionLabel} hồ sơ ưu đãi của người dùng #${userId}?`)) return;

    try {
      await approveDiscount(userId, approved, approved ? 'Đã xác thực thẻ HSSV hợp lệ' : 'Hồ sơ chưa đạt yêu cầu');
      setPendingDiscounts((prev) => prev.filter((u) => u.id !== userId));
      showToast(`Đã ${actionLabel} hồ sơ ưu đãi thành công cho user #${userId}!`);
      loadAdminData();
    } catch (err) {
      showToast(`Lỗi duyệt ưu đãi: ${err.message || 'Không thể xử lý'}`, 'error');
    }
  };

  const handleUpdateFeedback = async (id, status) => {
    try {
      await updateFeedbackStatus(id, status);
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f))
      );
      showToast(`Đã cập nhật trạng thái góp ý #${id} thành "${status}".`);
    } catch (err) {
      showToast(`Lỗi cập nhật góp ý: ${err.message || 'Không thể lưu'}`, 'error');
    }
  };

  const switchToAdminDemo = () => {
    const adminUser = {
      id: 12,
      full_name: 'Lê Quản Lý (Admin)',
      email: 'admin@smartbus.vn',
      role: 'Admin',
      phone: '0988776655',
    };
    setCurrentUser(adminUser);
    setUser(adminUser);
    loadAdminData();
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.full_name || '').toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.phone || '').includes(searchUser);
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter((f) => {
    if (feedbackFilter === 'ALL') return true;
    return f.status === feedbackFilter;
  });

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditActionFilter === 'ALL') return true;
    return (log.action || '').toUpperCase().includes(auditActionFilter.toUpperCase());
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin':
      case 'QuanTriVien':
        return { label: '👑 Quản Trị Viên', bg: '#fee2e2', color: '#991b1b', border: '#fecaca' };
      case 'TaiXe':
        return { label: '🚌 Tài Xế', bg: '#fef3c7', color: '#92400e', border: '#fde68a' };
      case 'PhuXe':
        return { label: '🎫 Phụ Xe / Quầy', bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' };
      default:
        return { label: '👤 Hành Khách', bg: '#dcfce7', color: '#166534', border: '#bbf7d0' };
    }
  };

  // Access Denied Guard
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '720px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '48px 32px',
            border: '1px solid #fee2e2',
            boxShadow: '0 20px 40px rgba(220, 38, 38, 0.08)',
          }}
        >
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔒</div>
          <span
            style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '4px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '0.5px',
            }}
          >
            403 FORBIDDEN - BẢO MẬT PHÂN QUYỀN
          </span>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: '16px 0 8px 0' }}>
            Khu Vực Dành Riêng Cho Quản Trị Viên (Admin)
          </h2>
          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 28px auto' }}>
            Hệ thống phân quyền 4 Actor (Hành khách, Tài xế, Phụ xe, Quản trị viên) đã chặn truy cập.
            Tài khoản hiện tại của bạn là{' '}
            <b style={{ color: '#dc2626' }}>{currentUser?.role || 'Khách vãng lai'}</b> và không có đặc quyền quản trị.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={switchToAdminDemo}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              👑 Đăng Nhập 1-Click: Tài Khoản Quản Trị Viên (admin@smartbus.vn)
            </button>
            <Link
              to="/"
              style={{
                color: '#64748b',
                textDecoration: 'none',
                fontSize: '14px',
                marginTop: '8px',
              }}
            >
              ← Trở về Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '28px 16px', minHeight: '85vh' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)',
          borderRadius: '20px',
          padding: '24px 30px',
          color: 'white',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 10px 30px rgba(30, 27, 75, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: '#fca5a5',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '800',
              }}
            >
              SPRINT 3: TOÀN DIỆN 4 ACTORS & VẬN HÀNH
            </span>
            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>| Phiên: {currentUser?.email}</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            👑 Trung Tâm Quản Trị Hệ Thống Xe Khách Thông Minh
          </h1>
          <p style={{ margin: 0, color: '#e0e7ff', fontSize: '13px', maxWidth: '680px' }}>
            Quản trị 4 nhóm quyền RBAC, Báo cáo doanh thu & lấp đầy, Xuất CSV, Duyệt ưu đãi HSSV, Cấp Voucher, Quản lý hoàn tiền, Góp ý khách hàng & Audit Logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={loadAdminData}
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '9px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🔄 Làm mới
          </button>
          <a
            href={getRevenueExportUrl()}
            target="_blank"
            rel="noreferrer"
            download="bao_cao_doanh_thu_smartbus.csv"
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '9px 16px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            }}
          >
            📥 Xuất CSV Doanh Thu
          </a>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackMsg.text && (
        <div
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: feedbackMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedbackMsg.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: feedbackMsg.type === 'success' ? '#166534' : '#991b1b',
          }}
        >
          <span>{feedbackMsg.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>💰 Tổng Doanh Thu</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#059669' }}>
            {stats?.total_revenue != null
              ? Number(stats.total_revenue).toLocaleString('vi-VN') + ' đ'
              : 'Đang tính...'}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Doanh thu ghi nhận thực tế</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>🎫 Vé Đã Đặt</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#2563eb' }}>
            {stats?.total_tickets ?? stats?.paid_tickets ?? 12} vé
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Vé thường & vé điện tử</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>🚌 Chuyến Vận Hành</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#d97706' }}>
            {stats?.total_trips ?? trips.length ?? 8} chuyến
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>8 chuyến HCM ➔ Đà Lạt</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>👥 Người Dùng RBAC</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#7c3aed' }}>
            {stats?.total_users ?? users.length ?? 5} thành viên
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>4 vai trò độc lập</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>📊 Tỷ Lệ Lấp Đầy</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0891b2' }}>
            {occupancyData?.overall?.average_occupancy_rate || stats?.occupancy_rate || '68'}%
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Trung bình toàn tuyến</div>
        </div>
      </div>

      {/* Tab Navigation (Responsive Horizontal Scroll) */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #e2e8f0',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {[
          { key: 'users', label: '👥 Phân Quyền (RBAC)', count: users.length },
          { key: 'trips', label: '🚌 Điều Phối Chuyến', count: trips.length },
          { key: 'revenue', label: '📊 Doanh Thu & Lấp Đầy' },
          { key: 'discounts', label: '🎓 Duyệt Ưu Đãi (US23)', count: pendingDiscounts.length, badgeColor: '#ef4444' },
          { key: 'vouchers', label: '🎟️ Mã Ưu Đãi (US18)' },
          { key: 'refunds', label: '💸 Hoàn Tiền (US08)' },
          { key: 'feedbacks', label: '💬 Đánh Giá (US24)', count: feedbacks.length },
          { key: 'audit', label: '🛡️ Audit Logs (US17)' },
          { key: 'overview', label: '🏛️ Ma Trận Quyền' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 14px',
                fontWeight: isActive ? '700' : '600',
                fontSize: '13px',
                border: 'none',
                background: 'none',
                color: isActive ? '#2563eb' : '#64748b',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    backgroundColor: tab.badgeColor ? tab.badgeColor : (isActive ? '#eff6ff' : '#f1f5f9'),
                    color: tab.badgeColor ? 'white' : (isActive ? '#2563eb' : '#64748b'),
                    padding: '2px 7px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USER MANAGEMENT & ROLE RBAC */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div style={{ flex: '1', minWidth: '240px', maxWidth: '380px' }}>
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="🔍 Tìm theo Tên, Email hoặc Số điện thoại..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'HanhKhach', label: '👤 Hành khách' },
                { key: 'TaiXe', label: '🚌 Tài xế' },
                { key: 'PhuXe', label: '🎫 Phụ xe' },
                { key: 'Admin', label: '👑 Quản trị' },
              ].map((rf) => (
                <button
                  key={rf.key}
                  onClick={() => setFilterRole(rf.key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: filterRole === rf.key ? '#2563eb' : '#e2e8f0',
                    backgroundColor: filterRole === rf.key ? '#eff6ff' : 'white',
                    color: filterRole === rf.key ? '#2563eb' : '#64748b',
                    fontSize: '12px',
                    fontWeight: filterRole === rf.key ? 'bold' : 'normal',
                    cursor: 'pointer',
                  }}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>ID</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Họ Và Tên</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Email Liên Hệ</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Số Điện Thoại</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Ưu Đãi</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Vai Trò Hiện Tại</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Phân Quyền Lại (RBAC)</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                      Không tìm thấy người dùng phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const badge = getRoleBadge(u.role);
                    const isSelf = currentUser && currentUser.id === u.id;
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isSelf ? '#f0fdf4' : 'transparent' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#64748b' }}>#{u.id}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1e293b' }}>
                          {u.full_name || 'Chưa cập nhật'}
                          {isSelf && <span style={{ marginLeft: '6px', fontSize: '10px', backgroundColor: '#bbf7d0', color: '#166534', padding: '2px 5px', borderRadius: '4px' }}>Bạn</span>}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569', fontFamily: 'monospace' }}>{u.email}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{u.phone || '098*******'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {u.discount_type && u.discount_type !== 'Khong' ? (
                            <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                              {u.discount_type} (-20%)
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>Thường</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <select
                            value={u.role}
                            disabled={updatingUserId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '12px', fontWeight: '600', backgroundColor: updatingUserId === u.id ? '#f1f5f9' : 'white', color: '#1e293b', cursor: 'pointer', outline: 'none' }}
                          >
                            <option value="HanhKhach">👤 Hành khách (HanhKhach)</option>
                            <option value="TaiXe">🚌 Tài xế (TaiXe)</option>
                            <option value="PhuXe">🎫 Phụ xe / Quầy (PhuXe)</option>
                            <option value="Admin">👑 Quản trị viên (Admin)</option>
                          </select>
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

      {/* ========================================================================= */}
      {/* TAB 2: TRIP DISPATCHING & MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'trips' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                🚌 Danh Sách Chuyến Xe & Điều Phối Tuyến (8 Chuyến HCM ➔ Đà Lạt)
              </h2>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>
                Hỗ trợ cập nhật trạng thái vận hành theo thời gian thực (Đúng lịch, Đón khách, Đang chạy, Đã đến)
              </p>
            </div>
            <Link
              to="/buses?origin=Hồ%20Chí%20Minh&destination=Đà%20Lạt"
              style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}
            >
              🔍 Xem trang đặt vé HCM ➔ Đà Lạt
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>ID</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Tuyến Xe</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Khởi Hành</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Xe & Biển Số</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Giá Vé</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Ghế Trống</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Tài Xế</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                      Chưa có chuyến xe nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  trips.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#64748b' }}>#{t.id}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1e293b' }}>{t.origin} ➔ {t.destination}</td>
                      <td style={{ padding: '10px 12px', color: '#2563eb', fontWeight: '600' }}>
                        🕒 {t.departure_time?.slice(11, 16) || t.departure_time || '08:00'} ({t.departure_time?.slice(0, 10)})
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 'bold', color: '#334155' }}>{t.license_plate || '51B-888.99'}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t.bus_type || 'Limousine 34 Phòng'}</div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#059669' }}>
                        {Number(t.price || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                          {t.available_seats ?? 28} chỗ
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{t.driver_name || 'Trần Văn Tài (Tài Xế)'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <select
                          value={t.status || 'SCHEDULED'}
                          onChange={(e) => handleTripStatusChange(t.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor:
                              t.status === 'BOARDING' ? '#fef3c7' :
                              t.status === 'DEPARTED' ? '#e0f2fe' :
                              t.status === 'COMPLETED' ? '#dcfce7' : 'white',
                            color: '#1e293b',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="SCHEDULED">📅 Đúng Lịch</option>
                          <option value="BOARDING">🚶 Đón Khách</option>
                          <option value="DEPARTED">🚍 Đang Chạy</option>
                          <option value="COMPLETED">🏁 Đã Đến</option>
                          <option value="CANCELLED">❌ Hủy Chuyến</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REVENUE & OCCUPANCY & CSV EXPORT (SPRINT 3) */}
      {/* ========================================================================= */}
      {activeTab === 'revenue' && (
        <div className="admin-analytics">
          <div className="admin-analytics-heading">
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                📊 Báo Cáo Doanh Thu & Tỷ Lệ Lấp Đầy Ghế (Occupancy)
              </h2>
              <p>Phân tích hiệu quả vận hành các tuyến, thống kê doanh thu đa chiều và tỷ lệ lấp đầy</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={revenueGroupBy}
                onChange={(e) => setRevenueGroupBy(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
              >
                <option value="day">Theo Ngày (day)</option>
                <option value="month">Theo Tháng (month)</option>
              </select>
              <a
                href={getRevenueExportUrl()}
                target="_blank"
                rel="noreferrer"
                download="bao_cao_doanh_thu_smartbus.csv"
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📥 Xuất File CSV
              </a>
            </div>
          </div>

          {/* Revenue KPI Summary */}
          <div className="admin-revenue-summary">
            <article className="admin-revenue-primary">
              <span>TỔNG DOANH THU GHI NHẬN</span>
              <strong>
                {revenueData?.summary?.total_revenue != null
                  ? Number(revenueData.summary.total_revenue).toLocaleString('vi-VN') + ' đ'
                  : '4.850.000 đ'}
              </strong>
              <small>Dữ liệu hợp nhất từ vé lẻ, thẻ vé tháng và thanh toán online</small>
            </article>

            <article>
              <span>TỔNG SỐ ĐƠN ĐẶT</span>
              <strong>{revenueData?.summary?.total_orders ?? 14} đơn</strong>
              <small>Thanh toán thành công qua VietQR, VNPay, ZaloPay</small>
            </article>

            <article>
              <span>SỐ VÉ ĐÃ PHÁT HÀNH</span>
              <strong>{revenueData?.summary?.total_tickets ?? 21} vé</strong>
              <small>Bao gồm vé thường và vé ưu đãi HSSV</small>
            </article>
          </div>

          {/* Route Occupancy Table */}
          <div className="admin-analytics-panel">
            <div className="admin-analytics-panel-heading">
              <div>
                <span className="admin-analytics-eyebrow">OCCUPANCY METRICS</span>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Tỷ Lệ Lấp Đầy Ghế Theo Chuyến Xe (HCM ➔ Đà Lạt)</h3>
              </div>
              <div className="admin-occupancy-summary">
                <span>Lấp đầy trung bình:</span>
                <strong>{occupancyData?.overall?.average_occupancy_rate || 68}%</strong>
              </div>
            </div>

            <div className="admin-analytics-table-wrap">
              <table className="admin-analytics-table">
                <thead>
                  <tr>
                    <th>Mã Chuyến</th>
                    <th>Tuyến Đường</th>
                    <th>Thời Gian Khởi Hành</th>
                    <th>Loại Xe</th>
                    <th>Số Ghế (Đặt / Tổng)</th>
                    <th>Tỷ Lệ Lấp Đầy</th>
                    <th>Doanh Thu Tạm Tính</th>
                  </tr>
                </thead>
                <tbody>
                  {(occupancyData?.trips || trips).map((t, idx) => {
                    const totalSeats = t.total_seats || 34;
                    const available = t.available_seats !== undefined ? t.available_seats : (28 - (idx % 5));
                    const booked = totalSeats - available;
                    const rate = t.occupancy_rate || Math.round((booked / totalSeats) * 100);
                    const rev = t.estimated_revenue || (booked * (t.price || 280000));
                    return (
                      <tr key={t.id || idx}>
                        <td className="admin-analytics-strong">#{t.id || idx + 1}</td>
                        <td>
                          <strong>{t.origin || 'Hồ Chí Minh'} ➔ {t.destination || 'Đà Lạt'}</strong>
                        </td>
                        <td>{t.departure_time?.slice(11, 16) || t.departure_time || '08:00'}</td>
                        <td>{t.bus_type || 'Limousine 34 Phòng'}</td>
                        <td>
                          <strong>{booked}</strong> / {totalSeats} chỗ
                        </td>
                        <td>
                          <div className="admin-occupancy-cell">
                            <div className="admin-occupancy-track">
                              <span style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}></span>
                            </div>
                            <strong>{rate}%</strong>
                          </div>
                        </td>
                        <td style={{ fontWeight: '700', color: '#059669' }}>
                          {Number(rev).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PENDING DISCOUNTS US23 */}
      {/* ========================================================================= */}
      {activeTab === 'discounts' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                🎓 Xét Duyệt Hồ Sơ Ưu Đãi Sinh Viên / Linh Hoạt (US23)
              </h2>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>
                Hành khách nộp thẻ HSSV hoặc giấy tờ đối tượng ưu đãi (-20%) cần được Admin phê duyệt
              </p>
            </div>
            <button
              onClick={loadPendingDiscounts}
              style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              🔄 Làm mới ({pendingDiscounts.length})
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>ID User</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Họ Và Tên</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Email</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Số Điện Thoại</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Loại Đăng Ký</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Trạng Thái</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {pendingDiscounts.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      🎉 Tuyệt vời! Hiện tại không có hồ sơ ưu đãi nào đang chờ duyệt.
                    </td>
                  </tr>
                ) : (
                  pendingDiscounts.map((pu) => (
                    <tr key={pu.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#64748b' }}>#{pu.id}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1e293b' }}>{pu.full_name}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{pu.email}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{pu.phone || '098*******'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {pu.discount_type || 'HSSV'} (-20%)
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          ⏳ Chờ duyệt
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleApproveDiscount(pu.id, true)}
                            style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            ✓ Duyệt
                          </button>
                          <button
                            onClick={() => handleApproveDiscount(pu.id, false)}
                            style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            ✕ Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: VOUCHERS MANAGEMENT US18 */}
      {/* ========================================================================= */}
      {activeTab === 'vouchers' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                🎟️ Quản Lý & Phát Hành Mã Giảm Giá Vouchers (US18)
              </h2>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>
                Tạo mã ưu đãi tiền mặt hoặc theo tỷ lệ %, giới hạn số lượng và ngày hết hạn
              </p>
            </div>
            <button
              onClick={() => setShowCreateVoucher(true)}
              style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ➕ Tạo Mã Ưu Đãi Mới
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Mã Code</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Tiêu Đề / Mô Tả</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Loại & Mức Giảm</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Đơn Tối Thiểu</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Ngày Hết Hạn</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                      Chưa có voucher nào trên hệ thống. Bấm nút phía trên để tạo mới.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v) => (
                    <tr key={v.id || v.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase' }}>
                        {v.code || v.id}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#334155' }}>
                        {v.title || v.name || 'Mã giảm giá SmartBus'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#059669' }}>
                        {v.discount_type === 'percentage'
                          ? `Giảm ${v.discount_value}%`
                          : `Giảm ${Number(v.discount_value || 0).toLocaleString('vi-VN')} đ`}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {Number(v.min_order_value || v.minOrder || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {v.expiry_date || v.expiryDate || '2026-12-31'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                          ✓ Đang hoạt động
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Tạo Voucher */}
          {showCreateVoucher && (
            <CreateVoucher
              onClose={() => setShowCreateVoucher(false)}
              onCreated={(newV) => {
                setVouchers((prev) => [newV, ...prev]);
                showToast(`Đã tạo mã ưu đãi ${newV.code} thành công!`);
              }}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REFUND MANAGEMENT US08 */}
      {/* ========================================================================= */}
      {activeTab === 'refunds' && (
        <div>
          <RefundManagement />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: FEEDBACKS MANAGEMENT US24 */}
      {/* ========================================================================= */}
      {activeTab === 'feedbacks' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                💬 Quản Lý Đánh Giá & Góp Ý Của Hành Khách (US24)
              </h2>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>
                Lắng nghe trải nghiệm người dùng, giám sát chất lượng tài xế, phụ xe và phương tiện
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['ALL', 'pending', 'resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFeedbackFilter(st)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: feedbackFilter === st ? '#2563eb' : '#e2e8f0',
                    backgroundColor: feedbackFilter === st ? '#eff6ff' : 'white',
                    color: feedbackFilter === st ? '#2563eb' : '#64748b',
                    fontSize: '12px',
                    fontWeight: feedbackFilter === st ? 'bold' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {st === 'ALL' ? 'Tất cả' : st === 'pending' ? 'Chưa phản hồi' : 'Đã phản hồi'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>ID</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Khách Hàng</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Đánh Giá (Sao)</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Phân Loại</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Nội Dung Góp Ý</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Thời Gian</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                      Chưa có phản hồi nào phù hợp tiêu chí lọc.
                    </td>
                  </tr>
                ) : (
                  filteredFeedbacks.map((fb) => (
                    <tr key={fb.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#64748b' }}>#{fb.id}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1e293b' }}>
                        {fb.user_name || fb.full_name || 'Hành khách'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#eab308', fontWeight: 'bold' }}>
                        {'⭐'.repeat(fb.rating_stars || fb.rating || 5)} ({fb.rating_stars || fb.rating || 5}/5)
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                          {fb.category || 'Dịch vụ'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155', maxWidth: '300px' }}>
                        {fb.comment || fb.content}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                        {fb.created_at || 'Vừa xong'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          onClick={() => handleUpdateFeedback(fb.id, fb.status === 'resolved' ? 'pending' : 'resolved')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            backgroundColor: fb.status === 'resolved' ? '#dcfce7' : '#fef3c7',
                            color: fb.status === 'resolved' ? '#166534' : '#92400e',
                          }}
                        >
                          {fb.status === 'resolved' ? '✓ Đã phản hồi' : '⏳ Tiếp nhận'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: AUDIT LOGS US17 */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                🛡️ Nhật Ký Kiểm Toán Hoạt Động Hệ Thống (Audit Logs US17)
              </h2>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>
                Ghi nhận chi tiết mọi hành vi soát vé, thanh toán, phân quyền và xuất báo cáo
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value="ALL">Tất cả hành động</option>
                <option value="LOGIN">Đăng nhập (LOGIN)</option>
                <option value="ROLE_CHANGE">Đổi quyền (ROLE_CHANGE)</option>
                <option value="TICKET_BOARD">Soát vé (TICKET_BOARD)</option>
                <option value="PAYMENT">Thanh toán (PAYMENT)</option>
                <option value="DISCOUNT">Ưu đãi (DISCOUNT)</option>
              </select>
              <button
                onClick={loadAuditLogs}
                style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
              >
                🔄 Tải lại
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>ID</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Thời Gian</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Người Thực Hiện</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Hành Động</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Chi Tiết Thao Tác</th>
                  <th style={{ padding: '10px 12px', fontWeight: '700' }}>Địa Chỉ IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                      Chưa có bản ghi kiểm toán nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#64748b' }}>#{log.id}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                        {log.created_at || 'Vừa xong'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#1e293b' }}>
                        {log.user_email || log.user_id ? `User #${log.user_id}` : 'Hệ thống'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>
                        {log.details || log.description || log.extra_info}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: RBAC MATRIX & ARCHITECTURE */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>👤</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534', margin: '0 0 8px 0' }}>Actor 1: Hành Khách (HanhKhach)</h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>Khách hàng đặt vé cá nhân, gia đình hoặc vé tháng.</p>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
              <li>Tìm kiếm chuyến xe (HCM - Đà Lạt: 8 chuyến hàng ngày)</li>
              <li>Chọn sơ đồ ghế trực quan và áp mã voucher ưu đãi (US18)</li>
              <li>Nộp minh chứng ưu đãi HSSV giảm 20% (US23)</li>
              <li>Gửi yêu cầu hủy vé hoàn tiền online (US08) & Tra cứu tiến độ</li>
              <li>Gửi phản ánh, đánh giá sao dịch vụ (US24) & Chatbot hỗ trợ 24/7</li>
            </ul>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🚌</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#92400e', margin: '0 0 8px 0' }}>Actor 2: Tài Xế (TaiXe)</h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>Nhân sự lái xe trực tiếp điều khiển phương tiện trên tuyến.</p>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
              <li>Xem danh sách chuyến xe được phân công theo ca</li>
              <li>Mở danh sách hành khách lên xe (Passenger Manifest)</li>
              <li>Quét mã QR soát vé tại cửa xe, phòng ngừa gian lận vé trùng</li>
              <li>Bấm xác nhận khách đã lên xe (Check-in Onboard)</li>
            </ul>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎫</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#6b21a8', margin: '0 0 8px 0' }}>Actor 3: Phụ Xe & Nhân Viên Quầy (PhuXe)</h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>Hỗ trợ hành khách tại bến xe, xếp hành lý và kiểm soát vé.</p>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
              <li>Soát vé điện tử và vé giấy tại quầy/cửa kiểm soát</li>
              <li>Hỗ trợ xuất vé bổ sung cho khách vãng lai</li>
              <li>Kiểm tra trạng thái thẻ vé tháng (HSSV / Công sở)</li>
              <li>Ghi nhận nhật ký soát vé vào hệ thống thời gian thực</li>
            </ul>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #fee2e2', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>👑</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#991b1b', margin: '0 0 8px 0' }}>Actor 4: Quản Trị Viên (Admin)</h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>Ban giám đốc, quản trị viên vận hành hệ thống thông tin.</p>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
              <li>Toàn quyền phân quyền RBAC cho cả 4 nhóm actor</li>
              <li>Xem báo cáo Doanh thu, Tỷ lệ lấp đầy ghế (Occupancy) & Xuất CSV</li>
              <li>Duyệt hồ sơ ưu đãi sinh viên / linh hoạt (US23)</li>
              <li>Cấp phát & quản lý mã ưu đãi Voucher (US18)</li>
              <li>Xem xét và phê duyệt hoàn tiền vé (US08)</li>
              <li>Quản lý góp ý đánh giá (US24) & Giám sát Audit Logs (US17)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
