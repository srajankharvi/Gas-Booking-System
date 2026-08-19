from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

# Database & settings
from database import get_database, ping_database, close_database_connection
from config import settings

# Routers
from routers import (
    auth_router,
    user_router,
    reading_router,
    booking_router,
    notification_router,
    admin_router,
    simulator_router
)
import websocket_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GasTrack")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Test MongoDB Connection
    logger.info("Attempting to connect to MongoDB Atlas...")
    if await ping_database():
        print("MongoDB Atlas connected successfully")
    else:
        print("MongoDB connection failed: Database service is temporarily unavailable.")
        
    # Initialize MongoDB Indexes on Startup
    logger.info("Initializing MongoDB Indexes...")
    db = get_database()
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("mobile", unique=True)
        await db.cylinders.create_index("owner_id")
        await db.cylinders.create_index("api_key", unique=True)
        # Required by user prompt
        await db.devices.create_index("device_id", unique=True)
        await db.sensor_readings.create_index([("cylinder_id", 1), ("timestamp", -1)])
        await db.bookings.create_index("user_id")
        await db.bookings.create_index("booking_id", unique=True)
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("MongoDB Indexes initialized successfully.")
    except Exception as e:
        logger.error("Failed to create some indexes. DB might be offline.")

    yield

    close_database_connection()

app = FastAPI(
    title="GasTrack API",
    description="Smart Gas Cylinder Booking & IoT Monitoring System API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost:5173", # Vite
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth_router.router)
app.include_router(user_router.router)
app.include_router(reading_router.router)
app.include_router(booking_router.router)
app.include_router(notification_router.router)
app.include_router(admin_router.router)
app.include_router(simulator_router.router)

# Real-time WebSocket connection route
@app.websocket("/api/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket_manager.manager.connect(user_id, websocket)
    logger.info(f"WebSocket client connected for User: {user_id}")
    try:
        while True:
            # Keep connection alive, listen for ping/pong or client messages
            data = await websocket.receive_text()
            # If client sends data, we can handle it or reply
            await websocket.send_json({"event": "pong", "message": "Connection active"})
    except WebSocketDisconnect:
        websocket_manager.manager.disconnect(user_id, websocket)
        logger.info(f"WebSocket client disconnected for User: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {str(e)}")
        websocket_manager.manager.disconnect(user_id, websocket)

@app.get("/")
def read_root():
    return {
        "app": "GasTrack - Smart Gas Booking & Monitoring System API",
        "status": "online",
        "version": "2.0.0"
    }

@app.get("/api/health")
async def health_check():
    is_connected = await ping_database()
    return {
        "success": True if is_connected else False,
        "server": "online",
        "database": "connected" if is_connected else "disconnected"
    }

from pydantic import BaseModel

class DeviceRegistration(BaseModel):
    device_id: str
    device_name: str
    location: str

@app.post("/api/iot/devices")
async def register_iot_device(device: DeviceRegistration):
    db = get_database()
    existing = await db.devices.find_one({"device_id": device.device_id})
    if existing:
        return {"success": False, "message": "Device ID already exists"}
        
    new_device = {
        "device_id": device.device_id,
        "device_name": device.device_name,
        "location": device.location,
        "status": "online",
        "created_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc),
        "last_seen": __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
    }
    
    await db.devices.insert_one(new_device)
    return {"success": True, "message": "Device registered successfully", "device_id": device.device_id}
