from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/v1/chatbot/")
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_chat():
    response = client.post(
        "/api/v1/chatbot/chat",
        json={
            "message": "Có voucher nào không?",
            "user_id": 1,
            "conversation": []
        }
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
