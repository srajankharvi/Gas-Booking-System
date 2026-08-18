from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import engine
from routers import device_router, reading_router

# Create DB tables
models.Base.metadata.create_all(bind=engine)

import scheduler
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start_scheduler()
    yield
    scheduler.scheduler.shutdown()

app = FastAPI(
    title="IoT Gas Booking System API",
    description="API for managing IoT Gas Cylinder monitors, predictions, and auto-booking",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost:5173", # Vite default port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(device_router.router)
app.include_router(reading_router.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the IoT Gas Booking System API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
