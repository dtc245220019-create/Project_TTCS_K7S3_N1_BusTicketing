# Backend 3 — QR, vé điện tử và hủy/đổi vé

Phần Backend 3, phụ trách US04 và US05.

## Chạy khởi tạo dữ liệu mẫu

```powershell
cd "D:\Thực tập\Backend\backend-3"
python seed_data.py
```

Lệnh tạo database tại `backend-3/data/backend_3.db`, tạo schema và nạp dữ liệu mẫu. Có thể chạy lại nhiều lần trong môi trường phát triển; dữ liệu mẫu sẽ được tạo lại.

## Dữ liệu mẫu

- `customer@example.com`: người đặt vé.
- `staff@example.com`: nhân viên soát vé.
- `admin@example.com`: quản trị viên.
- `BOOK-PAID-001` / `TICKET-001`: booking đã thanh toán, dùng để phát triển QR và soát vé.
- `BOOK-PENDING-001`: booking đang chờ thanh toán.
- Cổng thanh toán mẫu: `SANDBOX`.

## Các bảng hiện có

`users`, `trips`, `seats`, `bookings`, `booking_items`, `payments`, `tickets`, `ticket_inspections`.

## US05 — Hủy vé và đổi ghế

`ticket_changes.py` cung cấp `cancel_ticket(connection, ticket_code, user_id, now=...)`
và `change_seat(connection, ticket_code, user_id, new_seat_number, now=...)`.
Chỉ chủ vé đã thanh toán, chưa sử dụng được thao tác trước giờ khởi hành ít nhất 24 giờ.
Hủy hiện chỉ hỗ trợ booking một vé; **không tự hoàn tiền**. Đổi chỉ đổi ghế trong
cùng chuyến, không đổi giá hoặc cập nhật giao dịch thanh toán. Chưa có HTTP API/xác thực
người dùng; `user_id` phải lấy từ tầng xác thực tin cậy khi tích hợp.

Chạy test: `python -m unittest discover -s . -p "test_*.py" -v`.

## HTTP API thử nghiệm cho Frontend 3

`api.py` dùng FastAPI, Pydantic và Uvicorn (cần cài trong môi trường Python).
Chạy `python api.py` từ thư mục `backend-3`, API tại `http://127.0.0.1:8003/docs`.
Database được tạo khi khởi động nhưng **không tự seed**; chạy `python seed_data.py`
để thử với `user_id=1`, `staff_user_id=2`, vé `TICKET-001`.

- `GET /api/v1/tickets?user_id=1`: danh sách vé của khách.
- `GET /api/v1/tickets/code/TICKET-001?user_id=1`: tra cứu vé thuộc khách.
- `GET /api/v1/tickets/1/download?user_id=1`: trả dữ liệu JSON, **không phải PDF**.
- `POST /api/v1/tickets/1/cancel` body `{"user_id":1}`: hủy vé theo quy tắc US05, **không hoàn tiền**.
- `POST /api/v1/tickets/1/change-seat` body `{"user_id":1,"new_seat_number":"A02"}`.
- `POST /api/v1/tickets/verify` body `{"ticket_code":"TICKET-001","staff_user_id":2}`:
  ghi lịch sử kiểm tra ở Backend 3; lần quét hợp lệ đầu tiên chuyển vé thành `USED`, lần sau trả `ALREADY_USED`.
  QR có dạng `ticket:TICKET-001`; frontend cần tách mã vé trước khi gửi request.

Response vé dùng `ticket_id`, `ticket_code`, `booking_id`, `route_name`,
`departure_city`, `arrival_city`, `departure_time`, `arrival_time`, `seat_numbers`,
`price`, `status`, `qr_payload`. `PAID` được hiển thị thành `CONFIRMED` cho UI.
Mỗi ticket gắn với **một** booking item/ghế, không dùng QR chứa nhiều ghế như mock Frontend 3.
Frontend 3 hiện vẫn dùng mock, chưa có fetch thật. Không dùng mã vé hoặc `user_id`
do client tự nhập làm xác thực trong production: API demo này chưa có đăng nhập/token,
và chưa kết nối database riêng Backend 4. Cần thống nhất chính sách hoàn tiền,
xác thực và đồng bộ soát vé với Backend 4 trước khi triển khai thực tế.