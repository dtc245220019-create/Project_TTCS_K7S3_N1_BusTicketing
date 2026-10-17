# 🚌 HỆ THỐNG ĐẶT VÉ XE BUÝT THÔNG MINH (SMART BUS TICKETING)
> **Đồ án Thực tập Cơ sở K7S3 — Nhóm 01**  
> **Repository:** [Project_TTCS_K7S3_N1_BusTicketing](https://github.com/dtc245220019-create/Project_TTCS_K7S3_N1_BusTicketing.git)  
> **Trạng thái:** Tích hợp toàn diện Sprint 1, 2 & 3. 100% vượt qua kiểm thử (**58/58 Pytest Tests Passed**), Frontend Vite Production Build thành công, cấu trúc GitFlow chuẩn hóa, phân tách riêng biệt `backend/` và `frontend/`.

---

## 📌 1. Giới Thiệu Dự Án

Hệ thống **Smart Bus Ticketing** là nền tảng quản trị và bán vé xe buýt / xe khách trực tuyến toàn diện, áp dụng quy trình phát triển phần mềm Agile/Scrum qua 3 Sprint:

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
  * Hệ thống thông báo đa kênh (**US20**): Gửi email xác nhận HTML qua SMTP Gmail, tin nhắn SMS Gateway và thông báo In-App.
  * Phân hệ soát vé quét mã QR cho tài xế/phụ xe và ghi nhận hành khách lên xe (**US08**, **US24** - Boarding Check-in).
  * Quản lý mã giảm giá (**Vouchers**) và phụ phí dịch vụ (**Fees**).
  * Đăng ký và quản lý vé tháng (**Monthly Passes**).
  * Kiến trúc CSDL linh hoạt **Dual-Engine** (SQLite & MySQL).

* **Sprint 3 — AI Chatbot, Doanh Thu, Tỷ Lệ Lấp Đầy & Quản Trị Toàn Diện 4 Actors:**
  * 🤖 **Trợ Lý Ảo Chatbot AI Thông Minh (`ChatWidget.jsx`):** Tư vấn tự động lịch trình, giá vé, khuyến mãi, chính sách đổi trả vé 24/7 với gợi ý điều hướng thông minh.
  * 📊 **Báo Cáo Doanh Thu & Xuất CSV (Revenue & Export):** Thống kê doanh thu theo ngày, tháng, chuyến, tuyến xe, tính toán doanh thu thuần (đã trừ hoàn tiền) và xuất file CSV 1-click.
  * 📈 **Tỷ Lệ Lấp Đầy Ghế (Occupancy Rate):** Phân tích hiệu suất khai thác chuyến xe thời gian thực (loại bỏ triệt để giá trị âm).
  * 👑 **Bổ sung chức năng Nghiệp vụ Quản Trị Viên (Admin Operations):**
    * Thêm mới tuyến xe vận tải liên tỉnh/nội đô.
    * Tạo chuyến xe mới với khung giờ, đơn giá và biển số xe.
    * Thêm mới và phân công Tài xế (`TaiXe`), Phụ xe (`PhuXe`) cho từng chuyến xe.
    * Đồng bộ thời gian thực dữ liệu tuyến xe, chuyến xe cho toàn bộ các Role.
  * 🎓 **Xét Duyệt Ưu Đãi HSSV (US23):** Ban quản trị xét duyệt hồ sơ giảm giá sinh viên (giảm 20%) trực tiếp trên Admin Dashboard.
  * 🎟️ **Mã Khuyến Mãi Nâng Cao (US18):** Popup chọn voucher trực quan tại bước thanh toán (`VoucherModal.jsx`) và tính năng quản trị tạo mã ưu đãi mới (chặn ngày quá khứ).
  * 💸 **Quy Trình Hủy Vé & Hoàn Tiền (US08 / Refunds):** Hành khách gửi yêu cầu hoàn tiền, Admin duyệt/từ chối, trang tra cứu tiến độ hoàn tiền (`RefundStatusPage.jsx`), cập nhật trạng thái `REFUNDED` tức thì.
  * 💬 **Đánh Giá & Phản Ánh Dịch Vụ (US24 / Feedbacks):** Hành khách gửi góp ý sao và nhận xét; ban quản trị theo dõi xử lý chất lượng dịch vụ.
  * 🛡️ **Nhật Ký Kiểm Toán (Audit Logs US17):** Ghi vết chi tiết mọi thao tác hệ thống (soát vé, duyệt ưu đãi, hoàn tiền, thanh toán).
  * 👥 **Mô Hình Phân Quyền 4 Actors (RBAC):** Giao diện và quyền hạn tối ưu cho 4 vai trò (**Hành Khách**, **Tài Xế**, **Phụ Xe**, **Quản Trị Viên**).

---

## 🏗️ 2. Cấu Trúc Mã Nguồn Sau Tái Cấu Trúc (Clean Architecture)

Dự án đã được phân tách rõ ràng thành hai phân hệ độc lập:

```text
Project_TTCS_K7S3_N1_BusTicketing/
├── backend/                         # === PHÂN HỆ BACKEND (Python FastAPI) ===
│   ├── main.py                      # File khởi động chính của Backend Server
│   ├── pytest.ini                   # Cấu hình kiểm thử tự động
│   ├── requirements.txt             # Danh sách thư viện Python
│   ├── api/                         # Tầng Router API bóc tách theo nghiệp vụ
│   │   ├── auth_routes.py           # Đăng ký, đăng nhập, thông tin cá nhân
│   │   ├── trips_routes.py          # Tìm kiếm chuyến, sơ đồ ghế, giữ chỗ 10p
│   │   ├── payments_routes.py       # Cổng thanh toán VietQR, MoMo, VNPay, ZaloPay
│   │   ├── tickets_routes.py        # Quản lý vé điện tử, mã QR, đổi vé, hủy vé
│   │   ├── vouchers_routes.py       # Mã giảm giá, tính toán phụ phí
│   │   ├── monthly_pass_routes.py   # Quản lý thẻ và gia hạn vé tháng
│   │   ├── admin_routes.py          # Dashboard admin, tuyến/chuyến, nhân sự, doanh thu
│   │   ├── interactions_routes.py   # Chatbot AI, thông báo email/SMS, phản ánh
│   │   └── common.py                # Hàm tiện ích chung, audit logging
│   ├── src/                         # Mã nguồn nghiệp vụ lõi (Business Logic Core)
│   │   ├── database.py              # Kết nối CSDL thông minh Dual-Engine (SQLite/MySQL)
│   │   ├── notification.py          # Module gửi email SMTP Gmail và SMS
│   │   ├── payment_gateway.py       # Xử lý sinh mã QR VietQR, MoMo, VNPay, ZaloPay
│   │   ├── chatbot_engine.py        # Bộ máy xử lý ngôn ngữ Chatbot AI
│   │   ├── ticket_changes.py        # Logic nghiệp vụ đổi ghế, đổi chuyến xe
│   │   ├── boarding_api.py          # Nghiệp vụ soát vé quét mã QR cho tài xế/phụ xe
│   │   ├── seed_data.py             # Bộ dữ liệu mẫu phong phú khởi tạo hệ thống
│   │   ├── doanh_thu_api.py         # Tính toán báo cáo doanh thu
│   │   ├── xuat_doanh_thu_api.py    # Xuất báo cáo tài chính ra file CSV
│   │   └── refund_api.py            # Quản lý quy trình hoàn tiền vé US08
│   └── tests/                       # Bộ kiểm thử tự động toàn diện (58 test cases)
│       ├── test_admin_management.py # Test quản trị tuyến, chuyến, gán tài xế
│       ├── test_api.py              # Test tìm kiếm chuyến và đặt vé
│       ├── test_boarding_api.py     # Test soát vé QR và khách lên xe
│       ├── test_database.py         # Test khởi tạo và truy vấn CSDL
│       ├── test_monthly_pass.py     # Test chu trình vé tháng
│       ├── test_qr_api.py           # Test mã QR bảo mật vé điện tử
│       ├── test_rbac_and_admin_api.py # Test phân quyền 4 vai trò
│       ├── test_sprint2_api.py      # Test thanh toán VNPay, ZaloPay, thông báo
│       ├── test_sprint3_api.py      # Test chatbot AI, audit log, voucher
│       └── test_ticket_changes.py   # Test đổi vé và hủy vé
│
├── frontend/                        # === PHÂN HỆ FRONTEND (React 19 + Vite) ===
│   ├── package.json                 # Cấu hình gói và thư viện giao diện
│   ├── vite.config.js               # Cấu hình máy chủ phát triển Vite
│   └── src/
│       ├── api/                     # Tầng API Client giao tiếp Backend
│       │   ├── client.js            # Axios client, cấu hình baseURL và Interceptors
│       │   ├── chatbotApi.js        # API gọi Chatbot AI
│       │   ├── feedbackApi.js       # API gửi phản ánh đánh giá
│       │   └── index.js             # Export tập trung các service API
│       ├── components/              # Các thành phần giao diện tái sử dụng
│       │   ├── Header.jsx           # Thanh điều hướng, chuyển đổi vai trò Demo
│       │   ├── Footer.jsx           # Chân trang kèm liên kết Gửi phản ánh
│       │   ├── ChatWidget.jsx       # Cửa sổ chat với Trợ lý AI thông minh
│       │   ├── SearchForm.jsx       # Form tra cứu chuyến xe kèm gợi ý
│       │   ├── PaymentForm.jsx      # Form thanh toán kèm popup chọn Voucher
│       │   ├── VoucherModal.jsx     # Popup chọn mã giảm giá trực quan
│       │   ├── CreateVoucher.jsx    # Popup tạo mã ưu đãi cho Admin
│       │   ├── RefundManagement.jsx # Quản lý và xử lý hoàn tiền vé
│       │   ├── PrintableTicket.jsx  # Thẻ vé xe có thể in ấn trực tiếp
│       │   └── CountdownTimer.jsx   # Đồng hồ đếm ngược 10 phút giữ chỗ
│       └── pages/                   # Các trang giao diện chức năng chính
│           ├── HomePage.jsx         # Trang chủ giới thiệu dịch vụ
│           ├── BusListPage.jsx      # Danh sách xe và sơ đồ ghế 2 tầng
│           ├── PaymentPage.jsx      # Trang xác nhận đặt vé và thanh toán
│           ├── PaymentResultPage.jsx# Màn hình kết quả thanh toán chi tiết
│           ├── UserDashboard.jsx    # Quản lý vé cá nhân, đổi vé, hủy vé
│           ├── RefundStatusPage.jsx # Tra cứu tiến độ yêu cầu hoàn tiền
│           ├── MonthlyPassPage.jsx  # Đăng ký và thanh toán gia hạn vé tháng
│           ├── TicketVerification.jsx # Màn hình soát vé QR cho Tài xế / Phụ xe
│           ├── AdminDashboard.jsx   # Bảng điều khiển toàn diện của Quản trị viên
│           ├── FeedbackPage.jsx     # Gửi góp ý và đánh giá chất lượng
│           ├── MapPage.jsx          # Bản đồ định vị lộ trình GPS
│           ├── LoginPage.jsx        # Đăng nhập hệ thống
│           └── RegisterPage.jsx     # Đăng ký tài khoản (tự động gửi email)
│
├── start_project.bat                # Script 1-Click tự động chạy cả Backend & Frontend
├── api.py & main.py                 # File proxy tương thích ngược 100%
├── package.json                     # NPM script điều phối từ thư mục gốc
└── README.md                        # Tài liệu hướng dẫn sử dụng và báo cáo
```

---

## 👥 3. Danh Sách Tài Khoản Demo Theo Từng Vai Trò (4 Actors)

Hệ thống hỗ trợ chuyển đổi vai trò 1-click trực tiếp trên thanh điều hướng (Navbar) hoặc đăng nhập với **mật khẩu chung: `123456`**:

| Vai Trò (Role) | Tên Người Dùng Demo | Email Đăng Nhập | Mật Khẩu | Nghiệp Vụ Chính Để Demo |
|:---|:---|:---|:---|:---|
| **Quản Trị Viên** *(Admin)* | Lê Quản Lý | `admin@smartbus.vn` | `123456` | Quản lý tuyến xe, tạo chuyến, phân công tài xế & phụ xe, duyệt hoàn tiền, xem tỷ lệ lấp đầy, xuất CSV doanh thu, duyệt hồ sơ HSSV. |
| **Hành Khách (Thường)** | Nguyễn Văn A | `customer@example.com` | `123456` | Tìm chuyến, chọn ghế 2 tầng, giữ chỗ 10p, áp dụng voucher, thanh toán QR, quản lý vé sắp tới, hủy vé yêu cầu hoàn tiền. |
| **Hành Khách (HSSV)** | Nguyễn Văn A (Ưu đãi) | `nguyenvana@gmail.com` | `123456` | Mua và gia hạn vé tháng xe buýt trực tuyến, hưởng ưu đãi giảm giá học sinh - sinh viên. |
| **Tài Xế** *(Driver)* | Trần Văn Tài | `taixe.nguyen@smartbus.vn` | `123456` | Xem lịch trình phân công lái xe, danh sách hành khách lên xe của chuyến xe mình phụ trách. |
| **Phụ Xe / Soát Vé** *(Staff)* | Trần Thị B | `nhanvien@smartbus.vn` | `123456` | Quét mã QR soát vé khách lên xe tại cửa xe, xác nhận lên xe (**Boarding**). |

---

## 🚀 4. Hướng Dẫn Khởi Chạy Hệ Thống Demo

### Yêu Cầu Cài Đặt Ban Đầu:
* **Python:** 3.10 trở lên (khuyên dùng Python 3.11 hoặc 3.12).
* **Node.js:** 18.x trở lên kèm `npm`.
* **Hệ điều hành:** Windows 10/11, macOS hoặc Linux.

---

### Cách 1: Khởi Chạy 1-Click Bằng File Batch (Khuyên Dùng Cho Windows)
Chỉ cần nhấp đúp vào file `start_project.bat` tại thư mục gốc, hoặc chạy từ Terminal:

```powershell
.\start_project.bat
```

> **Script sẽ tự động:**
> 1. Kiểm tra thư viện và nạp dữ liệu mẫu khởi tạo.
> 2. Khởi chạy Backend FastAPI Server tại cổng `8000`.
> 3. Khởi chạy Frontend React Vite Dev Server tại cổng `5173`.
> 4. Tự động bật trình duyệt web truy cập ngay **http://localhost:5173**.

---

### Cách 2: Khởi Chạy Thủ Công Từng Phân Hệ

#### Bước 1: Khởi động Backend (FastAPI Server)
Mở cửa sổ PowerShell/Terminal thứ nhất tại thư mục gốc dự án:

```powershell
# 1. Cài đặt các thư viện Python cần thiết
pip install -r requirements.txt

# 2. Khởi chạy Backend Server (hỗ trợ tự động reload khi code thay đổi)
python backend/main.py
```
* **Địa chỉ Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Tài liệu Swagger UI tương tác trực tiếp:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Tài liệu Redoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

#### Bước 2: Khởi động Frontend (React 19 + Vite)
Mở cửa sổ PowerShell/Terminal thứ hai tại thư mục gốc:

```powershell
# Di chuyển vào thư mục frontend và khởi chạy
cd frontend
npm install
npm run dev
```
* **Địa chỉ Giao diện Web:** [http://localhost:5173](http://localhost:5173)

---

### Cách 3: Khởi Chạy Qua NPM Script Tại Thư Mục Gốc

```powershell
# Cài đặt toàn bộ thư viện Frontend từ root
npm run install:frontend

# Khởi chạy máy chủ phát triển Frontend
npm run dev

# Đóng gói sản phẩm biên dịch production (Build < 700ms)
npm run build
```

---

## 🎬 5. Kịch Bản Chi Tiết Các Bước Trình Diễn Demo

Sau khi mở trình duyệt tại **[http://localhost:5173](http://localhost:5173)**, bạn hãy thực hiện theo kịch bản mẫu sau để kiểm tra đầy đủ các tính năng:

### 🎭 Kịch Bản 1: Role Hành Khách (Customer Flow)
1. **Tìm kiếm chuyến xe:**
   - Tại Trang Chủ, chọn Điểm đi: `TP. Hồ Chí Minh`, Điểm đến: `Đà Lạt` (hoặc `Hà Nội` ➔ `Thái Nguyên`).
   - Bấm **"Tìm Chuyến Xe"** ➔ Màn hình hiển thị danh sách các chuyến xe với thông tin giờ xuất bến, biển số xe, loại xe và giá vé.
2. **Chọn ghế & Tạm giữ chỗ 10 phút:**
   - Bấm **"Chọn Ghế"** trên một chuyến xe bất kỳ.
   - Sơ đồ ghế 2 tầng hiển thị trực quan: Tầng Dưới (Dãy A: A01, A02...) và Tầng Trên (Dãy B: B01, B02...).
   - Nhấp chọn ghế ➔ Đồng hồ đếm ngược **10:00** bắt đầu kích hoạt; hệ thống khóa ghế trên server chống xung đột giữ chỗ.
3. **Áp dụng Voucher giảm giá:**
   - Tại trang thanh toán, bấm vào nút **"Chọn Mã Giảm Giá"** ➔ Popup `VoucherModal` xuất hiện liệt kê các mã ưu đãi hợp lệ.
   - Chọn mã giảm giá (ví dụ: `GIAM20K`, `HSSV20`) ➔ Tiền vé được trừ trực tiếp và hiển thị rõ ràng.
4. **Thanh toán trực tuyến:**
   - Chọn phương thức thanh toán: **VietQR / MoMo / VNPay**.
   - Bấm **"Xác Nhận Thanh Toán"** ➔ Mã QR thanh toán kèm số tài khoản hiển thị. Sau khi hoàn tất, hệ thống cấp vé điện tử thành công.
5. **Kiểm tra vé cá nhân ("Vé Của Tôi"):**
   - Vào mục **Vé Của Tôi** (`/dashboard`).
   - Vé vừa đặt hiển thị ngay lập tức trong tab **"Vé Sắp Khởi Hành"** (không bị nhầm lẫn thời gian với các vé quá khứ).
   - Bấm **"In Vé / Xem Thẻ Vé"** để xem vé điện tử mã QR sắc nét.
6. **Thử nghiệm Hủy vé & Yêu cầu hoàn tiền (US08):**
   - Bấm **"Yêu Cầu Hủy Vé"** trên vé vừa đặt.
   - Nhập lý do hủy, chọn Ngân hàng, nhập Số tài khoản và Tên chủ tài khoản nhận tiền hoàn.
   - Bấm gửi ➔ Hệ thống tiếp nhận yêu cầu và cấp mã tra cứu hoàn tiền.
7. **Trợ lý ảo Chatbot AI:**
   - Nhấp vào biểu tượng Chatbot AI ở góc dưới cùng bên phải màn hình.
   - Thử nhắn tin: *"Cho tôi biết giá vé đi Đà Lạt?"*, *"Chính sách hoàn hủy vé như thế nào?"*. Chatbot AI sẽ trả lời thông minh và gợi ý link xem chuyến.
8. **Đăng ký / Gia hạn Vé tháng:**
   - Truy cập tab **"Vé Tháng"** (`/monthly-pass`).
   - Chọn tuyến xe thường xuyên đi lại, nhập thông tin cá nhân và thanh toán gia hạn vé tháng online.

---

### 👑 Kịch Bản 2: Role Quản Trị Viên (Admin Flow)
Đăng nhập tài khoản `admin@smartbus.vn` (mật khẩu `123456`) hoặc chọn vai trò **Admin** trên thanh Header:

1. **Bảng số liệu tổng quan (Dashboard Overview):**
   - Xem các thẻ thống kê tổng doanh thu, tổng số vé đã bán, tổng số chuyến xe và tổng số người dùng.
   - Xem bảng phân bổ vai trò và tỷ lệ lấp đầy ghế (**Occupancy Rate**) thời gian thực (giá trị phần trăm chuẩn xác từ 0% đến 100%, không bị âm).
2. **Thêm Tuyến xe mới:**
   - Chọn tab **"Quản Lý Tuyến & Chuyến Xe"**.
   - Bấm nút **"+ Thêm Tuyến Xe Mới"**.
   - Nhập Điểm đi (VD: `Hà Nội`), Điểm đến (VD: `Hạ Long`), Cự ly (VD: `160 km`), Giá vé cơ bản (VD: `180,000 VNĐ`).
   - Bấm **"Khởi Tạo Tuyến Xe"** ➔ Tuyến xe mới lập tức xuất hiện và có thể dùng cho toàn bộ hệ thống.
3. **Thêm Chuyến xe mới:**
   - Bấm nút **"+ Thêm Chuyến Xe Mới"**.
   - Chọn tuyến xe vừa tạo, nhập giờ khởi hành, chọn xe buýt và đơn giá riêng của chuyến.
   - Chọn gán trực tiếp **Tài xế** và **Phụ xe** vận hành chuyến đi.
   - Bấm **"Khởi Tạo Chuyến Xe"** ➔ Chuyến xe mới sẽ xuất hiện trên trang tìm kiếm của khách hàng và lịch trình của tài xế ngay lập tức.
4. **Phân công lại Nhân sự cho Chuyến xe:**
   - Tại danh sách chuyến xe của Admin, bấm nút **"Gán Lại Nhân Sự"** trên một chuyến bất kỳ để đổi tài xế hoặc phụ xe.
5. **Duyệt yêu cầu Hoàn tiền vé (Refund Approval):**
   - Chọn tab **"Quản Lý Hoàn Tiền"**.
   - Danh sách các yêu cầu hoàn tiền đang chờ (`PENDING`) hiển thị đầy đủ thông tin: Mã vé, Lý do hủy, Số tiền hoàn, Ngân hàng, Số tài khoản.
   - Bấm **"✓ Xác Nhận Hoàn Tiền"** ➔ Trạng thái chuyển ngay sang **`REFUNDED` (Đã hoàn tiền)** và cập nhật vào lịch sử tài chính, không còn bị treo ở PENDING.
6. **Thêm Mã Giảm Giá mới (Vouchers):**
   - Bấm nút **"+ Tạo Mã Ưu Đãi Mới"**.
   - Hệ thống có cơ chế kiểm tra ngày hết hạn: **chặn không cho phép tạo mã ưu đãi trong quá khứ**.
7. **Báo cáo Tài chính & Xuất File CSV:**
   - Chọn tab **"Báo Cáo Doanh Thu"**.
   - Xem biểu đồ doanh thu theo ngày, doanh thu theo tuyến xe.
   - Bấm nút **"Xuất File CSV Doanh Thu"** ➔ Trình duyệt tự động tải file `doanh_thu_smartbus_*.csv` chứa bảng kê chi tiết để báo cáo kế toán.
8. **Duyệt hồ sơ Ưu đãi HSSV (US23):**
   - Xem danh sách học sinh - sinh viên gửi thẻ sinh viên xác nhận ưu đãi và bấm duyệt 1-click.
9. **Nhật ký Kiểm toán (Audit Logs US17):**
   - Tra cứu vết toàn bộ các hành động trong phiên làm việc: ai đã soát vé, ai đã duyệt hoàn tiền, mã giao dịch nào đã được xử lý.

---

### 🚍 Kịch Bản 3: Role Tài Xế (Driver Flow)
1. Đăng nhập tài khoản `taixe.nguyen@smartbus.vn` (mật khẩu `123456`) hoặc chọn vai trò **Tài Xế**.
2. Mở mục **"Lịch Trình Của Tôi"**:
   - Hiển thị danh sách các chuyến xe được Admin phân công cho tài xế Trần Văn Tài.
   - Xem thông tin biển số xe, giờ xuất bến, tuyến đường phụ trách.
   - Xem danh sách hành khách đã đặt vé trên chuyến xe của mình.

---

### 🎫 Kịch Bản 4: Role Phụ Xe / Soát Vé (Staff Flow)
1. Đăng nhập tài khoản `nhanvien@smartbus.vn` (mật khẩu `123456`) hoặc chọn vai trò **Phụ Xe**.
2. Truy cập màn hình **"Soát Vé"** (`/verify-ticket`):
   - Mở camera quét mã QR trên vé điện tử của hành khách, hoặc nhập trực tiếp mã vé (VD: `TKT-HCM-001`, `TKT-TN-001`).
   - Bấm **"Kiểm Tra Vé"** ➔ Hệ thống hiển thị trạng thái vé: **HỢP LỆ**, tên hành khách, số ghế và chuyến đi.
   - Bấm **"Xác Nhận Lên Xe (Boarding)"** ➔ Trạng thái vé chuyển thành `USED` (Đã soát vé) và lưu vết vào Nhật ký soát vé.

---

## 🧪 6. Hướng Dẫn Chạy Kiểm Thử Tự Động (Quality Assurance)

### 1. Kiểm thử Backend (58/58 Tests Passed)
Chạy toàn bộ bộ kiểm thử tự động của dự án bằng lệnh:

```powershell
python -m pytest -q
```
* **Kết quả:** `58 passed in < 10s (100% OK)` bao phủ đầy đủ tất cả các phân hệ: Đặt vé, Giữ ghế, Thanh toán, Đổi vé, Hoàn tiền, Vé tháng, Chatbot AI, Quản trị Admin, Doanh thu và Phân quyền.

### 2. Kiểm thử Biên Dịch Frontend (Vite Production Build)
```powershell
cd frontend
npm run build
```
* **Kết quả:** `✓ built in < 700ms`, toàn bộ 61 module được tối ưu hóa gzip hoàn hảo, 0 lỗi biên dịch.

---

## 🛠️ 7. Quy Trình Phối Hợp Mã Nguồn (GitFlow Workflow)

Dự án áp dụng quy chuẩn GitFlow chặt chẽ để đảm bảo không xảy ra xung đột mã nguồn:

1. **Nhánh `develop`:** Nhánh hoạt động và tích hợp chính của toàn bộ dự án. Tất cả các chức năng mới sau khi kiểm thử đạt 100% đều được hợp nhất vào nhánh này.
2. **Nhánh `main`:** Nhánh phát hành chính thức (Release), được bảo vệ và đóng gói từ `develop`.
3. **Nhánh tính năng (`feature/fe-*` và `feature/be-*`):**
   - Đội ngũ Frontend làm việc trên các nhánh `feature/fe-*` (chỉ thao tác trong thư mục `frontend/`).
   - Đội ngũ Backend làm việc trên các nhánh `feature/be-*` (chỉ thao tác trong thư mục `backend/`).
   - Tất cả Pull Request đều hướng vào nhánh `develop`, có tiêu đề và mô tả rõ ràng theo mẫu `.github/pull_request_template.md`.

---

## 📞 8. Thông Tin Liên Hệ & Hỗ Trợ

* **Đồ án:** Thực tập Cơ sở K7S3 — Nhóm 01 (Hệ thống Smart Bus Ticketing)
* **Leader & Đại diện kỹ thuật:** Lê Gia Bảo
* **Email:** `hotro@smartbus.vn` | `dtc245220019@ictu.edu.vn`
* **Hotline hỗ trợ kỹ thuật:** `1900 6868`

---
© 2026 Smart BusTicketing — Unified Ecosystem. Bản quyền thuộc về Nhóm 01.
