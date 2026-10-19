import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFaqs,
  getFaqRoles,
  getFaqCategories,
  getFaqStats,
  voteFaqHelpful,
  submitFaqInquiry,
} from '../api';
import './FaqPage.css';

// Dữ liệu mẫu dự phòng (fallback) giúp trang luôn hiển thị mượt mà kể cả khi backend chưa nạp DB
const FALLBACK_FAQS = [
  {
    id: 1,
    category: 'DAT_VE',
    role_target: 'HanhKhach',
    question: 'Làm thế nào để tìm kiếm chuyến xe và chọn chỗ ngồi ưng ý?',
    answer:
      'Bước 1: Truy cập Trang chủ hoặc mục "Chuyến xe".\nBước 2: Chọn Điểm đi, Điểm đến và Ngày khởi hành, sau đó nhấn "Tìm Chuyến Xe".\nBước 3: Chọn chuyến xe phù hợp và bấm "Chọn Ghế". Hệ thống hiển thị sơ đồ 2 tầng trực quan: Tầng dưới (A01-A18) và Tầng trên (B01-B18).\nBước 4: Bấm vào ghế màu xanh lá (ghế trống) để chọn. Ghế của bạn sẽ chuyển sang màu xanh dương nổi bật.\nBước 5: Nhấn "Tiến hành thanh toán". Hệ thống sẽ tự động giữ chỗ trong 10 phút để bạn hoàn tất đơn hàng.',
    keywords: 'tìm chuyến, chọn ghế, sơ đồ ghế, tầng 1 tầng 2, đặt vé',
    order_num: 1,
    icon: '🚌',
    helpful_count: 42,
    action_url: '/buses',
    action_label: 'Đặt Vé Ngay',
  },
  {
    id: 2,
    category: 'DAT_VE',
    role_target: 'HanhKhach',
    question: 'Cơ chế "Tạm giữ ghế 10 phút" hoạt động như thế nào?',
    answer:
      'Khi bạn chọn ghế và tiến hành đặt vé, hệ thống kích hoạt cơ chế khóa ghế tạm thời (HELD) trong vòng 10 phút. Trong thời gian này, không hành khách nào khác có thể chọn ghế đó. Đồng hồ đếm ngược sẽ hiển thị trên màn hình thanh toán. Nếu sau 10 phút bạn chưa hoàn tất thanh toán, Cronjob tự động của SmartBus sẽ giải phóng ghế về trạng thái TRỐNG (AVAILABLE) để người khác có thể đặt.',
    keywords: 'giữ chỗ, 10 phút, đếm ngược, hết hạn giữ ghế, tự động nhả ghế',
    order_num: 2,
    icon: '⏱️',
    helpful_count: 38,
    action_url: '/buses',
    action_label: 'Thử Chọn Ghế',
  },
  {
    id: 3,
    category: 'THANH_TOAN',
    role_target: 'HanhKhach',
    question: 'Hệ thống SmartBus hỗ trợ những phương thức thanh toán nào?',
    answer:
      'SmartBus tích hợp cổng thanh toán đa kênh an toàn:\n1. Quét mã VietQR chuyển khoản ngân hàng 24/7 (tự động nhận diện giao dịch).\n2. Cổng thanh toán trực tuyến VNPay (hỗ trợ thẻ ATM nội địa và ứng dụng Mobile Banking).\n3. Ví điện tử ZaloPay / MoMo.\n4. Cổng thanh toán Sandbox thử nghiệm tức thì dành cho môi trường Demo.\nSau khi thanh toán thành công, vé điện tử kèm mã QR sẽ được gửi ngay lập tức về hòm thư Email và lưu vào mục "Vé của tôi".',
    keywords: 'thanh toán, vnpay, zalopay, vietqr, sandbox, momo',
    order_num: 3,
    icon: '💳',
    helpful_count: 56,
    action_url: '/buses',
    action_label: 'Khám Phá Chuyến Xe',
  },
  {
    id: 4,
    category: 'VE_THANG',
    role_target: 'HanhKhach',
    question: 'Làm sao để đăng ký vé tháng xe buýt và nhận ưu đãi giảm giá HSSV?',
    answer:
      'Bước 1: Vào mục "Vé tháng" trên thanh điều hướng.\nBước 2: Chọn Tuyến đường bạn thường xuyên đi lại và chọn loại vé (1 tháng, 3 tháng hoặc 1 năm).\nBước 3: Nhập thông tin CCCD và tải lên hình ảnh Thẻ Học sinh - Sinh viên hoặc giấy tờ ưu tiên nếu thuộc diện đối tượng chính sách.\nBước 4: Nhấn "Đăng ký vé tháng". Hệ thống sẽ áp dụng mức chiết khấu 30% - 50% ngay sau khi Ban Quản Trị duyệt hồ sơ.\nBước 5: Bạn sẽ nhận mã thẻ vé tháng số hóa kèm mã QR để đi xe không giới hạn số lượt.',
    keywords: 'vé tháng, đăng ký vé tháng, hssv, học sinh sinh viên, ưu đãi',
    order_num: 4,
    icon: '🎫',
    helpful_count: 64,
    action_url: '/monthly-pass',
    action_label: 'Đăng Ký Vé Tháng',
  },
  {
    id: 5,
    category: 'DOI_HUY_VE',
    role_target: 'HanhKhach',
    question: 'Chính sách đổi vé, đổi ghế hoặc hủy vé hoàn tiền quy định ra sao?',
    answer:
      'Chính sách hoàn/hủy vé tự động theo quy định của SmartBus:\n• Trước giờ khởi hành trên 24 tiếng: Hoàn 90% giá trị vé (phí xử lý 10%).\n• Trước giờ khởi hành từ 12 đến 24 tiếng: Hoàn 70% giá trị vé (phí xử lý 30%).\n• Dưới 12 tiếng hoặc sau khi xe đã xuất bến: Không hỗ trợ hoàn hủy.\nCách thực hiện: Vào "Vé của tôi" -> Chọn vé cần thao tác -> Bấm "Đổi chuyến / Đổi ghế" (miễn phí chênh lệch cùng hạng) hoặc "Yêu cầu hủy vé & hoàn tiền". Bạn có thể tra cứu tiến độ hoàn tiền tại mục "Hoàn tiền".',
    keywords: 'hủy vé, đổi vé, hoàn tiền, đổi chuyến, chính sách hoàn',
    order_num: 5,
    icon: '💸',
    helpful_count: 89,
    action_url: '/tra-cuu-hoan-tien',
    action_label: 'Tra Cứu Hoàn Tiền',
  },
  {
    id: 6,
    category: 'SOAT_VE_BOARDING',
    role_target: 'HanhKhach',
    question: 'Khi lên xe buýt tôi cần xuất trình những giấy tờ hoặc mã gì?',
    answer:
      'Bạn chỉ cần mở điện thoại vào mục "Vé của tôi" và bấm "Xem mã QR vé" (hoặc mở email vé điện tử đã được SmartBus gửi). Khi bước lên xe, đưa mã QR trước máy quét của Phụ xe hoặc điện thoại của Tài xế. Hệ thống sẽ phát âm thanh báo "Hợp lệ" và xác nhận bạn đã lên xe thành công. Nếu điện thoại hết pin, bạn chỉ cần đọc Số điện thoại hoặc Mã vé (ví dụ: TK-XXXX) cho Phụ xe kiểm tra.',
    keywords: 'lên xe, xuất trình vé, mã qr vé, quét mã, lên trạm',
    order_num: 6,
    icon: '📱',
    helpful_count: 35,
    action_url: '/dashboard',
    action_label: 'Xem Vé Của Tôi',
  },
  {
    id: 7,
    category: 'KY_THUAT',
    role_target: 'HanhKhach',
    question: 'Làm sao để theo dõi vị trí xe buýt trực tiếp trên bản đồ GPS?',
    answer:
      'Vào mục "Bản đồ" trên thanh điều hướng. Bản đồ số sẽ hiển thị trực quan toàn bộ mạng lưới tuyến xe, các trạm dừng dọc hành trình và biểu tượng xe buýt đang di chuyển theo thời gian thực (real-time GPS simulation). Bạn có thể bấm vào từng trạm dừng để xem khoảng cách km và thời gian dự kiến xe sẽ đến đón.',
    keywords: 'bản đồ, gps, theo dõi xe, vị trí trạm dừng, xe đến trong bao lâu',
    order_num: 7,
    icon: '🗺️',
    helpful_count: 47,
    action_url: '/map',
    action_label: 'Mở Bản Đồ GPS',
  },
  {
    id: 8,
    category: 'KY_THUAT',
    role_target: 'HanhKhach',
    question: 'Tôi có thể liên hệ hỗ trợ hoặc phản ánh chất lượng chuyến đi ở đâu?',
    answer:
      'Bạn có 3 kênh hỗ trợ nhanh:\n1. Bấm vào biểu tượng Chatbot AI ở góc phải màn hình để được trợ lý ảo giải đáp 24/7 về lịch trình, quy định hành lý và giá vé.\n2. Vào mục "Đánh giá" để gửi sao và nhận xét chi tiết sau chuyến đi.\n3. Gọi trực tiếp tổng đài chăm sóc khách hàng SmartBus: 1900 6868.',
    keywords: 'hỗ trợ, liên hệ, chatbot ai, đánh giá dịch vụ, khiếu nại',
    order_num: 8,
    icon: '💬',
    helpful_count: 29,
    action_url: '/feedback',
    action_label: 'Gửi Đánh Giá',
  },
  {
    id: 9,
    category: 'SOAT_VE_BOARDING',
    role_target: 'TaiXe',
    question: 'Quy trình xem lịch trình chạy xe và điểm danh trước chuyến đi (Dành cho Tài Xế)',
    answer:
      'Bước 1: Chuyển vai trò sang "Tài Xế" (hoặc đăng nhập bằng tài khoản tài xế).\nBước 2: Truy cập mục "Lịch trình xe" hoặc "Lịch sử chuyến". Bạn sẽ thấy danh sách các chuyến xe được Ban Quản Trị phân công phụ trách trong ngày (mã chuyến, biển số xe, giờ xuất bến, điểm đi, điểm đến).\nBước 3: Kiểm tra thông số xe và xác nhận sẵn sàng xuất bến trước giờ chạy ít nhất 15 phút.',
    keywords: 'tài xế, lịch trình, phân công, xuất bến, lái xe',
    order_num: 9,
    icon: '🧭',
    helpful_count: 51,
    action_url: '/buses',
    action_label: 'Xem Lịch Trình',
  },
  {
    id: 10,
    category: 'SOAT_VE_BOARDING',
    role_target: 'TaiXe',
    question: 'Hướng dẫn Tài xế sử dụng tính năng Soát vé & Check-in tại cửa xe',
    answer:
      'Bước 1: Vào mục "Soát vé & Lên xe" trên thanh điều hướng.\nBước 2: Chọn chuyến xe hiện tại đang phục vụ.\nBước 3: Hướng camera điện thoại về phía mã QR trên vé của hành khách (hoặc trên ứng dụng của họ). Hệ thống sẽ tự động quét và kiểm tra tính hợp lệ tức thì.\nBước 4: Nhấn nút "Xác nhận lên xe" để chuyển trạng thái vé sang "USED" (Đã lên xe) và đồng bộ trực tiếp lên hệ thống trung tâm.',
    keywords: 'tài xế, soát vé, check-in, quét qr, cửa xe',
    order_num: 10,
    icon: '📷',
    helpful_count: 44,
    action_url: '/verify-ticket',
    action_label: 'Mở Máy Soát Vé',
  },
  {
    id: 11,
    category: 'KY_THUAT',
    role_target: 'TaiXe',
    question: 'Quy trình xử lý sự cố kỹ thuật hoặc tắc đường dọc hành trình',
    answer:
      'Khi gặp sự cố ngoài ý muốn (xe hỏng hóc, sự cố lốp, tắc đường nghiêm trọng):\n1. Đảm bảo an toàn tuyệt đối cho toàn bộ hành khách trên xe, bật đèn cảnh báo.\n2. Liên hệ ngay Bộ phận Điều phối & Tổng đài điều hành qua Hotline nội bộ.\n3. Thông báo rõ lý do và dự kiến thời gian chậm trễ cho hành khách trên xe để họ an tâm.\n4. Ban điều phối sẽ kích hoạt xe dự phòng hoặc gửi thông báo SMS/Email khẩn cấp tới các hành khách ở trạm kế tiếp.',
    keywords: 'tài xế, sự cố, hỏng xe, tắc đường, báo cáo sự cố',
    order_num: 11,
    icon: '⚠️',
    helpful_count: 33,
  },
  {
    id: 12,
    category: 'SOAT_VE_BOARDING',
    role_target: 'PhuXe',
    question: 'Hướng dẫn Phụ xe soát vé QR và xử lý khi hành khách quên mã vé',
    answer:
      'Bước 1: Vào mục "Soát vé QR" trên thanh menu.\nBước 2: Quét mã QR trên màn hình điện thoại hoặc vé giấy của hành khách.\nBước 3: Nếu khách hết pin hoặc quên mã vé: Bấm chuyển sang tab "Tra cứu thủ công", nhập Số điện thoại hoặc Họ tên của khách để tìm vé. Nếu vé hiển thị trạng thái "ĐÃ THANH TOÁN (PAID)", bấm nút "Xác nhận lên xe".\nBước 4: Hướng dẫn hành khách về đúng số ghế (tầng 1 hoặc tầng 2) đã ghi rõ trên vé.',
    keywords: 'phụ xe, soát vé, quên vé, tra cứu sđt, lên xe',
    order_num: 12,
    icon: '🎟️',
    helpful_count: 62,
    action_url: '/verify-ticket',
    action_label: 'Soát Vé QR',
  },
  {
    id: 13,
    category: 'DAT_VE',
    role_target: 'PhuXe',
    question: 'Cách xuất vé trực tiếp cho khách lên xe tại trạm dừng (Bán vé quầy / Offline)',
    answer:
      'Đối với hành khách vãng lai bắt xe dọc đường:\nBước 1: Vào mục "Bán vé quầy" hoặc "Chuyến xe".\nBước 2: Chọn chuyến xe đang chạy, kiểm tra các ghế trống (màu xanh lá).\nBước 3: Nhập thông tin nhanh của khách (Họ tên, SĐT) và chọn ghế theo yêu cầu của khách.\nBước 4: Thu tiền mặt hoặc đưa mã QR tĩnh để khách quét chuyển khoản.\nBước 5: Bấm "Xuất vé nhanh", hệ thống ghi nhận doanh thu và in hoặc gửi vé điện tử qua SMS/Email cho khách.',
    keywords: 'phụ xe, bán vé trực tiếp, vé quầy, khách dọc đường, tiền mặt',
    order_num: 13,
    icon: '💵',
    helpful_count: 49,
    action_url: '/buses',
    action_label: 'Bán Vé Chuyến',
  },
  {
    id: 14,
    category: 'VE_THANG',
    role_target: 'PhuXe',
    question: 'Cách kiểm tra tính hợp lệ của Vé Tháng khi hành khách xuất trình',
    answer:
      'Hành khách sử dụng vé tháng sẽ xuất trình thẻ cứng hoặc mã QR vé tháng trên điện thoại.\nPhụ xe dùng ứng dụng quét mã QR vé tháng hoặc vào mục "Vé tháng" nhập mã thẻ. Màn hình sẽ hiển thị: Tên hành khách, Ảnh chân dung, Tuyến đường được phép đi và Ngày hết hạn. Nếu trạng thái là "CÒN HẠN (ConHan)" và đúng tuyến, mời khách lên xe.',
    keywords: 'phụ xe, kiểm tra vé tháng, thẻ tháng, hết hạn vé tháng',
    order_num: 14,
    icon: '🆔',
    helpful_count: 40,
    action_url: '/monthly-pass',
    action_label: 'Kiểm Tra Vé Tháng',
  },
  {
    id: 15,
    category: 'QUAN_TRI',
    role_target: 'Admin',
    question: 'Quy trình tạo chuyến xe mới và phân công Tài xế, Phụ xe (Điều phối)',
    answer:
      'Bước 1: Chuyển vai trò sang "Quản trị viên" và truy cập mục "Quản Trị Hệ Thống" (/admin).\nBước 2: Chuyển sang tab "Điều phối chuyến" hoặc "Quản lý Chuyến xe".\nBước 3: Bấm nút "+ Thêm chuyến xe mới".\nBước 4: Chọn Tuyến đường (Route), Xe buýt (Bus) phụ trách, phân công Tài xế (Driver) và Phụ xe (Staff).\nBước 5: Nhập thời gian khởi hành và kết thúc dự kiến, điều chỉnh giá vé cơ bản nếu cần.\nBước 6: Nhấn "Lưu chuyến xe". Hệ thống sẽ tự động khởi tạo danh sách ghế tương ứng với loại xe buýt đã chọn.',
    keywords: 'admin, tạo chuyến xe, phân công tài xế, điều phối, quản trị',
    order_num: 15,
    icon: '👑',
    helpful_count: 78,
    action_url: '/admin',
    action_label: 'Mở Cổng Quản Trị',
  },
  {
    id: 16,
    category: 'QUAN_TRI',
    role_target: 'Admin',
    question: 'Cách phê duyệt hồ sơ giảm giá vé tháng cho Học sinh - Sinh viên (US23)',
    answer:
      'Bước 1: Vào Admin Dashboard -> Tab "Hồ sơ Vé Tháng & Giảm giá".\nBước 2: Hệ thống hiển thị danh sách người dùng có trạng thái "Chờ duyệt (ChoDuyet)".\nBước 3: Nhấn "Xem chi tiết" để kiểm tra hình ảnh Thẻ HSSV hoặc giấy tờ chứng minh.\nBước 4: Nhấn nút "Duyệt giảm giá" (Chuyển sang "DaDuyet"). Hệ thống sẽ tự động gửi Email thông báo chúc mừng tới người dùng và kích hoạt chiết khấu 30-50% cho các lần mua vé tháng tiếp theo.',
    keywords: 'admin, duyệt giảm giá, hssv, duyệt hồ sơ, vé tháng ưu đãi',
    order_num: 16,
    icon: '🎓',
    helpful_count: 71,
    action_url: '/admin',
    action_label: 'Duyệt Hồ Sơ HSSV',
  },
  {
    id: 17,
    category: 'DOI_HUY_VE',
    role_target: 'Admin',
    question: 'Quy trình thẩm định và phê duyệt yêu cầu Hoàn tiền / Hủy vé (US08)',
    answer:
      'Bước 1: Vào Admin Dashboard -> Chọn tab "Quản lý Hoàn tiền".\nBước 2: Xem danh sách các yêu cầu hoàn tiền đang ở trạng thái "PENDING". Hệ thống tính toán sẵn tỷ lệ khấu trừ (10% hoặc 30%) và số tiền đề xuất hoàn dựa trên mốc thời gian khách gửi đơn.\nBước 3: Kiểm tra thông tin STK ngân hàng, Tên người thụ hưởng của khách hàng.\nBước 4: Nhấn "Phê duyệt hoàn tiền". Hệ thống ghi nhận trạng thái "REFUNDED", hủy vé trong cơ sở dữ liệu và kích hoạt thông báo gửi tới khách hàng.',
    keywords: 'admin, duyệt hoàn tiền, us08, hủy vé, chuyển khoản hoàn tiền',
    order_num: 17,
    icon: '⚖️',
    helpful_count: 83,
    action_url: '/admin',
    action_label: 'Duyệt Hoàn Tiền',
  },
  {
    id: 18,
    category: 'QUAN_TRI',
    role_target: 'Admin',
    question: 'Cách tạo mã Voucher khuyến mãi và thiết lập chính sách phụ phí (US18)',
    answer:
      'Bước 1: Tại trang Quản trị, chọn tab "Voucher & Phụ phí".\nBước 2: Bấm nút "Tạo Voucher Mới".\nBước 3: Nhập Mã khuyến mãi (ví dụ: HE2026, BANMOI, TRIAN), phần trăm giảm giá (%) hoặc số tiền giảm cố định, số lượng phát hành tối đa và ngày hết hạn.\nBước 4: Nhấn "Kích hoạt Voucher". Người dùng khi đặt vé có thể nhập mã này tại bước thanh toán để được giảm trừ trực tiếp vào tổng tiền.',
    keywords: 'admin, tạo voucher, khuyến mãi, mã giảm giá, us18, phụ phí',
    order_num: 18,
    icon: '🎁',
    helpful_count: 67,
    action_url: '/admin',
    action_label: 'Tạo Voucher Mới',
  },
  {
    id: 19,
    category: 'QUAN_TRI',
    role_target: 'Admin',
    question: 'Hướng dẫn theo dõi Báo cáo Doanh thu, Tỷ lệ lấp đầy ghế và Xuất Excel',
    answer:
      'Bước 1: Tại Admin Dashboard, chọn tab "Thống kê & Doanh thu".\nBước 2: Theo dõi các chỉ số KPI trực quan: Tổng doanh thu, Số vé bán ra, Tỷ lệ lấp đầy ghế bình quân (Occupancy Rate) và Biểu đồ doanh thu theo ngày/tháng.\nBước 3: Chọn khoảng thời gian hoặc lọc theo từng tuyến xe trọng điểm.\nBước 4: Nhấn nút "Xuất báo cáo Excel / CSV". Hệ thống sẽ trích xuất toàn bộ dữ liệu tài chính chi tiết để phục vụ báo cáo kế toán và nghiệm thu dự án.',
    keywords: 'admin, doanh thu, thống kê, tỷ lệ lấp đầy, xuất excel, csv, báo cáo',
    order_num: 19,
    icon: '📊',
    helpful_count: 95,
    action_url: '/admin',
    action_label: 'Xem Doanh Thu',
  },
  {
    id: 20,
    category: 'QUAN_TRI',
    role_target: 'Admin',
    question: 'Cách giám sát Nhật ký kiểm toán hệ thống (Audit Logs) để bảo mật',
    answer:
      'Bước 1: Vào Admin Dashboard -> Tab "Nhật ký kiểm toán (Audit Logs)".\nBước 2: Bảng hiển thị toàn bộ hoạt động nhạy cảm trong hệ thống theo dòng thời gian (Ai làm gì? Thời điểm nào? Tác động lên bảng dữ liệu nào? Chi tiết thông số).\nBước 3: Sử dụng thanh lọc để tìm kiếm các hành vi như: Đổi ghế, Phê duyệt hoàn tiền, Tạo voucher, Phân công tài xế nhằm phục vụ công tác thanh tra và kiểm soát rủi ro bảo mật.',
    keywords: 'admin, audit log, nhật ký kiểm toán, bảo mật, truy vết lịch sử',
    order_num: 20,
    icon: '🛡️',
    helpful_count: 58,
    action_url: '/admin',
    action_label: 'Xem Audit Logs',
  },
];

const ROLES_META = [
  {
    code: 'ALL',
    name: 'Tất Cả Vai Trò',
    badge_color: '#64748b',
    icon: '🌐',
    description: 'Toàn bộ cẩm nang hướng dẫn sử dụng và vận hành hệ thống SmartBus.',
    key_features: ['Tra cứu lộ trình', 'Bản đồ GPS', 'Chatbot AI 24/7', 'Liên hệ hỗ trợ'],
  },
  {
    code: 'HanhKhach',
    name: 'Hành Khách (Customer)',
    badge_color: '#2563eb',
    icon: '🎒',
    description: 'Người đặt vé xe khách, vé tháng, tra cứu chuyến và quản lý hành trình di chuyển.',
    key_features: [
      'Tra cứu chuyến xe & chọn ghế 2 tầng',
      'Giữ chỗ 10 phút & thanh toán đa phương thức',
      'Nhận vé điện tử mã QR lên xe tức thì',
      'Đăng ký vé tháng ưu đãi HSSV (30-50%)',
      'Hủy vé, đổi chuyến & nhận hoàn tiền tự động',
      'Theo dõi xe buýt thời gian thực trên bản đồ GPS',
    ],
    demo_action: { label: 'Chuyển sang Hành Khách', target_url: '/dashboard' },
  },
  {
    code: 'TaiXe',
    name: 'Tài Xế (Driver)',
    badge_color: '#d97706',
    icon: '🚌',
    description: 'Người điều khiển phương tiện, vận hành chuyến xe và soát vé hành khách tại cửa xe.',
    key_features: [
      'Xem lịch trình xe chạy và danh sách trạm dừng',
      'Quét mã QR soát vé tại cửa xe buýt (Boarding check-in)',
      'Điểm danh hành khách đã lên xe và vắng mặt',
      'Báo cáo sự cố phương tiện hoặc giao thông khẩn cấp',
    ],
    demo_action: { label: 'Chuyển sang Tài Xế', target_url: '/verify-ticket' },
  },
  {
    code: 'PhuXe',
    name: 'Phụ Xe / Soát Vé (Conductor)',
    badge_color: '#7c3aed',
    icon: '🎫',
    description: 'Nhân viên hỗ trợ hành khách, kiểm tra vé, bán vé quầy trực tiếp và xử lý tại chỗ.',
    key_features: [
      'Soát vé QR bằng camera hoặc tra cứu SĐT/Mã vé khi khách hết pin',
      'Bán vé trực tiếp cho khách lên xe tại trạm dừng',
      'Kiểm tra thẻ vé tháng sinh viên/người cao tuổi',
      'Hỗ trợ đổi chỗ và hướng dẫn vị trí tầng 1, tầng 2',
    ],
    demo_action: { label: 'Chuyển sang Phụ Xe', target_url: '/verify-ticket' },
  },
  {
    code: 'Admin',
    name: 'Quản Trị Viên (System Admin)',
    badge_color: '#dc2626',
    icon: '👑',
    description: 'Quản lý toàn bộ hệ sinh thái: tuyến đường, phương tiện, nhân sự, tài chính và bảo mật.',
    key_features: [
      'Điều phối chuyến xe và phân công tài xế, phụ xe',
      'Xét duyệt hồ sơ ưu đãi vé tháng HSSV (US23)',
      'Thẩm định & phê duyệt hoàn tiền hủy vé (US08)',
      'Phát hành mã Voucher khuyến mãi & cấu hình phụ phí',
      'Báo cáo doanh thu thời gian thực & tỷ lệ lấp đầy ghế',
      'Giám sát nhật ký kiểm toán hệ thống (Audit Logs)',
      'Xuất dữ liệu thống kê ra file Excel / CSV',
    ],
    demo_action: { label: 'Chuyển sang Quản Trị Viên', target_url: '/admin' },
  },
];

const CATEGORIES_META = [
  { code: 'ALL', name: 'Tất cả chủ đề', icon: '✨' },
  { code: 'DAT_VE', name: 'Đặt Vé & Chọn Ghế', icon: '💺' },
  { code: 'THANH_TOAN', name: 'Thanh Toán & Cổng Online', icon: '💳' },
  { code: 'VE_THANG', name: 'Vé Tháng & Ưu Đãi HSSV', icon: '🎫' },
  { code: 'DOI_HUY_VE', name: 'Đổi Ghế, Hủy Vé & Hoàn Tiền', icon: '💸' },
  { code: 'SOAT_VE_BOARDING', name: 'Soát Vé & Lên Xe (Boarding)', icon: '📱' },
  { code: 'QUAN_TRI', name: 'Quản Trị Hệ Thống & Nghiệp Vụ', icon: '👑' },
  { code: 'KY_THUAT', name: 'Kỹ Thuật & Hỗ Trợ 24/7', icon: '🛠️' },
];

function FaqPage() {
  const navigate = useNavigate();

  // State quản lý
  const [faqs, setFaqs] = useState(FALLBACK_FAQS);
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState(1);
  const [helpfulMap, setHelpfulMap] = useState({});
  const [stats, setStats] = useState({
    total_faqs: 20,
    total_helpful_votes: 1120,
    total_categories: 7,
    total_roles: 4,
    support_hotline: '1900 6868',
    support_email: 'hotro@smartbus.vn',
  });

  // Modal gửi câu hỏi mới
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role_target: 'HanhKhach',
    category: 'DAT_VE',
    question: '',
  });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccessMsg, setInquirySuccessMsg] = useState('');

  // Tải dữ liệu từ Backend API
  useEffect(() => {
    // Tải danh sách FAQ
    getFaqs({ role: selectedRole, category: selectedCategory })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFaqs(data);
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải FAQ từ Backend, sử dụng bộ dữ liệu cục bộ dự phòng:', err);
      });

    // Tải thống kê
    getFaqStats()
      .then((statData) => {
        if (statData) setStats(statData);
      })
      .catch(() => {});
  }, [selectedRole, selectedCategory]);

  // Bộ lọc tìm kiếm
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      // Lọc Role
      if (selectedRole !== 'ALL' && faq.role_target !== selectedRole && faq.role_target !== 'ALL') {
        return false;
      }
      // Lọc Category
      if (selectedCategory !== 'ALL' && faq.category !== selectedCategory) {
        return false;
      }
      // Lọc Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const questionMatch = (faq.question || '').toLowerCase().includes(q);
        const answerMatch = (faq.answer || '').toLowerCase().includes(q);
        const keywordMatch = (faq.keywords || '').toLowerCase().includes(q);
        return questionMatch || answerMatch || keywordMatch;
      }
      return true;
    });
  }, [faqs, selectedRole, selectedCategory, searchQuery]);

  // Xử lý vote helpful
  const handleVoteHelpful = async (faqId, e) => {
    e.stopPropagation();
    if (helpfulMap[faqId]) return;

    setHelpfulMap((prev) => ({ ...prev, [faqId]: true }));
    setFaqs((prev) =>
      prev.map((f) => (f.id === faqId ? { ...f, helpful_count: (f.helpful_count || 0) + 1 } : f))
    );

    try {
      await voteFaqHelpful(faqId);
    } catch {
      // Silent fail
    }
  };

  // Xử lý gửi inquiry
  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setInquirySubmitting(true);
    setInquirySuccessMsg('');
    try {
      const res = await submitFaqInquiry(inquiryForm);
      setInquirySuccessMsg(
        res.message || 'Thắc mắc của bạn đã được gửi thành công! Ban Quản Trị sẽ phản hồi trong 24h.'
      );
      setInquiryForm({
        full_name: '',
        email: '',
        phone: '',
        role_target: 'HanhKhach',
        category: 'DAT_VE',
        question: '',
      });
      setTimeout(() => {
        setShowInquiryModal(false);
        setInquirySuccessMsg('');
      }, 2500);
    } catch (err) {
      alert('Không thể gửi câu hỏi: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setInquirySubmitting(false);
    }
  };

  // Giả lập chuyển vai trò nhanh để kiểm thử
  const handleActorSimulate = (roleCode, targetUrl) => {
    const roleMap = {
      HanhKhach: { id: 1, full_name: 'Nguyễn Văn A (Hành Khách)', email: 'customer@example.com', role: 'HanhKhach' },
      TaiXe: { id: 11, full_name: 'Trần Văn Tài (Tài Xế)', email: 'taixe.nguyen@smartbus.vn', role: 'TaiXe' },
      PhuXe: { id: 2, full_name: 'Lê Phụ Xe (Nhân Viên)', email: 'nhanvien@smartbus.vn', role: 'PhuXe' },
      Admin: { id: 12, full_name: 'Lê Quản Lý (Admin)', email: 'admin@smartbus.vn', role: 'Admin' },
    };
    if (roleMap[roleCode]) {
      localStorage.setItem('user', JSON.stringify(roleMap[roleCode]));
      window.dispatchEvent(new Event('storage'));
      navigate(targetUrl);
    }
  };

  const activeRoleMeta = ROLES_META.find((r) => r.code === selectedRole) || ROLES_META[0];

  return (
    <div className="faq-page-container">
      {/* HERO SECTION */}
      <section className="faq-hero">
        <div className="faq-hero-inner">
          <div className="faq-badge-chip">
            <span>✨</span> SMARTBUS KNOWLEDGE BASE & SYSTEM MANUAL
          </div>
          <h1 className="faq-hero-title">
            Trung Tâm Trợ Giúp &<br />
            <span>Hướng Dẫn Vận Hành Hệ Thống</span>
          </h1>
          <p className="faq-hero-desc">
            Cẩm nang hướng dẫn đầy đủ, chi tiết từng bước vận hành nghiệp vụ cho tất cả các bên tham gia:
            <strong> Hành Khách, Tài Xế, Phụ Xe</strong> và <strong>Quản Trị Viên</strong>.
          </p>

          {/* SEARCH BAR */}
          <div className="faq-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="faq-search-input"
              placeholder="Nhập từ khóa cần trợ giúp: giữ chỗ 10p, soát vé QR, hoàn tiền, vé tháng HSSV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>

          {/* POPULAR TAGS */}
          <div className="faq-popular-tags">
            <span className="tags-label">Từ khóa phổ biến:</span>
            {[
              'Chọn ghế 2 tầng',
              'Giữ chỗ 10 phút',
              'Vé tháng HSSV',
              'Hoàn tiền US08',
              'Quét QR Soát vé',
              'Điều phối xe',
              'Xuất báo cáo Excel',
            ].map((tag, idx) => (
              <button
                key={idx}
                className="faq-tag-btn"
                onClick={() => setSearchQuery(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* QUICK STATS BAR */}
          <div className="faq-stats-bar">
            <div className="stat-item">
              <span className="stat-number">20+</span>
              <span className="stat-label">Cẩm nang hướng dẫn</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">4 Roles</span>
              <span className="stat-label">Đầy đủ mọi vai trò</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">7 Nhóm</span>
              <span className="stat-label">Nghiệp vụ cốt lõi</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">1900 6868</span>
              <span className="stat-label">Tổng đài hỗ trợ 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <div className="faq-main-wrapper">
        {/* ROLE TABS SELECTOR */}
        <div className="faq-role-tabs">
          <div className="role-tabs-header">
            <h3>Chọn vai trò cần xem hướng dẫn:</h3>
            <span className="role-tabs-sub">Mỗi vai trò có hệ sinh thái tính năng và nghiệp vụ riêng biệt</span>
          </div>

          <div className="role-tabs-grid">
            {ROLES_META.map((r) => {
              const isSelected = selectedRole === r.code;
              return (
                <button
                  key={r.code}
                  className={`role-tab-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedRole(r.code)}
                  style={{
                    borderColor: isSelected ? r.badge_color : 'transparent',
                    borderLeft: isSelected ? `4px solid ${r.badge_color}` : 'none',
                  }}
                >
                  <span className="role-icon">{r.icon}</span>
                  <div className="role-info">
                    <strong style={{ color: isSelected ? r.badge_color : '#1e293b' }}>
                      {r.name}
                    </strong>
                    <small>{r.description.slice(0, 52)}...</small>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE ROLE HIGHLIGHT & PERMISSIONS CARD */}
        {selectedRole !== 'ALL' && (
          <div className="role-summary-card" style={{ borderLeft: `6px solid ${activeRoleMeta.badge_color}` }}>
            <div className="role-summary-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>{activeRoleMeta.icon}</span>
                <div>
                  <h3 style={{ margin: 0, color: activeRoleMeta.badge_color }}>
                    Nghiệp Vụ & Quyền Hạn: {activeRoleMeta.name}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: '#475569', fontSize: '14px' }}>
                    {activeRoleMeta.description}
                  </p>
                </div>
              </div>

              {activeRoleMeta.demo_action && (
                <button
                  className="role-simulate-btn"
                  style={{ backgroundColor: activeRoleMeta.badge_color }}
                  onClick={() =>
                    handleActorSimulate(activeRoleMeta.code, activeRoleMeta.demo_action.target_url)
                  }
                  title="Giả lập phiên đăng nhập của vai trò này để trải nghiệm trực tiếp hệ thống"
                >
                  <span>⚡</span> {activeRoleMeta.demo_action.label} ➔
                </button>
              )}
            </div>

            <div className="role-features-list">
              <span className="features-title">Các nghiệp vụ chính trên hệ thống:</span>
              <div className="features-tags">
                {activeRoleMeta.key_features.map((feat, idx) => (
                  <span key={idx} className="feature-pill">
                    ✓ {feat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY CHIPS */}
        <div className="faq-category-nav">
          <span className="cat-nav-title">Chủ đề:</span>
          <div className="cat-chips-scroll">
            {CATEGORIES_META.map((cat) => {
              const isSelected = selectedCategory === cat.code;
              return (
                <button
                  key={cat.code}
                  className={`cat-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.code)}
                >
                  <span>{cat.icon}</span> {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* RESULTS HEADER & ACTION BUTTONS */}
        <div className="faq-results-header">
          <div>
            <h2>
              {selectedCategory === 'ALL'
                ? 'Danh Sách Hướng Dẫn & Câu Hỏi'
                : CATEGORIES_META.find((c) => c.code === selectedCategory)?.name}
            </h2>
            <span className="results-count">
              Tìm thấy <strong>{filteredFaqs.length}</strong> bài viết phù hợp
            </span>
          </div>

          <button className="faq-ask-btn" onClick={() => setShowInquiryModal(true)}>
            <span>❓</span> Gửi Câu Hỏi Mới
          </button>
        </div>

        {/* FAQ ACCORDION LIST */}
        <div className="faq-accordion-list">
          {filteredFaqs.length === 0 ? (
            <div className="faq-empty-state">
              <span className="empty-icon">🔎</span>
              <h3>Không tìm thấy câu hỏi phù hợp</h3>
              <p>Thử tìm kiếm với từ khóa khác hoặc bấm nút dưới đây để gửi câu hỏi trực tiếp tới Ban Quản Trị.</p>
              <button
                className="faq-tag-btn"
                style={{ padding: '8px 16px', fontSize: '14px', marginTop: '12px' }}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRole('ALL');
                  setSelectedCategory('ALL');
                }}
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              const roleMeta = ROLES_META.find((r) => r.code === faq.role_target);

              // Map action links based on content
              let actionLink = faq.action_url;
              let actionTitle = faq.action_label || 'Thực Hiện Ngay';
              if (!actionLink) {
                if (faq.category === 'DAT_VE') {
                  actionLink = '/buses';
                  actionTitle = 'Xem Chuyến Xe';
                } else if (faq.category === 'VE_THANG') {
                  actionLink = '/monthly-pass';
                  actionTitle = 'Mở Vé Tháng';
                } else if (faq.category === 'DOI_HUY_VE') {
                  actionLink = '/tra-cuu-hoan-tien';
                  actionTitle = 'Tra Cứu Hoàn Tiền';
                } else if (faq.category === 'SOAT_VE_BOARDING') {
                  actionLink = '/verify-ticket';
                  actionTitle = 'Mở Soát Vé QR';
                } else if (faq.category === 'QUAN_TRI') {
                  actionLink = '/admin';
                  actionTitle = 'Cổng Quản Trị';
                } else if (faq.category === 'KY_THUAT') {
                  actionLink = '/map';
                  actionTitle = 'Xem Bản Đồ';
                }
              }

              return (
                <div
                  key={faq.id}
                  className={`faq-card ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                >
                  <div className="faq-question-row">
                    <div className="faq-q-left">
                      <span className="faq-item-icon">{faq.icon || '💡'}</span>
                      <div className="faq-q-text">
                        <div className="faq-badges-row">
                          {roleMeta && (
                            <span
                              className="faq-role-badge"
                              style={{ backgroundColor: `${roleMeta.badge_color}18`, color: roleMeta.badge_color, border: `1px solid ${roleMeta.badge_color}35` }}
                            >
                              {roleMeta.icon} {roleMeta.name}
                            </span>
                          )}
                          <span className="faq-cat-badge">
                            {CATEGORIES_META.find((c) => c.code === faq.category)?.name || faq.category}
                          </span>
                        </div>
                        <h4 className="faq-question-title">{faq.question}</h4>
                      </div>
                    </div>

                    <div className="faq-q-right">
                      <span className={`faq-toggle-arrow ${isExpanded ? 'open' : ''}`}>▼</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="faq-answer-container" onClick={(e) => e.stopPropagation()}>
                      <div className="faq-answer-content">
                        {faq.answer.split('\n').map((paragraph, pIdx) => {
                          if (paragraph.startsWith('Bước') || paragraph.startsWith('•') || /^\d+\./.test(paragraph)) {
                            return (
                              <p key={pIdx} className="faq-step-line">
                                {paragraph}
                              </p>
                            );
                          }
                          return (
                            <p key={pIdx} className="faq-body-paragraph">
                              {paragraph}
                            </p>
                          );
                        })}
                      </div>

                      <div className="faq-footer-actions">
                        <div className="faq-helpful-box">
                          <span className="helpful-prompt">Hướng dẫn này có hữu ích với bạn?</span>
                          <button
                            className={`helpful-btn ${helpfulMap[faq.id] ? 'voted' : ''}`}
                            onClick={(e) => handleVoteHelpful(faq.id, e)}
                            disabled={helpfulMap[faq.id]}
                          >
                            <span>{helpfulMap[faq.id] ? '❤️' : '👍'}</span>
                            <span>{helpfulMap[faq.id] ? 'Đã cảm ơn' : 'Hữu ích'}</span>
                            <span className="vote-counter">({faq.helpful_count || 0})</span>
                          </button>
                        </div>

                        {actionLink && (
                          <button
                            className="faq-direct-action-btn"
                            onClick={() => navigate(actionLink)}
                          >
                            {actionTitle} <span>➔</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM HELPDESK CHANNELS */}
        <section className="faq-support-channels">
          <div className="support-card hotline">
            <span className="support-icon">📞</span>
            <h4>Tổng Đài 24/7</h4>
            <p>Giải đáp khẩn cấp về hành trình và vé xe</p>
            <strong>1900 6868</strong>
          </div>

          <div className="support-card email">
            <span className="support-icon">📧</span>
            <h4>Hòm Thư Hỗ Trợ</h4>
            <p>Tiếp nhận giải quyết khiếu nại và hoàn tiền</p>
            <strong>hotro@smartbus.vn</strong>
          </div>

          <div className="support-card ai">
            <span className="support-icon">🤖</span>
            <h4>Trợ Lý Ảo AI Chatbot</h4>
            <p>Tư vấn lịch trình, giá vé và sơ đồ ghế tức thì</p>
            <span className="chat-link">Nhấn biểu tượng Chat góc phải màn hình ➔</span>
          </div>

          <div className="support-card feedback">
            <span className="support-icon">⭐</span>
            <h4>Đánh Giá Dịch Vụ</h4>
            <p>Chia sẻ trải nghiệm để SmartBus hoàn thiện hơn</p>
            <button className="card-action-link" onClick={() => navigate('/feedback')}>
              Gửi Đánh Giá Ngay ➔
            </button>
          </div>
        </section>
      </div>

      {/* MODAL GỬI CÂU HỎI MỚI */}
      {showInquiryModal && (
        <div className="inquiry-modal-overlay" onClick={() => setShowInquiryModal(false)}>
          <div className="inquiry-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="inquiry-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>📝</span>
                <h3>Gửi Thắc Mắc & Câu Hỏi Mới</h3>
              </div>
              <button className="inquiry-close-btn" onClick={() => setShowInquiryModal(false)}>
                ✕
              </button>
            </div>

            {inquirySuccessMsg ? (
              <div className="inquiry-success-alert">
                <span>🎉</span>
                <p>{inquirySuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="inquiry-form">
                <p className="form-intro">
                  Ban Quản Trị SmartBus sẽ giải đáp câu hỏi của bạn và bổ sung vào cẩm nang để phục vụ cộng đồng.
                </p>

                <div className="form-row">
                  <div className="form-field">
                    <label>Họ và tên của bạn *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={inquiryForm.full_name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, full_name: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Email liên hệ nhận phản hồi *</label>
                    <input
                      type="email"
                      required
                      placeholder="ban@example.com"
                      value={inquiryForm.email}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Vai trò bạn đang đóng *</label>
                    <select
                      value={inquiryForm.role_target}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, role_target: e.target.value })}
                    >
                      <option value="HanhKhach">🎒 Hành Khách</option>
                      <option value="TaiXe">🚌 Tài Xế</option>
                      <option value="PhuXe">🎫 Phụ Xe / Soát Vé</option>
                      <option value="Admin">👑 Quản Trị Viên</option>
                      <option value="ALL">🌐 Chung cho mọi người</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Chủ đề liên quan *</label>
                    <select
                      value={inquiryForm.category}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, category: e.target.value })}
                    >
                      <option value="DAT_VE">💺 Đặt Vé & Chọn Ghế</option>
                      <option value="THANH_TOAN">💳 Thanh Toán & Cổng Online</option>
                      <option value="VE_THANG">🎫 Vé Tháng & Ưu Đãi HSSV</option>
                      <option value="DOI_HUY_VE">💸 Đổi Ghế, Hủy Vé & Hoàn Tiền</option>
                      <option value="SOAT_VE_BOARDING">📱 Soát Vé & Lên Xe</option>
                      <option value="QUAN_TRI">👑 Quản Trị Hệ Thống</option>
                      <option value="KY_THUAT">🛠️ Kỹ Thuật & Khác</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Nội dung câu hỏi hoặc vấn đề cần trợ giúp *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Hãy mô tả chi tiết thắc mắc của bạn về các bước sử dụng hoặc quy trình vận hành..."
                    value={inquiryForm.question}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, question: e.target.value })}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowInquiryModal(false)}
                  >
                    Hủy Bỏ
                  </button>
                  <button type="submit" className="btn-submit" disabled={inquirySubmitting}>
                    {inquirySubmitting ? 'Đang gửi...' : 'Gửi Thắc Mắc ➔'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FaqPage;
