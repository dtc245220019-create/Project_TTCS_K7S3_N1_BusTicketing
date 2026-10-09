# US19 – Báo cáo doanh thu

## Công nghệ

Python 3, FastAPI, SQLite và Pydantic.

## API đã tích hợp

```http
GET /api/v1/admin/revenue
```

Query hỗ trợ: `from_date`, `to_date`, `route_id`, `trip_id`.

## Quy tắc tính

- Chỉ payment có trạng thái `SUCCESS` được tính.
- Trả tổng doanh thu, số giao dịch, thống kê theo ngày và chi tiết giao dịch.
- Báo cáo trả `gross_revenue`, `refunded_amount`, `total_revenue` (doanh thu sau hoàn tiền).
- Chỉ refund `REFUNDED` được trừ; bộ lọc và thống kê ngày dựa trên ngày thanh toán gốc `paid_at`.

## Mã nguồn

Mã API ở `backend_admin.py` trong thư mục Backend mẫu 4, được nạp qua
`be4_loader.py` ở gốc để dùng chung authentication và database của hệ thống.