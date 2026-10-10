# US20 – Tỷ lệ lấp đầy

## Mục tiêu

Thống kê số ghế đã bán, tổng số ghế và tỷ lệ lấp đầy theo chuyến hoặc tuyến.

## Công nghệ

Python 3, FastAPI, SQLite, Pydantic và `unittest`.

## API đã triển khai

- `GET /api/v1/admin/occupancy/trips/{trip_id}`
- `GET /api/v1/admin/occupancy?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&route_id=...`

## Công thức

```text
tỷ lệ lấp đầy = số ghế đã bán / tổng số ghế * 100
```

Ghế được tính là đã bán khi ticket/booking ở trạng thái hợp lệ theo nghiệp vụ thanh toán hiện tại; ghế hủy không được tính.

Đã tích hợp bằng Python tại `backend_admin.py` trong thư mục Backend mẫu 4.
Tổng ghế lấy từ bus, fallback sang số bản ghi seats nếu chưa gắn bus.
Hiện đếm ticket có trip_id trực tiếp và trạng thái PAID/USED/DaThanhToan/DaSoat;
ticket CANCELLED/DaHuy không được tính. Tổng ghế bằng 0 trả tỷ lệ 0.