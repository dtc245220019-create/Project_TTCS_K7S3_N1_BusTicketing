# 🚌 HỆ THỐNG ĐẶT VÉ XE BUÝT THÔNG MINH (SMART BUS TICKETING)
> **Đồ án Thực tập Cơ sở K7S3 — Nhóm 01**  
> **Repository:** [Project_TTCS_K7S3_N1_BusTicketing](https://github.com/dtc245220019-create/Project_TTCS_K7S3_N1_BusTicketing.git)  
> **Phiên bản hiện tại:** `v2.2.1 - Hotfix & Conductor Synchronization Release` (Cập nhật ngày 20/10/2026)  
> **Trạng thái kiểm thử:** 100% vượt qua kiểm thử tự động (**102/102 Pytest Tests Passed**), Frontend Vite Production Build thành công, cấu trúc GitFlow chuẩn hóa, phân tách riêng biệt `backend/` và `frontend/`.

---

## 📌 1. Giới Thiệu Tổng Quan Dự Án

Hệ thống **Smart Bus Ticketing** là giải pháp phần mềm quản trị và bán vé xe buýt / xe khách trực tuyến toàn diện, được thiết kế và triển khai nhằm số hóa toàn bộ chu trình vận hành vận tải hành khách: từ tìm kiếm chuyến, giữ chỗ thời gian thực, thanh toán đa kênh, cấp vé điện tử mã QR, đến quản lý chuyến, phân công tài xế, soát vé lên xe và báo cáo doanh thu tài chính chuyên sâu.

Hệ thống áp dụng mô hình phân quyền **4 Actors độc lập**:
1. **👤 Hành Khách (Customer):** Tìm chuyến, chọn sơ đồ ghế 2 tầng, giữ chỗ 10 phút, áp mã voucher, thanh toán QR (VietQR / VNPay / ZaloPay), nhận vé điện tử, đổi/hủy vé, đăng ký thẻ vé tháng và gửi hồ sơ xác minh học sinh - sinh viên.
2. **🚌 Tài Xế (Driver):** Theo dõi lịch trình phân công lái xe theo thời gian thực, danh sách hành khách lên xe và xác nhận hoàn thành chuyến xe.
3. **🎫 Phụ Xe / Tiếp Viên (Conductor / Staff):** Quét mã QR soát vé tại cửa xe, xác nhận hành khách lên xe (**Boarding Check-in**), hỗ trợ bán vé nhanh cho khách vãng lai.
4. **👑 Quản Trị Viên (Admin):** Khởi tạo tuyến đường, điều phối chuyến xe, phân công tài xế/phụ xe, xét duyệt hồ sơ ưu đãi HSSV (kèm ảnh thẻ sinh viên), phát hành voucher, duyệt yêu cầu hoàn tiền vé và theo dõi báo cáo doanh thu - tỷ lệ lấp đầy ghế minh bạch.

---

## 💻 2. Môi Trường Lập Trình & Công Nghệ Sử Dụng (Development Environment)

Dự án được xây dựng và tối ưu trên nền tảng công nghệ hiện đại, đảm bảo tính ổn định, tốc độ phản hồi nhanh và khả năng tương thích cao trên mọi hệ điều hành:

### 2.1. Môi trường phát triển & Hệ điều hành
* **Hệ điều hành thử nghiệm & vận hành:** Windows 10/11 64-bit (hoàn toàn tương thích và hỗ trợ cross-platform trên macOS và Linux).
* **Môi trường dòng lệnh (CLI/Terminal):** PowerShell 7+, Windows Terminal, Git Bash.
* **Môi trường tích hợp (IDE / Tooling):** Visual Studio Code, Google Antigravity Agentic IDE.

### 2.2. Phân hệ Backend (API & Core Engine)
* **Ngôn ngữ:** Python 3.12 (tương thích Python 3.10 trở lên).
* **Framework:** **FastAPI** (hiệu năng cao dựa trên Starlette và Pydantic v2, hỗ trợ chuẩn OpenAPI / Swagger UI).
* **Web Server (ASGI):** **Uvicorn** với cơ chế tự động nạp lại mã nguồn (`--reload`).
* **Quản lý dữ liệu:** SQLite3 native tích hợp sẵn trong Python standard library, kết hợp SQLAlchemy ORM và DDL Schema tương thích MySQL.
* **Tác vụ nền & Định kỳ (Cronjob):** **APScheduler** (tự động quét và giải phóng ghế tạm giữ sau 10 phút hết hạn).
* **Bảo mật & Mã hóa:** `passlib` (PBKDF2 SHA-256 password hashing), `hashlib` (HMAC-SHA512 cho VNPay, HMAC-SHA256 cho ZaloPay).
* **Thông báo đa kênh:** SMTP Gmail HTML template (Email), Mock SMS Gateway.
* **Kiểm thử tự động (QA):** `pytest`, `httpx` (TestClient), `unittest`.

### 2.3. Phân hệ Frontend (Client Interface)
* **Ngôn ngữ & Thư viện:** **JavaScript (ES6+)**, **React 19** (Functional Components, Custom Hooks).
* **Bộ điều hướng:** **React Router DOM v7** (định tuyến SPA mượt mà, phân tách layout thông minh).
* **Công cụ đóng gói (Bundler):** **Vite v8.3** (Hot Module Replacement - HMR tức thì, thời gian build production dưới 2 giây).
* **Bản đồ tương tác:** **Leaflet** & OpenStreetMap (hiển thị lộ trình xe và trạm dừng GPS trực quan).
* **Sinh mã QR trực quan:** Dynamic QR Server Engine (hỗ trợ in vé chuẩn và quét bằng camera điện thoại).
* **Quản lý gói:** Node.js 18.x+, `npm`.

---

## 👥 3. Quy Trình Làm Việc Của Đội Ngũ Phát Triển (Team Workflow)

Nhóm 01 áp dụng phương pháp luận phát triển phần mềm **Agile / Scrum** kết hợp quy chuẩn quản lý mã nguồn **GitFlow** nhằm đảm bảo tiến độ, chất lượng mã nguồn và sự đồng bộ nhịp nhàng giữa các thành viên:

```mermaid
flowchart LR
    A["Sprint Planning<br/>(Product Backlog)"] --> B["Phân Nhánh Tính Năng<br/>feature/fe-* & feature/be-*"]
    B --> C["Pair Programming<br/>& Development"]
    C --> D["Local Test & Pytest<br/>(102 Test Cases)"]
    D --> E["Pull Request & Code Review<br/>(PR Template)"]
    E --> F["Merge vào nhánh develop<br/>(Integration)"]
    F --> G["Staging Verification<br/>& End-to-End Test"]
    G --> H["Release đóng gói sang main<br/>(Production Ready)"]
```

### 3.1. Các giai đoạn phát triển theo Sprint
* **Sprint 1 — Core MVP:** Xây dựng khung kiến trúc Backend/Frontend, thiết kế cơ sở dữ liệu 10 bảng, luồng đặt vé, sơ đồ ghế 2 tầng, giữ chỗ 10 phút và sinh vé điện tử QR.
* **Sprint 2 — Mở rộng Thanh toán & Vận hành:** Tích hợp VNPay, ZaloPay, VietQR, gửi email thông báo xác nhận đặt vé, phân hệ soát vé QR cho tài xế/phụ xe và vé tháng.
* **Sprint 3 — AI Chatbot, Doanh thu & Quản trị 4 Actors:** Tích hợp Chatbot AI hỗ trợ khách hàng, báo cáo doanh thu tài chính đa chiều, tỷ lệ lấp đầy ghế, quản lý phân công chuyến xe, hoàn tiền vé và duyệt ưu đãi sinh viên.

### 3.2. Quy chuẩn Git & Phối hợp nhóm (GitFlow Workflow)
* **Nhánh `develop`:** Nhánh tích hợp trung tâm của dự án. Tất cả tính năng mới sau khi kiểm thử nội bộ đều được hợp nhất về đây.
* **Nhánh `main`:** Nhánh phát hành chính thức (Release). Mã nguồn trên nhánh `main` luôn ở trạng thái ổn định nhất, vượt qua 100% test suites.
* **Nhánh tính năng (`feature/fe-*` và `feature/be-*`):**
  * Thành viên phụ trách Frontend làm việc độc lập trên nhánh `feature/fe-*`, thao tác trong phạm vi thư mục `frontend/`.
  * Thành viên phụ trách Backend làm việc trên nhánh `feature/be-*`, thao tác trong thư mục `backend/`.
* **Cơ chế Code Review & Kiểm thử trước khi Merge:**
  * Mọi Pull Request (PR) đều tuân theo mẫu biểu `.github/pull_request_template.md`.
  * Yêu cầu bắt buộc: `npm run build` không phát sinh lỗi và toàn bộ 102 test cases backend `pytest` đều vượt qua trước khi phê duyệt merge.

---

## 🗄️ 4. Kiến Trúc Cơ Sở Dữ Liệu: Vị Trí, Cơ Chế & Đánh Giá Ưu / Nhược Điểm

Hệ thống được trang bị kiến trúc lưu trữ **Dual-Engine** linh hoạt: mặc định sử dụng cơ chế Serverless SQLite cho môi trường phát triển và kiểm thử, đồng thời hỗ trợ chuyển mạch sang MySQL phân tán khi triển khai quy mô lớn.

### 4.1. Vị trí lưu trữ dữ liệu
* **Tệp cơ sở dữ liệu chính thức:** Đặt tại thư mục `backend/data/bus_booking.db` (đường dẫn tương đối từ gốc dự án: `data/bus_booking.db`).
* **Tệp khởi tạo & Tự động di trú (Migration):** `backend/src/database.py` (tự động nhận diện cấu trúc, tạo mới các bảng và tự động bổ sung các cột mới như `student_id`, `card_image`, `refunded_amount` nếu chưa tồn tại).
* **Tệp dữ liệu mẫu chuẩn hóa:** `backend/src/seed_data.py` (nạp sẵn danh sách người dùng 4 vai trò, 30+ chuyến xe liên tỉnh, sơ đồ ghế 2 tầng, lịch sử giao dịch và mã ưu đãi).
* **Tệp kịch bản chuyển đổi MySQL:** `backend/src/schema_mysql.sql` (sẵn sàng chuyển sang MySQL thông qua cấu hình biến môi trường `DATABASE_URL=mysql+pymysql://user:pass@host/bus_booking`).

### 4.2. Bảng phân tích Ưu điểm & Nhược điểm của giải pháp CSDL

| Tiêu Chí | Ưu Điểm (Strengths) | Nhược Điểm & Hạn Chế (Limitations) | Giải Pháp Khắc Phục Của Nhóm |
|:---|:---|:---|:---|
| **Cài đặt & Triển khai** | **Zero-Configuration:** Hoạt động ngay lập tức không cần cài đặt phần mềm máy chủ CSDL (MySQL/PostgreSQL), không lo cấu hình port hay tài khoản phân quyền. | Không chạy dưới dạng một dịch vụ độc lập (Daemon process) quản lý qua mạng. | Đã xây dựng sẵn script `database.py` tự động phát hiện đường dẫn và kết nối an toàn. |
| **Tính di động (Portability)** | **Gọn nhẹ & Toàn vẹn:** Toàn bộ hệ thống cơ sở dữ liệu nằm trọn trong 1 file `.db` duy nhất, cực kỳ dễ dàng sao lưu (backup), copy sang máy khác và chia sẻ giữa các thành viên. | Kích thước file tăng dần theo thời gian nếu lưu trữ lượng lớn ảnh base64. | Giới hạn dung lượng ảnh thẻ SV tải lên tối đa 5MB và khuyến khích lưu trữ URL ảnh CDN. |
| **Tốc độ truy vấn (Speed)** | **In-process Querying:** Truy vấn dữ liệu trực tiếp trong bộ nhớ/tệp nội bộ, loại bỏ hoàn toàn độ trễ truyền tải qua mạng (Network Latency), cho tốc độ đọc cực nhanh. | Xung đột ghi đồng thời (Concurrency Lock) do SQLite sử dụng cơ chế khóa ở mức file (File-level locking) khi ghi. | Hệ thống sử dụng chế độ kết nối ngắn gọn (`contextmanager`), commit ngay sau khi thực thi để giải phóng khóa lập tức. |
| **Kiểm thử tự động (QA Testing)** | **Repeatable Fixtures:** Khôi phục trạng thái dữ liệu mẫu và chạy 102 test cases trong vài giây mà không làm sai lệch dữ liệu của máy chủ thật. | Không có sẵn các tính năng nâng cao như Stored Procedure, Trigger phức tạp cấp DB. | Đưa toàn bộ quy tắc nghiệp vụ (Business Rules) lên tầng Python Core để kiểm soát chặt chẽ 100%. |
| **Khả năng mở rộng (Scalability)** | Phù hợp tối đa cho đồ án, thử nghiệm nghiệm thu, demo sản phẩm và hệ thống vừa và nhỏ. | Không hỗ trợ mở rộng theo chiều ngang (Clustering / Multi-master Replication) cho hàng chục ngàn lượt ghi/giây. | Thiết kế schema theo chuẩn ANSI SQL 100% tương thích MySQL; chỉ cần đổi `DATABASE_URL` là chuyển sang MySQL ngay. |

---

## 🏗️ 5. Cấu Trúc Mã Nguồn Dự Án (Clean Architecture)

```text
Project_TTCS_K7S3_N1_BusTicketing/
├── backend/                         # === PHÂN HỆ BACKEND (Python FastAPI) ===
│   ├── main.py                      # Điểm khởi động chính của Backend Server (Uvicorn)
│   ├── pytest.ini                   # Cấu hình kiểm thử tự động toàn diện
│   ├── requirements.txt             # Danh sách thư viện Python phụ thuộc
│   ├── data/                        # Thư mục chứa cơ sở dữ liệu SQLite
│   │   └── bus_booking.db           # Tệp CSDL chính của hệ thống
│   ├── api/                         # Tầng Router API nghiệp vụ độc lập
│   │   ├── auth_routes.py           # Đăng ký, đăng nhập, hồ sơ, xác minh HSSV (mã SV & ảnh thẻ)
│   │   ├── trips_routes.py          # Tra cứu chuyến, sơ đồ ghế 2 tầng, giữ chỗ 10p
│   │   ├── payments_routes.py       # Xử lý thanh toán VietQR, MoMo, VNPay, ZaloPay
│   │   ├── tickets_routes.py        # Vé điện tử, đổi ghế, đổi chuyến, hủy vé & hoàn tiền
│   │   ├── vouchers_routes.py       # Quản lý mã ưu đãi, tính toán giảm phần trăm & phụ phí
│   │   ├── monthly_pass_routes.py   # Mua mới và gia hạn thẻ vé tháng toàn tuyến
│   │   ├── admin_routes.py          # Điều phối chuyến xe, đối soát doanh thu, duyệt ưu đãi
│   │   ├── interactions_routes.py   # Trợ lý ảo Chatbot AI, thông báo Email/SMS, đánh giá
│   │   └── common.py                # Hàm tiện ích dùng chung, ghi vết Audit Logs
│   ├── src/                         # Nghiệp vụ lõi (Business Logic Core Engine)
│   │   ├── database.py              # Quản lý kết nối CSDL và tự động Migration
│   │   ├── seed_data.py             # Bộ dữ liệu mẫu khởi tạo phong phú
│   │   ├── notification.py          # Module gửi thông báo Email HTML và SMS
│   │   ├── payment_gateway.py       # Thuật toán tạo mã thanh toán & kiểm tra chữ ký số
│   │   ├── chatbot_engine.py        # Động cơ xử lý ngôn ngữ tư vấn khách hàng tự động
│   │   ├── ticket_changes.py        # Nghiệp vụ đổi vé và hủy vé trực tuyến
│   │   ├── boarding_api.py          # Nghiệp vụ quét mã QR soát vé cho tài xế/phụ xe
│   │   ├── doanh_thu_api.py         # Công thức tính doanh thu thuần và tỷ lệ lấp đầy
│   │   ├── xuat_doanh_thu_api.py    # Xuất file CSV báo cáo tài chính
│   │   └── refund_api.py            # Quy trình tiếp nhận và xử lý hoàn tiền US08
│   └── tests/                       # 102 Test Cases kiểm thử tự động toàn diện
│
├── frontend/                        # === PHÂN HỆ FRONTEND (React 19 + Vite) ===
│   ├── package.json                 # Cấu hình gói và thư viện giao diện
│   ├── vite.config.js               # Cấu hình máy chủ phát triển Vite
│   └── src/
│       ├── api/                     # Tầng API Client gọi Backend
│       │   ├── client.js            # Cấu hình baseURL và Fetch Client
│       │   ├── adminApi.js          # API điều phối chuyến, doanh thu, duyệt ưu đãi
│       │   ├── authApi.js           # API đăng nhập, đăng ký, xác minh mã SV & ảnh thẻ
│       │   ├── tripsApi.js          # API tìm chuyến, khóa ghế tạm thời
│       │   ├── paymentsApi.js       # API khởi tạo đơn hàng và thanh toán
│       │   ├── ticketsApi.js        # API vé điện tử, đổi vé, hủy vé
│       │   ├── vouchersApi.js       # API áp dụng và tạo voucher
│       │   └── index.js             # Export tập trung các dịch vụ
│       ├── components/              # Thành phần giao diện tái sử dụng
│       │   ├── Header.jsx           # Thanh điều hướng, chuyển đổi vai trò Demo
│       │   ├── Footer.jsx           # Chân trang kèm thông tin liên hệ và phản ánh
│       │   ├── ChatWidget.jsx       # Cửa sổ Trợ lý ảo AI thông minh 24/7
│       │   ├── SearchForm.jsx       # Form tìm kiếm chuyến xe thông minh
│       │   ├── PaymentForm.jsx      # Form thanh toán và áp mã voucher trực quan
│       │   ├── VoucherModal.jsx     # Popup danh sách mã giảm giá
│       │   ├── PrintableTicket.jsx  # Mẫu vé điện tử in trực tiếp kèm mã QR
│       │   └── CountdownTimer.jsx   # Đồng hồ đếm ngược 10 phút giữ chỗ
│       └── pages/                   # Các trang giao diện chức năng chính
│           ├── HomePage.jsx         # Trang chủ giới thiệu dịch vụ
│           ├── BusListPage.jsx      # Danh sách xe và sơ đồ ghế 2 tầng
│           ├── PaymentPage.jsx      # Xác nhận đặt vé và quét mã thanh toán
│           ├── UserDashboard.jsx    # Vé của tôi, đổi/hủy vé, xác minh mã SV & ảnh thẻ
│           ├── AdminDashboard.jsx   # Quản trị hệ thống, duyệt ưu đãi, đối soát doanh thu
│           ├── TicketVerification.jsx # Màn hình quét QR soát vé cho Tài xế / Phụ xe
│           ├── MonthlyPassPage.jsx  # Đăng ký và gia hạn vé tháng
│           ├── RefundStatusPage.jsx # Tra cứu tiến độ yêu cầu hoàn tiền
│           ├── MapPage.jsx          # Bản đồ định vị GPS trạm dừng
│           ├── LoginPage.jsx        # Đăng nhập hệ thống
│           └── RegisterPage.jsx     # Đăng ký tài khoản (tối ưu, gọn gàng)
│
├── start_project.bat                # Script 1-Click tự động chạy toàn bộ hệ thống
├── package.json                     # NPM launcher điều phối từ thư mục gốc
└── README.md                        # Tài liệu hướng dẫn sử dụng và báo cáo kỹ thuật
```

---

## 👥 6. Danh Sách Tài Khoản Demo Theo Từng Vai Trò (4 Actors)

Hệ thống hỗ trợ chuyển đổi vai trò 1-click trực tiếp trên thanh Header (Navbar) hoặc đăng nhập với **mật khẩu chung: `123456`**:

| Vai Trò (Role) | Tên Người Dùng Demo | Email Đăng Nhập | Mật Khẩu | Nghiệp Vụ Trọng Tâm |
|:---|:---|:---|:---|:---|
| **Quản Trị Viên** *(Admin)* | Lê Quản Lý | `admin@smartbus.vn` | `123456` | Quản lý tuyến/chuyến, phân công tài xế & phụ xe, xem ảnh thẻ SV và duyệt ưu đãi HSSV (US23), đối soát doanh thu chi tiết từng đơn hàng, xuất file CSV. |
| **Hành Khách (Thường)** | Nguyễn Văn A | `customer@example.com` | `123456` | Tìm chuyến, chọn ghế 2 tầng, giữ chỗ 10p, áp dụng voucher, thanh toán VietQR/VNPay, in vé điện tử, yêu cầu hủy vé hoàn tiền trực tuyến. |
| **Hành Khách (HSSV)** | Nguyễn Văn A (Ưu đãi) | `nguyenvana@gmail.com` | `123456` | Gửi mã sinh viên và ảnh thẻ sinh viên để nhận ưu đãi giảm 20% giá vé xe khách và thẻ vé tháng. |
| **Tài Xế** *(Driver)* | Trần Văn Tài | `taixe.nguyen@smartbus.vn` | `123456` | Xem lịch trình phân công lái xe, danh sách hành khách lên xe của chuyến xe mình phụ trách. |
| **Phụ Xe / Soát Vé** *(Staff)* | Trần Thị B | `nhanvien@smartbus.vn` | `123456` | Quét mã QR soát vé khách lên xe tại cửa xe, xác nhận lên xe (**Boarding Check-in**). |

---

## 🚀 7. Hướng Dẫn Khởi Chạy Hệ Thống

### Cách 1: Khởi Chạy 1-Click Bằng File Batch (Khuyên Dùng Cho Windows)
Nhấp đúp chuột vào file `start_project.bat` tại thư mục gốc dự án, hoặc mở PowerShell chạy:

```powershell
.\start_project.bat
```

> **Script sẽ tự động:**
> 1. Kiểm tra môi trường Python và Node.js.
> 2. Khởi chạy Backend FastAPI Server tại cổng `8000`.
> 3. Khởi chạy Frontend React Vite Dev Server tại cổng `5173`.
> 4. Tự động mở trình duyệt truy cập ngay **http://localhost:5173**.

---

### Cách 2: Khởi Chạy Thủ Công Từng Phân Hệ

#### Bước 1: Khởi động Backend (FastAPI Server)
Mở cửa sổ Terminal/PowerShell thứ nhất tại thư mục gốc:

```powershell
# Cài đặt thư viện Python (chỉ chạy lần đầu)
pip install -r requirements.txt

# Khởi chạy Backend Server
python backend/main.py
```
* **Địa chỉ Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Tài liệu Swagger UI tương tác trực tiếp:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Tài liệu Redoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

#### Bước 2: Khởi động Frontend (React 19 + Vite)
Mở cửa sổ Terminal/PowerShell thứ hai tại thư mục gốc:

```powershell
cd frontend
npm install
npm run dev
```
* **Địa chỉ Giao diện Web:** [http://localhost:5173](http://localhost:5173)

---

## 🎬 8. Kịch Bản Trình Diễn Demo Các Tính Năng Mới Cập Nhật

### 🎭 Kịch Bản 1: Đăng Ký Tài Khoản & Xác Minh Sinh Viên Bằng Ảnh Thẻ
1. **Đăng ký tài khoản mới:**
   - Bấm **"Đăng ký"** tại trang chủ hoặc truy cập `/register`.
   - Form đăng ký được tinh giản gọn gàng: chỉ gồm Họ tên, Email, Số điện thoại, Mật khẩu (đã lược bỏ ô chọn đối tượng ưu đãi bên ngoài theo yêu cầu).
   - Nhập thông tin và bấm **"Đăng Ký Ngay"** ➔ Hệ thống tự động tạo tài khoản thường và tự động đăng nhập.
2. **Xác minh sinh viên trên Trang cá nhân:**
   - Vào mục **"Trang cá nhân"** (`/dashboard?tab=profile`).
   - Tại card **"🎓 Xác Minh Đối Tượng Ưu Đãi"**:
     - Nhập **Mã sinh viên / Mã học sinh** (ví dụ: `B21DCCN001` hoặc `SV2026-889`).
     - Nhập **Trường Đại Học / Học Viện** (ví dụ: `Đại học Bách Khoa`).
     - Bấm **"📁 Chọn ảnh thẻ từ máy"** hoặc bấm **"🖼️ Dùng ảnh thẻ SV mẫu demo"** để đính kèm ảnh thẻ sinh viên. Ảnh xem trước hiển thị sắc nét.
     - Bấm **"📤 Gửi Hồ Sơ Xác Minh Ưu Đãi"** ➔ Hệ thống ghi nhận trạng thái **"⏳ Chờ duyệt"**.

---

### 👑 Kịch Bản 2: Quản Trị Viên Duyệt Ưu Đãi & Đối Soát Doanh Thu Khớp Đơn Vé
1. **Xét duyệt hồ sơ sinh viên kèm ảnh thẻ (US23):**
   - Đăng nhập quyền **Admin**, chuyển đến tab **"🎓 Duyệt Ưu Đãi (US23)"**.
   - Bảng danh sách hiển thị đầy đủ: ID, Họ tên, Email, Số điện thoại, **Mã Sinh Viên**, **Trường học** và cột **Ảnh Thẻ SV**.
   - Bấm **"👁️ Xem ảnh"** ➔ Modal phóng to ảnh thẻ sinh viên xuất hiện rõ ràng để kiểm tra tính hợp lệ.
   - Bấm **"✓ Duyệt"** ➔ Tài khoản người dùng được nâng cấp lên diện HSSV và tự động được giảm 20% khi mua vé.
2. **Quản lý danh sách người dùng:**
   - Tại tab **"👥 Quản Lý Người Dùng"**, bảng hiển thị thông tin cân đối, gọn gàng (đã bỏ cột Phân quyền lại RBAC theo đúng yêu cầu).
3. **Báo cáo Doanh thu & Bảng kê đối soát giao dịch chi tiết:**
   - Chuyển sang tab **"📊 Doanh Thu & Lấp Đầy"**.
   - Thẻ KPI hiển thị số liệu chuẩn xác:
     - **TỔNG DOANH THU THỰC NHẬN (NET):** Tổng tiền sau khi trừ hoàn vé.
     - **DOANH THU GỘP (GROSS):** Tổng tiền thanh toán thành công.
     - **TỔNG SỐ ĐƠN ĐẶT:** Số lượng đơn hàng giao dịch.
     - **SỐ VÉ ĐÃ PHÁT HÀNH:** Đếm chính xác số lượng vé thực tế được cấp (kể cả đơn mua nhiều vé).
   - Bảng theo ngày hiển thị rõ: `X đơn (Y vé)`.
   - **Bảng kê chi tiết đơn hàng:** Hiển thị minh bạch từng giao dịch của khách hàng (Mã GD, Mã đơn, Tên & SĐT khách, Tuyến xe, Số vé & ghế ngồi, Cổng thanh toán, Tiền gốc, Hoàn tiền, Thực thu, Thời gian và Trạng thái).
   - Bấm **"📥 Xuất File CSV"** để tải file đối soát doanh thu tài chính đầy đủ thông tin khách hàng và số ghế.

---

## 🧪 9. Kiểm Thử Chất Lượng (Quality Assurance & Testing)

### 1. Kiểm thử Backend Tự Động (102/102 Tests Passed - 100% OK)
```powershell
python -m pytest
```
* **Kết quả:** `102 passed in ~11s (100% SUCCESS)`.
* Bao phủ 13 bộ test suites kiểm tra toàn bộ: Đặt vé, Giữ ghế 10p, Cổng thanh toán (VietQR, VNPay, ZaloPay), Đổi/hủy vé, Hoàn tiền US08, Vé tháng US16, Chatbot AI, Quản lý chuyến, Báo cáo doanh thu và Phân quyền người dùng.

### 2. Kiểm thử Biên Dịch Frontend (Vite Production Build)
```powershell
npm run build
```
* **Kết quả:** `✓ built in < 2.0s`, tối ưu hóa tài nguyên hoàn hảo, 0 lỗi biên dịch.

---

## 📜 10. Nhật Ký Phiên Bản (Changelog)

* **Phiên bản v2.2.1 (20/10/2026) — Hotfix & Conductor Synchronization Release:**
  * 🛡️ **Khắc phục lỗi tự động đẩy duyệt ưu đãi HSSV:**
    * Sửa logic kiểm tra yêu cầu ưu đãi trong Backend API (`get_pending_discounts`): Chỉ hiển thị các tài khoản thực sự đã nộp hồ sơ (có Mã sinh viên hoặc Ảnh thẻ sinh viên và trạng thái `ChoDuyet`).
    * Sửa giá trị mặc định của `discount_status` thành `None` (thay vì tự gán `ChoDuyet`), bảo đảm khách hàng mới đăng ký hoặc chưa gửi duyệt sẽ không bị tự động đẩy lên trang quản trị viên.
    * Xóa bỏ các chuỗi dữ liệu giả định hardcode (`SV2026-889`, `Đại học Bách Khoa`) trên giao diện Admin; chỉ hiển thị dữ liệu xác thực thực tế do người dùng cung cấp.
  * 🎫 **Đồng bộ hóa & Hoàn thiện Nghiệp vụ Role Phụ Xe (`PhuXe`):**
    * Mở rộng quyền cho Phụ xe và Admin kiểm soát danh sách hành khách của tất cả các chuyến xe đang vận hành trong hệ thống thay vì bị giới hạn 0 chuyến xe.
    * Đồng bộ hóa dữ liệu hành khách theo thời gian thực: Hợp nhất tức thì các vé mới được khách hàng đặt trực tuyến (qua API và phiên Client).
    * Bổ sung nút **"🔄 Làm Mới Vé"** và thanh tìm kiếm nhanh theo Tên hành khách, Số điện thoại, Số ghế và Mã vé.
    * Nâng cấp thao tác duyệt khách lên xe (**"🚪 Duyệt Cho Lên Xe"**), tự động chuyển đổi trạng thái vé sang `USED` (Đã lên xe) và ghi nhật ký soát vé bảo mật.

* **Phiên bản v2.2.0 (20/10/2026) — Final Golden Release:**
  * ✨ **Xác minh sinh viên:** Đổi trường xác minh thành Mã sinh viên và tích hợp chức năng tải ảnh thẻ sinh viên (kèm preview xem trước và modal phóng to cho Admin).
  * 🎨 **Tối ưu form đăng ký:** Loại bỏ ô chọn đối tượng ưu đãi bên ngoài, hướng dẫn khách hàng đăng ký xong xác minh trong trang cá nhân.
  * 🛡️ **Tinh giản Admin:** Loại bỏ cột "Phân quyền lại (RBAC)" không hợp lý, cân đối lại giao diện quản lý người dùng.
  * 📊 **Chuẩn hóa Báo cáo Doanh thu:** Sửa lỗi đếm số vé phát hành (khớp đúng số vé của từng đơn), sửa logic đối soát hoàn tiền và bổ sung bảng kê chi tiết từng giao dịch của khách hàng.
  * 📖 **Tài liệu:** Bổ sung chi tiết môi trường lập trình, quy trình Agile của team và phân tích ưu/nhược điểm CSDL.

---

## 📞 11. Thông Tin Nhóm Phát Triển & Liên Hệ

* **Đồ án:** Thực tập Cơ sở K7S3 — Nhóm 01 (Hệ thống Smart Bus Ticketing)
* **Trưởng nhóm & Kỹ thuật:** Lê Gia Bảo
* **Email:** `hotro@smartbus.vn` | `dtc245220019@ictu.edu.vn`
* **Hotline kỹ thuật:** `1900 6868`

---
© 2026 Smart BusTicketing — Unified Ecosystem. Bản quyền thuộc về Nhóm 01.
