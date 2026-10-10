
from fastapi import FastAPI

from database.database import engine, Base
from app.models.voucher import Voucher
from app.models.feedback import Feedback
from app.routers import voucher, feedback


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BE3 Voucher and Feedback API",
    description="API quan ly voucher va phan anh chuyen xe",
    version="1.0.0"
)

app.include_router(voucher.router)
app.include_router(feedback.router)


@app.get("/")
def home():
    return {
        "message": "BE3 Voucher and Feedback API is running"
    }