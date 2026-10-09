# US21 – Xuất dữ liệu doanh thu

## Mục tiêu

Cho phép admin tải báo cáo doanh thu để lưu trữ hoặc xử lý bằng Excel/Google Sheets.

## Công nghệ

Python 3, FastAPI, `csv` của Python standard library và SQLite.

## API đã triển khai

```http
GET /api/v1/admin/revenue/export?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
```

API trả file CSV UTF-8 có BOM để Excel nhận diện đúng tiếng Việt. Bộ lọc phải tương thích với US19 và dữ liệu xuất phải dùng cùng quy tắc doanh thu.

## Các cột dự kiến

`transaction_code`, `booking_code`, `amount`, `provider`, `paid_at`, `trip_code`, `route_name`, `origin`, `destination`.

Đã tích hợp bằng Python tại `backend_admin.py` trong thư mục Backend mẫu 4;
file CSV có UTF-8 BOM để mở đúng tiếng Việt trên Excel. Bổ sung cột
`refunded_amount` và `net_revenue`, dùng cùng bộ lọc ngày/tuyến/chuyến của US19.
Các giá trị chuỗi có thể kích hoạt công thức bảng tính được thêm dấu nháy bảo vệ.