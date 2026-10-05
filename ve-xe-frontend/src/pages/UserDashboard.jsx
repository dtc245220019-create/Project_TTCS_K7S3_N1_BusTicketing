import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  getTickets,
  getTicketByCode,
  cancelTicket,
  changeTicketSeat,
  changeTicketTrip,
  getCurrentUser,
  getMonthlyPasses,
  getTrips,
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
    passenger_name: 'Trần Văn Tài (Tài Xế)',
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
    passenger_name: 'Trần Văn Tài (Tài Xế)',
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
    passenger_name: 'Trần Văn Tài (Tài Xế)',
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
    passenger_name: 'Trần Văn Tài (Tài Xế)',
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
  };

  // Đồng bộ tab nếu URL thay đổi
  useEffect(() => {
    const qTab = new URLSearchParams(location.search).get('tab');
    if (qTab) {
      setActiveTab(qTab);
    }
  }, [location.search]);

  // Tải dữ liệu toàn bộ vé
  const loadDashboardData = async () => {
    setLoading(true);
    try {
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
      const localCancelled = JSON.parse(localStorage.getItem('smartbus_cancelled_tickets') || '[]');

      // Hợp nhất vé
      const existingCodes = new Set(apiTickets.map((t) => (t.ticket_code || t.id || '').toUpperCase()));
      const uniqueLocal = localPurchased.filter((lt) => !existingCodes.has((lt.ticket_code || lt.id || '').toUpperCase()));
      let combined = [...uniqueLocal, ...apiTickets];

      if (combined.length === 0) {
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

      // Tải danh sách vé đã hủy
      const mergedCancelled = [
        ...localCancelled,
        ...updatedTickets.filter((t) => t.status === 'CANCELLED' && !localCancelled.some((c) => (c.ticketCode || c.id) === (t.ticket_code || t.id)))
      ];
      setCancelledList(mergedCancelled);

      // Tải vé tháng
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
    loadDashboardData();
  }, []);

  // Kiểm tra chuyến xe đã khởi hành trong quá khứ chưa
  const isPastDeparture = (timeStr) => {
    if (!timeStr) return false;
    try {
      const matchIso = timeStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (matchIso) {
        const timePart = timeStr.match(/(\d{2}):(\d{2})/)?.[0] || '23:59';
        const d = new Date(`${matchIso[0]}T${timePart}:00`);
        return d < new Date();
      }
      const matchVn = timeStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (matchVn) {
        const timePart = timeStr.match(/(\d{2}):(\d{2})/)?.[0] || '23:59';
        const d = new Date(`${matchVn[3]}-${matchVn[2]}-${matchVn[1]}T${timePart}:00`);
        return d < new Date();
      }
    } catch {
      return false;
    }
    return false;
  };

  // Phân loại chính xác Vé sắp khởi hành và Lịch sử chuyến đi quá khứ
  const upcomingTickets = tickets.filter(
    (t) =>
      (t.status === 'CONFIRMED' || t.status === 'PAID' || t.status === 'GiuCho') &&
      !t.is_past &&
      !isPastDeparture(t.departureTime || t.departure_time)
  );

  const historyTickets = tickets.filter(
    (t) =>
      t.status === 'COMPLETED' ||
      t.status === 'USED' ||
      t.status === 'DaSoat' ||
      Boolean(t.is_past) ||
      isPastDeparture(t.departureTime || t.departure_time)
  );

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

      // Tạo bản ghi hoàn tiền
      const rawPrice = cancellingTicket.total_amount || 120000;
      const refundRecord = {
        id: `REFUND-${Date.now().toString().slice(-6)}`,
        ticketCode: code,
        passenger: cancellingTicket.passenger_name || currentUser.full_name,
        route: cancellingTicket.routeName || cancellingTicket.route_name || 'Hà Nội - Thái Nguyên',
        departure: cancellingTicket.departureTime || cancellingTicket.departure_time,
        seat: cancellingTicket.seatNumber || cancellingTicket.seat_numbers?.[0] || 'A01',
        price: rawPrice,
        refundAmount: rawPrice, // Hoàn 100%
        reason: finalReason,
        refundMethod: refundMethod === 'bank' ? `${bankName} - STK: ${bankAccount} (${bankHolder})` : (refundMethod === 'ewallet' ? `Ví điện tử (${ewalletPhone})` : 'Hoàn về thẻ/nguồn thanh toán ban đầu'),
        refundStatus: 'ĐANG XỬ LÝ (Hoàn 100%)',
        cancelledAt: new Date().toLocaleString('vi-VN'),
      };

      // Lưu vé đã hủy vào localStorage
      const localCancelled = JSON.parse(localStorage.getItem('smartbus_cancelled_tickets') || '[]');
      const newCancelledList = [refundRecord, ...localCancelled];
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
      <div className="dashboard-stats-grid no-print" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
      </div>

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

              {cancelledList.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    border: '1px solid #fecaca',
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
                      <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: '800', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>
                        {item.refundStatus || 'ĐANG XỬ LÝ (Hoàn 100%)'}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1e293b' }}>
                      {item.route || item.routeName || 'Hà Nội - Thái Nguyên'}
                    </h4>
                    <p style={{ margin: '0 0 3px 0', fontSize: '13px', color: '#64748b' }}>
                      🕒 Xuất bến: {item.departure || item.departureTime} • 💺 Ghế cũ: <b>{item.seat || item.seatNumber || 'A04'}</b>
                    </p>
                    <p style={{ margin: '0 0 3px 0', fontSize: '13px', color: '#64748b' }}>
                      📝 <b>Lý do hủy:</b> {item.reason || 'Thay đổi lịch trình'}
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      💳 <b>Nhận tiền hoàn qua:</b> {item.refundMethod || 'Chuyển khoản tài khoản ngân hàng'}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Số tiền hoàn dự kiến:</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a', margin: '2px 0 6px 0' }}>
                      {typeof item.price === 'number' ? `${item.price.toLocaleString('vi-VN')} VNĐ` : (item.price || '120.000 VNĐ')}
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Hủy lúc: {item.cancelledAt || 'Gần đây'}
                    </span>
                  </div>
                </div>
              ))}
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
      ) : (
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