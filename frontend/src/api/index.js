/**
 * Frontend API Layer - Central Aggregator
 * 
 * Modular API client functions connecting the React UI to Backend FastAPI:
 * - client.js: Core HTTP client (fetchJson, API_BASE_URL)
 * - authApi.js: Xác thực, đăng nhập, đăng ký, phiên đăng nhập người dùng
 * - tripsApi.js: Tra cứu chuyến xe, sơ đồ ghế 2 tầng, giữ chỗ 10p, tuyến đường, bản đồ
 * - paymentsApi.js: Thanh toán đơn hàng, cổng thanh toán VNPay, ZaloPay, VietQR
 * - ticketsApi.js: Vé điện tử, đổi vé, hủy vé, soát vé QR, hành khách lên xe, hoàn tiền
 * - vouchersApi.js: Mã giảm giá, tạo voucher mới, tính toán phụ phí
 * - monthlyPassApi.js: Vé tháng xe buýt, đăng ký & gia hạn
 * - adminApi.js: Quản trị viên, doanh thu, tỷ lệ lấp đầy, duyệt HSSV, hoàn tiền, audit log
 * - notificationsApi.js: Thông báo hệ thống đa kênh
 * - chatbotApi.js: Trợ lý ảo AI Chatbot (Gemini / RAG)
 * - feedbackApi.js: Đánh giá và gửi phản ánh dịch vụ
 */

export * from './client.js';
export * from './authApi.js';
export * from './tripsApi.js';
export * from './paymentsApi.js';
export * from './ticketsApi.js';
export * from './vouchersApi.js';
export * from './monthlyPassApi.js';
export * from './adminApi.js';
export * from './notificationsApi.js';
export * from './chatbotApi.js';
export * from './feedbackApi.js';
