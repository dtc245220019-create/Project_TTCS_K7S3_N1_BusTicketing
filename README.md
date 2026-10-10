# 🚌 HỆ THỐNG ĐẶT VÉ XE BUÝT THÔNG MINH (SMART BUS TICKETING)
> **Đồ án Thực tập Cơ sở K7S3 — Nhóm 01**  
> **Repository:** [Project_TTCS_K7S3_N1_BusTicketing](https://github.com/dtc245220019-create/Project_TTCS_K7S3_N1_BusTicketing.git)  
> **Trạng thái Sprint 3:** Đã tích hợp hoàn tất (Git Merge All Sprint 3 Branches), 100% vượt qua kiểm thử (**51/51 Test Cases Passed**), Frontend Vite Production Build Success, sẵn sàng Demo & Báo cáo Hội đồng.

---

## 📌 1. Giới Thiệu Dự Án & Tiến Độ Toàn Diện Sprint 1, 2 & 3

Hệ thống **Smart Bus Ticketing** là nền tảng quản trị và bán vé xe buýt / xe khách trực tuyến toàn diện. Dự án áp dụng quy trình Scrum/Agile với tổng lộ trình phát triển:

- **Sprint 1 (Tuần 1): MVP Cốt Lõi (US01 - US08):** Tra cứu chuyến xe, sơ đồ ghế 2 tầng (Dãy A & Dãy B), giữ chỗ tạm thời 10 phút với Cronjob tự động nhả ghế, thanh toán Sandbox, xuất vé điện tử kèm mã QR động và Bản đồ tương tác Leaflet/GPS.
- **Sprint 2 (Tuần 2): Cổng Thanh Toán & Nghiệp Vụ Vận Hành:** Tích hợp VNPay (HMAC-SHA512) & ZaloPay (HMAC-SHA256), thông báo Email SMTP & SMS Gateway (US20), soát vé lên xe Boarding Check-in (US24), hủy vé (TicketCancellation), Dual-Engine MySQL & SQLite.
- **Sprint 3 (Tuần 3): AI Chatbot, Doanh Thu, Tỷ Lệ Lấp Đầy & Quản Trị 4 Actors:**
  - 🤖 **Trợ Lý Ảo Chatbot AI (BE1 & FE1):** Hỗ trợ tư vấn lịch trình, giá vé, chính sách hoàn tiền 24/7 trực tiếp trên màn hình (`ChatWidget.jsx`).
  - 📊 **Báo Cáo Doanh Thu & Xuất CSV (US17/Revenue):** Tổng hợp doanh thu đa chiều (theo ngày/tháng/tuyến), tính toán tỷ lệ lấp đầy ghế (**Occupancy Rate**) và tính năng xuất file báo cáo **CSV** 1-click.
  - 🎓 **Xét Duyệt Ưu Đãi Sinh Viên / Linh Hoạt (US23):** Thẩm định minh chứng HSSV trực tiếp trên Admin Dashboard, tự động áp dụng mức chiết khấu 20%.
  - 🎟️ **Hệ Thống Voucher Khuyến Mãi (US18):** Quản lý mã giảm giá (cố định/phần trăm), tích hợp popup chọn mã (`VoucherModal.jsx`) ngay tại bước thanh toán.
  - 💸 **Quy Trình Hủy Vé & Hoàn Tiền (US08):** Gửi yêu cầu hoàn tiền online, ban quản trị xem xét & duyệt/từ chối hoàn tiền (`RefundManagement.jsx`), tra cứu tiến độ (`RefundStatusPage.jsx`).
  - 💬 **Đánh Giá & Phản Ánh Dịch Vụ (US24):** Gửi đánh giá sao, nhận xét về xe và tài xế (`FeedbackPage.jsx`), ban quản trị tiếp nhận & giải quyết phản ánh.
  - 🛡️ **Nhật Ký Kiểm Toán (Audit Logs US17):** Ghi nhận chi tiết mọi hành vi soát vé, thanh toán, phân quyền và xuất dữ liệu.
  - 👑 **Mô Hình Phân Quyền 4 Actors Hoàn Chỉnh (RBAC):** Phân quyền độc lập 4 vai trò (**Hành khách**, **Tài xế**, **Phụ xe**, **Quản trị viên**) kèm chuyển đổi tài khoản demo 1-click tiện lợi trên giao diện.

---

## 👥 2. Phân Chia Vai Trò Nhóm 10 Thành Viên (Sprint 2)

| STT | Thành Viên / Luồng | Vai Trò | Nhiệm Vụ Chi Tiết Sprint 2 | Nhánh Nguồn Git |
|:---:|:---|:---|:---|:---|
| 1 | **Leader (Gia Bảo)** | Quản lý dự án & Kiến trúc sư | Gitmerge hợp nhất toàn bộ nhánh nguồn Sprint 2, đồng bộ mô hình CSDL MySQL & SQLite Dual-Engine, chuẩn hóa API thống nhất, kiểm thử toàn diện 33 tests và viết tài liệu hướng dẫn. | `main` |
| 2 | **Backend 1** | Backend Engineer | Cổng thanh toán ZaloPay & VNPay: Mã hóa chữ ký HMAC-SHA256, HMAC-SHA512, API tạo URL thanh toán (**US17**), Webhook IPN & Return URL (**US18**). | `feature/be1-zalo-vnpay` |
| 3 | **Backend 2** | Backend Engineer | Hệ thống Thông báo đa kênh (**US20**): Gửi Email SMTP HTML xác nhận đặt vé, SMS Gateway Mock và lưu trữ thông báo in-app. | `feature/be-notification-US20` |
| 4 | **Backend 3** | Backend Engineer | API Soát vé bằng mã QR (**US08**) và Nghiệp vụ ghi nhận hành khách lên xe (**US24** - Boarding API). | `feature/Api-cap-nhat-trang-thai-ve-khi-len-xe`<br>`feature/Api-soat-ve-bang-qr` |
| 5 | **Backend 4** | Backend Engineer | Quản lý Mã giảm giá (Vouchers) và Phí dịch vụ (Service Fees): Tính toán chiết khấu, ràng buộc đơn giá tối thiểu và hạn sử dụng. | `feature/be4-voucher-fee` |
| 6 | **Frontend 1** | Frontend Engineer | Thiết kế Trang Kết quả thanh toán chi tiết (**US26** - `PaymentResultPage.jsx`) hiển thị mã hóa đơn, thông tin vé và nút điều hướng. | `feature/fe-payment-result` |
| 7 | **Frontend 2** | Frontend Engineer | Xây dựng Giao diện Tra cứu vé, Hủy vé trực tuyến và Chính sách hoàn tiền 100% (**US25** - `TicketCancellation.jsx`). | `feature/fe-ticket-verify-cancel` |
| 8 | **Frontend 3** | Frontend Engineer | Tích hợp thành phần nhập Voucher khuyến mãi trực tiếp trên Form thanh toán và hiển thị thẻ vé QR động. | `feature/fe2-ticket-qr-voucher` |
| 9 | **Frontend 4** | Frontend Engineer | Thiết kế Chuông thông báo Notification Bell trên Navbar với số đếm tin chưa đọc và Dropdown xem tin nhắn xác nhận Email/SMS. | `feature/fe-user-dashboard` |
| 10 | **QA - Tester** | Kiểm thử phần mềm | Xây dựng bộ test suite tự động 33 tests kiểm thử toàn diện Voucher, Fee, VNPay, ZaloPay, Boarding, Hủy vé và CSDL. | `test` |

---

## 🗄️ 3. Mô Hình Dữ Liệu MySQL Chuẩn Hóa 18 Bảng (ERD Sprint 2)

Hệ thống cung cấp file DDL MySQL hoàn chỉnh tại **[schema_mysql.sql](schema_mysql.sql)** chuẩn hóa theo tài liệu ERD *"Đề tài Smart_Bus_Ticketing"*:

```mermaid
erDiagram
    users ||--o{ bookings : "places"
    users ||--o{ tickets : "owns"
    users ||--o{ notifications : "receives"
    users ||--o{ monthly_passes : "registers"
    users ||--o{ ticket_inspections : "inspects"
    
    routes ||--|{ route_stop_details : "contains"
    bus_stops ||--|{ route_stop_details : "locates"
    routes ||--o{ trips : "schedules"
    
    buses ||--|{ seats : "has"
    buses ||--o{ trips : "assigns"
    
    trips ||--|{ seats : "arranges"
    trips ||--o{ bookings : "booked_in"
    trips ||--o{ tickets : "issues"
    
    bookings ||--|{ booking_items : "contains"
    bookings ||--o| payments : "paid_by"
    
    booking_items ||--o| tickets : "generates"
    seats ||--o| tickets : "reserved_for"
    vouchers ||--o{ tickets : "applies_to"
    
    tickets ||--o{ ticket_inspections : "inspected_in"
    tickets ||--o{ notifications : "triggers"
```

### Danh sách 18 Bảng CSDL Chuẩn Hóa:
1. `users` (Khách hàng, Tài xế, Phụ xe, Quản trị viên, Loại đối tượng ưu đãi HSSV)
2. `routes` (Tuyến xe buýt liên tỉnh / nội đô)
3. `bus_stops` (Trạm dừng đón/trả khách kèm tọa độ GPS)
4. `route_stop_details` (Thứ tự trạm dừng và khoảng cách cự ly theo tuyến)
5. `buses` (Phương tiện, biển số xe, loại xe, vị trí GPS thời gian thực)
6. `trips` (Lịch khởi hành, điểm đi, điểm đến, tài xế phân công, số ghế trống)
7. `seats` (Sơ đồ ghế 2 tầng: Dãy A Tầng Dưới, Dãy B Tầng Trên, trạng thái AVAILABLE/HELD/BOOKED)
8. `vouchers` (Mã giảm giá, loại chiết khấu %, giảm cố định, đơn giá tối thiểu, ngày hết hạn)
9. `fees` (Các loại phụ phí dịch vụ: bảo hiểm hành khách, tiện ích bến bãi)
10. `bookings` (Đơn đặt vé tổng hợp)
11. `booking_items` (Chi tiết ghế và thông tin từng hành khách)
12. `payments` (Lịch sử thanh toán: SANDBOX, VNPAY, ZALOPAY, MOMO, BANK)
13. `tickets` (Vé điện tử, mã vé `TKT-...`, chuỗi QR Payload, trạng thái PAID/USED/CANCELLED)
14. `demo_tickets` (Khả năng tương thích sandbox và mô phỏng vé demo)
15. `ticket_inspections` (Nhật ký soát vé và xác nhận hành khách lên xe của tài xế)
16. `notifications` (Nhật ký gửi thông báo Email xác nhận, SMS Gateway và In-app)
17. `monthly_passes` (Đăng ký vé tháng theo tuyến)
18. `incident_reports` & `feedbacks` (Báo cáo sự cố và đánh giá chuyến đi 1-5 sao)

---

## ⚡ 4. Hướng Dẫn Di Chuyển Lên MySQL (MySQL Migration)

Dự án trang bị kiến trúc **Dual-Engine**:
- Mặc định hệ thống chạy với SQLite tại `data/bus_booking.db` (đảm bảo demo mượt mà ngay cả khi chưa bật dịch vụ MySQL).
- Khi kết nối MySQL, chỉ cần chỉ định biến môi trường `DATABASE_URL`.

### Cách 1: Chạy công cụ di chuyển dữ liệu tự động (CLI Migration)
Đảm bảo dịch vụ MySQL trên máy tính đang chạy (Port 3306), sau đó chạy lệnh:

```bash
python migrate_to_mysql.py
```
> Script sẽ tự động:
> 1. Kết nối MySQL với tài khoản `root` (hoặc cấu hình qua biến môi trường).
> 2. Tự động tạo cơ sở dữ liệu `smart_bus_ticketing` với mã hóa UTF-8 (`utf8mb4`).
> 3. Tự động thực thi toàn bộ cấu trúc 18 bảng từ `schema_mysql.sql`.
> 4. Sao chép và di chuyển toàn bộ dữ liệu hiện có từ SQLite sang MySQL (vô hiệu hóa tạm thời Foreign Keys để tránh xung đột).
> 5. Xác thực số lượng bản ghi của tất cả 18 bảng.

### Cách 2: Nhập trực tiếp file DDL vào MySQL Workbench / Command Line
```sql
mysql -u root -p < schema_mysql.sql
```

Sau đó khởi động Backend với kết nối MySQL:
```bash
set DATABASE_URL=mysql+pymysql://root:password@localhost:3306/smart_bus_ticketing
python main.py
```

---

## 💻 5. Hướng Dẫn Cài Đặt & Chạy Demo Hệ Thống

### Bước 1: Khởi động Backend
Mở PowerShell tại thư mục gốc dự án:
```powershell
# 1. Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# 2. Khởi tạo cơ sở dữ liệu và nạp dữ liệu mẫu
python seed_data.py

# 3. Khởi chạy Backend Server (FastAPI + APScheduler Cronjob)
python main.py
```
> Server Backend sẽ chạy tại: **http://127.0.0.1:8000**  
> Tài liệu Swagger API tương tác: **http://127.0.0.1:8000/docs**

### Bước 2: Khởi động Frontend
Mở một cửa sổ Terminal mới:
```powershell
cd ve-xe-frontend
npm install
npm run dev
```
> Giao diện người dùng sẽ chạy tại: **http://localhost:5173**

---

## 🧪 6. Chạy Kiểm Thử Tự Động Toàn Diện (Unit Tests)

Bộ kiểm thử bao gồm 33 test case bao phủ toàn bộ chức năng Sprint 1 & Sprint 2:
```powershell
python -m unittest discover -s . -p "test_*.py" -v
```
Kết quả kiểm thử: **33/33 Tests Passed (100% OK)**.

---

## 🗺️ 7. Danh Sách Endpoint API Sprint 2 (Mới Bổ Sung)

| Method | Endpoint | Mô Tả Chức Năng | User Story |
|:---|:---|:---|:---:|
| `GET` | `/api/v1/vouchers` | Lấy danh sách mã khuyến mãi khả dụng | BE4 |
| `POST` | `/api/v1/vouchers/apply` | Áp dụng Voucher tính toán chiết khấu đơn hàng | BE4 |
| `GET` | `/api/v1/fees` | Danh sách các loại phí dịch vụ bến bãi, bảo hiểm | BE4 |
| `POST` | `/api/v1/fees/calculate` | Tính tổng phụ phí dịch vụ cho hành trình | BE4 |
| `POST` | `/api/v1/payments/vnpay/create` | Tạo URL thanh toán VNPay kèm chữ ký HMAC-SHA512 | US17 |
| `GET` | `/api/v1/payments/vnpay/ipn` | Webhook IPN xử lý kết quả giao dịch VNPay | US18 |
| `GET` | `/api/v1/payments/vnpay/return` | Điều hướng khách hàng về web sau thanh toán VNPay | US18 |
| `POST` | `/api/v1/payments/zalopay/create` | Khởi tạo đơn hàng thanh toán qua ZaloPay | US17 |
| `POST` | `/api/v1/payments/zalopay/callback` | Webhook Callback ZaloPay kèm xác thực MAC SHA256 | US18 |
| `POST` | `/api/v1/tickets/boarding` | Xác nhận hành khách lên xe sau khi quét QR | US24 |
| `GET` | `/api/v1/tickets/{code}/boarding` | Tra cứu trạng thái soát vé lên xe (`DaSoat` / `ChuaLenXe`) | US24 |
| `GET` | `/api/v1/notifications` | Danh sách thông báo tức thì (Email/SMS/In-app) | US20 |

---

© 2026 Nhóm 01 — Dự Án Smart Bus Ticketing. Được phát triển và hoàn thiện bởi Leader Gia Bảo và nhóm 10 thành viên.
