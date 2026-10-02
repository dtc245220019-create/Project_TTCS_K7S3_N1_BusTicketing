# Backend S2 — API soát vé QR

API riêng, không chỉnh sửa backend/frontend gốc. Dùng chung schema trong
`D:\Thực tập\Project_TTCS_K7S3_N1_BusTicketing\database.py` và SQLite tại
`D:\Thực tập\Project_TTCS_K7S3_N1_BusTicketing\data\bus_booking.db`.
Không tự seed hoặc xóa dữ liệu. Chạy backend gốc để có dữ liệu demo nếu cần.

## Chạy

```powershell
python "D:\Thực tập\Project_TTCS_K7S3_N1_BusTicketing\backendS2\backend 1\qr_api.py"
```

Swagger: http://127.0.0.1:8000/docs
Môi trường cần FastAPI, Pydantic 2, Uvicorn, SQLAlchemy (database gốc import ORM).
Test cần thêm httpx. Không cần thư viện đọc ảnh QR: camera/frontend giải mã QR
thành chuỗi rồi gửi API; API không nhận ảnh hoặc trực tiếp truy cập camera.

## POST /api/v1/tickets/verify

```json
{
  "qr_payload": "ticket:TICKET-001",
  "staff_user_id": 2,
  "trip_id": 1
}
```

- Có thể dùng `ticket_code` thay `qr_payload`.
- Nhận mã vé thuần, `ticket:mã-vé`, `SMARTBUS|mã-vé|...` từ giao diện cũ.
- Cung cấp ID nhân viên hoặc `staff_email`; nếu cung cấp cả hai phải khớp.
- `trip_id` tùy chọn để kiểm tra đúng chuyến.
- Chỉ tin dữ liệu database, không tin hành khách/ghế/lộ trình trong QR.
- Vai trò: STAFF/ADMIN (nhà xe/quản trị), DRIVER/TaiXe, CONDUCTOR/PhuXe.
- Tài xế chỉ soát chuyến được phân công nếu chuyến có driver_id.
- Vé thật cần trạng thái PAID/DaThanhToan, đơn hàng PAID (nếu có) và giao dịch SUCCESS.
- Vé trực tiếp không có liên kết đơn/thanh toán sẽ không được chấp nhận.
- Hỗ trợ demo_tickets như dự án gốc, nhưng không bịa thông tin hành khách cho vé demo-only.
- Vé hợp lệ được đánh dấu USED và ghi used_at. BEGIN IMMEDIATE chống chấp nhận trùng
  khi hai request API mới chạy đồng thời. Backend cũ vẫn cần cơ chế khóa tương tự
  nếu chạy song song endpoint soát vé cũ.

Kết quả giữ các trường giao diện gốc: valid, result, reason, message,
ticket_code, details (customer, route, seat, time); thêm reason_code,
inspection_id, inspected_at, staff_user_id.

`result`: VALID, ALREADY_USED, CANCELLED, UNPAID, INVALID (đúng CHECK constraint gốc).
`reason_code` phân biệt NOT_FOUND, EXPIRED, TRIP_UNAVAILABLE, WRONG_TRIP, WRONG_DRIVER.
Lỗi nghiệp vụ trả HTTP 200 với valid=false; lỗi input 422, nhân viên không tồn tại 404,
không có quyền 403. Mọi kết quả nghiệp vụ được ghi ticket_inspections.

## GET /api/v1/inspections/recent

Ví dụ: http://127.0.0.1:8000/api/v1/inspections/recent?staff_user_id=2&limit=10
STAFF/ADMIN xem toàn bộ nhật ký, tài xế/phụ xe chỉ xem nhật ký của mình.
Limit từ 1 đến 100. Yêu cầu ID/email nhân viên như endpoint POST.

## Kiểm thử

```powershell
python "D:\Thực tập\Project_TTCS_K7S3_N1_BusTicketing\backendS2\backend 1\test_qr_api.py"
```

Test dùng database tạm với schema/seed gốc, không seed database thật.

## Giới hạn và tích hợp

**Đây chưa phải xác thực đăng nhập an toàn:** ID/email trong request có thể bị giả mạo.
Token ngẫu nhiên của auth gốc chưa được lưu/xác minh. Trước production cần tích hợp
session/token đã xác thực và lấy staff từ phiên đăng nhập thay vì tin request.
Schema gốc không có bảng nhà xe/operator_id nên STAFF/ADMIN là vai trò quản lý chung,
chưa thể phân tách quyền giữa nhiều nhà xe.

API này chạy cổng 8000 để dùng cùng URL với frontend và backend gốc. Backend 1 và
backend 2 là hai app độc lập, không chạy đồng thời trên cùng cổng; hãy chạy đúng
app tương ứng với nghiệp vụ cần dùng.
Không kiểm tra ngày khởi hành so với đồng hồ (giữ hành vi demo gốc); chỉ chặn chuyến
CANCELLED/COMPLETED. QR gốc không có chữ ký hay thời hạn mật mã.