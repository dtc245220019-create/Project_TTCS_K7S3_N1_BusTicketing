import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCurrentUser,
  setCurrentUser,
  getAdminUsers,
  updateUserRole,
  getAdminStats,
  getAdminTrips,
  getTripSeats,
  getRecentInspections,
  updateTripStatus,
} from '../api';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [currentUser, setUser] = useState(getCurrentUser());
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsErrors, setAnalyticsErrors] = useState([]);
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [searchUser, setSearchUser] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: 'success' });
  const [updatingUserId, setUpdatingUserId] = useState(null);

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

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsErrors([]);

    const [tripsResult, auditResult] = await Promise.allSettled([
      getAdminTrips(),
      getRecentInspections(),
    ]);
    const errors = [];
    let tripList = trips;

    if (tripsResult.status === 'fulfilled') {
      tripList = tripsResult.value?.trips || tripsResult.value || [];
      setTrips(tripList);
    } else {
      errors.push(`Không tải được danh sách chuyến: ${tripsResult.reason?.message || 'Lỗi không xác định'}`);
    }

    if (auditResult.status === 'fulfilled') {
      setAuditLogs(auditResult.value?.inspections || auditResult.value || []);
    } else {
      setAuditLogs([]);
      errors.push(`Không tải được audit log: ${auditResult.reason?.message || 'Lỗi không xác định'}`);
    }

    const occupancyResults = await Promise.allSettled(
      tripList.map(async (trip) => {
        const response = await getTripSeats(trip.id);
        const seats = response?.seats || [];
        const bookedSeats = seats.filter((seat) => seat.status === 'BOOKED').length;
        const heldSeats = seats.filter((seat) => seat.status === 'HELD').length;
        const totalSeats = Number(response?.total_seats) || seats.length;

        return {
          ...trip,
          bookedSeats,
          heldSeats,
          totalSeats,
          occupancyRate: totalSeats ? Math.round((bookedSeats / totalSeats) * 100) : 0,
        };
      })
    );
    const occupancyRows = occupancyResults.flatMap((result, index) => {
      if (result.status === 'fulfilled') return [result.value];
      errors.push(`Không tải được sơ đồ ghế chuyến ${tripList[index]?.trip_code || tripList[index]?.id}: ${result.reason?.message || 'Lỗi không xác định'}`);
      return [{
        ...tripList[index],
        error: true,
      }];
    });
    setOccupancy(occupancyRows);
    setAnalyticsErrors(errors);
    setAnalyticsLoading(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingUserId(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setFeedbackMsg({
        text: `Đã phân quyền thành công! Người dùng #${userId} hiện có vai trò: ${newRole}.`,
        type: 'success',
      });
      setTimeout(() => setFeedbackMsg({ text: '', type: 'success' }), 4000);
    } catch (err) {
      setFeedbackMsg({
        text: `Lỗi cập nhật vai trò: ${err.message || 'Không thể lưu'}`,
        type: 'error',
      });
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
      setFeedbackMsg({
        text: `Đã cập nhật trạng thái chuyến #${tripId} thành "${newStatus}".`,
        type: 'success',
      });
      setTimeout(() => setFeedbackMsg({ text: '', type: 'success' }), 4000);
    } catch (err) {
      setFeedbackMsg({
        text: `Lỗi đổi trạng thái chuyến: ${err.message || 'Không thể lưu'}`,
        type: 'error',
      });
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
  const filteredAuditLogs =
    auditFilter === 'ALL' ? auditLogs : auditLogs.filter((log) => log.result === auditFilter);
  const totalOccupancySeats = occupancy.reduce((sum, trip) => sum + (trip.error ? 0 : trip.totalSeats), 0);
  const bookedOccupancySeats = occupancy.reduce((sum, trip) => sum + (trip.bookedSeats || 0), 0);
  const overallOccupancy = totalOccupancySeats
    ? Math.round((bookedOccupancySeats / totalOccupancySeats) * 100)
    : 0;
  const formatMoney = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} đ`;
  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
  };

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

  // Render Access Denied Guard if not Admin
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
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px', minHeight: '85vh' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: 'white',
          marginBottom: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 10px 30px rgba(30, 27, 75, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
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
              ACTOR 4: QUẢN TRỊ VIÊN HỆ THỐNG (RBAC)
            </span>
            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>| Phiên làm việc: {currentUser?.email}</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            👑 Trung Tâm Quản Trị & Phân Quyền Thông Minh
          </h1>
          <p style={{ margin: 0, color: '#e0e7ff', fontSize: '14px', maxWidth: '640px' }}>
            Quản trị 4 nhóm quyền độc lập (Hành khách, Tài xế, Phụ xe, Admin). Điều phối tuyến đường,
            theo dõi doanh thu và giám sát vận hành toàn hệ thống theo thời gian thực.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              loadAdminData();
              if (activeTab === 'analytics') loadAnalytics();
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '10px 18px',
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
          <Link
            to="/buses"
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '10px 18px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🚌 Xem Tuyến HCM-ĐL
          </Link>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            💰 Tổng Doanh Thu Vé
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669' }}>
            {stats?.total_revenue != null
              ? Number(stats.total_revenue).toLocaleString('vi-VN') + ' đ'
              : 'Đang tính...'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Doanh thu ghi nhận qua các cổng</div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            🎫 Tổng Vé Đã Đặt
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#2563eb' }}>
            {stats?.total_tickets ?? stats?.paid_tickets ?? '---'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Vé thường & vé điện tử</div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            🚌 Chuyến Đang Vận Hành
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706' }}>
            {stats?.total_trips ?? trips.length} chuyến
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Bao gồm 8 chuyến HCM ➔ Đà Lạt</div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            👥 Người Dùng Hệ Thống
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#7c3aed' }}>
            {stats?.total_users ?? users.length} thành viên
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Được phân 4 vai trò rõ ràng</div>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            💳 Tổng Vé Tháng
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0891b2' }}>
            {stats?.total_monthly_passes ?? '---'} thẻ
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Học sinh, sinh viên, công sở</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #e2e8f0',
          gap: '24px',
          marginBottom: '24px',
        }}
      >
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '12px 16px',
            fontWeight: '700',
            fontSize: '15px',
            border: 'none',
            background: 'none',
            color: activeTab === 'users' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'users' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>👥</span> Phân Quyền Người Dùng (4 Actors RBAC)
          <span
            style={{
              backgroundColor: activeTab === 'users' ? '#eff6ff' : '#f1f5f9',
              color: activeTab === 'users' ? '#2563eb' : '#64748b',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          >
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('trips')}
          style={{
            padding: '12px 16px',
            fontWeight: '700',
            fontSize: '15px',
            border: 'none',
            background: 'none',
            color: activeTab === 'trips' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'trips' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🚌</span> Điều Phối Chuyến Xe ({trips.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('analytics');
            loadAnalytics();
          }}
          style={{
            padding: '12px 16px',
            fontWeight: '700',
            fontSize: '15px',
            border: 'none',
            background: 'none',
            color: activeTab === 'analytics' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'analytics' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📊</span> Doanh thu · Lấp đầy · Audit log
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 16px',
            fontWeight: '700',
            fontSize: '15px',
            border: 'none',
            background: 'none',
            color: activeTab === 'overview' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'overview' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🛡️</span> Cấu Trúc Quyền Hạn & Ma Trận Truy Cập
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT & ROLE RBAC */}
      {activeTab === 'users' && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          }}
        >
          {/* Controls bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            {/* Search */}
            <div style={{ flex: '1', minWidth: '260px', maxWidth: '420px', position: 'relative' }}>
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="🔍 Tìm theo Tên, Email hoặc Số điện thoại..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Role Filter Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: filterRole === rf.key ? '#2563eb' : '#e2e8f0',
                    backgroundColor: filterRole === rf.key ? '#eff6ff' : 'white',
                    color: filterRole === rf.key ? '#2563eb' : '#64748b',
                    fontSize: '13px',
                    fontWeight: filterRole === rf.key ? 'bold' : 'normal',
                    cursor: 'pointer',
                  }}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>ID</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Họ Và Tên</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Email Liên Hệ</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Số Điện Thoại</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Ưu Đãi</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Vai Trò Hiện Tại</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Phân Quyền Lại (RBAC)</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      Không tìm thấy người dùng phù hợp với tiêu chí lọc.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const badge = getRoleBadge(u.role);
                    const isSelf = currentUser && currentUser.id === u.id;
                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isSelf ? '#f0fdf4' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#64748b' }}>
                          #{u.id}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b' }}>
                          {u.full_name || 'Chưa cập nhật'}
                          {isSelf && (
                            <span
                              style={{
                                marginLeft: '6px',
                                fontSize: '11px',
                                backgroundColor: '#bbf7d0',
                                color: '#166534',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              Bạn
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontFamily: 'monospace' }}>
                          {u.email}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {u.phone || '098*******'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {u.discount_type && u.discount_type !== 'Khong' ? (
                            <span
                              style={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                              }}
                            >
                              {u.discount_type} (-20%)
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Thường</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <select
                            value={u.role}
                            disabled={updatingUserId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '13px',
                              fontWeight: '600',
                              backgroundColor: updatingUserId === u.id ? '#f1f5f9' : 'white',
                              color: '#1e293b',
                              cursor: updatingUserId === u.id ? 'wait' : 'pointer',
                              outline: 'none',
                            }}
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

          <div
            style={{
              marginTop: '20px',
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#64748b',
              lineHeight: 1.6,
            }}
          >
            💡 <b>Hướng dẫn phân quyền:</b> Khi Admin chọn một vai trò mới từ dropdown, hệ thống sẽ thực thi ngay API{' '}
            <code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>
              PUT /api/v1/admin/users/{'{user_id}'}/role
            </code>
            , cập nhật cơ sở dữ liệu và giới hạn quyền truy cập của người dùng đó theo đúng quy định.
          </div>
        </div>
      )}

      {/* TAB 2: TRIP DISPATCHING & MANAGEMENT */}
      {activeTab === 'trips' && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                🚌 Danh Sách Chuyến Xe & Điều Phối Tuyến
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                Hệ thống gồm các tuyến trọng điểm (Hồ Chí Minh ➔ Đà Lạt: 8 chuyến hàng ngày)
              </p>
            </div>
            <Link
              to="/buses?origin=Hồ%20Chí%20Minh&destination=Đà%20Lạt"
              style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              🔍 Xem trang đặt vé HCM ➔ Đà Lạt
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>ID</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Tuyến Xe</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Khởi Hành</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Xe & Biển Số</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Giá Vé</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Ghế Trống</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Tài Xế Phụ Trách</th>
                  <th style={{ padding: '12px 14px', fontWeight: '700' }}>Trạng Thái Vận Hành</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      Chưa có chuyến xe nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  trips.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 'bold', color: '#64748b' }}>
                        #{t.id}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b' }}>
                        {t.origin} ➔ {t.destination}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#2563eb', fontWeight: '600' }}>
                        🕒 {t.departure_time?.slice(11, 16) || t.departure_time || '08:00'} ({t.departure_time?.slice(0, 10)})
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 'bold', color: '#334155' }}>{t.license_plate || '51B-888.99'}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t.bus_type || 'Limousine 34 Phòng'}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#059669' }}>
                        {Number(t.price || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {t.available_seats ?? 28} chỗ
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {t.driver_name || 'Trần Văn Tài (Tài Xế)'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <select
                          value={t.status || 'SCHEDULED'}
                          onChange={(e) => handleTripStatusChange(t.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor:
                              t.status === 'BOARDING'
                                ? '#fef3c7'
                                : t.status === 'DEPARTED'
                                ? '#e0f2fe'
                                : t.status === 'COMPLETED'
                                ? '#dcfce7'
                                : 'white',
                            color: '#1e293b',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="SCHEDULED">📅 Đúng Lịch (SCHEDULED)</option>
                          <option value="BOARDING">🚶 Đón Khách (BOARDING)</option>
                          <option value="DEPARTED">🚍 Đang Chạy (DEPARTED)</option>
                          <option value="COMPLETED">🏁 Đã Đến (COMPLETED)</option>
                          <option value="CANCELLED">❌ Hủy Chuyến (CANCELLED)</option>
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

      {activeTab === 'analytics' && (
        <section className="admin-analytics" aria-label="Báo cáo doanh thu, lấp đầy và audit log">
          <div className="admin-analytics-heading">
            <div>
              <h2>Phân tích vận hành</h2>
              <p>Doanh thu đã thanh toán, tình trạng ghế theo chuyến và lịch sử soát vé.</p>
            </div>
            <button
              className="admin-analytics-refresh"
              type="button"
              onClick={loadAnalytics}
              disabled={analyticsLoading}
            >
              {analyticsLoading ? 'Đang đồng bộ…' : '↻ Làm mới dữ liệu'}
            </button>
          </div>

          {analyticsErrors.length > 0 && (
            <div className="admin-analytics-alert" role="alert">
              <strong>Một số dữ liệu chưa tải được.</strong>
              <ul>
                {analyticsErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}

          <section className="admin-analytics-panel">
            <div className="admin-analytics-panel-heading">
              <div>
                <span className="admin-analytics-eyebrow">TÀI CHÍNH</span>
                <h3>Doanh thu hệ thống</h3>
              </div>
              <span className="admin-analytics-source">Tổng giao dịch SUCCESS</span>
            </div>
            <div className="admin-revenue-summary">
              <article className="admin-revenue-primary">
                <span>Tổng doanh thu ghi nhận</span>
                <strong>{stats ? formatMoney(stats.total_revenue) : 'Đang tải…'}</strong>
                <small>Số liệu lũy kế từ các thanh toán thành công</small>
              </article>
              <article className="admin-revenue-secondary">
                <span>Vé đã ghi nhận</span>
                <strong>{stats?.total_tickets ?? '—'}</strong>
                <small>Toàn bộ vé trong hệ thống</small>
              </article>
              <article className="admin-revenue-secondary">
                <span>Doanh thu / vé</span>
                <strong>
                  {stats?.total_tickets
                    ? formatMoney(Number(stats.total_revenue || 0) / Number(stats.total_tickets))
                    : '—'}
                </strong>
                <small>Ước tính từ tổng doanh thu và số vé</small>
              </article>
            </div>

            <div className="admin-analytics-subheading">
              <div>
                <h4>Đơn đặt gần đây</h4>
                <p>Giá trị đơn không đồng nghĩa với doanh thu đã thanh toán.</p>
              </div>
            </div>
            <div className="admin-analytics-table-wrap">
              <table className="admin-analytics-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Hành khách</th>
                    <th>Tuyến</th>
                    <th>Giá trị đơn</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recent_bookings || []).length === 0 ? (
                    <tr><td className="admin-analytics-empty" colSpan="5">
                      {stats ? 'Chưa có đơn đặt vé.' : 'Đang tải dữ liệu doanh thu…'}
                    </td></tr>
                  ) : (
                    stats.recent_bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="admin-analytics-strong">{booking.booking_code || `#${booking.id}`}</td>
                        <td>{booking.customer_name || 'Khách hàng'}</td>
                        <td>{booking.origin || '—'} → {booking.destination || '—'}</td>
                        <td>{formatMoney(booking.total_amount)}</td>
                        <td><span className={`admin-status-badge status-${String(booking.status || '').toLowerCase()}`}>
                          {booking.status || '—'}
                        </span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-analytics-panel">
            <div className="admin-analytics-panel-heading">
              <div>
                <span className="admin-analytics-eyebrow">ĐIỀU PHỐI</span>
                <h3>Tình trạng lấp đầy ghế</h3>
              </div>
              <div className="admin-occupancy-summary">
                <strong>{overallOccupancy}%</strong>
                <span>lấp đầy · {bookedOccupancySeats}/{totalOccupancySeats} ghế đã đặt</span>
              </div>
            </div>
            <div className="admin-analytics-table-wrap">
              <table className="admin-analytics-table">
                <thead>
                  <tr>
                    <th>Chuyến xe</th>
                    <th>Khởi hành</th>
                    <th>Ghế đã đặt</th>
                    <th>Đang giữ</th>
                    <th>Tỷ lệ lấp đầy</th>
                  </tr>
                </thead>
                <tbody>
                  {occupancy.length === 0 ? (
                    <tr><td className="admin-analytics-empty" colSpan="5">
                      {analyticsLoading ? 'Đang tải trạng thái ghế…' : 'Chưa có dữ liệu chuyến xe.'}
                    </td></tr>
                  ) : occupancy.map((trip) => (
                    <tr key={trip.id}>
                      <td>
                        <span className="admin-analytics-strong">{trip.trip_code || `Chuyến #${trip.id}`}</span>
                        <small className="admin-analytics-route">{trip.origin} → {trip.destination}</small>
                      </td>
                      <td>{formatDateTime(trip.departure_at)}</td>
                      {trip.error ? (
                        <td className="admin-analytics-row-error" colSpan="3">Không tải được trạng thái ghế.</td>
                      ) : (
                        <>
                          <td>{trip.bookedSeats}/{trip.totalSeats}</td>
                          <td>{trip.heldSeats}</td>
                          <td>
                            <div className="admin-occupancy-cell">
                              <div className="admin-occupancy-track" aria-label={`${trip.occupancyRate}% lấp đầy`}>
                                <span style={{ width: `${trip.occupancyRate}%` }} />
                              </div>
                              <strong>{trip.occupancyRate}%</strong>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="admin-analytics-footnote">
              Tỷ lệ tính theo ghế BOOKED; ghế HELD được hiển thị riêng và chưa tính là vé đã bán.
            </p>
          </section>

          <section className="admin-analytics-panel">
            <div className="admin-analytics-panel-heading">
              <div>
                <span className="admin-analytics-eyebrow">KIỂM SOÁT</span>
                <h3>Audit log soát vé</h3>
                <p>10 lượt kiểm tra gần nhất được ghi nhận bởi nhân viên vận hành.</p>
              </div>
              <label className="admin-audit-filter">
                <span>Lọc kết quả</span>
                <select value={auditFilter} onChange={(event) => setAuditFilter(event.target.value)}>
                  <option value="ALL">Tất cả</option>
                  <option value="VALID">Hợp lệ</option>
                  <option value="ALREADY_USED">Đã sử dụng</option>
                  <option value="CANCELLED">Đã hủy</option>
                  <option value="INVALID">Không hợp lệ</option>
                  <option value="UNPAID">Chưa thanh toán</option>
                </select>
              </label>
            </div>
            <div className="admin-analytics-table-wrap">
              <table className="admin-analytics-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Mã vé</th>
                    <th>Nhân viên</th>
                    <th>Kết quả</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.length === 0 ? (
                    <tr><td className="admin-analytics-empty" colSpan="5">
                      {analyticsLoading ? 'Đang tải audit log…' : 'Không có bản ghi phù hợp.'}
                    </td></tr>
                  ) : filteredAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.inspected_at)}</td>
                      <td className="admin-analytics-strong">{log.ticket_code || '—'}</td>
                      <td>{log.staff_email || `Nhân viên #${log.staff_user_id || '—'}`}</td>
                      <td>
                        <span className={`admin-status-badge audit-${String(log.result || '').toLowerCase()}`}>
                          {({
                            VALID: 'Hợp lệ',
                            ALREADY_USED: 'Đã sử dụng',
                            CANCELLED: 'Đã hủy',
                            INVALID: 'Không hợp lệ',
                            UNPAID: 'Chưa thanh toán',
                          })[log.result] || log.result || 'Không rõ'}
                        </span>
                      </td>
                      <td>{log.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {/* TAB 3: RBAC MATRIX & ARCHITECTURE */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>👤</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534', margin: '0 0 8px 0' }}>
              Actor 1: Hành Khách (HanhKhach)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              Khách hàng đặt vé cá nhân, gia đình hoặc theo đoàn.
            </p>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
              <li>Tìm kiếm chuyến xe (HCM - Đà Lạt, HN - Thái Nguyên...)</li>
              <li>Chọn sơ đồ ghế trực quan và áp mã giảm giá HSSV (-20%)</li>
              <li>Xem vé sắp tới & <b>toàn bộ vé đã đi trong quá khứ</b></li>
              <li>In vé điện tử, quét QR, đổi/hủy vé tự phục vụ</li>
              <li><b style={{ color: '#dc2626' }}>Không có quyền:</b> Soát vé, xem doanh thu, phân quyền</li>
            </ul>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🚌</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#92400e', margin: '0 0 8px 0' }}>
              Actor 2: Tài Xế (TaiXe)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              Nhân sự lái xe trực tiếp điều khiển phương tiện trên đường.
            </p>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
              <li>Xem danh sách chuyến xe được phân công theo ca</li>
              <li><b>Mở danh sách hành khách lên xe (Passenger Manifest)</b></li>
              <li>Quét mã QR soát vé tại cửa xe, phòng ngừa gian lận vé trùng</li>
              <li>Bấm xác nhận khách đã lên xe (Check-in Onboard)</li>
              <li><b style={{ color: '#dc2626' }}>Không có quyền:</b> Cấu hình hệ thống, đổi quyền user</li>
            </ul>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎫</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#6b21a8', margin: '0 0 8px 0' }}>
              Actor 3: Phụ Xe & Nhân Viên Quầy (PhuXe)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              Hỗ trợ hành khách tại bến xe, xếp hành lý và kiểm soát vé.
            </p>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
              <li>Soát vé điện tử và vé giấy tại cửa kiểm soát</li>
              <li>Hỗ trợ xuất vé bổ sung cho khách vãng lai</li>
              <li>Kiểm tra trạng thái thẻ vé tháng (HSSV / Công sở)</li>
              <li>Ghi nhận nhật ký soát vé vào hệ thống thời gian thực</li>
              <li><b style={{ color: '#dc2626' }}>Không có quyền:</b> Phân quyền người dùng, hủy chuyến</li>
            </ul>
          </div>

          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #fee2e2',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>👑</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#991b1b', margin: '0 0 8px 0' }}>
              Actor 4: Quản Trị Viên (Admin)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
              Ban giám đốc, quản trị viên vận hành hệ thống thông tin.
            </p>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
              <li><b>Toàn quyền phân quyền RBAC cho cả 4 nhóm actor</b></li>
              <li>Thống kê KPI doanh thu, số vé, chuyến xe, thẻ vé tháng</li>
              <li>Điều phối chuyến xe, phân công tài xế cho từng chặng</li>
              <li>Cấu hình phí dịch vụ, hoàn/hủy và ưu đãi giảm giá</li>
              <li>Truy cập mọi chức năng kiểm toán và bảo mật cao cấp</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
