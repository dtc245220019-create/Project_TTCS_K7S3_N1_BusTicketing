# US8 – Hoàn tiền

## Mục tiêu

Cho phép xử lý yêu cầu hoàn tiền cho booking/vé đã thanh toán, tách biệt với nghiệp vụ hủy vé hiện có.

## Công nghệ

Python 3, FastAPI, Pydantic, SQLite và `unittest`.

## Phạm vi nghiệp vụ

- Tạo yêu cầu hoàn tiền cho booking đã có payment `SUCCESS`.
- Không cho tạo trùng yêu cầu đang chờ xử lý.
- Admin xem danh sách và duyệt/từ chối yêu cầu.
- Theo dõi số tiền yêu cầu, số tiền được duyệt và lý do.
- Khi hoàn tiền thành công, doanh thu thực phải trừ khoản đã hoàn.

## Trạng thái dự kiến

`PENDING`, `APPROVED`, `REJECTED`, `PROCESSING`, `REFUNDED`, `FAILED`.

## API đã triển khai

- `POST /api/v1/refunds`
- `GET /api/v1/refunds`
- `GET /api/v1/admin/refunds`
- `PATCH /api/v1/admin/refunds/{refund_id}`

Đã tích hợp bằng Python vào backend chính và dùng database chung, không tạo database riêng.

Các endpoint đã có: `POST/GET /api/v1/refunds` và `PATCH /api/v1/admin/refunds/{refund_id}`.

Mã customer ở `api.py` trong thư mục US8; mã admin ở `backend_admin.py`
trong thư mục cha. Chính sách mẫu: booking đã `CANCELLED`, payment `SUCCESS`,
hoàn toàn bộ số tiền payment. Quy trình `PENDING → APPROVED → REFUNDED/FAILED`
hoặc `PENDING → REJECTED`. Duyệt không chuyển tiền; admin xác nhận `REFUNDED`
sau khi hoàn tiền bên ngoài, bắt buộc ghi bằng chứng trong `admin_note`.
Chưa tích hợp hoàn tiền tự động qua ngân hàng/cổng thanh toán.