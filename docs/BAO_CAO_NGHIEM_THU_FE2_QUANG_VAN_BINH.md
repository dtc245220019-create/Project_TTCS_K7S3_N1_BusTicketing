# 📋 BÁO CÁO NGHIỆM THU TÍNH NĂNG PHÂN HỆ FRONTEND 2 (FE2)
### Dự án: Hệ Thống Đặt Vé Xe Buýt Thông Minh (Smart Bus Ticketing)
---
- **Thành viên thực hiện:** Quang Văn Bình
- **Vai trò / Phân hệ:** Frontend 2 (FE2) & Tích hợp Nghiệm thu
- **Người phối hợp kiểm thử:** Huy Đồng (QA/Tester)
- **Người duyệt (Reviewer / Leader):** Ban Quản Lý Dự Án & Tech Lead
- **Thời gian hoàn thành:** 17/10/2026
- **Trạng thái nhánh Git:** `bugfix/fe2-test-sync-verification` ➔ `develop`

---

## 1. TỔNG QUAN NỘI DUNG CÔNG VIỆC PHỤ TRÁCH (FE2)

Phân hệ Frontend 2 (FE2) phụ trách hoàn thiện 3 cụm tính năng cốt lõi thuộc Sprint 1, 2 và 3 của dự án SmartBus:

1. **Vé Điện Tử QR Code Động & In Vé Chuẩn Khổ A4 (`PrintableTicket.jsx` - US06):**
   - Hiển thị vé điện tử trực quan sau khi thanh toán thành công hoặc xem lại trong Lịch sử đặt vé.
   - Tích hợp mã QR bảo mật động phục vụ kiểm soát soát vé khi lên xe (Boarding Pass).
   - Tích hợp mã vạch vector SVG Code 128 giả lập và con dấu điện tử chứng thực `SMARTBUS CA VERIFIED`.
   - Phần cuống vé kiểm soát dành riêng cho phụ xe (`showStub = true`) có đường cắt kéo trực quan.
   - Tối ưu hóa CSS chuyên dụng `@media print` chuẩn A4 portrait: tự động ẩn thanh điều hướng, nút bấm, banner trang web, chỉ giữ lại khung vé sắc nét.

2. **Modal Chọn Mã Ưu Đãi / Voucher Trực Quan (`VoucherModal.jsx` - US18):**
   - Modal hiển thị danh sách voucher có sẵn với giao diện thân thiện tại bước thanh toán.
   - Kết nối API `vouchersApi.js` lấy dữ liệu mã giảm giá thời gian thực từ CSDL.
   - Hỗ trợ chọn nhanh 1-click hoặc nhập mã thủ công, kiểm tra điều kiện đơn hàng tối thiểu và tự động trừ tiền ngay trên tổng thanh toán.

3. **Báo Cáo Doanh Thu & Tỷ Lệ Lấp Đầy Ghế (`AdminDashboard.jsx` - Sprint 3):**
   - Tab phân tích doanh thu đa chiều: Thống kê theo ngày (`day`) và theo tháng (`month`).
   - Khối KPI trực quan: Tổng doanh thu ghi nhận, Tổng số đơn đặt, Số lượng vé phát hành.
   - Bảng Occupancy Rate: Tỷ lệ lấp đầy ghế theo từng chuyến xe HCM ➔ Đà Lạt (loại bỏ triệt để tỷ lệ âm, thanh tiến trình màu sắc trực quan).
   - Chi tiết ghế đã đặt và ghế đang giữ (HELD) theo thời gian thực.
   - Nút 1-click xuất báo cáo tài chính ra file CSV chuẩn hóa.

---

## 2. KẾT QUẢ KIỂM THỬ KỸ THUẬT (VERIFICATION & AUTOMATION)

| Phân hệ kiểm thử | Công cụ / Lệnh kiểm thử | Kết quả thực tế | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Frontend Build** | `npm --prefix frontend run build` | Chuyển đổi 69 modules, build hoàn tất trong **634ms**, 0 lỗi. | ✅ PASSED |
| **Backend Unit Tests** | `python -m pytest backend/tests -v` | **58/58 test cases** vượt qua kiểm thử tự động (Admin, Trips, Boarding, QR, Monthly Pass, Vouchers, Refunds, Chatbot AI). | ✅ PASSED |
| **Database Integrity** | SQLite Schema & Foreign Keys | `PRAGMA foreign_keys = ON;` toàn bộ ràng buộc khóa ngoại được đảm bảo toàn vẹn. | ✅ PASSED |

---

## 3. BIÊN BẢN NGHIỆM THU GIAO DIỆN (PHỐI HỢP VỚI HUY ĐỒNG - TESTER)

| STT | Kịch bản kiểm thử | Thao tác thực hiện | Kết quả mong đợi | Xác nhận QA |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **Hiển thị & In Vé QR (US06)** | Đặt vé thành công ➔ Nhấn "🖨️ In Vé Này" / "In Tất Cả Vé" ➔ Mở hộp thoại Print. | Giao diện vé hiển thị đầy đủ QR, mã vé, thông tin bến xe, cuống vé. Bản in A4 không bị dính navbar hoặc nút bấm. | [x] Đạt |
| 2 | **Chọn Voucher (US18)** | Tại bước Thanh toán ➔ Bấm "🎟️ Chọn voucher có sẵn" ➔ Chọn `CHAO20` / `BUS50`. | Popup modal mở mượt mà, danh sách hiển thị rõ ràng điều kiện tối thiểu, bấm chọn áp dụng giảm tiền tức thì. | [x] Đạt |
| 3 | **Doanh Thu & Lấp Đầy (Admin)** | Vào vai Admin ➔ Truy cập `/admin` ➔ Tab "📊 Doanh Thu & Lấp Đầy". | Các thẻ KPI hiển thị số liệu chính xác, bảng Occupancy rate không bị âm, xuất file CSV hoạt động chuẩn. | [x] Đạt |

---

## 4. BẰNG CHỨNG HÌNH ẢNH THỰC NGHIỆM (ATTACHMENTS)

*(Huy Đồng và Bình đính kèm ảnh chụp 3 màn hình tại mục này khi nộp cho Quản lý dự án)*:
1. `screenshot-01-printable-ticket-print-preview.png` (Giao diện vé điện tử và bản xem trước in ấn A4).
2. `screenshot-02-voucher-modal-selection.png` (Giao diện popup chọn voucher ở bước thanh toán).
3. `screenshot-03-admin-revenue-occupancy-dashboard.png` (Bảng thống kê doanh thu và tỷ lệ lấp đầy ghế).

---

## 5. KẾT LUẬN & ĐỀ XUẤT
- Mã nguồn phân hệ FE2 đã được hoàn thiện chỉnh chu, đồng bộ 100% với nhánh `develop`.
- Kính đề nghị Tech Lead / Leader duyệt và Merge Pull Request của nhánh `bugfix/fe2-test-sync-verification` vào `develop`.
