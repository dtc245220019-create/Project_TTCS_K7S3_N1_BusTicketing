from fastapi import FastAPI

from database.database import Base, engine
from app.models.voucher import Voucher
from app.models.fee import Fee
from app.routers.voucher import router as voucher_router
from app.routers.fee import router as fee_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(voucher_router)
app.include_router(fee_router)


@app.get("/")
def root():
    return {"message": "Voucher Fee API is running"}