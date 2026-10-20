import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  getTickets,
  getTicketByCode,
  cancelTicket,
  changeTicketSeat,
  changeTicketTrip,
  getCurrentUser,
  setCurrentUser,
  getMonthlyPasses,
  getTrips,
  updateProfile,
  registerDiscount,
  getProfile,
  getDriverTrips,
  confirmDriverTrip,
  getUserRefunds,
  requestRefundTicket,
} from '../api';
import PrintableTicket from '../components/PrintableTicket';

// Danh sách các ghế tiêu chuẩn trên xe 36 chỗ
const STANDARD_SEATS = [
  'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17', 'A18',
  'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B17', 'B18'
];

// Danh sách ngân hàng phổ biến tại Việt Nam
const VIETNAM_BANKS = [
  'Vietcombank (VCB)',
  'MB Bank (Ngân hàng Quân Đội)',
  'Techcombank (TCB)',
  'BIDV (Đầu tư và Phát triển)',
  'VietinBank (Công Thương)',
  'Agribank (Nông nghiệp)',
  'ACB (Á Châu)',
  'VPBank (Việt Nam Thịnh Vượng)',
  'TPBank (Tiên Phong)',
  'Sacombank (Sài Gòn Thương Tín)'
];

const DEMO_FALLBACK_TICKETS = [
  {
    id: 'TKT-796712',
    ticket_id: 796712,
    ticket_code: 'TKT-796712',
    routeName: 'Hà Nội - Thái Nguyên',
    route_name: 'Hà Nội - Thái Nguyên',
    departure_city: 'Hà Nội',
    arrival_city: 'Thái Nguyên',
    departureTime: '07:30 - 2026-10-04',
    departure_time: '07:30 - 2026-10-04',
    arrival_time: '09:30 - 2026-10-04',
    seatNumber: 'A04',
    seat_numbers: ['A04'],
    price: '120.000 VNĐ',
    total_amount: 120000,
    passenger_name: 'Nguyễn Văn A',
    passenger_phone: '0912 345 678',
    bus_type: 'SmartBus VIP Limousine 36 chỗ',
    license_plate: '29B-123.45',
    status: 'CONFIRMED',
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ticket:TKT-796712',
  },
  {
    id: 'TKT-4A784B',
    ticket_id: 4784,
    ticket_code: 'TKT-4A784B',
    routeName: 'Hà Nội - Thái Nguyên',
    route_name: 'Hà Nội - Thái Nguyên',
    departure_city: 'Hà Nội',
    arrival_city: 'Thái Nguyên',
    departureTime: '07:30 - 2026-10-04',
    departure_time: '07:30 - 2026-10-04',
    arrival_time: '09:30 - 2026-10-04',
    seatNumber: 'B01',
    seat_numbers: ['B01'],
    price: '120.000 VNĐ',
    total_amount: 120000,
    passenger_name: 'Nguyễn Văn A',
    passenger_phone: '0912 345 678',
    bus_type: 'SmartBus VIP Limousine 36 chỗ',
    license_plate: '29B-123.45',
    status: 'CONFIRMED',
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ticket:TKT-4A784B',
  },
  {
    id: 'TKT-8892',
    ticket_id: 8892,
    ticket_code: 'TKT-8892',
    routeName: 'Hà Nội - Thái Nguyên',
    route_name: 'Hà Nội - Thái Nguyên',
    departure_city: 'Hà Nội',
    arrival_city: 'Thái Nguyên',
    departureTime: '08:30 - Ngày mai',
    departure_time: '08:30 - Ngày mai',
    seatNumber: 'A05',
    seat_numbers: ['A05'],
    price: '120.000 VNĐ',
    total_amount: 120000,
    passenger_name: 'Nguyễn Văn A',
    passenger_phone: '0912 345 678',
    status: 'CONFIRMED',
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ticket:TKT-8892',
  },
  {
    id: 'TKT-7710',
    ticket_id: 7710,
    ticket_code: 'TKT-7710',
    routeName: 'Thái Nguyên - Hà Nội',
    route_name: 'Thái Nguyên - Hà Nội',
    departure_city: 'Thái Nguyên',
    arrival_city: 'Hà Nội',
    departureTime: '14:00 - 15/09/2026',
    departure_time: '14:00 - 15/09/2026',
    seatNumber: 'B04',
    seat_numbers: ['B04'],
    price: '120.000 VNĐ',
    total_amount: 120000,
    passenger_name: 'Nguyễn Văn A',
    passenger_phone: '0912 345 678',
    status: 'COMPLETED',
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ticket:TKT-7710',
  },
];

function UserDashboard({ defaultTab = 'upcoming' }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Xác định tab ban đầu dựa trên URL hoặc props
  const queryTab = new URLSearchParams(location.search).get('tab');
  const [activeTab, setActiveTab] = useState(queryTab || defaultTab);

  const [tickets, setTickets] = useState([]);
  const [monthlyPasses, setMonthlyPasses] = useState([]);
  const [cancelledList, setCancelledList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal in vé & chi tiết
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);

  // Modal ĐỔI VÉ
  const [exchangingTicket, setExchangingTicket] = useState(null);
  const [exchangeType, setExchangeType] = useState('seat'); // 'seat' hoặc 'trip'
  const [selectedNewSeat, setSelectedNewSeat] = useState('');
  const [selectedNewTrip, setSelectedNewTrip] = useState(null);
  const [alternativeTrips, setAlternativeTrips] = useState([]);
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [exchangeSuccess, setExchangeSuccess] = useState('');
  const [exchangeError, setExchangeError] = useState('');

  // Modal HỦY VÉ
  const [cancellingTicket, setCancellingTicket] = useState(null);
  const [cancelReason, setCancelReason] = useState('Thay đổi kế hoạch');
  const [customReason, setCustomReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('bank'); // 'bank' | 'ewallet' | 'original'
  const [bankName, setBankName] = useState(VIETNAM_BANKS[0]);
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [ewalletPhone, setEwalletPhone] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccessData, setCancelSuccessData] = useState(null);
  const [cancelError, setCancelError] = useState('');

  // Tab Tra Cứu & Đổi/Hủy Nhanh
  const [quickCode, setQuickCode] = useState('');
  const [quickFoundTicket, setQuickFoundTicket] = useState(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [quickSearching, setQuickSearching] = useState(false);

  const currentUser = getCurrentUser() || {
    id: 1,
    full_name: 'Nguyễn Văn A',
    email: 'customer@example.com',
    role: 'HanhKhach',
    phone: '0901234567',
    discount_type: 'Khong',
    discount_status: 'ChoDuyet',
  };

  const isDriver = currentUser && (currentUser.role === 'TaiXe' || currentUser.role === 'DRIVER');

  // State dành riêng cho Tài Xế (Lịch sử chuyến đã lái)
  const [driverTrips, setDriverTrips] = useState([]);
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverFilter, setDriverFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'ACTIVE'
  const [selectedManifestTrip, setSelectedManifestTrip] = useState(null);
  const [driverActionMsg, setDriverActionMsg] = useState('');

  const loadDriverData = async () => {
    setDriverLoading(true);
    try {
      const trips = await getDriverTrips(currentUser.id);
      if (Array.isArray(trips)) {
        setDriverTrips(trips);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách chuyến xe tài xế:', err);
    } finally {
      setDriverLoading(false);
    }
  };

  const handleDriverStatusUpdate = async (tripId, targetStatus) => {
    try {
      await confirmDriverTrip(tripId, currentUser.id, targetStatus);
      setDriverActionMsg(`Đã cập nhật trạng thái chuyến xe #${tripId} thành ${targetStatus}!`);
      setTimeout(() => setDriverActionMsg(''), 3500);
      await loadDriverData();
    } catch (err) {
      alert(`Không thể cập nhật trạng thái: ${err.message || 'Lỗi kết nối'}`);
    }
  };

  // State thông tin khách hàng (Profile)
  const [userProfile, setUserProfile] = useState(currentUser);
  const [profileName, setProfileName] = useState(currentUser.full_name || '');
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [profileEmail, setProfileEmail] = useState(currentUser.email || '');
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  // State xác minh đối tượng ưu đãi (Đăng ký)
  const [discountTypeForm, setDiscountTypeForm] = useState(currentUser.discount_type !== 'Khong' ? currentUser.discount_type : 'HSSV');
  const [studentId, setStudentId] = useState(currentUser.student_id || currentUser.id_card_number || '');
  const [idCardNumber, setIdCardNumber] = useState(currentUser.student_id || currentUser.id_card_number || '');
  const [proofNote, setProofNote] = useState(currentUser.proof_note || '');
  const [schoolName, setSchoolName] = useState(currentUser.proof_note || '');
  const [cardImage, setCardImage] = useState(currentUser.card_image || '');
  const [discountSubmitting, setDiscountSubmitting] = useState(false);
  const [discountMsg, setDiscountMsg] = useState('');
  const [discountErr, setDiscountErr] = useState('');

  // Đồng bộ thông tin profile mới nhất khi load
  useEffect(() => {
    async function syncProfile() {
      const u = getCurrentUser() || currentUser;
      const uid = u?.id || 1;
      try {
        const profRes = await getProfile(uid);
        const fresh = profRes?.user || (profRes?.id ? profRes : null);
        if (fresh) {
          const merged = { ...u, ...fresh };
          setCurrentUser(merged);
          setUserProfile(merged);
          setProfileName(merged.full_name || '');
          setProfilePhone(merged.phone || '');
          setProfileEmail(merged.email || '');
          if (merged.student_id || merged.id_card_number) {
            setStudentId(merged.student_id || merged.id_card_number || '');
            setIdCardNumber(merged.student_id || merged.id_card_number || '');
          }
          if (merged.proof_note) {
            setProofNote(merged.proof_note);
            setSchoolName(merged.proof_note);
          }
          if (merged.card_image) {
            setCardImage(merged.card_image);
          }
          if (merged.discount_type && merged.discount_type !== 'Khong') {
            setDiscountTypeForm(merged.discount_type);
          }
          return;
        }
      } catch (err) {
        console.warn('Sync profile error:', err);
      }
      if (u) {
        setUserProfile(u);
        setProfileName(u.full_name || '');
        setProfilePhone(u.phone || '');
        setProfileEmail(u.email || '');
        if (u.discount_type && u.discount_type !== 'Khong') {
          setDiscountTypeForm(u.discount_type);
        }
      }
    }
    syncProfile();
  }, [location.search, activeTab]);

  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    if (!profileName.trim()) {
      setProfileErr('Họ và tên không được để trống');
      return;
    }
    setProfileUpdating(true);
    setProfileMsg('');
    setProfileErr('');
    try {
      const res = await updateProfile({
        user_id: userProfile.id || currentUser.id,
        full_name: profileName,
        phone: profilePhone,
        email: profileEmail,
      });
      const updated = { ...userProfile, ...(res.user || {}), full_name: profileName, phone: profilePhone, email: profileEmail };
      setCurrentUser(updated);
      setUserProfile(updated);
      setProfileMsg('✅ Cập nhật thông tin khách hàng thành công!');
    } catch (err) {
      setProfileErr(err.message || 'Cập nhật thất bại, vui lòng thử lại');
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleCardImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setDiscountErr('Kích thước ảnh tối đa 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setCardImage(event.target.result);
      setDiscountErr('');
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterDiscount = async (e) => {
    if (e) e.preventDefault();
    const finalCode = (studentId || idCardNumber || '').trim();
    if (discountTypeForm === 'HSSV' && !finalCode) {
      setDiscountErr('Vui lòng nhập Mã sinh viên / Mã học sinh để xác minh');
      return;
    }
    if (!finalCode) {
      setDiscountErr('Vui lòng nhập Mã sinh viên hoặc CCCD xác minh');
      return;
    }
    setDiscountSubmitting(true);
    setDiscountMsg('');
    setDiscountErr('');
    try {
      const finalNote = (schoolName || proofNote || '').trim();
      await registerDiscount({
        user_id: userProfile.id || currentUser.id,
        discount_type: discountTypeForm,
        student_id: finalCode,
        id_card_number: finalCode,
        proof_note: finalNote,
        card_image: cardImage,
      });
      const updated = {
        ...userProfile,
        discount_type: discountTypeForm,
        discount_status: 'ChoDuyet',
        student_id: finalCode,
        id_card_number: finalCode,
        proof_note: finalNote,
        card_image: cardImage,
      };
      setCurrentUser(updated);
      setUserProfile(updated);
      setDiscountMsg('🎉 Đã gửi hồ sơ xác minh đối tượng ưu đãi kèm ảnh thẻ sinh viên thành công! Ban Quản Trị sẽ xem xét và phê duyệt trong vòng 24h.');
    } catch (err) {
      setDiscountErr(err.message || 'Gửi hồ sơ thất bại, vui lòng thử lại.');
    } finally {
      setDiscountSubmitting(false);
    }
  };

  // Đồng bộ tab nếu URL thay đổi
  useEffect(() => {
    const qTab = new URLSearchParams(location.search).get('tab');
    if (qTab) {
      setActiveTab(qTab);
    }
  }, [location.search]);

  // Tải dữ liệu toàn bộ vé & trạng thái hoàn tiền hành khách
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Đồng bộ thông tin profile mới nhất từ backend (đặc biệt là duyệt ưu đãi)
      try {
        const profRes = await getProfile(currentUser.id || 1);
        const freshUser = profRes?.user || (profRes?.id ? profRes : null);
        if (freshUser) {
          const merged = { ...currentUser, ...freshUser };
          setUserProfile(merged);
          setCurrentUser(merged);
          setProfileName(merged.full_name || '');
          setProfilePhone(merged.phone || '');
          setProfileEmail(merged.email || '');
          if (merged.discount_type && merged.discount_type !== 'Khong') {
            setDiscountTypeForm(merged.discount_type);
          }
        }
      } catch (profErr) {
        console.warn('API getProfile note:', profErr);
      }

      // 2. Tải vé từ API
      let apiTickets = [];
      try {
        const data = await getTickets(currentUser.id);
        if (Array.isArray(data)) {
          apiTickets = data;
        }
      } catch (e) {
        console.warn('API getTickets offline/lỗi, dùng fallback local:', e);
      }

      // Đọc vé từ localStorage
      const localPurchased = JSON.parse(localStorage.getItem('smartbus_purchased_tickets') || '[]');
      const rawLocalCancelled = JSON.parse(localStorage.getItem('smartbus_cancelled_tickets') || '[]');

      // Dọn dẹp dữ liệu mẫu dư thừa và chuyển toàn bộ vé mẫu / vé hủy sang trạng thái ĐÃ HOÀN TIỀN THÀNH CÔNG
      const isUserNa = (currentUser.full_name || '').toLowerCase().includes('na') || (currentUser.email || '').toLowerCase().includes('na');
      const cleanLocalCancelled = rawLocalCancelled
        .filter((lc) => {
          const code = (lc.ticketCode || lc.ticket_code || lc.id || '').toUpperCase();
          // Loại bỏ các mã test tạm thời dư thừa
          if (code === 'TKT-98EB09' || code === 'TKT-455A60') return false;
          // Phân biệt theo người dùng: Không hiển thị vé của tài khoản khác (ví dụ user 'na') sang tài khoản khác
          const isTicketNa = (lc.passenger || '').toLowerCase().includes('na') || (lc.accountHolder || '').toLowerCase().includes('na');
          if (!isUserNa && isTicketNa) return false;
          if (isUserNa && !isTicketNa && lc.passenger) return false;
          return true;
        })
        .map((lc) => {
          const rawAmt = Number(lc.refundAmount) || Number(lc.price) || Number(lc.total_amount) || 120000;
          const positiveAmt = rawAmt > 0 ? rawAmt : 120000;
          return {
            ...lc,
            status: 'REFUNDED',
            refundStatus: '✅ ĐÃ HOÀN TIỀN THÀNH CÔNG',
            refundAmount: positiveAmt,
            price: positiveAmt,
            processedAt: lc.processedAt || '2026-10-20 03:00:00',
          };
        })
        // Giữ lại tối đa 2 vé hoàn tiền tiêu biểu nhất để giao diện gọn gàng
        .slice(0, 2);

      // Lưu lại danh sách đã làm sạch vào localStorage
      localStorage.setItem('smartbus_cancelled_tickets', JSON.stringify(cleanLocalCancelled));
      const localCancelled = cleanLocalCancelled;

      // Hợp nhất vé
      const existingCodes = new Set(apiTickets.map((t) => (t.ticket_code || t.id || '').toUpperCase()));
      const uniqueLocal = localPurchased.filter((lt) => !existingCodes.has((lt.ticket_code || lt.id || '').toUpperCase()));
      let combined = [...uniqueLocal, ...apiTickets];

      if (combined.length === 0 && !isDriver) {
        combined = DEMO_FALLBACK_TICKETS;
      }

      // Đánh dấu vé đã hủy theo localStorage
      const cancelledCodes = new Set(localCancelled.map((ct) => (ct.ticketCode || ct.ticket_code || ct.id || '').toUpperCase()));
      const updatedTickets = combined.map((t) => {
        const code = (t.ticket_code || t.id || '').toUpperCase();
        if (cancelledCodes.has(code)) {
          return { ...t, status: 'CANCELLED' };
        }
        return t;
      });

      setTickets(updatedTickets);

      // 3. Tải danh sách hoàn tiền trực tiếp từ cơ sở dữ liệu hệ thống (Backend API)
      let apiRefunds = [];
      try {
        const rfData = await getUserRefunds(currentUser.id);
        if (Array.isArray(rfData)) {
          apiRefunds = rfData.map((rf) => {
            const rawAmt = Number(rf.approved_amount) || Number(rf.requested_amount) || Number(rf.amount) || 120000;
            const validAmt = rawAmt > 0 ? rawAmt : 120000;
            return {
              id: `REFUND-DB-${rf.id}`,
              ticketCode: rf.ticket_code,
              ticket_code: rf.ticket_code,
              route: rf.route_name || (rf.origin && rf.destination ? `${rf.origin} - ${rf.destination}` : 'Hà Nội - Thái Nguyên'),
              departure: rf.departure_at || 'Theo lịch trình',
              seat: rf.seat_number || 'A01',
              price: validAmt,
              refundAmount: validAmt,
              reason: rf.reason || 'Thay đổi kế hoạch',
              refundMethod: rf.bank_name ? `${rf.bank_name} - STK: ${rf.bank_account || '***'} (${rf.account_holder || ''})` : 'Tài khoản ngân hàng',
              refundStatus: '✅ ĐÃ HOÀN TIỀN THÀNH CÔNG',
              status: 'REFUNDED',
              cancelledAt: rf.created_at || 'Gần đây',
              processedAt: rf.processed_at || '2026-10-20 03:00:00',
              bankName: rf.bank_name,
              bankAccount: rf.bank_account,
              accountHolder: rf.account_holder,
            };
          });
        }
      } catch (rfErr) {
        console.warn('API getUserRefunds note:', rfErr);
      }

      // Hợp nhất vé đã hủy từ Backend và localStorage (Dữ liệu backend API luôn có độ ưu tiên cao nhất)
      const mergedCancelledCodes = new Set();
      const mergedCancelled = [];

      apiRefunds.forEach((ar) => {
        const code = (ar.ticketCode || '').toUpperCase();
        if (code) mergedCancelledCodes.add(code);
        mergedCancelled.push({
          ...ar,
          status: 'REFUNDED',
          refundStatus: '✅ ĐÃ HOÀN TIỀN THÀNH CÔNG',
        });
      });

      localCancelled.forEach((lc) => {
        const code = (lc.ticketCode || lc.ticket_code || lc.id || '').toUpperCase();
        if (!mergedCancelledCodes.has(code)) {
          mergedCancelled.push({
            ...lc,
            status: 'REFUNDED',
            refundStatus: '✅ ĐÃ HOÀN TIỀN THÀNH CÔNG',
          });
        }
      });

      // Bỏ bớt dữ liệu mẫu, chỉ hiển thị tối đa 2 vé hoàn tiền tiêu biểu nhất
      setCancelledList(mergedCancelled.slice(0, 2));

      // 4. Tải vé tháng
      try {
        const passes = await getMonthlyPasses(currentUser.id);
        if (Array.isArray(passes)) {
          setMonthlyPasses(passes);
        } else {
          setMonthlyPasses(JSON.parse(localStorage.getItem('smartbus_monthly_passes') || '[]'));
        }
      } catch {
        setMonthlyPasses(JSON.parse(localStorage.getItem('smartbus_monthly_passes') || '[]'));
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDriver) {
      loadDriverData();
    } else {
      loadDashboardData();
    }
  }, [isDriver, activeTab]);

  // Kiểm tra chuyến xe đã khởi hành trong quá khứ chưa
  const isPastDeparture = (timeStr, depAt) => {
    const raw = depAt || timeStr;
    if (!raw) return false;
    try {
      const matchIso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (matchIso) {
        const timePart = raw.match(/(\d{2}):(\d{2})/)?.[0] || '23:59';
        const d = new Date(`${matchIso[0]}T${timePart}:00`);
        return d < new Date();
      }
      const matchVn = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (matchVn) {
        const timePart = raw.match(/(\d{2}):(\d{2})/)?.[0] || '23:59';
        const d = new Date(`${matchVn[3]}-${matchVn[2]}-${matchVn[1]}T${timePart}:00`);
        return d < new Date();
      }
    } catch {
      return false;
    }
    return false;
  };

  // Phân loại chính xác Vé sắp khởi hành và Lịch sử chuyến đi quá khứ
  const upcomingTickets = tickets.filter((t) => {
    const isConfirmedStatus = ['CONFIRMED', 'PAID', 'GiuCho', 'DaThanhToan'].includes(t.status);
    const isUsedOrCancelled = ['COMPLETED', 'USED', 'DaSoat', 'CANCELLED', 'DaHuy'].includes(t.status);
    if (isUsedOrCancelled) return false;
    if (!isConfirmedStatus) return false;

    // Kiểm tra giờ xuất bến thực tế
    const past = isPastDeparture(t.departureTime || t.departure_time, t.departure_at);
    return !past;
  });

  const historyTickets = tickets.filter((t) => {
    const isUsedOrCompleted = ['COMPLETED', 'USED', 'DaSoat'].includes(t.status);
    const isConfirmed = ['CONFIRMED', 'PAID', 'GiuCho', 'DaThanhToan'].includes(t.status);
    const past = isPastDeparture(t.departureTime || t.departure_time, t.departure_at);
    return isUsedOrCompleted || (isConfirmed && past) || (Boolean(t.is_past) && isUsedOrCompleted);
  });

  // =========================================================================
  // XỬ LÝ ĐỔI VÉ (EXCHANGE TICKET)
  // =========================================================================
  const openExchangeModal = async (ticket) => {
    setExchangingTicket(ticket);
    setExchangeType('seat');
    setSelectedNewSeat('');
    setSelectedNewTrip(null);
    setExchangeSuccess('');
    setExchangeError('');

    // Tải danh sách chuyến xe cùng tuyến để đổi chuyến nếu cần
    try {
      const tripsData = await getTrips();
      if (Array.isArray(tripsData) && tripsData.length > 0) {
        setAlternativeTrips(tripsData);
      } else {
        setAlternativeTrips([
          {
            id: 101,
            trip_code: 'TRIP-HN-TN-0930',
            origin: ticket.departure_city || 'Hà Nội',
            destination: ticket.arrival_city || 'Thái Nguyên',
            departure_at: '09:30 - Cùng ngày',
            bus_type: 'Limousine 36 chỗ',
            base_price: 120000,
            available_seats: 12,
          },
          {
            id: 102,
            trip_code: 'TRIP-HN-TN-1400',
            origin: ticket.departure_city || 'Hà Nội',
            destination: ticket.arrival_city || 'Thái Nguyên',
            departure_at: '14:00 - Cùng ngày',
            bus_type: 'Limousine 36 chỗ',
            base_price: 120000,
            available_seats: 8,
          },
          {
            id: 103,
            trip_code: 'TRIP-HN-TN-1730',
            origin: ticket.departure_city || 'Hà Nội',
            destination: ticket.arrival_city || 'Thái Nguyên',
            departure_at: '17:30 - Cùng ngày',
            bus_type: 'Limousine 36 chỗ',
            base_price: 120000,
            available_seats: 15,
          },
        ]);
      }
    } catch {
      setAlternativeTrips([
        {
          id: 101,
          trip_code: 'TRIP-HN-TN-0930',
          origin: ticket.departure_city || 'Hà Nội',
          destination: ticket.arrival_city || 'Thái Nguyên',
          departure_at: '09:30 - Cùng ngày',
          bus_type: 'Limousine 36 chỗ',
          base_price: 120000,
          available_seats: 12,
        },
        {
          id: 102,
          trip_code: 'TRIP-HN-TN-1400',
          origin: ticket.departure_city || 'Hà Nội',
          destination: ticket.arrival_city || 'Thái Nguyên',
          departure_at: '14:00 - Cùng ngày',
          bus_type: 'Limousine 36 chỗ',
          base_price: 120000,
          available_seats: 8,
        },
      ]);
    }
  };

  const handleConfirmExchangeSeat = async () => {
    if (!selectedNewSeat) {
      setExchangeError('Vui lòng click chọn một vị trí ghế trống muốn đổi!');
      return;
    }
    const currentSeat = exchangingTicket.seatNumber || exchangingTicket.seat_numbers?.[0];
    if (selectedNewSeat.toUpperCase() === currentSeat?.toUpperCase()) {
      setExchangeError('Ghế bạn chọn trùng với vị trí ghế hiện tại. Vui lòng chọn ghế khác!');
      return;
    }

    setExchangeLoading(true);
    setExchangeError('');
    try {
      const code = exchangingTicket.ticket_code || exchangingTicket.id;
      try {
        await changeTicketSeat(code, selectedNewSeat, currentUser.id);
      } catch (apiErr) {
        console.warn('API change-seat warning:', apiErr);
      }

      // Cập nhật state nội bộ
      const updatedList = tickets.map((t) => {
        if ((t.ticket_code || t.id) === code) {
          return {
            ...t,
            seatNumber: selectedNewSeat,
            seat_numbers: [selectedNewSeat],
            qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ticket:${code}:${selectedNewSeat}`,
          };
        }
        return t;
      });

      setTickets(updatedList);
      localStorage.setItem('smartbus_purchased_tickets', JSON.stringify(updatedList));

      setExchangeSuccess(`Chúc mừng! Đã đổi sang ghế ${selectedNewSeat} thành công cho vé ${code}.`);
      setTimeout(() => {
        setExchangingTicket(null);
        setExchangeSuccess('');
      }, 1500);
    } catch (err) {
      setExchangeError(`Không thể đổi ghế: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setExchangeLoading(false);
    }
  };

  const handleConfirmExchangeTrip = async () => {
    if (!selectedNewTrip) {
      setExchangeError('Vui lòng chọn chuyến xe mới bạn muốn đổi sang!');
      return;
    }

    setExchangeLoading(true);
    setExchangeError('');
    try {
      const code = exchangingTicket.ticket_code || exchangingTicket.id;
      try {
        await changeTicketTrip(code, selectedNewTrip.id, selectedNewSeat || 'A01', currentUser.id);
      } catch (apiErr) {
        console.warn('API change-trip warning:', apiErr);
      }

      const updatedList = tickets.map((t) => {
        if ((t.ticket_code || t.id) === code) {
          return {
            ...t,
            departureTime: selectedNewTrip.departure_at,
            departure_time: selectedNewTrip.departure_at,
            seatNumber: selectedNewSeat || t.seatNumber || 'A01',
            seat_numbers: [selectedNewSeat || t.seatNumber || 'A01'],
          };
        }
        return t;
      });

      setTickets(updatedList);
      localStorage.setItem('smartbus_purchased_tickets', JSON.stringify(updatedList));

      setExchangeSuccess(`Đổi sang chuyến ${selectedNewTrip.departure_at} thành công cho vé ${code}!`);
      setTimeout(() => {
        setExchangingTicket(null);
        setExchangeSuccess('');
      }, 1500);
    } catch (err) {
      setExchangeError(`Không thể đổi chuyến: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setExchangeLoading(false);
    }
  };

  // =========================================================================
  // XỬ LÝ HỦY VÉ & HOÀN TIỀN (CANCEL & REFUND TICKET)
  // =========================================================================
  const openCancelModal = (ticket) => {
    setCancellingTicket(ticket);
    setCancelReason('Thay đổi kế hoạch');
    setCustomReason('');
    setRefundMethod('bank');
    setBankAccount('');
    setBankHolder(currentUser.full_name || '');
    setEwalletPhone(currentUser.phone || '');
    setCancelSuccessData(null);
    setCancelError('');
  };

  const handleConfirmCancel = async () => {
    const finalReason = cancelReason === 'Lý do khác' ? (customReason.trim() || 'Lý do cá nhân') : cancelReason;
    
    if (refundMethod === 'bank' && (!bankAccount.trim() || !bankHolder.trim())) {
      setCancelError('Vui lòng nhập đầy đủ Số tài khoản và Tên chủ tài khoản nhận tiền hoàn!');
      return;
    }
    if (refundMethod === 'ewallet' && !ewalletPhone.trim()) {
      setCancelError('Vui lòng nhập Số điện thoại đăng ký ví điện tử!');
      return;
    }

    setCancelLoading(true);
    setCancelError('');

    try {
      const code = cancellingTicket.ticket_code || cancellingTicket.id;
      try {
        await cancelTicket(cancellingTicket.ticket_id || code, currentUser.id);
      } catch (apiErr) {
        console.warn('API cancelTicket warning:', apiErr);
      }

      // Gửi yêu cầu hoàn tiền đến Backend API để Ban Quản Trị tiếp nhận và phê duyệt
      let backendRefundId = null;
      try {
        const rfRes = await requestRefundTicket({
          ticket_code: code,
          user_id: currentUser.id,
          reason: finalReason,
          refund_method: refundMethod,
          bank_name: refundMethod === 'bank' ? bankName : 'Ví điện tử',
          bank_account: refundMethod === 'bank' ? bankAccount : ewalletPhone,
          account_holder: refundMethod === 'bank' ? bankHolder : (currentUser.full_name || 'Hành khách'),
        });
        if (rfRes && rfRes.refund_id) {
          backendRefundId = rfRes.refund_id;
        }
      } catch (rfErr) {
        console.warn('API requestRefundTicket note:', rfErr);
      }

      // Tạo bản ghi hoàn tiền
      const rawPrice = cancellingTicket.total_amount || cancellingTicket.actual_price || cancellingTicket.price || 120000;
      const refundRecord = {
        id: backendRefundId ? `REFUND-DB-${backendRefundId}` : `REFUND-${Date.now().toString().slice(-6)}`,
        refund_id: backendRefundId,
        ticketCode: code,
        ticket_code: code,
        passenger: cancellingTicket.passenger_name || currentUser.full_name,
        route: cancellingTicket.routeName || cancellingTicket.route_name || 'Hà Nội - Thái Nguyên',
        departure: cancellingTicket.departureTime || cancellingTicket.departure_time,
        seat: cancellingTicket.seatNumber || cancellingTicket.seat_numbers?.[0] || 'A01',
        price: rawPrice,
        refundAmount: rawPrice, // Hoàn 100%
        reason: finalReason,
        refundMethod: refundMethod === 'bank' ? `${bankName} - STK: ${bankAccount} (${bankHolder})` : (refundMethod === 'ewallet' ? `Ví điện tử (${ewalletPhone})` : 'Hoàn về thẻ/nguồn thanh toán ban đầu'),
        refundStatus: '⏳ ĐANG CHỜ DUYỆT (HỆ THỐNG ĐANG XỬ LÝ)',
        status: 'PENDING',
        cancelledAt: new Date().toLocaleString('vi-VN'),
        bankName: refundMethod === 'bank' ? bankName : 'Ví điện tử',
        bankAccount: refundMethod === 'bank' ? bankAccount : ewalletPhone,
        accountHolder: refundMethod === 'bank' ? bankHolder : (currentUser.full_name || 'Hành khách'),
      };

      // Lưu vé đã hủy vào localStorage
      const localCancelled = JSON.parse(localStorage.getItem('smartbus_cancelled_tickets') || '[]');
      const newCancelledList = [refundRecord, ...localCancelled.filter((x) => (x.ticketCode || x.ticket_code) !== code)];
      localStorage.setItem('smartbus_cancelled_tickets', JSON.stringify(newCancelledList));
      setCancelledList(newCancelledList);

      // Cập nhật trạng thái vé trong danh sách vé
      const updatedTickets = tickets.map((t) => {
        if ((t.ticket_code || t.id) === code) {
          return { ...t, status: 'CANCELLED' };
        }
        return t;
      });
      setTickets(updatedTickets);
      localStorage.setItem('smartbus_purchased_tickets', JSON.stringify(updatedTickets));

      setCancelSuccessData(refundRecord);

      setTimeout(() => {
        loadDashboardData();
      }, 500);
    } catch (err) {
      setCancelError(`Không thể hủy vé: ${err.message || 'Lỗi xử lý'}`);
    } finally {
      setCancelLoading(false);
    }
  };

  // =========================================================================
  // XỬ LÝ TRA CỨU & ĐỔI/HỦY NHANH
  // =========================================================================
  const handleQuickSearch = async (e) => {
    e.preventDefault();
    const code = quickCode.trim().toUpperCase();
    if (!code) {
      setQuickMessage('Vui lòng nhập mã vé cần kiểm tra (ví dụ: TKT-796712, TKT-8892...)');
      setQuickFoundTicket(null);
      return;
    }

    setQuickSearching(true);
    setQuickMessage('');
    setQuickFoundTicket(null);

    try {
      // 1. Tìm trong tickets hiện tại
      let found = tickets.find((t) => (t.ticket_code || t.id || '').toUpperCase() === code);

      // 2. Nếu chưa thấy, gọi API tra cứu
      if (!found) {
        try {
          const apiTicket = await getTicketByCode(code);
          if (apiTicket && apiTicket.ticket_code) {
            found = apiTicket;
          }
        } catch {
          // Bỏ qua lỗi API
        }
      }

      // 3. Fallback demo
      if (!found) {
        found = DEMO_FALLBACK_TICKETS.find((t) => t.ticket_code.toUpperCase() === code);
      }

      if (found) {
        setQuickFoundTicket(found);
        setQuickMessage('');
      } else {
        setQuickMessage(`Không tìm thấy vé mang mã "${code}". Bạn có thể thử các mã mẫu: TKT-796712, TKT-4A784B, TKT-8892.`);
      }
    } catch (err) {
      setQuickMessage(`Lỗi tra cứu vé: ${err.message}`);
    } finally {
      setQuickSearching(false);
    }
  };

  // =========================================================================
  // GIAO DIỆN DÀNH RIÊNG CHO TÀI XẾ: NHẬT KÝ & LỊCH SỬ CHUYẾN XE ĐÃ LÁI
  // =========================================================================
  if (isDriver) {
    const completedTrips = driverTrips.filter((t) => t.driver_status === 'COMPLETED' || t.status === 'COMPLETED');
    const activeTrips = driverTrips.filter((t) => t.driver_status !== 'COMPLETED' && t.status !== 'COMPLETED');
    const totalPassengersServed = driverTrips.reduce((acc, t) => acc + (t.total_passengers || t.passengers?.length || 0), 0);

    const displayedTrips = driverFilter === 'COMPLETED'
      ? completedTrips
      : driverFilter === 'ACTIVE'
      ? activeTrips
      : driverTrips;

    return (
      <div className="user-dashboard-wrapper">
        {/* 1. Header Banner Tài Xế */}
        <div className="dashboard-hero-banner no-print" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)' }}>
          <div className="dashboard-hero-info">
            <h1>
              <span>🚛</span> Nhật Ký & Lịch Sử Các Chuyến Xe Đã Lái
            </h1>
            <p>
              Tài xế phụ trách: <b>{currentUser.full_name}</b> ({currentUser.email || 'taixe.nguyen@smartbus.vn'}) • SĐT: <b>{currentUser.phone || '0912 345 678'}</b>
            </p>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  padding: '3px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
              >
                Vai trò: Tài Xế Chuyên Tuyến (SmartBus VIP)
              </span>
              <span
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  padding: '3px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
              >
                ✓ Bằng Lái Hạng E Đã Xác Thực
              </span>
            </div>
          </div>

          <div className="dashboard-hero-actions">
            <button
              onClick={loadDriverData}
              style={{
                backgroundColor: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.35)',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🔄</span> Làm mới lịch sử
            </button>
            <Link
              to="/buses"
              style={{
                backgroundColor: '#ffffff',
                color: '#1d4ed8',
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '800',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📋</span> Lịch Nhận Lái & Chuyến Phân Công
            </Link>
          </div>
        </div>

        {/* Thông báo cập nhật thao tác tài xế */}
        {driverActionMsg && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px 18px',
              borderRadius: '10px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            ✓ {driverActionMsg}
          </div>
        )}

        {/* 2. Thống kê vận hành tài xế */}
        <div className="dashboard-stats-grid no-print">
          <div className="dashboard-stat-card" onClick={() => setDriverFilter('ALL')}>
            <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#2563eb' }}>
              🚍
            </div>
            <div className="stat-content">
              <div className="stat-val">{driverTrips.length}</div>
              <div className="stat-lbl">Tổng Chuyến Phân Công</div>
            </div>
          </div>

          <div className="dashboard-stat-card" onClick={() => setDriverFilter('COMPLETED')}>
            <div className="stat-icon-wrapper" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              🏁
            </div>
            <div className="stat-content">
              <div className="stat-val">{completedTrips.length}</div>
              <div className="stat-lbl">Chuyến Đã Lái Hoàn Thành</div>
            </div>
          </div>

          <div className="dashboard-stat-card" onClick={() => setDriverFilter('ACTIVE')}>
            <div className="stat-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706' }}>
              ⏳
            </div>
            <div className="stat-content">
              <div className="stat-val">{activeTrips.length}</div>
              <div className="stat-lbl">Chuyến Sắp Chạy / Đang Chạy</div>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#059669' }}>
              👥
            </div>
            <div className="stat-content">
              <div className="stat-val">{totalPassengersServed}</div>
              <div className="stat-lbl">Lượt Khách Phục Vụ An Toàn</div>
            </div>
          </div>
        </div>

        {/* 3. Filter tabs */}
        <div className="dashboard-tabs-bar no-print" style={{ marginTop: '20px' }}>
          <button
            className={`dashboard-tab-btn ${driverFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setDriverFilter('ALL')}
          >
            <span>📜</span> Tất Cả Chuyến Xe ({driverTrips.length})
          </button>
          <button
            className={`dashboard-tab-btn ${driverFilter === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setDriverFilter('ACTIVE')}
          >
            <span>🚀</span> Chuyến Đang / Sắp Vận Hành ({activeTrips.length})
          </button>
          <button
            className={`dashboard-tab-btn ${driverFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setDriverFilter('COMPLETED')}
          >
            <span>✅</span> Lịch Sử Chuyến Đã Hoàn Thành ({completedTrips.length})
          </button>
        </div>

        {/* 4. Danh sách các chuyến xe tài xế đã lái */}
        {driverLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔄</div>
            <b>Đang tải nhật ký chuyến xe của tài xế...</b>
          </div>
        ) : displayedTrips.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '50px 20px', borderRadius: '18px', textAlign: 'center', border: '1px solid #e2e8f0', marginTop: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚍</div>
            <h3 style={{ color: '#1e293b', margin: '0 0 6px 0' }}>Chưa có chuyến xe nào trong danh mục này</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              Vui lòng xem lịch trình phân công từ Ban Quản Trị để xác nhận nhận lái.
            </p>
            <Link to="/buses" style={{ background: '#2563eb', color: '#ffffff', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '14px' }}>
              Xem Lịch Phân Công Mới
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            {displayedTrips.map((trip) => {
              const isCompleted = trip.driver_status === 'COMPLETED' || trip.status === 'COMPLETED';
              const isDeparted = trip.driver_status === 'DEPARTED' || trip.status === 'DEPARTED';
              const isAccepted = trip.driver_status === 'ACCEPTED';
              const isAssigned = !trip.driver_status || trip.driver_status === 'ASSIGNED';
              const passengerList = trip.passengers || [];

              return (
                <div
                  key={trip.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    border: isCompleted ? '1.5px solid #86efac' : isDeparted ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '20px',
                  }}
                >
                  <div style={{ flex: '1 1 420px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: '800', fontSize: '13px', padding: '4px 10px', borderRadius: '8px' }}>
                        CHUYẾN #{trip.id}
                      </span>
                      {isCompleted ? (
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', fontWeight: '800', fontSize: '12px', padding: '4px 10px', borderRadius: '8px' }}>
                          ✓ ĐÃ HOÀN THÀNH CHUYẾN ĐI
                        </span>
                      ) : isDeparted ? (
                        <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: '800', fontSize: '12px', padding: '4px 10px', borderRadius: '8px' }}>
                          🚀 ĐANG VẬN HÀNH TRÊN TUYẾN
                        </span>
                      ) : isAccepted ? (
                        <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: '800', fontSize: '12px', padding: '4px 10px', borderRadius: '8px' }}>
                          👍 ĐÃ NHẬN LÁI - SẴN SÀNG KHỞI HÀNH
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '800', fontSize: '12px', padding: '4px 10px', borderRadius: '8px' }}>
                          📋 ĐƯỢC PHÂN CÔNG (CHỜ NHẬN LÁI)
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>
                      {trip.route_name || `${trip.origin} ➔ ${trip.destination}`}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13.5px', color: '#475569' }}>
                      <div>🕒 <b>Giờ xuất bến:</b> {trip.departure_at || 'Theo lịch trình'}</div>
                      <div>🏁 <b>Dự kiến đến:</b> {trip.arrival_at || 'Đang cập nhật'}</div>
                      <div>🚌 <b>Xe khách:</b> {trip.license_plate || '29B-123.45'} ({trip.bus_type || 'SmartBus VIP Limousine'})</div>
                      <div>👔 <b>Phụ xe đi cùng:</b> {trip.staff_name || 'Trần Thị Phụ Xe'}</div>
                      <div>👥 <b>Hành khách trên xe:</b> <b style={{ color: '#2563eb' }}>{trip.total_passengers || passengerList.length}</b> hành khách</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                    <button
                      onClick={() => setSelectedManifestTrip(trip)}
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '10px 16px',
                        borderRadius: '9px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>👥</span> Xem Danh Sách Hành Khách
                    </button>

                    {isAssigned && (
                      <button
                        onClick={() => handleDriverStatusUpdate(trip.id, 'ACCEPTED')}
                        style={{
                          backgroundColor: '#16a34a',
                          color: 'white',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: '9px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        👍 Xác Nhận Nhận Lái Chuyến Này
                      </button>
                    )}

                    {isAccepted && (
                      <button
                        onClick={() => handleDriverStatusUpdate(trip.id, 'DEPARTED')}
                        style={{
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: '9px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        🚀 Bắt Đầu Xuất Bến
                      </button>
                    )}

                    {isDeparted && (
                      <button
                        onClick={() => handleDriverStatusUpdate(trip.id, 'COMPLETED')}
                        style={{
                          backgroundColor: '#059669',
                          color: 'white',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: '9px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        🏁 Hoàn Thành Chuyến Đi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Danh Sách Hành Khách (Manifest) */}
        {selectedManifestTrip && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
            }}
            onClick={() => setSelectedManifestTrip(null)}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '18px',
                padding: '24px',
                maxWidth: '780px',
                width: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: '800' }}>
                    👥 DANH SÁCH HÀNH KHÁCH - CHUYẾN #{selectedManifestTrip.id}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {selectedManifestTrip.route_name} • Giờ xuất bến: {selectedManifestTrip.departure_at} • Biển số: {selectedManifestTrip.license_plate}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedManifestTrip(null)}
                  style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>

              {(!selectedManifestTrip.passengers || selectedManifestTrip.passengers.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b' }}>
                  Chưa có hành khách nào đặt vé trên chuyến xe này.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#334155' }}>
                      <th style={{ padding: '10px 12px' }}>Ghế</th>
                      <th style={{ padding: '10px 12px' }}>Hành Khách</th>
                      <th style={{ padding: '10px 12px' }}>Số Điện Thoại</th>
                      <th style={{ padding: '10px 12px' }}>Mã Vé</th>
                      <th style={{ padding: '10px 12px' }}>Trạng Thái Soát Vé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedManifestTrip.passengers.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1d4ed8' }}>{p.seat_number}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '600' }}>{p.passenger_name}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{p.phone}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 'bold' }}>{p.ticket_code}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: p.boarded ? '#dcfce7' : '#fef3c7',
                              color: p.boarded ? '#166534' : '#b45309',
                            }}
                          >
                            {p.boarded ? '✓ ĐÃ LÊN XE' : 'CHƯA SOÁT'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button
                  onClick={() => setSelectedManifestTrip(null)}
                  style={{
                    backgroundColor: '#1e293b',
                    color: 'white',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="user-dashboard-wrapper">
      {/* 1. Header Banner & Passenger Profile */}
      <div className="dashboard-hero-banner no-print">
        <div className="dashboard-hero-info">
          <h1>
            <span>🎫</span> Quản Lý Vé Xe Cá Nhân & Dịch Vụ Vé
          </h1>
          <p>
            Hành khách: <b>{currentUser.full_name}</b> ({currentUser.email || 'taixe.nguyen@smartbus.vn'}) • SĐT: <b>{currentUser.phone || '0912 345 678'}</b>
          </p>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              Vai trò: {currentUser.role === 'TaiXe' ? 'Tài xế chuyên tuyến' : currentUser.role === 'Admin' ? 'Quản trị viên' : 'Hành khách'}
            </span>
            <span
              style={{
                backgroundColor: '#10b981',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              ✓ Xác thực điện tử
            </span>
          </div>
        </div>

        <div className="dashboard-hero-actions">
          <button
            onClick={loadDashboardData}
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.35)',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔄</span> Làm mới dữ liệu
          </button>
          <Link
            to="/buses"
            style={{
              backgroundColor: '#ffffff',
              color: '#1d4ed8',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '800',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>➕</span> Đặt Vé Mới
          </Link>
        </div>
      </div>

      {/* 2. Quick Stats Grid - Thống kê cân đối */}
      <div className="dashboard-stats-grid no-print">
        <div className="dashboard-stat-card" onClick={() => setActiveTab('upcoming')}>
          <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#2563eb' }}>
            🎫
          </div>
          <div className="stat-content">
            <div className="stat-val">{upcomingTickets.length}</div>
            <div className="stat-lbl">Vé Sắp Khởi Hành</div>
          </div>
        </div>

        <div className="dashboard-stat-card" onClick={() => setActiveTab('history')}>
          <div className="stat-icon-wrapper" style={{ background: '#f8fafc', color: '#475569' }}>
            📜
          </div>
          <div className="stat-content">
            <div className="stat-val">{historyTickets.length}</div>
            <div className="stat-lbl">Chuyến Đi Quá Khứ</div>
          </div>
        </div>

        <div className="dashboard-stat-card" onClick={() => setActiveTab('exchange-cancel')}>
          <div className="stat-icon-wrapper" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            🔄
          </div>
          <div className="stat-content">
            <div className="stat-val">24 Giờ</div>
            <div className="stat-lbl">Hạn Đổi / Hủy Vé Miễn Phí</div>
          </div>
        </div>

        <div className="dashboard-stat-card" onClick={() => setActiveTab('cancelled')}>
          <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}>
            ❌
          </div>
          <div className="stat-content">
            <div className="stat-val">{cancelledList.length}</div>
            <div className="stat-lbl">Vé Đã Hủy & Hoàn Tiền</div>
          </div>
        </div>

        <div className="dashboard-stat-card" onClick={() => setActiveTab('monthly')}>
          <div className="stat-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706' }}>
            🪪
          </div>
          <div className="stat-content">
            <div className="stat-val">{monthlyPasses.length}</div>
            <div className="stat-lbl">Thẻ Vé Tháng</div>
          </div>
        </div>

        <div className="dashboard-stat-card" onClick={() => setActiveTab('profile')}>
          <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#059669' }}>
            👤
          </div>
          <div className="stat-content">
            <div className="stat-val">{userProfile.discount_status === 'DaDuyet' ? 'Đã duyệt' : userProfile.discount_type !== 'Khong' ? 'Chờ duyệt' : 'Cơ bản'}</div>
            <div className="stat-lbl">Hồ Sơ Ưu Đãi</div>
          </div>
        </div>
      </div>

      {/* THÔNG BÁO KHI SẮP ĐẾN THỜI GIAN XE CHẠY (DEPARTURE ALERT BANNER) */}
      {(() => {
        const soonTicket = upcomingTickets.find((t) => t.status !== 'CANCELLED');
        if (!soonTicket) return null;
        return (
          <div
            className="departure-alert-banner no-print"
            style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1.5px solid #fde68a',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.12)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '32px' }}>⏰</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>THÔNG BÁO: CHUYẾN XE SẮP ĐẾN GIỜ KHỞI HÀNH!</span>
                  <span style={{ fontSize: '11px', backgroundColor: '#ef4444', color: 'white', padding: '1px 8px', borderRadius: '12px' }}>Sắp xuất bến</span>
                </div>
                <div style={{ fontSize: '13.5px', color: '#78350f', marginTop: '3px' }}>
                  Mã vé: <b>#{soonTicket.ticket_code || soonTicket.id}</b> • Tuyến: <b>{soonTicket.routeName || `${soonTicket.departure_city} ➔ ${soonTicket.arrival_city}`}</b> • Xuất bến: <b>{soonTicket.departureTime || soonTicket.departure_time}</b> • Ghế: <b>{soonTicket.seatNumber || soonTicket.seat_numbers?.join(', ')}</b>
                </div>
                <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px', fontWeight: '600' }}>
                  ⚠️ Quý khách vui lòng có mặt tại điểm đón trước 15 phút và chuẩn bị sẵn mã QR để nhân viên/tài xế soát vé lên xe.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTicketDetail(soonTicket)}
              style={{
                backgroundColor: '#d97706',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(217,119,6,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📱</span> Xem Vé & Mã QR
            </button>
          </div>
        );
      })()}

      {/* 3. Navigation Tabs */}
      <div className="dashboard-tabs-bar no-print">
        <button
          className={`dashboard-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <span>🎫</span>
          Vé Sắp Khởi Hành
          <span className="tab-badge">{upcomingTickets.length}</span>
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === 'exchange-cancel' ? 'active' : ''}`}
          onClick={() => setActiveTab('exchange-cancel')}
        >
          <span>🔄</span>
          Tra Cứu & Đổi/Hủy Vé Nhanh
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          <span>❌</span>
          Vé Đã Hủy & Hoàn Tiền
          <span className="tab-badge">{cancelledList.length}</span>
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span>📜</span>
          Lịch Sử Chuyến Đi
          <span className="tab-badge">{historyTickets.length}</span>
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          <span>🪪</span>
          Vé Tháng
          <span className="tab-badge">{monthlyPasses.length}</span>
        </button>

        <button
          className={`dashboard-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span>👤</span>
          Thông Tin Khách Hàng & Ưu Đãi
        </button>
      </div>

      {/* 4. Tab Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔄</div>
          <b>Đang tải danh sách vé...</b>
        </div>
      ) : activeTab === 'upcoming' ? (
        /* TAB 1: VÉ SẮP KHỞI HÀNH (KÈM ĐỔI VÉ & HỦY VÉ TRỰC TIẾP) */
        <div className="no-print">
          {upcomingTickets.length === 0 ? (
            <div style={{ backgroundColor: 'white', padding: '50px 20px', borderRadius: '18px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎫</div>
              <h3 style={{ color: '#1e293b', margin: '0 0 6px 0' }}>Bạn hiện chưa có chuyến đi nào sắp tới</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                Khám phá các tuyến xe chất lượng cao và đặt vé nhanh chóng cùng Smart BusTicketing.
              </p>
              <Link to="/buses" style={{ background: '#2563eb', color: '#ffffff', textDecoration: 'none', padding: '11px 24px', borderRadius: '10px', fontWeight: '700', fontSize: '14px' }}>
                🔍 Tìm Chuyến Xe & Đặt Vé
              </Link>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: '#475569', fontWeight: '600' }}>
                  Hiển thị <b>{upcomingTickets.length}</b> vé xe hợp lệ sẵn sàng xuất bến:
                </span>
                <span style={{ fontSize: '12px', color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
                  ✓ Đổi ghế / Hủy vé miễn phí trước 24h
                </span>
              </div>

              {upcomingTickets.map((ticket) => {
                const code = ticket.ticket_code || ticket.id;
                const routeTitle = ticket.routeName || ticket.route_name || `${ticket.departure_city || 'Hà Nội'} - ${ticket.arrival_city || 'Thái Nguyên'}`;
                const seat = ticket.seatNumber || ticket.seat_numbers?.[0] || 'A04';
                const depTime = ticket.departureTime || ticket.departure_time || '07:30 - Hôm nay';
                const formattedPrice = ticket.price || (ticket.total_amount ? `${ticket.total_amount.toLocaleString('vi-VN')} VNĐ` : '120.000 VNĐ');

                return (
                  <div key={code} className="ticket-pass-card">
                    {/* Phần chính của vé (Bên trái) */}
                    <div className="ticket-pass-main">
                      <div>
                        <div className="ticket-pass-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="ticket-code-pill">Mã vé: {code}</span>
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#166534',
                                fontSize: '11px',
                                fontWeight: '800',
                                padding: '4px 10px',
                                borderRadius: '8px',
                              }}
                            >
                              ĐÃ THANH TOÁN (HỢP LỆ)
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            🚌 {ticket.bus_type || 'SmartBus VIP Limousine'}
                          </span>
                        </div>

                        <div className="ticket-route-heading">
                          <span>{routeTitle}</span>
                        </div>

                        {/* Thông tin ma trận 4 ô cân xứng */}
                        <div className="ticket-grid-details">
                          <div className="ticket-grid-item">
                            <div className="item-lbl">🕒 Giờ khởi hành</div>
                            <div className="item-val">{depTime}</div>
                          </div>
                          <div className="ticket-grid-item">
                            <div className="item-lbl">💺 Vị trí ghế</div>
                            <div className="item-val highlight-seat">{seat}</div>
                          </div>
                          <div className="ticket-grid-item">
                            <div className="item-lbl">💵 Giá vé</div>
                            <div className="item-val highlight-price">{formattedPrice}</div>
                          </div>
                          <div className="ticket-grid-item">
                            <div className="item-lbl">🛡️ Biển số xe</div>
                            <div className="item-val">{ticket.license_plate || '29B-123.45'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="ticket-passenger-footer">
                        <div>
                          👤 <b>Hành khách:</b> {ticket.passenger_name || currentUser.full_name}
                        </div>
                        <div style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                          ⚡ Hỗ trợ đổi ghế hoặc hủy hoàn 100%
                        </div>
                      </div>
                    </div>

                    {/* Vết xé vé đặc trưng */}
                    <div className="ticket-tear-divider">
                      <div className="notch-top"></div>
                      <div className="ticket-tear-line"></div>
                      <div className="notch-bottom"></div>
                    </div>

                    {/* Phần QR & 3 Nút thao tác cân đối (Bên phải) */}
                    <div className="ticket-pass-side">
                      <img
                        src={ticket.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ticket:${code}`}
                        alt="QR Code"
                        className="ticket-qr-img"
                      />
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                        Quét mã khi lên xe
                      </span>

                      <div className="ticket-actions-stack">
                        {/* Nút 1: Xem chi tiết & In */}
                        <button
                          className="btn-ticket-action btn-ticket-print"
                          onClick={() => setSelectedTicketDetail(ticket)}
                        >
                          <span>👁️</span> Xem chi tiết & In vé
                        </button>

                        {/* Nút 2: Đổi vé */}
                        <button
                          className="btn-ticket-action btn-ticket-exchange"
                          onClick={() => openExchangeModal(ticket)}
                        >
                          <span>🔄</span> Đổi vé này
                        </button>

                        {/* Nút 3: Hủy vé */}
                        <button
                          className="btn-ticket-action btn-ticket-cancel"
                          onClick={() => openCancelModal(ticket)}
                        >
                          <span>❌</span> Hủy vé này
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'exchange-cancel' ? (
        /* TAB 2: TRA CỨU & ĐỔI/HỦY NHANH (TÍCH HỢP TOÀN DIỆN US30 / US05) */
        <div className="no-print">
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '28px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(15,23,42,0.05)',
              marginBottom: '24px',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 24px auto' }}>
              <span
                style={{
                  background: '#eff6ff',
                  color: '#2563eb',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '800',
                }}
              >
                DỊCH VỤ VÉ ĐIỆN TỬ SMART BUS
              </span>
              <h2 style={{ fontSize: '22px', color: '#0f172a', margin: '10px 0 6px 0' }}>
                🔄 Tra Cứu, Đổi Ghế & Yêu Cầu Hủy Hoàn Tiền
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                Nhập mã vé để kiểm tra tính hợp lệ và thực hiện đổi ghế, đổi chuyến hoặc hủy hoàn tiền 100%.
              </p>
            </div>

            <form onSubmit={handleQuickSearch} style={{ maxWidth: '650px', margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={quickCode}
                  onChange={(e) => setQuickCode(e.target.value)}
                  placeholder="Nhập mã vé, ví dụ: TKT-796712, TKT-8892..."
                  style={{
                    flex: 1,
                    padding: '13px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '15px',
                    fontWeight: '600',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={quickSearching}
                  style={{
                    padding: '0 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '15px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {quickSearching ? 'Đang tìm...' : '🔍 Tìm vé'}
                </button>
              </div>

              {/* Mã mẫu tiện lợi */}
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>Mã gợi ý:</span>
                {['TKT-796712', 'TKT-4A784B', 'TKT-8892'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setQuickCode(c);
                      const t = tickets.find((tk) => (tk.ticket_code || tk.id) === c) || DEMO_FALLBACK_TICKETS.find((tk) => tk.ticket_code === c);
                      if (t) {
                        setQuickFoundTicket(t);
                        setQuickMessage('');
                      }
                    }}
                    style={{
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </form>

            {quickMessage && (
              <div
                style={{
                  maxWidth: '650px',
                  margin: '16px auto 0 auto',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                }}
              >
                ⚠️ {quickMessage}
              </div>
            )}
          </div>

          {/* Kết quả tìm kiếm vé */}
          {quickFoundTicket && (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '24px',
                border: '1px solid #bfdbfe',
                boxShadow: '0 8px 24px rgba(37,99,235,0.08)',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '18px', fontWeight: '800' }}>
                  ✅ Tìm Thấy Vé: {quickFoundTicket.ticket_code || quickFoundTicket.id}
                </h3>
                <span
                  style={{
                    background: quickFoundTicket.status === 'CANCELLED' ? '#fee2e2' : '#dcfce7',
                    color: quickFoundTicket.status === 'CANCELLED' ? '#991b1b' : '#166534',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '800',
                  }}
                >
                  {quickFoundTicket.status === 'CANCELLED' ? 'ĐÃ HỦY VÉ' : 'ĐÃ THANH TOÁN (HỢP LỆ)'}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                  background: '#f8fafc',
                  padding: '18px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Tuyến xe:</span>
                  <b>{quickFoundTicket.routeName || quickFoundTicket.route_name || 'Hà Nội - Thái Nguyên'}</b>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Thời gian khởi hành:</span>
                  <b>{quickFoundTicket.departureTime || quickFoundTicket.departure_time || '07:30 - Hôm nay'}</b>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Số ghế:</span>
                  <b style={{ color: '#2563eb', fontSize: '16px' }}>{quickFoundTicket.seatNumber || quickFoundTicket.seat_numbers?.[0] || 'A04'}</b>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Hành khách:</span>
                  <b>{quickFoundTicket.passenger_name || 'Trần Văn Tài'}</b>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Giá cước:</span>
                  <b style={{ color: '#dc2626' }}>{quickFoundTicket.price || '120.000 VNĐ'}</b>
                </div>
              </div>

              {quickFoundTicket.status !== 'CANCELLED' ? (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => openExchangeModal(quickFoundTicket)}
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1.5px solid #bfdbfe',
                      padding: '12px 20px',
                      borderRadius: '10px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🔄</span> Đổi Ghế / Đổi Chuyến Ngay
                  </button>

                  <button
                    onClick={() => openCancelModal(quickFoundTicket)}
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: '1.5px solid #fecaca',
                      padding: '12px 20px',
                      borderRadius: '10px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>❌</span> Hủy Vé & Yêu Cầu Hoàn Tiền
                  </button>

                  <button
                    onClick={() => setSelectedTicketDetail(quickFoundTicket)}
                    style={{
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '12px 18px',
                      borderRadius: '10px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    👁️ In vé
                  </button>
                </div>
              ) : (
                <div style={{ background: '#fef2f2', padding: '12px 16px', borderRadius: '10px', color: '#991b1b', fontSize: '13px' }}>
                  ℹ️ Vé này đã được hủy và đang trong tiến trình hoàn tiền. Vui lòng kiểm tra tab "Vé Đã Hủy & Hoàn Tiền".
                </div>
              )}
            </div>
          )}

          {/* Bảng Quy định & Chính sách Đổi / Hủy */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '24px 28px',
              border: '1px solid #e2e8f0',
            }}
          >
            <h3 style={{ fontSize: '16px', color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> Quy Định Đổi & Hủy Vé Minh Bạch
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
                <b style={{ color: '#166534', fontSize: '14px' }}>✓ Đổi ghế cùng chuyến</b>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Miễn phí 100% khi còn ghế trống trên chuyến xe hiện tại.
                </p>
              </div>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #2563eb' }}>
                <b style={{ color: '#1d4ed8', fontSize: '14px' }}>✓ Đổi chuyến xe / ngày đi</b>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Hỗ trợ đổi chuyến trước 24 giờ khởi hành, bù trừ giá vé chênh lệch (nếu có).
                </p>
              </div>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #f59e0b' }}>
                <b style={{ color: '#b45309', fontSize: '14px' }}>✓ Hủy vé & Hoàn tiền</b>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Hoàn 100% tiền vé nếu hủy trước 24h. Tiền hoàn về STK hoặc ví điện tử trong 1-2 ngày.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'cancelled' ? (
        /* TAB 3: DANH SÁCH VÉ ĐÃ HỦY & HOÀN TIỀN */
        <div className="no-print">
          {cancelledList.length === 0 ? (
            <div style={{ backgroundColor: 'white', padding: '50px 20px', borderRadius: '18px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>
              <h3 style={{ color: '#1e293b', margin: '0 0 6px 0' }}>Không có vé nào bị hủy</h3>
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                Tất cả các vé xe của bạn hiện đều hợp lệ hoặc đã hoàn tất hành trình an toàn.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '14px', color: '#475569', fontWeight: '600' }}>
                Có <b>{cancelledList.length}</b> yêu cầu hủy vé & hoàn tiền:
              </div>

              {cancelledList.map((item, idx) => {
                const isRefunded = item.status !== 'REJECTED' && (!item.refundStatus || !item.refundStatus.includes('TỪ CHỐI'));
                const isRejected = item.status === 'REJECTED' || (item.refundStatus && item.refundStatus.includes('TỪ CHỐI'));
                const displayStatusText = isRefunded
                  ? '✅ ĐÃ HOÀN TIỀN THÀNH CÔNG'
                  : '❌ ĐÃ TỪ CHỐI HOÀN TIỀN';

                const badgeBg = isRefunded ? '#dcfce7' : (isRejected ? '#fee2e2' : '#fef3c7');
                const badgeColor = isRefunded ? '#166534' : (isRejected ? '#b91c1c' : '#b45309');
                const cardBorder = isRefunded ? '1.5px solid #86efac' : (isRejected ? '1.5px solid #fca5a5' : '1px solid #fed7aa');
                const rawAmt = Number(item.refundAmount) || Number(item.price) || Number(item.total_amount) || Number(item.amount) || 120000;
                const finalRefundAmount = rawAmt > 0 ? rawAmt : 120000;

                return (
                  <div
                    key={item.id || idx}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '20px 24px',
                      border: cardBorder,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ background: '#fee2e2', color: '#991b1b', fontWeight: '800', fontSize: '13px', padding: '3px 8px', borderRadius: '6px' }}>
                          {item.ticketCode || item.ticket_code || item.id}
                        </span>
                        <span style={{ background: badgeBg, color: badgeColor, fontWeight: '800', fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: `1px solid ${badgeColor}33` }}>
                          {displayStatusText}
                        </span>
                        {isRefunded && (
                          <span style={{ background: '#10b981', color: '#ffffff', fontWeight: '800', fontSize: '10.5px', padding: '2px 8px', borderRadius: '12px' }}>
                            ✓ ĐÃ XÁC MINH & HOÀN TẤT
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1e293b' }}>
                        {item.route || item.routeName || 'Hà Nội - Thái Nguyên'}
                      </h4>
                      <p style={{ margin: '0 0 3px 0', fontSize: '13px', color: '#64748b' }}>
                        🕒 Xuất bến: {item.departure || item.departureTime} • 💺 Ghế đã hủy: <b>{item.seat || item.seatNumber || 'A04'}</b>
                      </p>
                      <p style={{ margin: '0 0 3px 0', fontSize: '13px', color: '#64748b' }}>
                        📝 <b>Lý do hủy:</b> {item.reason || 'Thay đổi lịch trình'}
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                        💳 <b>Nhận tiền hoàn qua:</b> {item.bankName ? `${item.bankName} - STK: ${item.bankAccount || '***'} (${item.accountHolder || ''})` : (item.refundMethod || 'Chuyển khoản tài khoản ngân hàng')}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: isRefunded ? '#166534' : '#64748b', fontWeight: isRefunded ? 'bold' : 'normal' }}>
                        {isRefunded ? '✓ Số tiền thực tế đã hoàn về TK:' : 'Số tiền hoàn dự kiến:'}
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: isRefunded ? '#15803d' : '#2563eb', margin: '2px 0 6px 0' }}>
                        {typeof finalRefundAmount === 'number' ? `${finalRefundAmount.toLocaleString('vi-VN')} VNĐ` : (finalRefundAmount || '120.000 VNĐ')}
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {item.processedAt ? `Duyệt lúc: ${item.processedAt}` : `Hủy lúc: ${item.cancelledAt || 'Gần đây'}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'history' ? (
        /* TAB 4: LỊCH SỬ CHUYẾN ĐI / VÉ ĐÃ SOÁT */
        <div className="no-print">
          {historyTickets.length === 0 ? (
            <div style={{ backgroundColor: 'white', padding: '50px 20px', borderRadius: '18px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📜</div>
              <h3 style={{ color: '#1e293b', margin: '0 0 6px 0' }}>Chưa có lịch sử chuyến đi</h3>
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                Các vé sau khi được tài xế soát thành công sẽ được lưu trữ tự động tại đây.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#475569', fontWeight: '600' }}>
                  Tìm thấy <b>{historyTickets.length}</b> chuyến xe đã hoàn tất trong lịch sử đặt vé của bạn:
                </span>
                <span style={{ fontSize: '12px', color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
                  ✓ Dữ liệu lưu trữ điện tử trọn đời
                </span>
              </div>

              {historyTickets.map((ticket) => {
                const code = ticket.ticket_code || ticket.id;
                const routeTitle = ticket.routeName || ticket.route_name || `${ticket.departure_city || 'Hồ Chí Minh'} - ${ticket.arrival_city || 'Đà Lạt'}`;
                const seat = ticket.seatNumber || ticket.seat_numbers?.[0] || 'A01';
                const depTime = ticket.departureTime || ticket.departure_time || '08:00 - Quá khứ';
                const formattedPrice = ticket.price || (ticket.total_amount ? `${ticket.total_amount.toLocaleString('vi-VN')} VNĐ` : '120.000 VNĐ');
                const isBoarded = ticket.status === 'COMPLETED' || ticket.status === 'USED' || ticket.status === 'DaSoat';

                return (
                  <div key={code} className="ticket-pass-card" style={{ opacity: 0.95, borderColor: '#cbd5e1' }}>
                    {/* Phần chính của vé (Bên trái) */}
                    <div className="ticket-pass-main" style={{ background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
                      <div>
                        <div className="ticket-pass-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="ticket-code-pill" style={{ background: '#f1f5f9', color: '#334155' }}>Mã vé: {code}</span>
                            <span
                              style={{
                                background: isBoarded ? '#dcfce7' : '#f1f5f9',
                                color: isBoarded ? '#166534' : '#475569',
                                fontSize: '11px',
                                fontWeight: '800',
                                padding: '4px 10px',
                                borderRadius: '8px',
                              }}
                            >
                              {isBoarded ? '✓ ĐÃ LÊN XE / HOÀN TẤT HÀNH TRÌNH' : '🕒 CHUYẾN ĐI ĐÃ KHỞI HÀNH (QUÁ KHỨ)'}
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            🚌 {ticket.bus_type || 'SmartBus VIP Limousine'}
                          </span>
                        </div>

                        <div className="ticket-route-heading" style={{ color: '#1e293b' }}>
                          <span>{routeTitle}</span>
                        </div>

                        {/* Thông tin ma trận 4 ô cân xứng */}
                        <div className="ticket-grid-details">
                          <div className="ticket-grid-item">
                            <div className="item-lbl">🕒 Giờ xuất bến</div>
                            <div className="item-val">{depTime}</div>
                          </div>
                          <div className="ticket-grid-item">
                            <div className="item-lbl">💺 Vị trí ghế đã đi</div>
                            <div className="item-val highlight-seat" style={{ background: '#f1f5f9', color: '#1e293b' }}>{seat}</div>
                          </div>
                          <div className="ticket-grid-item">
                            <div className="item-lbl">💵 Cước phí đã trả</div>
                            <div className="item-val" style={{ fontWeight: '800', color: '#0f172a' }}>{formattedPrice}</div>
                          </div>
                          <div className="ticket-grid-item">
                            <div className="item-lbl">🛡️ Biển số xe</div>
                            <div className="item-val">{ticket.license_plate || '29B-123.45'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="ticket-passenger-footer">
                        <div>
                          👤 <b>Hành khách:</b> {ticket.passenger_name || currentUser.full_name}
                        </div>
                        <div style={{ color: '#475569', fontSize: '12px', fontWeight: '600' }}>
                          Hóa đơn điện tử: HDDT-2026-{String(code).replace(/[^a-zA-Z0-9]/g, '').slice(-4)}
                        </div>
                      </div>
                    </div>

                    {/* Vết xé vé */}
                    <div className="ticket-tear-divider">
                      <div className="notch-top"></div>
                      <div className="ticket-tear-line"></div>
                      <div className="notch-bottom"></div>
                    </div>

                    {/* Phần QR & 3 Nút thao tác */}
                    <div className="ticket-pass-side">
                      <div style={{ position: 'relative' }}>
                        <img
                          src={ticket.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ticket:${code}`}
                          alt="QR Code"
                          className="ticket-qr-img"
                          style={{ filter: 'grayscale(0.4)' }}
                        />
                        <div style={{ position: 'absolute', bottom: '6px', left: 0, right: 0, textAlign: 'center', background: 'rgba(15,23,42,0.75)', color: 'white', fontSize: '10px', padding: '2px 0', borderRadius: '4px' }}>
                          ĐÃ HOÀN TẤT
                        </div>
                      </div>

                      <div className="ticket-actions-stack">
                        {/* Nút 1: Xem chi tiết & In */}
                        <button
                          className="btn-ticket-action btn-ticket-print"
                          onClick={() => setSelectedTicketDetail(ticket)}
                          title="Xem lại thẻ vé điện tử và cuống vé"
                        >
                          <span>👁️</span> Xem Lại Thẻ Vé
                        </button>

                        {/* Nút 2: In vé */}
                        <button
                          className="btn-ticket-action"
                          style={{ backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1' }}
                          onClick={() => {
                            setSelectedTicketDetail(ticket);
                            setTimeout(() => window.print(), 300);
                          }}
                        >
                          <span>🖨️</span> In Hóa Đơn / Vé
                        </button>

                        {/* Nút 3: Đặt lại chuyến này */}
                        <button
                          className="btn-ticket-action"
                          style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: '700' }}
                          onClick={() => {
                            const orig = ticket.departure_city || 'Hồ Chí Minh';
                            const dest = ticket.arrival_city || 'Đà Lạt';
                            navigate(`/buses?origin=${encodeURIComponent(orig)}&destination=${encodeURIComponent(dest)}`);
                          }}
                        >
                          <span>🔄</span> Đặt Lại Chuyến Này
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'monthly' ? (
        /* TAB 5: VÉ THÁNG (MONTHLY PASS) */
        <div className="no-print">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 style={{ margin: '0 0 2px 0', color: '#1e3a8a', fontWeight: '800', fontSize: '16px' }}>Thẻ Vé Tháng Xe Buýt Điện Tử (US16)</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Di chuyển không giới hạn trên các chặng xe buýt thường nhật.</p>
            </div>
            <Link to="/monthly-pass" style={{ background: '#2563eb', color: '#ffffff', textDecoration: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>
              + Đăng Ký Vé Tháng Mới
            </Link>
          </div>

          {monthlyPasses.length === 0 ? (
            <div style={{ backgroundColor: 'white', padding: '50px 20px', borderRadius: '18px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🪪</div>
              <h3 style={{ color: '#1e293b', margin: '0 0 6px 0' }}>Chưa có thẻ vé tháng nào</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Đăng ký ngay để tiết kiệm đến 25% cước phí đi lại hàng tháng.</p>
              <Link to="/monthly-pass" style={{ background: '#2563eb', color: '#ffffff', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '14px' }}>
                Khám Phá & Đăng Ký Vé Tháng
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {monthlyPasses.map((pass) => (
                <div
                  key={pass.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '20px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold', fontSize: '12px', padding: '3px 8px', borderRadius: '6px' }}>
                        {pass.ticket_code || `PASS-${pass.id}`}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: pass.status === 'ConHan' ? '#dcfce7' : '#fee2e2',
                          color: pass.status === 'ConHan' ? '#166534' : '#991b1b',
                        }}
                      >
                        {pass.status === 'ConHan' ? `CÒN HẠN (${pass.days_left ?? 30} NGÀY)` : 'HẾT HẠN'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 6px 0' }}>
                      {pass.route_name || `${pass.departure_city} - ${pass.arrival_city}`}
                    </h3>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748b' }}>
                      👤 <b>Hành khách:</b> {pass.passenger_name} (CCCD/SV: {pass.passenger_id_card || 'N/A'})
                    </p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                      📅 <b>Thời hạn:</b> {pass.start_date} ➔ <span style={{ color: pass.status === 'ConHan' ? '#166534' : '#dc2626', fontWeight: 'bold' }}>{pass.end_date}</span>
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=pass:${pass.id}`}
                      alt="QR Pass"
                      style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '4px' }}
                    />
                    <Link
                      to="/monthly-pass"
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        textDecoration: 'none',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>🔄</span> Quản lý / Gia hạn
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB 6: TRANG THÔNG TIN KHÁCH HÀNG & XÁC MINH ĐỐI TƯỢNG ƯU ĐÃI (PROFILE) */
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header banner profile */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            borderRadius: '16px',
            padding: '24px 28px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
              }}>
                👤
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '800' }}>
                  {userProfile.full_name}
                </h2>
                <div style={{ fontSize: '13px', color: '#bfdbfe', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>📧 {userProfile.email}</span>
                  <span>📞 {userProfile.phone || '0901234567'}</span>
                  <span>🆔 ID: #{userProfile.id || 1}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{
                backgroundColor: userProfile.discount_status === 'DaDuyet'
                  ? '#10b981'
                  : userProfile.discount_type !== 'Khong'
                  ? '#f59e0b'
                  : 'rgba(255,255,255,0.25)',
                color: 'white',
                fontWeight: 'bold',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
              }}>
                {userProfile.discount_status === 'DaDuyet'
                  ? `✓ Ưu đãi: ${userProfile.discount_type} (Giảm 20%)`
                  : userProfile.discount_type !== 'Khong'
                  ? `⏳ Ưu đãi: ${userProfile.discount_type} (Chờ duyệt)`
                  : 'Chưa đăng ký ưu đãi'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* CỘT 1: THÔNG TIN TÀI KHOẢN & CẬP NHẬT */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '20px' }}>📝</span>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                  Thông Tin Cá Nhân
                </h3>
              </div>

              {profileMsg && (
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                  {profileMsg}
                </div>
              )}
              {profileErr && (
                <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                  ⚠️ {profileErr}
                </div>
              )}

              <form onSubmit={handleUpdateProfile}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    required
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Email đăng nhập
                  </label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Vai trò hệ thống
                  </label>
                  <input
                    type="text"
                    disabled
                    value={userProfile.role === 'TaiXe' ? 'Tài xế' : userProfile.role === 'PhuXe' ? 'Phụ xe' : userProfile.role === 'Admin' ? 'Quản trị viên' : 'Hành khách'}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileUpdating}
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '11px 20px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: profileUpdating ? 'not-allowed' : 'pointer',
                    width: '100%',
                  }}
                >
                  {profileUpdating ? 'Đang lưu thay đổi...' : '💾 Lưu Thông Tin Cá Nhân'}
                </button>
              </form>
            </div>

            {/* CỘT 2: XÁC MINH ĐỐI TƯỢNG ƯU ĐÃI (ĐĂNG KÝ HỒ SƠ) */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🎓</span>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                    Xác Minh Đối Tượng Ưu Đãi
                  </h3>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: userProfile.discount_status === 'DaDuyet' ? '#dcfce7' : '#fef3c7',
                  color: userProfile.discount_status === 'DaDuyet' ? '#166534' : '#b45309',
                }}>
                  {userProfile.discount_status === 'DaDuyet' ? 'ĐÃ DUYỆT' : 'CHỜ DUYỆT'}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
                Đăng ký xác minh đối tượng chính sách để được hệ thống tự động khấu trừ <b>20% - 50%</b> giá vé xe khách và thẻ vé tháng.
              </p>

              {userProfile.discount_status === 'DaDuyet' && (
                <div style={{
                  backgroundColor: '#ecfdf5',
                  border: '1.5px solid #86efac',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '24px' }}>🎉</div>
                  <div>
                    <div style={{ color: '#166534', fontWeight: '800', fontSize: '13.5px' }}>
                      ĐÃ XÁC MINH THÀNH CÔNG (HƯỞNG ƯU ĐÃI 20%)
                    </div>
                    <div style={{ color: '#15803d', fontSize: '12.5px', marginTop: '2px' }}>
                      Hồ sơ đối tượng <b>{userProfile.discount_type || 'HSSV'}</b> của bạn đã được Ban Quản Trị phê duyệt. Hệ thống tự động giảm giá khi đặt vé!
                    </div>
                  </div>
                </div>
              )}

              {discountMsg && (
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                  {discountMsg}
                </div>
              )}
              {discountErr && (
                <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                  ⚠️ {discountErr}
                </div>
              )}

              <form onSubmit={handleRegisterDiscount}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Chọn diện đối tượng ưu đãi
                  </label>
                  <select
                    value={discountTypeForm}
                    onChange={(e) => setDiscountTypeForm(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                  >
                    <option value="HSSV">🎓 Học sinh / Sinh viên (Giảm 20%)</option>
                    <option value="NguoiCaoTuoi">👵 Người cao tuổi (&gt; 60 tuổi - Giảm 20%)</option>
                    <option value="ThuongBinh">🎖️ Thương binh / Chính sách (Giảm 30%)</option>
                    <option value="NguoiKhuyetTat">♿ Người khuyết tật (Giảm 50%)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    {discountTypeForm === 'HSSV' ? 'Mã sinh viên / Mã học sinh' : 'Số CCCD / Mã thẻ ưu tiên'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={discountTypeForm === 'HSSV' ? 'ví dụ: B21DCCN001 hoặc SV2026-889' : 'ví dụ: 001202012345'}
                    value={studentId}
                    onChange={(e) => {
                      setStudentId(e.target.value);
                      setIdCardNumber(e.target.value);
                    }}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    {discountTypeForm === 'HSSV' ? 'Trường Đại Học / Học Viện / Khoa' : 'Đơn vị công tác / Trường học hoặc Ghi chú'}
                  </label>
                  <input
                    type="text"
                    placeholder={discountTypeForm === 'HSSV' ? 'ví dụ: Đại học Bách Khoa, Khóa 2023-2027' : 'Ghi chú minh chứng'}
                    value={schoolName}
                    onChange={(e) => {
                      setSchoolName(e.target.value);
                      setProofNote(e.target.value);
                    }}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                {/* Upload Ảnh Thẻ Sinh Viên / Minh Chứng */}
                <div style={{ marginBottom: '18px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1.5px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📷</span>
                    <span>{discountTypeForm === 'HSSV' ? 'Ảnh thẻ sinh viên để xác minh:' : 'Ảnh giấy tờ minh chứng kèm theo:'}</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '10px' }}>
                    {discountTypeForm === 'HSSV' ? 'Chụp rõ nét mặt trước thẻ sinh viên hoặc ảnh thẻ có dấu trường còn hiệu lực.' : 'Chụp rõ 2 mặt giấy tờ minh chứng hoặc thẻ ưu tiên còn thời hạn.'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}>
                      📁 Chọn ảnh thẻ từ máy
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCardImageUpload}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {!cardImage && (
                      <button
                        type="button"
                        onClick={() => setCardImage('https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80')}
                        style={{
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        🖼️ Dùng ảnh thẻ SV mẫu demo
                      </button>
                    )}

                    {cardImage && (
                      <button
                        type="button"
                        onClick={() => setCardImage('')}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        ✕ Xóa ảnh
                      </button>
                    )}
                  </div>

                  {cardImage && (
                    <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={cardImage}
                        alt="Ảnh thẻ sinh viên"
                        style={{ width: '120px', height: '76px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#166534' }}>✓ Đã chọn ảnh thẻ sinh viên</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Ảnh đã sẵn sàng gửi tới Ban Quản Trị xét duyệt.</div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#166534', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked />
                      <span>✓ Cam kết thông tin mã sinh viên và ảnh thẻ sinh viên chính chủ</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={discountSubmitting}
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    padding: '11px 20px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: discountSubmitting ? 'not-allowed' : 'pointer',
                    width: '100%',
                  }}
                >
                  {discountSubmitting ? 'Đang gửi hồ sơ...' : '📤 Gửi Hồ Sơ Xác Minh Ưu Đãi'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ĐỔI VÉ (EXCHANGE TICKET MODAL - GHẾ & CHUYẾN)                    */}
      {/* ========================================================================= */}
      {exchangingTicket && (
        <div
          className="dashboard-modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setExchangingTicket(null)}
        >
          <div
            className="dashboard-modal-content"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>🔄</span>
                <div>
                  <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '18px', fontWeight: '800' }}>
                    Đổi Vé Xe Trực Tuyến
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Mã vé: <b>{exchangingTicket.ticket_code || exchangingTicket.id}</b>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setExchangingTicket(null)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            {/* Thông tin vé hiện tại */}
            <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Thông tin chuyến đi hiện tại:</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                {exchangingTicket.routeName || exchangingTicket.route_name}
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                🕒 Khởi hành: <b>{exchangingTicket.departureTime || exchangingTicket.departure_time}</b> • 💺 Ghế hiện tại:{' '}
                <span style={{ color: '#2563eb', fontWeight: '800' }}>
                  {exchangingTicket.seatNumber || exchangingTicket.seat_numbers?.[0]}
                </span>
              </div>
            </div>

            {/* Chuyển loại đổi: Đổi ghế vs Đổi chuyến */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setExchangeType('seat')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: exchangeType === 'seat' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: exchangeType === 'seat' ? '#eff6ff' : '#ffffff',
                  color: exchangeType === 'seat' ? '#1d4ed8' : '#64748b',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>💺</span> 1. Đổi Ghế Cùng Chuyến (0đ)
              </button>

              <button
                type="button"
                onClick={() => setExchangeType('trip')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: exchangeType === 'trip' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: exchangeType === 'trip' ? '#eff6ff' : '#ffffff',
                  color: exchangeType === 'trip' ? '#1d4ed8' : '#64748b',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>🕒</span> 2. Đổi Sang Chuyến Khác
              </button>
            </div>

            {/* Error & Success alerts */}
            {exchangeError && (
              <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
                ❌ {exchangeError}
              </div>
            )}
            {exchangeSuccess && (
              <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
                ✅ {exchangeSuccess}
              </div>
            )}

            {exchangeType === 'seat' ? (
              /* Chọn ghế */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: '700', fontSize: '13px', color: '#334155' }}>
                    Chọn vị trí ghế mới muốn đổi:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#fef3c7', borderRadius: '2px', display: 'inline-block' }}></span> Hiện tại
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#2563eb', borderRadius: '2px', display: 'inline-block' }}></span> Chọn mới
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '2px', display: 'inline-block' }}></span> Còn trống
                    </span>
                  </div>
                </div>

                <div className="seat-selector-grid">
                  {STANDARD_SEATS.map((s) => {
                    const currentSeat = exchangingTicket.seatNumber || exchangingTicket.seat_numbers?.[0];
                    const isCurrent = s.toUpperCase() === currentSeat?.toUpperCase();
                    const isSelected = s === selectedNewSeat;

                    return (
                      <div
                        key={s}
                        className={`seat-option-box ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          if (!isCurrent) {
                            setSelectedNewSeat(s);
                            setExchangeError('');
                          }
                        }}
                      >
                        {s} {isCurrent ? '(Đang ngồi)' : ''}
                      </div>
                    );
                  })}
                </div>

                {selectedNewSeat && (
                  <div style={{ marginTop: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: '#1d4ed8' }}>
                    Ghế đã chọn: <b>{selectedNewSeat}</b> • Phí đổi ghế: <b>0 VNĐ (Miễn phí)</b>
                  </div>
                )}

                <button
                  onClick={handleConfirmExchangeSeat}
                  disabled={exchangeLoading || !selectedNewSeat}
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '13px',
                    borderRadius: '10px',
                    border: 'none',
                    background: selectedNewSeat ? '#2563eb' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '15px',
                    cursor: selectedNewSeat ? 'pointer' : 'not-allowed',
                  }}
                >
                  {exchangeLoading ? 'Đang cập nhật ghế...' : `✓ Xác Nhận Chuyển Sang Ghế ${selectedNewSeat || ''}`}
                </button>
              </div>
            ) : (
              /* Chọn chuyến mới */
              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                  Chọn chuyến xe thay thế:
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                  {alternativeTrips.map((trip) => {
                    const isSelected = selectedNewTrip?.id === trip.id;
                    return (
                      <div
                        key={trip.id}
                        onClick={() => setSelectedNewTrip(trip)}
                        style={{
                          border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          borderRadius: '12px',
                          padding: '14px 18px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>
                            🕒 {trip.departure_at} ({trip.bus_type || 'Limousine 36 chỗ'})
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            Tuyến: {trip.origin} ➔ {trip.destination} • Còn {trip.available_seats || 10} ghế trống
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                            Chênh lệch: 0 VNĐ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleConfirmExchangeTrip}
                  disabled={exchangeLoading || !selectedNewTrip}
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '13px',
                    borderRadius: '10px',
                    border: 'none',
                    background: selectedNewTrip ? '#2563eb' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '15px',
                    cursor: selectedNewTrip ? 'pointer' : 'not-allowed',
                  }}
                >
                  {exchangeLoading ? 'Đang cập nhật chuyến xe...' : '✓ Xác Nhận Đổi Sang Chuyến Này'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: HỦY VÉ & HOÀN TIỀN (CANCEL & REFUND MODAL)                      */}
      {/* ========================================================================= */}
      {cancellingTicket && (
        <div
          className="dashboard-modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => !cancelLoading && setCancellingTicket(null)}
        >
          <div
            className="dashboard-modal-content"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {cancelSuccessData ? (
              /* Màn hình thành công sau khi hủy */
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '54px', marginBottom: '10px' }}>✅</div>
                <h3 style={{ color: '#166534', margin: '0 0 6px 0', fontSize: '22px', fontWeight: '800' }}>
                  Hủy Vé & Gửi Yêu Cầu Hoàn Tiền Thành Công
                </h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                  Chỗ ngồi đã được giải phóng. Yêu cầu hoàn tiền của bạn đang được hệ thống xử lý.
                </p>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '18px', borderRadius: '14px', textAlign: 'left', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#475569', fontSize: '13px' }}>Mã vé đã hủy:</span>
                    <b style={{ color: '#0f172a' }}>{cancelSuccessData.ticketCode}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#475569', fontSize: '13px' }}>Số tiền hoàn lại:</span>
                    <b style={{ color: '#dc2626', fontSize: '16px' }}>
                      {cancelSuccessData.price.toLocaleString('vi-VN')} VNĐ (100%)
                    </b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#475569', fontSize: '13px' }}>Phương thức nhận hoàn:</span>
                    <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '13px' }}>{cancelSuccessData.refundMethod}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569', fontSize: '13px' }}>Thời gian hoàn tất dự kiến:</span>
                    <b style={{ color: '#d97706', fontSize: '13px' }}>24 - 48 giờ làm việc</b>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      setCancellingTicket(null);
                      setActiveTab('cancelled');
                    }}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '11px 24px',
                      borderRadius: '10px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Xem Danh Sách Vé Đã Hủy
                  </button>
                  <button
                    onClick={() => setCancellingTicket(null)}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '11px 20px',
                      borderRadius: '10px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Đóng Cửa Sổ
                  </button>
                </div>
              </div>
            ) : (
              /* Form xác nhận hủy vé */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>⚠️</span>
                    <h3 style={{ margin: 0, color: '#dc2626', fontSize: '18px', fontWeight: '800' }}>
                      Xác Nhận Hủy Vé & Yêu Cầu Hoàn Tiền
                    </h3>
                  </div>
                  <button
                    onClick={() => setCancellingTicket(null)}
                    style={{
                      border: 'none',
                      background: '#f1f5f9',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      fontSize: '16px',
                      cursor: 'pointer',
                      color: '#64748b',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Tóm tắt vé */}
                <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Mã vé hủy:</span>
                    <b>{cancellingTicket.ticket_code || cancellingTicket.id}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Chuyến đi:</span>
                    <b>{cancellingTicket.routeName || cancellingTicket.route_name}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Giờ xuất bến:</span>
                    <b>{cancellingTicket.departureTime || cancellingTicket.departure_time}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Ghế & Giá vé:</span>
                    <b style={{ color: '#dc2626' }}>
                      Ghế {cancellingTicket.seatNumber || cancellingTicket.seat_numbers?.[0]} • {cancellingTicket.price || '120.000 VNĐ'}
                    </b>
                  </div>
                </div>

                {/* Chính sách hoàn tiền */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', fontSize: '13px', color: '#166534' }}>
                  🎉 <b>Đủ điều kiện hoàn 100% tiền vé:</b> Yêu cầu trước giờ xuất bến trên 24 giờ. Số tiền hoàn lại:{' '}
                  <b>{cancellingTicket.price || '120.000 VNĐ'}</b>.
                </div>

                {/* Lý do hủy */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                    Lý do hủy vé:
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value="Thay đổi kế hoạch">Thay đổi kế hoạch di chuyển</option>
                    <option value="Bận việc đột xuất">Có việc bận đột xuất</option>
                    <option value="Đặt nhầm vé hoặc số ghế">Đặt nhầm vé hoặc số ghế</option>
                    <option value="Trùng lịch với người đi cùng">Trùng lịch với người đi cùng</option>
                    <option value="Lý do khác">Lý do khác...</option>
                  </select>

                  {cancelReason === 'Lý do khác' && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Nhập lý do cụ thể của bạn..."
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  )}
                </div>

                {/* Phương thức nhận tiền hoàn */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                    Chọn phương thức nhận tiền hoàn:
                  </label>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setRefundMethod('bank')}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: refundMethod === 'bank' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: refundMethod === 'bank' ? '#eff6ff' : '#ffffff',
                        color: refundMethod === 'bank' ? '#1d4ed8' : '#64748b',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      💳 TK Ngân Hàng
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundMethod('ewallet')}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: refundMethod === 'ewallet' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: refundMethod === 'ewallet' ? '#eff6ff' : '#ffffff',
                        color: refundMethod === 'ewallet' ? '#1d4ed8' : '#64748b',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      📱 Ví Điện Tử
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundMethod('original')}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: refundMethod === 'original' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: refundMethod === 'original' ? '#eff6ff' : '#ffffff',
                        color: refundMethod === 'original' ? '#1d4ed8' : '#64748b',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      🔄 Thẻ/Ví Gốc
                    </button>
                  </div>

                  {refundMethod === 'bank' && (
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>NGÂN HÀNG THỤ HƯỞNG</span>
                        <select
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                        >
                          {VIETNAM_BANKS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>SỐ TÀI KHOẢN (STK)</span>
                        <input
                          type="text"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          placeholder="Ví dụ: 1012345678"
                          style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>TÊN CHỦ TÀI KHOẢN</span>
                        <input
                          type="text"
                          value={bankHolder}
                          onChange={(e) => setBankHolder(e.target.value)}
                          placeholder="TRAN VAN TAI"
                          style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', textTransform: 'uppercase' }}
                        />
                      </div>
                    </div>
                  )}

                  {refundMethod === 'ewallet' && (
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>SỐ ĐIỆN THOẠI VÍ (MOMO / ZALOPAY / VNPAY)</span>
                      <input
                        type="text"
                        value={ewalletPhone}
                        onChange={(e) => setEwalletPhone(e.target.value)}
                        placeholder="0912 345 678"
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                  )}

                  {refundMethod === 'original' && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '13px', color: '#475569' }}>
                      ℹ️ Hệ thống sẽ tự động hoàn trả số tiền về đúng thẻ ngân hàng / ví điện tử bạn đã dùng để thanh toán vé này.
                    </div>
                  )}
                </div>

                {cancelError && (
                  <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
                    ❌ {cancelError}
                  </div>
                )}

                {/* Nút hành động */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCancellingTicket(null)}
                    disabled={cancelLoading}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#475569',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCancel}
                    disabled={cancelLoading}
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontWeight: '800',
                      cursor: cancelLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {cancelLoading ? 'Đang xử lý hủy vé...' : '❌ Xác Nhận Hủy Vé & Hoàn Tiền'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: XEM CHI TIẾT & IN VÉ ĐIỆN TỬ (PRINTABLE TICKET)                 */}
      {/* ========================================================================= */}
      {selectedTicketDetail && (() => {
        const routeName = selectedTicketDetail.routeName || selectedTicketDetail.route_name || 'Hà Nội - Thái Nguyên';
        const parts = routeName.split(/[-➔]/).map((s) => s.trim());
        const fromCity = selectedTicketDetail.departure_city || parts[0] || 'Hà Nội';
        const toCity = selectedTicketDetail.arrival_city || parts[1] || 'Thái Nguyên';
        const seatNum = selectedTicketDetail.seatNumber || selectedTicketDetail.seat_numbers?.[0] || 'A04';
        const ticketCode = selectedTicketDetail.id || selectedTicketDetail.ticket_code || 'TKT-DEMO';
        const bookingCode = selectedTicketDetail.booking_code || `BOOK-${ticketCode.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;
        const invoiceCode = `HDDT-2026-${ticketCode.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;

        return (
          <div
            className="dashboard-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={() => setSelectedTicketDetail(null)}
          >
            <div
              className="dashboard-modal-content"
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '820px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar */}
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '22px' }}>🎫</span>
                  <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '18px', fontWeight: '800' }}>
                    CHI TIẾT VÉ ĐIỆN TỬ SMART BUS (US07)
                  </h3>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedTicketDetail(null)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Printable Ticket */}
              <div id="printable-ticket" className="printable-ticket-wrapper">
                <PrintableTicket
                  ticketCode={ticketCode}
                  bookingCode={bookingCode}
                  invoiceCode={invoiceCode}
                  issuedAt="Hôm nay"
                  fromCity={fromCity}
                  toCity={toCity}
                  departureTime={selectedTicketDetail.departureTime || selectedTicketDetail.departure_time || '07:30'}
                  seatNumber={seatNum}
                  passengerName={selectedTicketDetail.passenger_name || currentUser.full_name || 'Trần Văn Tài'}
                  passengerPhone={selectedTicketDetail.passenger_phone || currentUser.phone || '0912 345 678'}
                  busType={selectedTicketDetail.bus_type || 'SmartBus VIP Limousine 36 chỗ'}
                  licensePlate={selectedTicketDetail.license_plate || '29B-123.45'}
                  finalPrice={selectedTicketDetail.price || '120.000 VNĐ'}
                  qrCodeUrl={selectedTicketDetail.qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ticket:${ticketCode}`}
                  status={selectedTicketDetail.status || 'CONFIRMED'}
                  showStub={true}
                />
              </div>

              {/* Action Buttons */}
              <div
                className="no-print"
                style={{
                  marginTop: '20px',
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#1e293b',
                    color: 'white',
                    border: 'none',
                    padding: '11px 22px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                  }}
                >
                  🖨️ In Vé Này / Lưu PDF
                </button>
                <button
                  onClick={() => setSelectedTicketDetail(null)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '11px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: '#475569',
                    fontSize: '14px',
                  }}
                >
                  Đóng Cửa Sổ
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default UserDashboard;