# Backend 4 — Thanh toán Sandbox và soát vé

Phần Backend 4, phụ trách US06 và US15.

## Chạy seed

```powershell
cd "D:\Thực tập\Backend\backend-4"
python seed_data.py
```

Database riêng của Backend 4 nằm tại `backend-4/data/backend_4.db`.

Phần này quản lý giao dịch thanh toán Sandbox và lịch sử soát vé. Contract kết nối với Backend 3 sẽ dùng `booking_code` và `ticket_code`.

## Chạy API mẫu

```powershell
cd "D:\Thực tập\Backend\backend-4"
pip install -r requirements.txt
python seed_data.py
python api.py
```

Mở Swagger tại `http://127.0.0.1:8004/docs`.

Các endpoint chính:

- `POST /api/v1/payments`: tạo giao dịch `PENDING` với `booking_code`, `amount`, `provider`.
- `POST /api/v1/payments/{transaction_code}/callback`: giả lập callback Sandbox với `SUCCESS` hoặc `FAILED`.
- `GET /api/v1/payments/{transaction_code}`: xem trạng thái giao dịch.
- `POST /api/v1/tickets/verify`: soát vé với `ticket_code` và `staff_email`.

Seed có sẵn `TICKET-001` tương ứng `BOOK-PAID-001` và một giao dịch `SUCCESS`. Đây là mapping demo; khi Backend 3 có API vé hoàn chỉnh thì thay bằng truy vấn/API liên kết thật.

## Chạy test

```powershell
python -m unittest discover -s . -p "test_*.py" -v
```

Test API dùng SQLite tạm thời, không thay đổi `data/backend_4.db`. Có kiểm tra tạo payment,
callback `SUCCESS`/`FAILED`, callback lặp lại, soát vé `VALID`/`UNPAID`/`ALREADY_USED`/
`CANCELLED`/`INVALID`, validation và CORS cho Frontend 1.

Backend 4 hiện vẫn là sandbox độc lập. Nó chưa gọi HTTP sang Backend 3; bảng `demo_tickets`
chỉ phục vụ test mẫu. Khi tích hợp thật, Backend 4 phải gọi Backend 3 để xác nhận booking,
cập nhật kết quả thanh toán và kiểm tra/đánh dấu vé.