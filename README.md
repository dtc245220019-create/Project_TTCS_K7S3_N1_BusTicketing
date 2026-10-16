# 🚌 HỆ THỐNG ĐẶT VÉ XE BUÝT THÔNG MINH (SMART BUS TICKETING)
> **Đồ án Thực tập Cơ sở K7S3 — Nhóm 01**  
> **Repository:** [Project_TTCS_K7S3_N1_BusTicketing](https://github.com/dtc245220019-create/Project_TTCS_K7S3_N1_BusTicketing.git)  
> **Trạng thái:** Tích hợp toàn diện Sprint 1, 2 & 3. 100% vượt qua kiểm thử (**51/51 Pytest Tests Passed**), Frontend Vite Production Build thành công, ESLint 0 lỗi. Hệ thống sẵn sàng chạy và báo cáo.

---

## 📌 1. Giới Thiệu Dự Án

Hệ thống **Smart Bus Ticketing** là nền tảng quản trị và bán vé xe buýt / xe khách trực tuyến toàn diện, áp dụng quy trình phát triển Agile/Scrum qua 3 Sprint:

* **Sprint 1 — Nền Tảng Cốt Lõi (Core MVP):**
  * Tra cứu chuyến xe liên tỉnh/nội đô theo điểm đi, điểm đến, thời gian (**US01**).
  * Sơ đồ ghế 2 tầng (Dãy A Tầng Dưới, Dãy B Tầng Trên), cơ chế tạm giữ ghế trong 10 phút với **Cronjob APScheduler** tự động giải phóng ghế hết hạn (**US02**, **US03**).
  * Đăng ký, đăng nhập và phân quyền người dùng (**US04**).
  * Thanh toán trực tuyến Sandbox Momo, VNPay, ZaloPay, Thẻ ngân hàng (**US05**).
  * Xuất vé điện tử kèm mã QR Code động hiển thị đầy đủ thông tin vé (**US06**).
  * Lịch sử đặt vé, đổi ghế, đổi chuyến và hủy vé trực tuyến (**US07**).
  * Bản đồ tương tác Leaflet hiển thị lộ trình tuyến và trạm dừng GPS.

* **Sprint 2 — Mở Rộng Cổng Thanh Toán & Nghiệp Vụ Vận Hành:**
  * Tích hợp cổng thanh toán thực tế **VNPay** (chữ ký bảo mật HMAC-SHA512) và **ZaloPay** (HMAC-SHA256) kèm Webhook IPN & Return URL (**US17**, **US18**).
  * Hệ thống thông báo đa kênh (**US20**): Gửi email xác nhận HTML qua SMTP, tin nhắn SMS Gateway giả lập và chuông thông báo In-App.
  * Phân hệ soát vé quét mã QR cho tài xế/phụ xe và ghi nhận hành khách lên xe (**US08**, **US24** - Boarding Check-in).
  * Quản lý mã giảm giá (**Vouchers**) và phụ phí dịch vụ (**Fees**).
  * Đăng ký và quản lý vé tháng (**Monthly Passes**).
  * Kiến trúc CSDL linh hoạt **Dual-Engine** (SQLite & MySQL).

* **Sprint 3 — AI Chatbot, Doanh Thu, Tỷ Lệ Lấp Đầy & Quản Trị Toàn Diện 4 Actors:**
  * 🤖 **Trợ Lý Ảo Chatbot AI Thông Minh (`ChatWidget.jsx`):** Tư vấn tự động lịch trình, giá vé, khuyến mãi, chính sách đổi trả vé 24/7 với gợi ý điều hướng thông minh.
  * 📊 **Báo Cáo Doanh Thu & Xuất CSV (Revenue & Export):** Thống kê doanh thu theo ngày, tháng, chuyến, tuyến xe, tính toán doanh thu thuần (đã trừ hoàn tiền) và xuất file CSV 1-click.
  * 📈 **Tỷ Lệ Lấp Đầy Ghế (Occupancy Rate):** Phân tích hiệu suất khai thác chuyến xe thời gian thực.
  * 🎓 **Xét Duyệt Ưu Đãi HSSV (US23):** Ban quản trị xét duyệt hồ sơ giảm giá sinh viên (giảm 20%) trực tiếp trên Admin Dashboard.
  * 🎟️ **Mã Khuyến Mãi Nâng Cao (US18):** Popup chọn voucher trực quan tại bước thanh toán (`VoucherModal.jsx`) và tính năng quản trị tạo mã ưu đãi mới.
  * 💸 **Quy Trình Hủy Vé & Hoàn Tiền (US08 / Refunds):** Hành khách gửi yêu cầu hoàn tiền, Admin duyệt/từ chối, trang tra cứu tiến độ hoàn tiền (`RefundStatusPage.jsx`).
  * 💬 **Đánh Giá & Phản Ánh Dịch Vụ (US24 / Feedbacks):** Hành khách gửi góp ý sao và nhận xét; ban quản trị theo dõi xử lý chất lượng dịch vụ.
  * 🛡️ **Nhật Ký Kiểm Toán (Audit Logs US17):** Ghi vết chi tiết mọi thao tác hệ thống (soát vé, duyệt ưu đãi, hoàn tiền, thanh toán).
  * 👑 **Mô Hình Phân Quyền 4 Actors (RBAC):** Giao diện và quyền hạn tối ưu cho 4 vai trò (**Hành Khách**, **Tài Xế**, **Phụ Xe**, **Quản Trị Viên**) cùng công cụ chuyển đổi vai trò Demo nhanh chóng.

---

## 👥 2. Mô Hình Phân Quyền 4 Actors & Tài Khoản Demo

Hệ thống hỗ trợ chuyển đổi vai trò 1-click trực tiếp trên thanh điều hướng (Navbar) hoặc đăng nhập bằng các tài khoản demo sau:

| Vai Trò (Actor) | Tên Người Dùng Demo | Email Đăng Nhập | Mật Khẩu | Quyền Hạn & Màn Hình Chính |
|:---|:---|:---|:---|:---|
| **Hành Khách** *(Customer)* | Nguyễn Văn A | `customer@example.com` | `123456` | Tra cứu chuyến, chọn ghế, áp dụng voucher, thanh toán vé, quản lý vé của tôi, in vé, yêu cầu hủy vé/hoàn tiền, gửi đánh giá, chat với AI. |
| **Tài Xế** *(Driver)* | Trần Văn Tài | `taixe.nguyen@smartbus.vn` | `123456` | Xem danh sách chuyến được phân công, danh sách hành khách lên xe, quét mã QR soát vé tại cửa xe, xác nhận lên xe (**Boarding**). |
| **Phụ Xe / Quầy** *(Staff)* | Lê Phụ Xe | `nhanvien@smartbus.vn` | `123456` | Hỗ trợ soát vé hành khách lên xe tại điểm đón/trạm dừng, kiểm tra tính hợp lệ của vé điện tử. |
| **Quản Trị Viên** *(Admin)* | Lê Quản Lý | `admin@smartbus.vn` | `123456` | Toàn quyền Admin Dashboard: Quản lý người dùng & phân quyền, quản lý chuyến xe, duyệt ưu đãi HSSV, tạo voucher, duyệt hoàn tiền, xem báo cáo doanh thu & xuất CSV, xem audit logs. |

---

## 🗄️ 3. Sơ Đồ ERD Mẫu (Entity Relationship Diagram)

Hệ thống được thiết kế theo kiến trúc chuẩn hóa 19 thực thể, liên kết chặt chẽ giữa các tầng nghiệp vụ:

### Sơ Đồ ERD Mermaid (Chuẩn Hệ Thống)

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "places (1:N)"
    USERS ||--o{ TICKETS : "owns (1:N)"
    USERS ||--o{ NOTIFICATIONS : "receives (1:N)"
    USERS ||--o{ MONTHLY_PASSES : "registers (1:N)"
    USERS ||--o{ TICKET_INSPECTIONS : "inspects (1:N)"
    USERS ||--o{ FEEDBACKS : "submits (1:N)"
    USERS ||--o{ REFUNDS : "requests (1:N)"
    USERS ||--o{ AUDIT_LOGS : "performs (1:N)"
    USERS ||--o{ TRIPS : "drives (1:N)"

    ROUTES ||--|{ ROUTE_STOP_DETAILS : "contains (1:N)"
    BUS_STOPS ||--|{ ROUTE_STOP_DETAILS : "located_at (1:N)"
    ROUTES ||--o{ TRIPS : "schedules (1:N)"
    ROUTES ||--o{ MONTHLY_PASSES : "valid_for (1:N)"

    BUSES ||--|{ SEATS : "configured_with (1:N)"
    BUSES ||--o{ TRIPS : "assigned_to (1:N)"

    TRIPS ||--|{ SEATS : "allocates (1:N)"
    TRIPS ||--o{ BOOKINGS : "booked_in (1:N)"
    TRIPS ||--o{ TICKETS : "issues (1:N)"
    TRIPS ||--o{ INCIDENT_REPORTS : "reports (1:N)"
    TRIPS ||--o{ FEEDBACKS : "evaluated_in (1:N)"

    BOOKINGS ||--|{ BOOKING_ITEMS : "contains (1:N)"
    BOOKINGS ||--o| PAYMENTS : "paid_via (1:1)"
    BOOKINGS ||--o{ REFUNDS : "refunds (1:N)"

    BOOKING_ITEMS ||--o| TICKETS : "creates (1:1)"
    SEATS ||--o| TICKETS : "assigned_to (1:1)"
    VOUCHERS ||--o{ TICKETS : "discounts (1:N)"

    TICKETS ||--o{ TICKET_INSPECTIONS : "checked_in (1:N)"
    TICKETS ||--o{ NOTIFICATIONS : "triggers (1:N)"
    TICKETS ||--o{ REFUNDS : "applied_for (1:1)"
    PAYMENTS ||--o{ REFUNDS : "refunded_from (1:N)"

    USERS {
        int id PK
        string full_name
        string email UK
        string phone
        string password_hash
        string role
        string discount_type
        string discount_status
        datetime created_at
    }

    ROUTES {
        int id PK
        string name
        string departure_city
        string arrival_city
        int base_price
        float distance_km
        string status
    }

    BUS_STOPS {
        int id PK
        string name
        float latitude
        float longitude
        string address
        string city
    }

    ROUTE_STOP_DETAILS {
        int route_id PK,FK
        int stop_id PK,FK
        int stop_order
        float distance_km
    }

    BUSES {
        int id PK
        string license_plate UK
        string bus_type
        int total_seats
        float current_lat
        float current_lng
        string status
    }

    TRIPS {
        int id PK
        string trip_code UK
        string origin
        string destination
        string departure_at
        string arrival_at
        int base_price
        string status
        int bus_id FK
        int route_id FK
        int driver_id FK
        int available_seats
    }

    SEATS {
        int id PK
        int trip_id FK
        int bus_id FK
        string seat_number
        string seat_type
        string deck_or_row
        string status
        string held_until
    }

    BOOKINGS {
        int id PK
        string booking_code UK
        int user_id FK
        int trip_id FK
        int total_amount
        string status
        datetime created_at
    }

    BOOKING_ITEMS {
        int id PK
        int booking_id FK
        int seat_id FK
        string passenger_name
        string passenger_id_number
    }

    PAYMENTS {
        int id PK
        int booking_id FK
        string booking_code
        string transaction_code UK
        int amount
        string provider
        string status
        string provider_transaction_code
        string paid_at
        datetime created_at
    }

    TICKETS {
        int id PK
        string ticket_code UK
        string qr_payload UK
        int booking_item_id FK
        int user_id FK
        int trip_id FK
        int seat_id FK
        int voucher_id FK
        int actual_price
        string held_until
        string status
        datetime issued_at
        string used_at
    }

    VOUCHERS {
        int id PK
        string code UK
        string name
        string description
        string discount_type
        float discount_value
        float min_order_value
        float max_discount
        string start_date
        string end_date
        int is_active
    }

    FEES {
        int id PK
        string name
        string description
        string fee_type
        float fee_value
        int is_active
        datetime created_at
    }

    TICKET_INSPECTIONS {
        int id PK
        int ticket_id FK
        string ticket_code
        int staff_user_id FK
        string staff_email
        string result
        datetime inspected_at
        string note
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        int ticket_id FK
        string type
        string recipient
        string title
        string message
        string status
        datetime created_at
    }

    MONTHLY_PASSES {
        int id PK
        int user_id FK
        string passenger_name
        string passenger_id_card
        int route_id FK
        string start_date
        string end_date
        float price
        string status
        datetime created_at
    }

    FEEDBACKS {
        int id PK
        int user_id FK
        int trip_id FK
        int rating
        string category
        string comment
        string status
        datetime created_at
    }

    REFUNDS {
        int id PK
        int booking_id FK
        int payment_id FK
        int ticket_id FK
        string ticket_code
        int user_id FK
        string reason
        float requested_amount
        float approved_amount
        string status
        string bank_name
        string bank_account
        string account_holder
        datetime created_at
        datetime processed_at
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action
        string entity_type
        int entity_id
        string details
        datetime created_at
    }
```

### Bảng Mô Tả Chi Tiết 19 Thực Thể ERD:

| STT | Tên Bảng (Entity) | Chức Năng Nghiệp Vụ | Quan Hệ Chính |
|:---:|:---|:---|:---|
| 1 | `users` | Lưu trữ thông tin tài khoản (Hành khách, Tài xế, Phụ xe, Admin) và đối tượng giảm giá HSSV | Khóa chính `id`, liên kết `bookings`, `tickets`, `feedbacks`, `refunds` |
| 2 | `routes` | Quản lý danh mục tuyến xe (Điểm đi, Điểm đến, Cự ly km, Đơn giá cơ bản) | Liên kết `route_stop_details`, `trips`, `monthly_passes` |
| 3 | `bus_stops` | Danh mục bến xe và trạm dừng dọc tuyến kèm tọa độ GPS (Latitude, Longitude) | Khóa chính `id`, liên kết `route_stop_details` |
| 4 | `route_stop_details` | Thứ tự các trạm dừng và cự ly chi tiết của từng trạm trên mỗi tuyến xe | Khóa phức hợp `(route_id, stop_id)` |
| 5 | `buses` | Quản lý xe buýt, biển số xe, loại xe (Giường nằm 36 chỗ), vị trí GPS thực tế | Khóa chính `id`, liên kết `trips`, `seats` |
| 6 | `trips` | Lịch trình các chuyến xe khởi hành, giá vé, số ghế trống khả dụng | Liên kết `routes`, `buses`, `users (driver)`, `seats`, `bookings` |
| 7 | `seats` | Sơ đồ ghế 2 tầng (Dãy A tầng dưới, Dãy B tầng trên), trạng thái AVAILABLE/HELD/BOOKED | Khóa chính `id`, `uq_trip_seat(trip_id, seat_number)` |
| 8 | `bookings` | Đơn đặt vé tổng hợp cho một giao dịch | Liên kết `users`, `trips`, `payments`, `booking_items` |
| 9 | `booking_items` | Chi tiết từng ghế và thông tin hành khách trong một đơn đặt vé | Khóa chính `id`, liên kết `bookings`, `seats`, `tickets` |
| 10 | `payments` | Lịch sử giao dịch thanh toán (SANDBOX, VNPAY, ZALOPAY, MOMO, BANK) | Khóa chính `id`, mã giao dịch `transaction_code` |
| 11 | `tickets` | Vé điện tử xuất cho hành khách, mã vé `TKT-...`, chuỗi QR Payload bảo mật | Khóa chính `id`, liên kết `users`, `trips`, `seats`, `vouchers` |
| 12 | `vouchers` | Quản lý mã giảm giá (phần trăm hoặc số tiền cố định, mức giảm tối đa) | Khóa chính `id`, mã `code`, liên kết `tickets` |
| 13 | `fees` | Danh mục phụ phí dịch vụ (bảo hiểm hành khách, tiện ích bến bãi) | Khóa chính `id` |
| 14 | `ticket_inspections` | Nhật ký soát vé của tài xế/phụ xe và kết quả quét mã QR hợp lệ/bất hợp pháp | Khóa chính `id`, liên kết `tickets`, `users (staff)` |
| 15 | `notifications` | Hộp thư thông báo Email HTML (SMTP), SMS Gateway và thông báo In-App | Khóa chính `id`, liên kết `users`, `tickets` |
| 16 | `monthly_passes` | Đăng ký vé tháng xe buýt theo tuyến cho học sinh, sinh viên, người đi làm | Khóa chính `id`, liên kết `users`, `routes` |
| 17 | `incident_reports` | Báo cáo sự cố phát sinh trên chuyến đi dành cho tài xế | Khóa chính `id`, liên kết `trips`, `users (driver)` |
| 18 | `feedbacks` | Đánh giá sao (1-5 sao) và nhận xét chất lượng dịch vụ của hành khách | Khóa chính `id`, liên kết `users`, `trips` |
| 19 | `refunds` | Quản lý yêu cầu hủy vé & hoàn tiền, số tiền duyệt, tài khoản ngân hàng | Khóa chính `id`, liên kết `bookings`, `payments`, `tickets`, `users` |
| * | `audit_logs` | Nhật ký kiểm toán bảo mật lưu vết mọi tác vụ quản trị | Khóa chính `id`, liên kết `users` |

---

## 💻 4. Hướng Dẫn Cài Đặt & Chạy Toàn Bộ Hệ Thống

### Yêu Cầu Môi Trường:
* **Python:** Phiên bản 3.10 trở lên (khuyên dùng Python 3.11 hoặc 3.12).
* **Node.js:** Phiên bản 18.x trở lên (kèm `npm`).
* **Hệ điều hành:** Windows, Linux hoặc macOS.

---

### Cách 1: Khởi Chạy 1-Click Bằng File Batch (Khuyên Dùng Cho Windows)
Chỉ cần nhấp đúp vào file hoặc chạy từ Command Prompt / PowerShell:

```powershell
.\start_project.bat
```

> **Script sẽ tự động:**
> 1. Mở cửa sổ Backend FastAPI chạy ngầm tại cổng `8000`.
> 2. Mở cửa sổ Frontend React Vite chạy tại cổng `5173`.
> 3. Tự động mở trình duyệt web truy cập ngay **http://localhost:5173**.

---

### Cách 2: Khởi Chạy Thủ Công Từng Thành Phần

#### Bước 1: Khởi động Backend (FastAPI Server)
Mở cửa sổ PowerShell hoặc Terminal tại thư mục gốc dự án:

```powershell
# 1. Cài đặt các thư viện Python
pip install -r requirements.txt

# 2. Khởi tạo CSDL SQLite & nạp bộ dữ liệu mẫu giàu demo (nếu cần nạp lại)
python -c "import database, seed_data; conn = database.get_connection(); seed_data.seed_database(conn); seed_data.seed_rich_demo_data(conn); print('Nạp dữ liệu thành công!')"

# 3. Chạy Backend Server (tích hợp Cronjob nhả ghế US03)
python main.py
```
* **Địa chỉ Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Tài liệu Swagger UI tương tác:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Tài liệu Redoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

#### Bước 2: Khởi động Frontend (React 19 + Vite)
Mở một cửa sổ PowerShell hoặc Terminal thứ 2:

```powershell
cd ve-xe-frontend
npm install
npm run dev
```
* **Địa chỉ Frontend Web:** [http://localhost:5173](http://localhost:5173)

---

### Cách 3: Chạy Tự Động Từ Thư Mục Gốc Qua NPM Scripts
Dự án đã trang bị file `package.json` gốc tiện lợi:

```powershell
# Cài đặt toàn bộ dependencies cho frontend
npm run install:frontend

# Khởi chạy frontend dev server từ thư mục gốc
npm run dev

# Build kiểm tra đóng gói bản phát hành
npm run build
```

---

## ⚡ 5. Hướng Dẫn Chuyển Đổi Sang MySQL (MySQL Migration)

Hệ thống hỗ trợ kiến trúc **Dual-Engine** thông minh:
* **Mặc định:** Sử dụng SQLite tại `data/bus_booking.db` (không cần cài đặt MySQL, sẵn sàng chạy ngay).
* **Khi triển khai production với MySQL:**
  1. Đảm bảo dịch vụ MySQL đang chạy (mặc định Port `3306`).
  2. Tạo database hoặc để script tự động tạo qua lệnh:
     ```powershell
     python migrate_to_mysql.py
     ```
  3. Khởi chạy Backend với chuỗi kết nối `DATABASE_URL`:
     ```powershell
     # Windows PowerShell
     $env:DATABASE_URL="mysql+pymysql://root:password@localhost:3306/smart_bus_ticketing"
     python main.py
     ```

---

## 🧪 6. Hướng Dẫn Kiểm Thử Chất Lượng (Quality Assurance & Tests)

### 1. Kiểm Thử Backend (Pytest Suite)
Chạy toàn bộ 51 test case tự động bao phủ 100% các phân hệ (Auth, Booking, Hold Seats, QR, Payments, Refunds, Vouchers, Monthly Pass, Audit):

```powershell
pytest
```
* **Kết quả:** `51 passed (100% OK)`

### 2. Kiểm Thử Linting Frontend (ESLint 10)
```powershell
npm --prefix ve-xe-frontend run lint
```
* **Kết quả:** `0 errors`

### 3. Kiểm Thử Đóng Gói Frontend (Vite Production Build)
```powershell
npm --prefix ve-xe-frontend run build
```
* **Kết quả:** `✓ built in < 500ms`

---

## 🗺️ 7. Danh Mục API Endpoints Chính (Hơn 70 Endpoints)

| Nhóm Chức Năng | Method | Endpoint | Mô Tả Nghiệp Vụ |
|:---|:---:|:---|:---|
| **Chuyến Xe & Ghế** | `GET` | `/api/v1/trips` | Tra cứu chuyến xe theo điểm đi, điểm đến, ngày |
| | `GET` | `/api/v1/trips/{id}/seats` | Lấy sơ đồ ghế 2 tầng (Dãy A & Dãy B) |
| | `POST` | `/api/v1/trips/{id}/hold-seats` | Tạm giữ ghế 10 phút chống xung đột giữ chỗ |
| **Xác Thực (Auth)** | `POST` | `/api/v1/auth/register` | Đăng ký tài khoản hành khách mới |
| | `POST` | `/api/v1/auth/login` | Đăng nhập tài khoản |
| | `GET` | `/api/v1/auth/me` | Lấy thông tin tài khoản hiện tại |
| **Thanh Toán (Payments)** | `POST` | `/api/v1/payments` | Khởi tạo giao dịch thanh toán |
| | `POST` | `/api/v1/payments/vnpay/create` | Tạo URL thanh toán VNPay HMAC-SHA512 |
| | `POST` | `/api/v1/payments/zalopay/create` | Tạo đơn hàng thanh toán ZaloPay MAC-SHA256 |
| | `POST` | `/api/v1/payments/{code}/callback` | Xử lý callback thanh toán thành công |
| **Vé & Soát Vé** | `GET` | `/api/v1/tickets` | Danh sách vé của người dùng |
| | `GET` | `/api/v1/tickets/{id}/qr` | Lấy chuỗi mã QR Payload của vé điện tử |
| | `POST` | `/api/v1/tickets/verify` | Soát vé bằng mã QR (Tài xế / Phụ xe) |
| | `POST` | `/api/v1/tickets/boarding` | Xác nhận hành khách đã lên xe |
| | `POST` | `/api/v1/tickets/{id}/cancel` | Hủy vé trực tuyến |
| | `POST` | `/api/v1/tickets/{id}/change-seat` | Đổi vị trí ghế ngồi |
| **Voucher & Phụ Phí** | `GET` | `/api/v1/vouchers` | Lấy danh sách mã ưu đãi còn hiệu lực |
| | `POST` | `/api/v1/vouchers/apply` | Áp dụng mã giảm giá tính toán giá trị đơn |
| | `POST` | `/api/v1/fees/calculate` | Tính tổng phụ phí dịch vụ chuyến đi |
| **Hoàn Tiền (Refunds)** | `POST` | `/api/v1/refunds/request` | Gửi yêu cầu hoàn tiền khi hủy vé |
| | `GET` | `/api/v1/refunds/status/{code}` | Tra cứu tiến độ hoàn tiền theo mã vé |
| | `GET` | `/api/v1/admin/refunds` | Admin xem danh sách yêu cầu hoàn tiền |
| | `POST` | `/api/v1/admin/refunds/{id}/approve` | Admin duyệt hoàn tiền vé |
| | `POST` | `/api/v1/admin/refunds/{id}/reject` | Admin từ chối yêu cầu hoàn tiền |
| **Doanh Thu & Lấp Đầy** | `GET` | `/api/v1/admin/revenue` | Báo cáo doanh thu theo ngày/tháng/tuyến |
| | `GET` | `/api/v1/admin/revenue/export` | Xuất báo cáo doanh thu ra file CSV |
| | `GET` | `/api/v1/admin/occupancy` | Tính toán tỷ lệ lấp đầy ghế (Occupancy Rate) |
| **Quản Trị Admin** | `GET` | `/api/v1/admin/users` | Quản lý danh sách người dùng và phân quyền |
| | `POST` | `/api/v1/admin/users/{id}/role` | Cập nhật vai trò (Customer/Driver/Staff/Admin) |
| | `GET` | `/api/v1/admin/discounts/pending` | Danh sách hồ sơ HSSV chờ duyệt giảm 20% |
| | `POST` | `/api/v1/admin/discounts/{id}/approve` | Duyệt đối tượng ưu đãi sinh viên |
| | `GET` | `/api/v1/admin/audit-logs` | Truy vấn nhật ký kiểm toán hệ thống |
| **Chatbot AI** | `POST` | `/api/v1/chatbot/chat` | Trợ lý ảo AI tư vấn lịch trình, giá vé, hoàn tiền |

---

## 📱 8. Tổng Hợp Các Trang Giao Diện Web (Frontend Routes)

* `/` — Trang chủ: Banner, tìm kiếm chuyến xe nhanh, giới thiệu ưu đãi, đánh giá.
* `/buses` — Tìm kiếm & lọc chuyến xe, sơ đồ ghế 2 tầng, chọn ghế và giữ chỗ.
* `/payment` — Trang thanh toán, popup chọn Voucher (`VoucherModal.jsx`), chọn phương thức thanh toán.
* `/payment-result` — Màn hình chi tiết kết quả thanh toán, mã giao dịch, tải vé.
* `/dashboard` — Vé của tôi: Danh sách vé đã mua, thẻ vé in ấn, đổi vé, gửi yêu cầu hủy vé.
* `/refund-status` — Tra cứu tiến độ hoàn tiền vé theo mã vé điện tử.
* `/verify-ticket` — Màn hình soát vé dành cho Tài xế & Phụ xe: Quét mã QR, danh sách hành khách lên xe (**Manifest**).
* `/monthly-pass` — Đăng ký và quản lý vé tháng xe buýt thông minh.
* `/map` — Bản đồ số GPS tương tác hiển thị lộ trình tuyến và danh sách trạm dừng.
* `/feedback` — Trang gửi đánh giá sao và nhận xét chất lượng dịch vụ.
* `/admin` — Quản trị viên Dashboard: Quản lý người dùng, chuyến xe, doanh thu, lấp đầy, duyệt HSSV, tạo voucher, duyệt hoàn tiền, audit logs.
* `/login` & `/register` — Đăng nhập và đăng ký tài khoản.

---

© 2026 Nhóm 01 — Dự Án Smart Bus Ticketing. Phát triển và hoàn thiện bởi Leader Gia Bảo và nhóm 10 thành viên.
