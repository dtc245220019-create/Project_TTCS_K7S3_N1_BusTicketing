# Backend S2 — API cập nhật trạng thái vé khi lên xe

API này dùng lại quy tắc và tiện ích từ backend 1 (cần giữ thư mục backend 1).
Endpoint boarding kiểm tra QR và cập nhật vé trong cùng một thao tác.
Không gọi verify của backend 1 rồi mới gọi boarding: verify đã chuyển vé sang USED,
nên boarding tiếp theo sẽ trả ALREADY_USED. Hai endpoint là hai lựa chọn thay thế,
không phải quy trình hai bước độc lập.

## Quy ước trạng thái

Theo `database.py` và `api.py` gốc:

- Trạng thái chuẩn trong database: `USED`.
- `used_at` lưu thời điểm hành khách lên xe.
- `DaSoat` là nhãn tương thích ERD tiếng Việt, được trả ra qua `boarding_status`.
- API không ghi `DaSoat` trực tiếp vì backend gốc dùng `USED` khi soát vé thành công.

## Chạy

```powershell
python "D:\Thực tập\Project_TTCS_K7S3_N1_BusTicketing\backendS2\backend 2\boarding_api.py"
```

API chạy tại `http://127.0.0.1:8000`; Swagger tại `/docs`.

## Cập nhật vé đã lên xe

```http
POST /api/v1/tickets/boarding
```

Request:

```json
{
  "qr_payload": "ticket:TICKET-001",
  "staff_user_id": 2,
  "trip_id": 1
}
```

Có thể dùng `ticket_code` thay `qr_payload`, hoặc payload QR dạng
`SMARTBUS|TICKET-001|...`. Nhân viên phải là STAFF, ADMIN, DRIVER, CONDUCTOR,
TaiXe hoặc PhuXe. Tài xế có `driver_id` chỉ được cập nhật vé của chuyến mình
được phân công.

Endpoint kiểm tra thanh toán, trạng thái vé, trạng thái chuyến và đúng chuyến.
Vé hợp lệ được cập nhật nguyên tử:

```text
tickets.status = USED
tickets.used_at = CURRENT_TIMESTAMP
```

Đồng thời ghi `ticket_inspections` với `result = VALID`. Vé đã dùng trả
`ALREADY_USED` và không thay đổi `used_at`. Dùng `BEGIN IMMEDIATE` để tránh hai
request cùng cập nhật một vé khi lên xe.

Alias tương thích:

```http
POST /api/v1/tickets/board
```

## Tra cứu trạng thái

```http
GET /api/v1/tickets/TICKET-001/boarding?staff_user_id=2
```

Kết quả gồm `canonical_ticket_status`, `boarding_status` và `boarded_at`.

## Kiểm thử

```powershell
Set-Location "D:\Thực tập\Project_TTCS_K7S3_N1_BusTicketing\backendS2\backend 2"
python -m unittest test_boarding_api.py -v
```

Test dùng database tạm, seed/schema của dự án gốc và không tác động database thật.

## Lưu ý tích hợp

API dùng chung SQLite, schema gốc và cổng 8000 với frontend. Backend 1 và backend 2
là hai app độc lập nên không chạy đồng thời trên cổng 8000; khi cần chức năng cập
nhật vé lên xe, hãy dừng app đang chạy rồi khởi động app này.
Không có bảng `operator_id` trong schema gốc, nên chưa phân quyền tách biệt giữa
nhiều nhà xe. ID/email nhân viên hiện chỉ được kiểm tra trong database; production
cần JWT/session xác thực thay vì tin trực tiếp dữ liệu gửi trong request.