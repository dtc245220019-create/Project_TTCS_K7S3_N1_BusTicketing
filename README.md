# US17 + US18 - Payment Integration

Đây là project RIÊNG chỉ phục vụ:

## US17 - Tích hợp cổng thanh toán

- VNPAY
- ZaloPay
- Tạo transaction thanh toán
- Trả payment URL đối với VNPAY

## US18 - Webhook / Callback

- VNPAY IPN
- VNPAY Return URL
- ZaloPay Callback
- Kiểm tra chữ ký/MAC
- Kiểm tra số tiền
- Xử lý callback lặp lại (idempotent)
- Cập nhật trạng thái PAYMENT

Không chứa các module khác của SmartBus.

## 1. Cài đặt

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Cài thư viện:

```bash
pip install -r requirements.txt
```

Tạo `.env`:

```bash
copy .env.example .env
```

Sau đó điền thông tin merchant VNPAY/ZaloPay.

## 2. Chạy server

```bash
uvicorn app.main:app --reload
```

Mở:

http://127.0.0.1:8000/docs

## 3. API US17

### VNPAY

POST:

```text
/api/v1/payments/vnpay/create
```

Body:

```json
{
  "amount": 100000,
  "order_info": "Thanh toan ve xe"
}
```

API trả về:

```json
{
  "success": true,
  "transaction_code": "VNP...",
  "status": "PENDING",
  "payment_url": "https://sandbox.vnpayment.vn/..."
}
```

### ZaloPay

POST:

```text
/api/v1/payments/zalopay/create
```

Body:

```json
{
  "amount": 100000
}
```

## 4. API US18

### VNPAY IPN

```text
GET /api/v1/payments/vnpay/ipn
```

Đây là endpoint server nhận thông báo thanh toán từ VNPAY.

### VNPAY Return

```text
GET /api/v1/payments/vnpay/return
```

Dùng để đưa người dùng quay lại website.

Return URL không được dùng thay cho IPN để xác nhận thanh toán.

### ZaloPay Callback

```text
POST /api/v1/payments/zalopay/callback
```

Backend kiểm tra MAC trước khi cập nhật trạng thái.

## 5. Kiểm tra trạng thái

```text
GET /api/v1/payments/{transaction_code}
```

Ví dụ:

```text
GET /api/v1/payments/VNPABC123
```

## 6. Luồng US17 + US18

```text
Client
   |
   |--- US17: Create Payment
   |
   v
Backend
   |
   +----> VNPAY / ZaloPay
             |
             | Người dùng thanh toán
             |
             v
        US18 Callback/IPN
             |
             v
       Verify Signature/MAC
             |
             v
       Update Payment Status
             |
             +--> SUCCESS
             |
             +--> FAILED
```

## Lưu ý

Code này là bộ khung US17 + US18 độc lập. Khi đưa vào project thật,
thay `PAYMENTS` bằng database/model Payment của project và nối phần
ZaloPay create-order với thông tin merchant thực tế.
