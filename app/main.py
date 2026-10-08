from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .chatbot import router as chatbot_router

app = FastAPI(
    title="SmartBus AI Chatbot Backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chatbot_router)


@app.get("/")
def root():
    return {
        "success": True,
        "service": "SmartBus AI Chatbot Backend",
        "docs": "/docs"
    }
