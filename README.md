# AI-Chatbot-Backend

Backend Chat Bot AI độc lập cho project BusTicketing / SmartBus.

## 1. Cấu trúc

```text
AI-Chatbot-Backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── chatbot.py
│   └── database.py
├── seed.py
├── requirements.txt
├── .env.example
└── run.bat
```

## 2. Cài đặt

Mở PowerShell tại thư mục này:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python seed.py
```

Nếu PowerShell chặn script:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

sau đó chạy lại:

```powershell
.\venv\Scripts\Activate.ps1
```

## 3. Chạy backend

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Mở:

```text
http://127.0.0.1:8001
```

Swagger:

```text
http://127.0.0.1:8001/docs
```

## 4. API Chat Bot

### GET

```text
GET /api/v1/chatbot/
```

### POST

```text
POST /api/v1/chatbot/chat
```

Body:

```json
{
  "message": "Có chuyến nào từ Hà Nội đi Thái Nguyên?",
  "user_id": 1,
  "conversation": []
}
```

## 5. Kết nối AI thật

Mặc định backend có local fallback nên **không cần API key vẫn chạy**.

Nếu muốn dùng AI thật, tạo file `.env` hoặc đặt biến môi trường:

```text
OPENAI_API_KEY=YOUR_API_KEY
OPENAI_MODEL=gpt-4o-mini
AI_API_BASE_URL=https://api.openai.com/v1
```

Nếu môi trường của bạn không tự load `.env`, hãy đặt biến môi trường trực tiếp trước khi chạy.

## 6. Kết nối frontend

Frontend BusTicketing chỉ cần gọi:

```javascript
const response = await fetch(
  "http://127.0.0.1:8001/api/v1/chatbot/chat",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Có chuyến nào từ Hà Nội đi Thái Nguyên?",
      user_id: 1,
      conversation: []
    })
  }
);

const data = await response.json();
console.log(data.message);
```

## 7. Dữ liệu demo

`seed.py` tạo dữ liệu mẫu:

- Hà Nội → Thái Nguyên
- Hà Nội → Hải Phòng
- Hà Nội → Đà Nẵng
- TP.HCM → Đà Lạt
- Voucher WELCOME10
- Voucher BUS20
- bảng tickets
- bảng monthly_passes

Sau này có thể thay `chatbot.db` bằng database thật của BusTicketing.
