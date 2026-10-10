# 🚌 HỆ THỐNG ĐẶT VÉ XE BUÝT THÔNG MINH (SMART BUS TICKETING)
> **Đồ án Thực tập Cơ sở K7S3 — Nhóm 01**  
> **Repository:** [Project_TTCS_K7S3_N1_BusTicketing](https://github.com/dtc245220019-create/Project_TTCS_K7S3_N1_BusTicketing.git)  
> **Nhánh phát triển:** `feature/phan-quyen-4-actors`  
> **Phiên bản:** Sprint 2 (RBAC 4 Actors & Admin Hub) • **Trạng thái:** 100% Passed (48/48 Unit Tests) • Sẵn sàng Demo & Nghiệm thu

---

## 📑 Mục Lục
1. [Giới Thiệu Dự Án](#-1-giới-thiệu-dự-án)
2. [Khởi Chạy Nhanh (1-Click Quick Start)](#-2-hướng-dẫn-khởi-chạy-nhanh-quick-start)
3. [Kịch Bản Trải Nghiệm Demo Chi Tiết](#-3-kịch-bản-trải-nghiệm-demo-từng-bước)
4. [Bảng Dữ Liệu Mẫu & Tài Khoản Test (Cheat Sheet)](#-4-bảng-dữ-liệu-mẫu--tài-khoản-demo-cheat-sheet)
5. [Kiến Trúc Kỹ Thuật & Công Nghệ](#-5-kiến-trúc-hệ-thống--công-nghệ-sử-dụng)
6. [Cơ Sở Dữ Liệu & Hướng Dẫn Di Chuyển Lên MySQL](#-6-cơ-sở-dữ-liệu--chuyển-đổi-lên-mysql)
7. [Danh Mục RESTful API Đầy Đủ](#-7-danh-mục-restful-api-sprint-1--sprint-2)
8. [Kiểm Thử Tự Động (Unit Testing)](#-8-kiểm-thử-tự-động-toàn-diện-unit-tests)
9. [Cấu Hình Biến Môi Trường (.env)](#-9-cấu-hình-biến-môi-trường-env)
10. [Cấu Trúc Thư Mục Dự Án](#-10-cấu-trúc-thư-mục-dự-án)
11. [Khắc Phục Sự Cố Thường Gặp (FAQ & Troubleshooting)](#-11-khắc-phục-sự-cố-thường-gặp-faq)
12. [Đội Ngũ Thực Hiện & Phân Chia Vai Trò](#-12-đội-ngũ-thực-hiện--phân-chia-vai-trò-nhóm-01)

---

## 🌟 1. Giới Thiệu Dự Án

Hệ thống **Smart Bus Ticketing** là nền tảng quản trị và bán vé xe buýt / xe khách trực tuyến toàn diện, được xây dựng theo phương pháp Scrum/Agile với lộ trình 4 tuần (24 User Stories).

### 🎯 Các phân hệ đã hoàn thành xuất sắc (Sprint 1 & Sprint 2):
- **Sơ đồ ghế xe 2 tầng trực quan:** Hỗ trợ Dãy A (Tầng dưới: A01 - A18) và Dãy B (Tầng trên: B01 - B18) với trạng thái thời gian thực (`AVAILABLE`, `HELD`, `BOOKED`).
- **Cơ chế Tạm giữ ghế 10 phút:** Tích hợp `APScheduler` tự động nhả ghế nếu quá hạn mà chưa thanh toán.
- **Hệ sinh thái Thanh toán đa kênh:**
  - Cổng thanh toán quốc dân **VNPay** với chữ ký điện tử HMAC-SHA512.
  - Cổng ví điện tử **ZaloPay** với mã xác thực HMAC-SHA256.
  - Cổng VietQR động và Sandbox mô phỏng tức thì.
- **Hệ sinh thái Khuyến mãi & Phí dịch vụ (BE4):** Mã giảm giá (**Vouchers**: `CHAO20`, `BUS50`, `GIAM10K`, `VIP15`) và Phí dịch vụ (bảo hiểm hành khách, tiện ích bến bãi thông minh).
- **Vé điện tử & Mã QR động chống gian lận:** Tự động sinh mã vé `TKT-xxxx`, chuỗi QR Payload chuẩn hóa, giao diện thẻ vé in trực tiếp hoặc tải PDF.
- **Hệ thống Thông báo tức thì đa kênh (US20):**
  - Gửi **Email xác nhận HTML** với đầy đủ thông tin hóa đơn qua Gmail SMTP (`busticketingduan@gmail.com`).
  - **SMS Gateway Mock** in log trực quan ra Console.
  - **Chuông thông báo in-app (Notification Bell)** trên Navbar với unread badge.
- **Nghiệp vụ Soát vé & Check-in lên xe (Boarding US24 & US08):** Quét mã QR, tự động ghi nhận lên xe, đổi trạng thái vé sang `USED` / `DaSoat`, lưu nhật ký kiểm soát vé và ngăn chặn tuyệt đối việc sử dụng lại vé đã đi.
- **Cổng Tra cứu & Hủy vé trực tuyến, Hoàn tiền 100% (US25):** Tra cứu vé theo mã vé/SĐT, áp dụng quy tắc hoàn hủy trước giờ khởi hành và tự động nhả lại ghế trống cho hệ thống.
- **Bản đồ Mạng lưới Trạm dừng GPS Thông minh:** Tích hợp Leaflet / OpenStreetMap hiển thị trực quan các trạm dừng, cự ly km và vị trí xe chạy thời gian thực.
- **Kiến trúc CSDL Dual-Engine (SQLite & MySQL):** Tự động kết nối MySQL 8.0+ 18 bảng cho môi trường doanh nghiệp, đồng thời có cơ chế Fallback mượt mà về SQLite `bus_booking.db` giúp chạy demo không cần cài đặt phức tạp.

---

## 🚀 2. Hướng Dẫn Khởi Chạy Nhanh (Quick Start)

### ⚡ Cách 1: Khởi chạy 1-Click tự động (Khuyên dùng cho Demo)

Dự án đã tích hợp sẵn kịch bản khởi động thông minh `start_project.bat`. Bạn chỉ cần:

1. **Nhấp đúp chuột** vào tệp **`start_project.bat`** tại thư mục gốc của dự án.
   *(Hoặc chạy lệnh sau trong PowerShell/CMD)*:
   ```cmd
   .\start_project.bat
   ```
2. Tệp script sẽ tự động:
   - Mở cửa sổ Backend FastAPI tại cổng `8000` (kèm tài liệu Swagger).
   - Mở cửa sổ Frontend React Vite tại cổng `5173`.
   - Tự động mở trình duyệt web điều hướng đến giao diện chính: **http://localhost:5173**.

---

### 🛠️ Cách 2: Khởi chạy thủ công từng bước

#### Yêu cầu môi trường tối thiểu:
- **Python:** Phiên bản `3.10` trở lên (Khuyên dùng `Python 3.12`).
- **Node.js:** Phiên bản `18.x` hoặc `20.x` trở lên (kèm `npm`).

#### Bước 1: Cài đặt và chạy Backend (FastAPI)
Mở cửa sổ Terminal thứ nhất tại thư mục gốc `Project_TTCS_K7S3_N1_BusTicketing`:
```powershell
# 1. Cài đặt các thư viện Python
pip install -r requirements.txt

# 2. Khởi tạo CSDL và nạp dữ liệu mẫu (Chuyến đi, Sơ đồ ghế, Vouchers, Tài khoản)
python seed_data.py

# 3. Khởi động máy chủ API
python main.py
```
> Server Backend sẽ hoạt động tại: **http://127.0.0.1:8000**  
> Tài liệu Swagger API tương tác: **http://127.0.0.1:8000/docs**  
> Tài liệu Redoc API: **http://127.0.0.1:8000/redoc**

#### Bước 2: Cài đặt và chạy Frontend (React + Vite)
Mở cửa sổ Terminal thứ hai tại thư mục gốc:
```powershell
# 1. Di chuyển vào thư mục frontend
cd ve-xe-frontend

# 2. Cài đặt các gói phụ thuộc npm
npm install

# 3. Khởi động ứng dụng React Vite
npm run dev
```
> Giao diện web người dùng sẽ hoạt động tại: **http://localhost:5173**

---

## 🎯 3. Kịch Bản Trải Nghiệm Demo Từng Bước

Sau buổi demo, để người dùng hoặc thầy cô kiểm tra mọi tính năng một cách dễ dàng và liền mạch nhất, hãy thực hiện theo 6 kịch bản mẫu dưới đây:

### 🎫 Kịch bản 1: Tra cứu chuyến & Đặt vé trực tuyến (End-to-End Booking)
1. **Tìm chuyến:** Mở trình duyệt vào `http://localhost:5173`. Tại thanh tìm kiếm nhanh, chọn:
   - **Điểm đi:** `Hà Nội`
   - **Điểm đến:** `Thái Nguyên`
   - Bấm **"Tìm Chuyến Xe"**.
2. **Chọn chuyến & Sơ đồ ghế:**
   - Hệ thống hiển thị các chuyến xe trong ngày (ví dụ `TRIP-HN-TN-01`, xuất bến `07:30`, giá vé `120.000 VNĐ`).
   - Bấm nút **"Chọn chuyến"**.
   - Giao diện sơ đồ xe 2 tầng hiện ra:
     - **Tầng dưới (Dãy A):** A01 -> A18
     - **Tầng trên (Dãy B):** B01 -> B18
   - Nhấp chọn 1 hoặc nhiều ghế (ví dụ ghế `A05`). Chú ý bộ đếm thời gian tạm giữ ghế `10:00` đếm ngược ở góc màn hình.
   - Bấm **"Tiếp tục thanh toán"**.
3. **Áp dụng Mã giảm giá (Voucher) & Phí dịch vụ:**
   - Tại form thanh toán, ở ô "Mã giảm giá", nhập mã **`CHAO20`** (giảm 20%) hoặc **`BUS50`** (giảm 50k) rồi bấm **"Áp dụng"**.
   - Quan sát giá tiền: Tổng tiền sẽ được tự động trừ khuyến mãi và hiển thị rõ ràng bảng chiết khấu cùng phụ phí tiện ích bến bãi / bảo hiểm.
4. **Chọn cổng thanh toán:**
   - **VietQR / Sandbox:** Bấm nút "Thanh toán ngay", hệ thống xử lý tức thì.
   - **VNPay Sandbox:** Chọn phương thức VNPay, bấm thanh toán -> hệ thống chuyển hướng sang trang VNPay chính thức với URL chữ ký HMAC-SHA512.
   - **ZaloPay:** Chọn ZaloPay để trải nghiệm luồng thanh toán ví điện tử.
5. **Nhận vé điện tử & Mã QR:**
   - Chuyển sang màn hình `PaymentResultPage` / Thẻ vé điện tử.
   - Hiển thị đầy đủ: Mã vé dạng `TKT-xxxx`, mã đặt chỗ, số ghế, sơ đồ mã QR động, nút **"In vé"** và **"Về trang chủ"**.

---

### 📩 Kịch bản 2: Trải nghiệm Thông báo tức thì đa kênh (US20)
Ngay sau khi bước thanh toán vé ở Kịch bản 1 hoàn tất:
1. **Email xác nhận hóa đơn:**
   - Backend sử dụng tài khoản Gmail SMTP gửi 1 Email định dạng HTML chuyên nghiệp đến hòm thư người đặt vé (chứa mã vé, hành trình, số ghế, tổng tiền và mã QR).
2. **SMS Gateway:**
   - Mở cửa sổ Console của Backend FastAPI, bạn sẽ thấy thông báo MOCK SMS GATEWAY được in ra dạng khung viền đẹp mắt:
     ```text
     =================================================================
      📲 [MOCK SMS GATEWAY - THÔNG BÁO ĐẶT VÉ THÀNH CÔNG]
      🕒 Thời gian gửi : 2026-10-05 08:30:00
      📞 Số điện thoại : +8491234567
      🎫 Mã vé đồng bộ : TKT-xxxx
      💬 Nội dung SMS  : [BusTicket] Dat ve thanh cong! Ma ve: TKT-xxxx...
     =================================================================
     ```
3. **Chuông thông báo (Notification Bell):**
   - Trên thanh điều hướng (Header) của Web, biểu tượng **Hình Quả Chuông** sẽ hiện số đếm tin chưa đọc màu đỏ.
   - Nhấp vào chuông để xem danh sách thông báo xác nhận Email & SMS vừa được ghi nhận.

---

### 🗺️ Kịch bản 3: Bản đồ Mạng lưới Trạm dừng GPS Thông minh
1. Nhấp vào mục **"Bản đồ trạm"** trên thanh menu Header (`http://localhost:5173/map`).
2. Giao diện OpenStreetMap / Leaflet hiển thị:
   - Danh sách các trạm dừng đón/trả khách kèm địa chỉ cụ thể và tọa độ GPS thực tế (Bến xe Mỹ Đình, Ngã 3 Dầu Giây, Bảo Lộc, Bến xe Đà Lạt...).
   - Lộ trình di chuyển giữa các trạm dừng với thông số cự ly (km).
   - Vị trí xe buýt đang vận hành thời gian thực trên bản đồ.

---

### 🔍 Kịch bản 4: Nghiệp vụ Soát vé & Check-in lên xe (Boarding US24 & US08)
1. Nhấp vào mục **"Soát vé QR"** trên thanh menu Header (`http://localhost:5173/verify`).
2. **Soát vé lần 1 (Vé hợp lệ):**
   - Nhập mã vé vừa mua ở Kịch bản 1 (hoặc mã vé có sẵn **`TKT-8892`**), bấm **"Kiểm tra vé"**.
   - Kết quả trả về màu xanh: **HỢP LỆ (VALID) / ĐÃ LÊN XE THÀNH CÔNG**.
   - Hệ thống hiển thị chi tiết tên hành khách, tuyến đi, số ghế và ghi nhận lịch sử vào bảng "Nhật ký soát vé gần đây".
   - Trạng thái vé trong cơ sở dữ liệu được cập nhật thành `USED` / `DaSoat`.
3. **Soát vé lần 2 (Phát hiện gian lận):**
   - Tiếp tục bấm kiểm tra lại chính mã vé vừa soát.
   - Hệ thống sẽ cảnh báo màu cam/đỏ: **"VÉ ĐÃ ĐƯỢC SỬ DỤNG TRƯỚC ĐÓ"**, ngăn chặn hành vi quay vòng vé.
4. **Kiểm tra vé giả / vé sai:**
   - Nhập một mã vé tùy ý (ví dụ `TKT-999999`), hệ thống sẽ thông báo vé không tồn tại trên hệ thống.

---

### 🔄 Kịch bản 5: Tra cứu & Hủy vé trực tuyến, Hoàn tiền 100% (US25 & US07)
1. Nhấp vào mục **"Hủy vé"** trên thanh menu Header (`http://localhost:5173/cancellation`).
2. Nhập mã vé cần hủy (ví dụ mã vé vừa đặt hoặc vé mẫu **`TKT-8892`**), bấm **"Tra cứu vé"**.
3. Hệ thống hiển thị:
   - Thông tin chi tiết vé xe, trạng thái thanh toán và chính sách hoàn tiền:
     - Hủy trước 24 giờ: Hoàn tiền **100%**.
     - Hủy trước 12 giờ: Hoàn tiền **70%**.
4. Chọn lý do hủy (ví dụ: *Thay đổi lịch trình cá nhân*), sau đó bấm **"Xác nhận hủy vé"**.
5. Thông báo hủy vé thành công xuất hiện:
   - Trạng thái vé chuyển thành `CANCELLED`.
   - Ghế tương ứng trên chuyến xe lập tức được trả lại thành `AVAILABLE` để khách hàng khác có thể đặt.
   - Nếu bạn mang mã vé này sang trang **"Soát vé QR"** để kiểm tra, hệ thống sẽ cảnh báo ngay: **"VÉ ĐÃ BỊ HỦY - KHÔNG CÓ HIỆU LỰC LÊN XE"**.

---

### 👤 Kịch bản 6: Trung tâm Cá nhân (User Dashboard)
1. Nhấp vào mục **"Vé của tôi"** trên thanh Header (`http://localhost:5173/dashboard`).
2. Xem toàn bộ danh sách vé đã mua của bạn, trạng thái của từng vé (`PAID`, `USED`, `CANCELLED`).
3. Dễ dàng xem lại mã QR hoặc in lại vé xe bất kỳ lúc nào.
4. Chuyển sang tab **"Thẻ Vé Tháng"** để xem và theo dõi hạn sử dụng thẻ xe buýt tháng.

---

### 🎫 Kịch bản 7: Đăng Ký, Gia Hạn & Soát Thẻ Vé Tháng Điện Tử (US16)
1. Nhấp vào mục **"Vé tháng"** trên thanh menu Header (`http://localhost:5173/monthly-pass`).
2. **Đăng ký thẻ vé tháng mới:**
   - Chọn tuyến xe (ví dụ: `Hà Nội - Thái Nguyên`).
   - Chọn gói kỳ hạn mong muốn:
     - Gói 1 Tháng (30 ngày)
     - Gói 3 Tháng (Tiết kiệm 8%)
     - Gói 6 Tháng (Ưu đãi 15%)
     - Gói 1 Năm (Siêu tiết kiệm 25%)
   - Điền thông tin chủ thẻ (Họ tên, CCCD/Mã SV). Nếu chọn đối tượng `Học sinh / Sinh viên` hoặc `Người cao tuổi`, hệ thống sẽ tự động giảm thêm **20%** cước phí.
   - Chọn cổng thanh toán (MoMo, VNPay, ZaloPay hoặc VietQR) và bấm **"Thanh Toán & Kích Hoạt Thẻ"**.
3. **Quản lý & Sử dụng Thẻ Vé Tháng:**
   - Hệ thống tự động chuyển sang tab **"Thẻ Của Tôi"** và mở popup Mã QR vé tháng.
   - Thẻ hiển thị giao diện Smart Transit Card sang trọng, có chip điện tử mô phỏng, tên chặng, thời hạn, đếm ngược số ngày còn lại và badge `CÒN HẠN`.
   - Bấm **"Gia Hạn Thẻ"** để gia hạn thêm 1, 3, 6 hoặc 12 tháng: Hệ thống tự động cộng dồn thời hạn tiếp theo mà không làm gián đoạn quyền lợi của khách hàng.
4. **Tài xế Soát Thẻ Vé Tháng (US08 & US16):**
   - Vào trang **"Soát vé (Tài xế)"** (`http://localhost:5173/verify-ticket`).
   - Nhập mã thẻ vé tháng (ví dụ: `PASS:1` hoặc `PASS-0001`) và bấm kiểm tra:
   - Hệ thống xác nhận ngay: **"Thẻ vé tháng HỢP LỆ! Tuyến: Hà Nội - Thái Nguyên (Còn X ngày sử dụng)"** và hiển thị thông tin chủ thẻ, cho phép khách lên xe tự do.

---

## 📋 4. Bảng Dữ Liệu Mẫu & Tài Khoản Demo (Cheat Sheet)

Để giúp việc kiểm thử và đánh giá diễn ra nhanh chóng, hệ thống đã nạp sẵn các dữ liệu sau:

### 🔑 Bảng 4 Actor Phân Quyền Độc Lập (RBAC)
| Actor | Vai trò hệ thống | Email đăng nhập | Mật khẩu | Đặc quyền & Nghiệp vụ |
|:---:|:---|:---|:---:|:---|
| **1** | **Hành khách (`HanhKhach`)** | `customer@example.com`<br>`nguyenvana@gmail.com` | `123456` | Tra cứu chuyến, đặt vé, chọn ghế, áp mã giảm giá HSSV (-20%), xem vé sắp tới và **lịch sử chuyến xe đã đi trong quá khứ**. Bị chặn 403 khi vào trang Soát vé/Admin. |
| **2** | **Tài xế (`TaiXe`)** | `taixe.nguyen@smartbus.vn` | `123456` | Xem lịch trình phân công, **danh sách hành khách lên xe (Passenger Manifest)**, soát vé mã QR tại cửa xe, xác nhận check-in lên xe (`boardPassenger`). |
| **3** | **Phụ xe / Bán vé (`PhuXe`)** | `nhanvien@smartbus.vn` | `123456` | Soát vé QR, bán vé bổ sung tại bến, kiểm tra thẻ vé tháng. Bị chặn truy cập trang Quản trị. |
| **4** | **Quản trị viên (`Admin`)** | `admin@smartbus.vn` | `123456` | **Toàn quyền hệ thống**: Phân quyền trực tiếp cho 4 actor (`PUT /api/v1/admin/users/{id}/role`), thống kê KPI doanh thu, điều phối chuyến xe và giá vé. |

---

### 🎟️ Danh sách Mã giảm giá khả dụng (Vouchers - BE4)
| Mã Voucher | Loại chiết khấu | Mức giảm | Đơn hàng tối thiểu | Mô tả |
|:---:|:---:|:---:|:---:|:---|
| **`CHAO20`** | Phần trăm (%) | **Giảm 20%** (tối đa 50.000đ) | 0 VNĐ | Dành tặng khách hàng lần đầu đặt vé |
| **`BUS50`** | Cố định (VNĐ) | **Giảm 50.000 VNĐ** | 100.000 VNĐ | Ưu đãi khuyến mãi du lịch thả ga |
| **`GIAM10K`** | Cố định (VNĐ) | **Giảm 10.000 VNĐ** | 0 VNĐ | Ưu đãi tiện lợi áp dụng cho mọi chuyến xe |
| **`VIP15`** | Phần trăm (%) | **Giảm 15%** (tối đa 60.000đ) | 100.000 VNĐ | Tri ân hành khách thân thiết VIP |

---

### 🎫 Tuyến trọng điểm: Hồ Chí Minh ➔ Đà Lạt (8 Chuyến/Ngày)
| Mã Chuyến | Giờ Xuất Bến | Dòng Xe | Biển Số | Giá Vé | Ghế Trống |
|:---:|:---:|:---|:---:|:---:|:---:|
| `TRIP-HCM-DL-01` | **06:00** | Limousine 34 Phòng | `51B-888.99` | 280.000 VNĐ | 28/34 |
| `TRIP-HCM-DL-02` | **08:00** | Giường nằm Luxury | `51B-999.11` | 260.000 VNĐ | 30/34 |
| `TRIP-HCM-DL-03` | **10:15** | Limousine 34 Phòng | `51B-777.22` | 280.000 VNĐ | 32/34 |
| `TRIP-HCM-DL-04` | **13:00** | Giường nằm Luxury | `51B-666.33` | 260.000 VNĐ | 29/34 |
| `TRIP-HCM-DL-05` | **15:30** | Limousine 34 Phòng | `51B-555.44` | 280.000 VNĐ | 31/34 |
| `TRIP-HCM-DL-06` | **18:00** | Royal Cabin VIP | `51B-444.55` | 320.000 VNĐ | 26/34 |
| `TRIP-HCM-DL-07` | **21:00** | Royal Cabin VIP (Chuyến đêm) | `51B-333.66` | 320.000 VNĐ | 27/34 |
| `TRIP-HCM-DL-08` | **23:30** | Royal Cabin VIP (Chuyến đêm) | `51B-222.77` | 320.000 VNĐ | 25/34 |

---

### 🎫 Mã vé nạp sẵn để test Soát vé & Quá khứ
| Mã Vé | Tuyến Đường | Số Ghế | Giá Vé | Phân Loại | Trạng Thái Ban Đầu |
|:---:|:---|:---:|:---:|:---:|:---:|
| **`TKT-HCM-DL-01`** | Hồ Chí Minh → Đà Lạt | `A05` | 280.000 VNĐ | Sắp khởi hành (Hôm nay) | `PAID` (Sẵn sàng test soát vé & lên xe) |
| **`TKT-PAST-01`** | Hà Nội → Thái Nguyên | `A02` | 120.000 VNĐ | **Vé Quá Khứ (Lịch sử)** | `COMPLETED` (Đã đi, có trong Tab Lịch sử) |
| **`TKT-PAST-02`** | Hồ Chí Minh → Đà Lạt | `B04` | 280.000 VNĐ | **Vé Quá Khứ (Lịch sử)** | `USED` (Đã đi ngày hôm qua) |
| **`TICKET-001`** | Hà Nội → Đà Nẵng | `A01` | 450.000 VNĐ | Vé Quá Khứ | `PAID` |

---

### 💳 Thông tin thẻ Test Cổng VNPay Sandbox
Khi chọn thanh toán qua cổng **VNPay Sandbox**, bạn có thể sử dụng thông tin thẻ thử nghiệm chính thức từ VNPay:
- **Ngân hàng:** `NCB` (Ngân hàng Quốc Dân)
- **Số thẻ:** `9704198526191432198`
- **Tên chủ thẻ:** `NGUYEN VAN A`
- **Ngày phát hành:** `07/15`
- **Mã OTP xác thực:** `123456`

---

## 🏗️ 5. Kiến Trúc Hệ Thống & Công Nghệ Sử Dụng

```mermaid
flowchart TD
    subgraph Client["Lớp Giao Diện (Frontend - React Vite)"]
        UI_Home["Trang chủ & Tra cứu"]
        UI_Seat["Sơ đồ ghế 2 tầng & Giữ chỗ"]
        UI_Pay["Form Thanh toán & Voucher"]
        UI_Verify["Soát vé QR & Boarding"]
        UI_Cancel["Tra cứu & Hủy vé Online"]
        UI_Map["Bản đồ GPS Leaflet"]
    end

    subgraph API_Gateway["Lớp API & Nghiệp Vụ (Backend - FastAPI)"]
        API_Trips["Quản lý Chuyến & Tuyến"]
        API_Lock["Cronjob Giữ ghế 10p (APScheduler)"]
        API_Payment["Xử lý Cổng TT (VNPay / ZaloPay)"]
        API_Promotion["Bộ tính Voucher & Phí (BE4)"]
        API_Notif["Dịch vụ Email SMTP & SMS (US20)"]
        API_Boarding["Nghiệp vụ Soát vé Check-in (US24)"]
    end

    subgraph Data_Layer["Lớp Cơ Sở Dữ Liệu (Dual-Engine)"]
        DB_Router{"Dual-Engine Selector"}
        DB_SQLite[("SQLite 3 (bus_booking.db) - Mặc định")]
        DB_MySQL[("MySQL 8.0+ (smart_bus_ticketing) - Doanh nghiệp")]
    end

    Client -->|HTTP RESTful API & JSON| API_Gateway
    API_Gateway --> DB_Router
    DB_Router -->|Fallback không cấu hình| DB_SQLite
    DB_Router -->|Khi có DATABASE_URL| DB_MySQL
```

### 💻 Bảng Công Nghệ (Tech Stack):
| Thành phần | Công nghệ / Thư viện | Vai trò trong hệ sinh thái |
|:---|:---|:---|
| **Backend Core** | **Python 3.12 + FastAPI** | Khung API bất đồng bộ hiệu năng cao, tự động sinh Swagger |
| **API Validation** | **Pydantic v2** | Xác thực schema dữ liệu đầu vào chặt chẽ |
| **Server Engine** | **Uvicorn (ASGI)** | Máy chủ ứng dụng chạy Backend siêu nhanh |
| **Background Cron** | **APScheduler** | Xử lý tác vụ nền tự động nhả ghế quá hạn 10 phút |
| **Mã hóa Bảo mật** | **Cryptography** | Tạo và kiểm tra chữ ký số HMAC-SHA512 (VNPay) & HMAC-SHA256 (ZaloPay) |
| **Hệ thống Email** | **smtplib + email.mime** | Soạn thảo và gửi Email HTML hóa đơn vé thật qua Gmail SMTP |
| **Frontend Core** | **React 19 + Vite** | Khởi tạo ứng dụng web đơn trang SPA tốc độ cao |
| **Điều hướng** | **React Router v7** | Quản lý chuyển trang mượt mà không reload |
| **Bản đồ số** | **Leaflet + OpenStreetMap** | Bản đồ mạng lưới tuyến đường và trạm dừng GPS |
| **Mã QR Code** | **qrcode + canvas** | Sinh mã QR động cho từng vé xe tức thì |
| **Giao diện & Icon**| **Lucide Icons + CSS Modern** | Thiết kế UI hiện đại, responsive trên mọi thiết bị |
| **Cơ sở dữ liệu** | **Dual-Engine (SQLite + MySQL)** | Linh hoạt chuyển đổi giữa môi trường demo và sản phẩm |

---

## 🗄️ 6. Cơ Sở Dữ Liệu & Chuyển Đổi Lên MySQL

### 📊 Lược đồ Thực thể Liên kết (ERD 18 Bảng Chuẩn Hóa)
Toàn bộ cấu trúc CSDL được định nghĩa tại **[`schema_mysql.sql`](schema_mysql.sql)**:

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

### 📋 18 Bảng Dữ Liệu Chi Tiết:
1. `users`: Tài khoản khách hàng, tài xế, quản trị viên và loại đối tượng ưu đãi (HSSV).
2. `routes`: Tuyến xe buýt nội tỉnh và liên tỉnh (TP.HCM - Đà Lạt, Hà Nội - Thái Nguyên...).
3. `bus_stops`: Danh mục các trạm dừng đón/trả khách kèm tọa độ GPS thực tế.
4. `route_stop_details`: Thứ tự trạm dừng và cự ly (km) cho từng tuyến xe.
5. `buses`: Danh sách phương tiện, biển số xe, loại xe (Limousine, Giường nằm) và định vị GPS.
6. `trips`: Các chuyến xe theo lịch khởi hành, tài xế phụ trách, giá vé cơ bản.
7. `seats`: 36 ghế/chuyến chia đều Tầng Dưới (A01 - A18) và Tầng Trên (B01 - B18).
8. `vouchers`: Danh sách mã giảm giá, mức giảm, thời hạn và đơn hàng tối thiểu (BE4).
9. `fees`: Các loại phí dịch vụ bến bãi, bảo hiểm du lịch hành khách (BE4).
10. `bookings`: Đơn đặt vé tổng hợp kèm tổng tiền và trạng thái đơn hàng.
11. `booking_items`: Chi tiết từng ghế và thông tin hành khách ngồi trên ghế.
12. `payments`: Lịch sử giao dịch thanh toán (SANDBOX, VNPAY, ZALOPAY, MOMO).
13. `tickets`: Vé điện tử chính thức, mã vé `TKT-xxxx`, QR Payload, trạng thái `PAID`/`USED`/`CANCELLED`.
14. `demo_tickets`: Bảng tương thích cho các kịch bản demo sandbox.
15. `ticket_inspections`: Nhật ký kiểm soát vé lên xe của tài xế (Boarding Log).
16. `notifications`: Lịch sử gửi thông báo xác nhận đặt vé (Email/SMS/In-app).
17. `monthly_passes`: Quản lý vé tháng xe buýt thông minh.
18. `incident_reports` & `feedbacks`: Báo cáo sự cố kỹ thuật và đánh giá chuyến đi 1-5 sao.

---

### 🔄 Hướng dẫn Di chuyển Dữ liệu sang MySQL 8.0+

Hệ thống hỗ trợ kiến trúc **Dual-Engine**:
- Mặc định sử dụng SQLite tại `data/bus_booking.db` (không cần cài đặt gì thêm, tải về là chạy ngay).
- Khi muốn chạy với MySQL Server:

#### Cách 1: Chạy công cụ di chuyển dữ liệu tự động (Khuyên dùng)
Đảm bảo dịch vụ MySQL trên máy đang chạy, sau đó gõ lệnh:
```powershell
python migrate_to_mysql.py --host localhost --port 3306 --user root --password your_password --db smart_bus_ticketing
```
> Script sẽ tự động:
> 1. Tạo cơ sở dữ liệu `smart_bus_ticketing` với bảng mã `utf8mb4`.
> 2. Thực thi toàn bộ cấu trúc 18 bảng từ `schema_mysql.sql`.
> 3. Di chuyển và sao chép toàn vẹn 100% dữ liệu từ SQLite sang MySQL.
> 4. Xác minh đối soát số lượng bản ghi của toàn bộ 18 bảng.

#### Cách 2: Khởi động Backend kết nối MySQL
Sau khi đã import MySQL, chỉ cần thiết lập biến môi trường và chạy server:
```powershell
# Windows PowerShell:
$env:DATABASE_URL="mysql+pymysql://root:your_password@localhost:3306/smart_bus_ticketing"
python main.py

# Hoặc Windows CMD:
set DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/smart_bus_ticketing
python main.py
```

---

## 🔌 7. Danh Mục RESTful API (Sprint 1 & Sprint 2)

Hệ thống cung cấp đầy đủ các nhóm API theo chuẩn RESTful. Bạn có thể thử nghiệm trực tiếp tại Swagger UI: `http://127.0.0.1:8000/docs`.

### 🚌 1. Chuyến Xe & Sơ Đồ Ghế (Trips & Seats)
| Method | Endpoint | Mô Tả | User Story |
|:---:|:---|:---|:---:|
| `GET` | `/api/v1/trips` | Tra cứu danh sách chuyến xe theo điểm đi, điểm đến, ngày | **US01** |
| `GET` | `/api/v1/trips/{trip_id}` | Xem thông tin chi tiết một chuyến xe | **US01** |
| `GET` | `/api/v1/trips/{trip_id}/seats` | Lấy sơ đồ 36 ghế (Dãy A & B) và trạng thái hiện tại | **US02** |
| `POST` | `/api/v1/trips/{trip_id}/hold-seats` | Tạm giữ ghế trong 10 phút kèm kiểm tra xung đột | **US03** |

### 💳 2. Đặt Vé & Cổng Thanh Toán (Payments & Gateways)
| Method | Endpoint | Mô Tả | User Story |
|:---:|:---|:---|:---:|
| `POST` | `/api/v1/payments/create-order` | Tạo đơn hàng đặt vé tổng hợp & xuất vé điện tử | **US05** |
| `POST` | `/api/v1/payments/vnpay/create` | Tạo URL thanh toán qua VNPay với mã HMAC-SHA512 | **US17** |
| `GET` | `/api/v1/payments/vnpay/ipn` | Webhook IPN xử lý kết quả giao dịch VNPay bất đồng bộ | **US18** |
| `GET` | `/api/v1/payments/vnpay/return` | Điều hướng người dùng quay lại web sau khi thanh toán VNPay | **US18** |
| `POST` | `/api/v1/payments/zalopay/create` | Khởi tạo đơn hàng thanh toán qua cổng ZaloPay | **US17** |
| `POST` | `/api/v1/payments/zalopay/callback` | Webhook Callback ZaloPay xác thực chữ ký MAC SHA256 | **US18** |
| `GET` | `/api/v1/payments/{transaction_code}` | Tra cứu trạng thái giao dịch thanh toán | **US05** |

### 🎁 3. Khuyến Mãi & Phí Dịch Vụ (Vouchers & Fees - BE4)
| Method | Endpoint | Mô Tả | User Story |
|:---:|:---|:---|:---:|
| `GET` | `/api/v1/vouchers` | Lấy danh sách các mã giảm giá đang hoạt động | **BE4** |
| `POST` | `/api/v1/vouchers/apply` | Kiểm tra điều kiện và áp dụng mã Voucher vào đơn hàng | **BE4** |
| `GET` | `/api/v1/fees` | Lấy danh sách phụ phí dịch vụ (bảo hiểm, tiện ích bến bãi) | **BE4** |
| `POST` | `/api/v1/fees/calculate` | Tính toán chính xác tổng phụ phí dịch vụ cho chuyến đi | **BE4** |

### 🎫 4. Vé Điện Tử & Soát Vé Lên Xe (Tickets & Boarding)
| Method | Endpoint | Mô Tả | User Story |
|:---:|:---|:---|:---:|
| `GET` | `/api/v1/tickets` | Danh sách vé của người dùng (kèm phân trang, lọc) | **US06** |
| `GET` | `/api/v1/tickets/code/{code}` | Tra cứu chi tiết vé theo mã vé (VD: `TKT-8892`) | **US06** |
| `GET` | `/api/v1/tickets/{ticket_id}/qr` | Sinh ảnh mã QR động trực tiếp từ server | **US06** |
| `POST` | `/api/v1/tickets/verify` | Soát vé bằng mã QR (dành cho tài xế/nhân viên) | **US08** |
| `POST` | `/api/v1/tickets/boarding` | Xác nhận hành khách lên xe, đổi trạng thái vé sang `USED` | **US24** |
| `GET` | `/api/v1/tickets/{code}/boarding` | Tra cứu lịch sử và trạng thái lên xe của vé | **US24** |
| `GET` | `/api/v1/inspections/recent` | Lấy danh sách các lượt soát vé gần đây nhất | **US08** |

### 🔄 5. Hủy Vé, Đổi Ghế & Thông Báo
| Method | Endpoint | Mô Tả | User Story |
|:---:|:---|:---|:---:|
| `POST` | `/api/v1/tickets/{ticket_id}/cancel` | Hủy vé trực tuyến, hoàn trả ghế trống về chuyến xe | **US07 / US25** |
| `POST` | `/api/v1/tickets/{ticket_id}/change-seat` | Đổi chỗ ngồi sang vị trí ghế trống khác | **US07** |
| `GET` | `/api/v1/notifications` | Lấy danh sách thông báo gửi Email, SMS và In-app | **US20** |
| `GET` | `/api/v1/map/overview` | Lấy toàn bộ danh sách tuyến đường, trạm GPS và xe chạy | **Smart Map** |

### 🪪 6. Thẻ Vé Tháng Điện Tử (Monthly Passes - US16)
| Method | Endpoint | Mô Tả | User Story |
|:---:|:---|:---|:---:|
| `GET` | `/api/v1/monthly-passes/plans` | Danh sách gói cước vé tháng (1, 3, 6, 12 tháng) & chính sách giảm giá | **US16** |
| `GET` | `/api/v1/monthly-passes` | Lấy danh sách thẻ vé tháng của người dùng (kèm hạn dùng, ngày còn lại) | **US16** |
| `GET` | `/api/v1/monthly-passes/user/{user_id}` | Tra cứu danh sách thẻ vé tháng theo ID người dùng | **US16** |
| `GET` | `/api/v1/monthly-passes/{id}` | Lấy chi tiết thẻ vé tháng điện tử | **US16** |
| `POST` | `/api/v1/monthly-passes/register` | Đăng ký thẻ mới hoặc gia hạn thẻ cũ (tự động cộng dồn thời hạn) | **US16** |

---

## 🧪 8. Kiểm Thử Tự Động Toàn Diện (Unit Tests)

Dự án sở hữu bộ kiểm thử tự động toàn diện bao phủ 100% các chức năng cốt lõi của Sprint 1, Sprint 2 và Sprint 2 mở rộng (US16).

### 🏃 Lệnh chạy kiểm thử:
```powershell
pytest
# Hoặc chạy bằng unittest:
python -m unittest discover -s . -p "test_*.py" -v
```

### 📊 Kết quả kiểm thử: **44/44 Test Cases Passed (100% OK)**
```text
BE1_zalo_vnpay\tests\test_payment.py ...                                  [  6%]
test_api.py .....                                                        [ 18%]
test_boarding_api.py .......                                             [ 34%]
test_database.py .                                                       [ 36%]
test_monthly_pass.py ........                                            [ 54%]
test_qr_api.py ........                                                  [ 72%]
test_sprint2_api.py ......                                               [ 86%]
test_ticket_changes.py ......                                            [100%]

======================= 44 passed, 3 warnings in ~4.9s (100% OK) =======================
```

---

## ⚙️ 9. Cấu Hình Biến Môi Trường (.env)

Tất cả các cấu hình nhạy cảm đều có thể tùy biến thông qua tệp `.env` tại thư mục gốc:

```ini
# ==========================================
# CẤU HÌNH CƠ SỞ DỮ LIỆU
# ==========================================
# Để trống nếu muốn dùng SQLite mặc định (bus_booking.db)
# Hoặc cung cấp chuỗi kết nối MySQL:
# DATABASE_URL=mysql+pymysql://root:password@localhost:3306/smart_bus_ticketing

# ==========================================
# CẤU HÌNH CỔNG THANH TOÁN VNPAY (SANDBOX)
# ==========================================
VNPAY_TMN_CODE=YOUR_TMN_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:8000/api/v1/payments/vnpay/return

# ==========================================
# CẤU HÌNH CỔNG THANH TOÁN ZALOPAY (SANDBOX)
# ==========================================
ZALOPAY_APP_ID=YOUR_APP_ID
ZALOPAY_KEY1=YOUR_KEY1
ZALOPAY_KEY2=YOUR_KEY2
ZALOPAY_BASE_URL=https://sb-openapi.zalopay.vn/v2
ZALOPAY_CALLBACK_URL=http://localhost:8000/api/v1/payments/zalopay/callback

# ==========================================
# CẤU HÌNH EMAIL SMTP GMAIL (GỬI VÉ THẬT)
# ==========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=busticketingduan@gmail.com
SMTP_PASSWORD=wrykoqvwkzlcxbpx
```

---

## 📂 10. Cấu Trúc Thư Mục Dự Án

```text
Project_TTCS_K7S3_N1_BusTicketing/
│
├── start_project.bat              # Script 1-Click khởi chạy toàn bộ Backend & Frontend
├── main.py                        # Điểm khởi chạy chính của Backend FastAPI + APScheduler
├── api.py                         # Module định nghĩa tập hợp toàn bộ RESTful API của hệ thống
├── database.py                    # Trình quản lý Dual-Engine Database (SQLite / MySQL)
├── seed_data.py                   # Script khởi tạo CSDL mẫu (Chuyến, Ghế, Trạm GPS, Vouchers)
├── schema_mysql.sql               # File DDL 18 bảng chuẩn hóa dành cho MySQL 8.0+
├── migrate_to_mysql.py            # Công cụ CLI di chuyển dữ liệu tự động sang MySQL
├── notification.py                # Dịch vụ gửi Email HTML hóa đơn vé thật & Mock SMS Gateway
├── boarding_api.py                # Xử lý nghiệp vụ Soát vé & Check-in hành khách lên xe (US24)
├── qr_api.py                      # Dịch vụ sinh và kiểm tra tính hợp lệ của mã QR code
├── ticket_changes.py              # Xử lý quy tắc nghiệp vụ Tra cứu vé, Hủy vé & Đổi ghế
├── requirements.txt               # Danh sách thư viện Python cần thiết
│
├── BE1_zalo_vnpay/                # Phân hệ Cổng thanh toán VNPay & ZaloPay (US17, US18)
│   └── app/
│       ├── config.py              # Tham số cấu hình cổng thanh toán
│       └── payment_gateway.py     # Thuật toán chữ ký số HMAC-SHA512 & HMAC-SHA256
│
├── BE4_Voucher_Fee/               # Phân hệ Mã khuyến mãi & Phí dịch vụ (BE4)
│
├── data/
│   └── bus_booking.db             # File cơ sở dữ liệu SQLite mặc định (Zero-config)
│
├── ve-xe-frontend/                # Ứng dụng Web Frontend (React + Vite + Leaflet)
│   ├── package.json               # Cấu hình phụ thuộc Node.js (React 19, Leaflet, Router)
│   ├── vite.config.js             # Cấu hình máy chủ Vite
│   └── src/
│       ├── App.jsx                # Khai báo bộ định tuyến Router chính của ứng dụng
│       ├── api.js                 # Lớp gọi API tập trung kết nối Backend
│       ├── components/            # Các thành phần giao diện dùng chung
│       │   ├── Header.jsx         # Thanh điều hướng Navbar + Notification Bell unread
│       │   ├── Footer.jsx         # Chân trang thông tin dự án
│       │   ├── CountdownTimer.jsx # Bộ đếm ngược thời gian giữ ghế 10 phút
│       │   ├── PaymentForm.jsx    # Form thanh toán, nhập Voucher & tính phí tiện ích
│       │   └── PrintableTicket.jsx# Thẻ vé điện tử in trực tiếp kèm QR Code động
│       └── pages/                 # Các trang màn hình chính
│           ├── HomePage.jsx       # Trang chủ tìm kiếm chuyến xe
│           ├── BusListPage.jsx    # Sơ đồ chọn ghế 2 tầng & giữ ghế thời gian thực
│           ├── PaymentPage.jsx    # Trang xử lý thanh toán
│           ├── PaymentResultPage.jsx # Trang chi tiết kết quả thanh toán & xuất vé
│           ├── TicketVerification.jsx# Trang soát vé QR dành cho tài xế / phụ xe
│           ├── TicketCancellation.jsx# Trang tra cứu vé & hủy vé trực tuyến
│           ├── MapPage.jsx        # Bản đồ số GPS mạng lưới trạm dừng & xe buýt
│           ├── UserDashboard.jsx  # Trung tâm quản lý vé cá nhân
│           ├── LoginPage.jsx      # Đăng nhập tài khoản
│           └── RegisterPage.jsx   # Đăng ký tài khoản (Khách hàng / HSSV)
│
└── test_*.py                      # Bộ 33 Unit Tests tự động kiểm thử toàn diện hệ thống
```

---

## ❓ 11. Khắc Phục Sự Cố Thường Gặp (FAQ)

### Q1: Nhấp vào `start_project.bat` nhưng cửa sổ bị tắt ngay lập tức?
> **Khắc phục:** Nguyên nhân thường do máy tính của bạn chưa cài đặt Python hoặc Node.js vào biến môi trường PATH.  
> Hãy mở PowerShell và kiểm tra:
> ```powershell
> python --version
> node --version
> ```
> Nếu chưa có, vui lòng cài đặt [Python 3.12](https://www.python.org/) (nhớ tick chọn *"Add python.exe to PATH"*) và [Node.js LTS](https://nodejs.org/).

### Q2: Bị báo lỗi Port 8000 hoặc Port 5173 đang bị chiếm dụng (Address already in use)?
> **Khắc phục:** Do phiên chạy trước chưa được tắt hoàn toàn. Bạn có thể giải phóng cổng nhanh bằng lệnh:
> ```powershell
> # Giải phóng cổng 8000:
> netstat -ano | findstr :8000
> taskkill /PID <PID_tìm_thấy> /F
>
> # Hoặc khởi động Uvicorn ở cổng khác:
> uvicorn main:app --port 8001 --reload
> ```

### Q3: Tôi không có MySQL trên máy, hệ thống có chạy được không?
> **Khắc phục:** **HOÀN TOÀN ĐƯỢC!** Hệ thống được thiết kế với kiến trúc **Dual-Engine**. Nếu không thiết lập `DATABASE_URL`, hệ thống sẽ tự động sử dụng SQLite tại `data/bus_booking.db` với đầy đủ 100% dữ liệu mẫu, không cần cài bất kỳ phần mềm CSDL nào khác.

### Q4: Email thông báo có thực sự gửi đến hộp thư người dùng không?
> **Khắc phục:** **CÓ!** Hệ thống tích hợp tài khoản Gmail SMTP thật (`busticketingduan@gmail.com`). Khi đặt vé thành công và nhập email chính xác (hoặc email của bạn), hệ thống sẽ gửi trực tiếp hóa đơn vé HTML vào hộp thư đến (inbox).

### Q5: Làm sao để reset lại toàn bộ dữ liệu mẫu ban đầu nếu test thử làm bẩn CSDL?
> **Khắc phục:** Bạn chỉ cần chạy lại lệnh nạp dữ liệu:
> ```powershell
> python seed_data.py
> ```
> CSDL sẽ tự động được dọn dẹp và khôi phục về trạng thái chuẩn ban đầu.

---

## 👥 12. Đội Ngũ Thực Hiện & Phân Chia Vai Trò (Nhóm 01)

| STT | Thành Viên / Luồng | Vai Trò | Nhiệm Vụ Trọng Tâm Sprint 2 |
|:---:|:---|:---|:---|
| 1 | **Leader (Gia Bảo)** | Quản lý dự án & Kiến trúc sư | Hợp nhất toàn bộ nhánh nguồn Git (`US16: Vé tháng`, `Sprint 2`), thiết kế kiến trúc Dual-Engine (MySQL + SQLite), chuẩn hóa chuẩn dữ liệu 18 bảng, xây dựng giao diện Thẻ vé tháng (`MonthlyPassPage.jsx`), bộ 44 unit tests và hoàn thiện tài liệu hướng dẫn. |
| 2 | **Backend 1** | Backend Engineer | Tích hợp Cổng thanh toán ZaloPay & VNPay: Mã hóa HMAC-SHA256, HMAC-SHA512, tạo URL thanh toán (**US17**), Webhook IPN & Return URL (**US18**). |
| 3 | **Backend 2** | Backend Engineer | Hệ thống Thông báo đa kênh (**US20**): Gửi Email HTML hóa đơn vé thật qua Gmail SMTP, SMS Gateway Mock và Notification in-app. |
| 4 | **Backend 3** | Backend Engineer | API Soát vé bằng mã QR (**US08**) và Nghiệp vụ ghi nhận hành khách lên xe (**US24** - Boarding API). |
| 5 | **Backend 4** | Backend Engineer | Quản lý Mã giảm giá (Vouchers) và Phí dịch vụ (Service Fees - **BE4**): Tính toán chiết khấu %, chiết khấu cố định, phụ phí tiện ích bến bãi. |
| 6 | **Frontend 1** | Frontend Engineer | Thiết kế Trang Kết quả thanh toán chi tiết (**US26** - `PaymentResultPage.jsx`) hiển thị mã giao dịch, vé xe và nút điều hướng. |
| 7 | **Frontend 2** | Frontend Engineer | Xây dựng Giao diện Tra cứu vé, Hủy vé trực tuyến và Chính sách hoàn tiền 100% (**US25** - `TicketCancellation.jsx`). |
| 8 | **Frontend 3** | Frontend Engineer | Tích hợp thành phần nhập Voucher trực tiếp trên Form thanh toán và Thẻ vé điện tử in trực tiếp (`PrintableTicket.jsx`). |
| 9 | **Frontend 4** | Frontend Engineer | Thiết kế Chuông thông báo Notification Bell trên Navbar với unread badge và Dropdown xem tin tức thời. |
| 10 | **QA - Tester** | Kiểm thử phần mềm | Xây dựng và duy trì bộ kiểm thử tự động 44 tests kiểm tra toàn diện luồng nghiệp vụ hệ thống (bao gồm 8 tests chuyên biệt cho Vé tháng US16). |

---

<p align="center">
  <b>© 2026 Nhóm 01 — Dự Án Hệ Thống Đặt Vé Xe Buýt Thông Minh (Smart Bus Ticketing).</b><br>
  <i>Được phát triển với niềm đam mê công nghệ và tinh thần đồng đội xuất sắc.</i>
</p>
