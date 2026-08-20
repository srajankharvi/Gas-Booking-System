from fastapi import APIRouter, Depends, HTTPException, status, Header
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from bson import ObjectId
from database import get_database
from config import settings
import schemas
import websocket_manager
import auth
import secrets

router = APIRouter(prefix="/api/iot/cylinder", tags=["IoT Endpoints"])

def calculate_percent(weight: float, tare: float, full: float) -> float:
    if full <= tare:
        return 0.0
    percent = ((weight - tare) / (full - tare)) * 100.0
    return max(0.0, min(100.0, percent))

@router.post("/readings", response_model=schemas.ReadingResponse, dependencies=[Depends(auth.verify_iot_api_key)])
async def create_reading(
    reading: schemas.ReadingCreate, 
    db = Depends(get_database)
):
    if not hasattr(reading, 'device_id') or not reading.device_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="device_id is required in JSON body"
        )
        
    try:
        cylinder = await db.cylinders.find_one({"_id": ObjectId(reading.device_id)})
    except:
        cylinder = await db.cylinders.find_one({"api_key": reading.device_id})
        
    if not cylinder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device (Cylinder) not found"
        )
            
    cylinder_id = str(cylinder["_id"])
    user_id = str(cylinder["owner_id"])
    
    tare = cylinder.get("tare_weight", 15.0)
    full = cylinder.get("full_weight", 29.2)
    percent = calculate_percent(reading.weight, tare, full)
    
    # Calculate Gas Weight
    gas_weight = max(0.0, reading.weight - tare)
    
    timestamp = reading.timestamp or datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
        
    db_reading = {
        "device_id": reading.device_id,
        "cylinder_id": cylinder_id,
        "weight": reading.weight,
        "temperature": reading.temperature,
        "percent": percent,
        "timestamp": timestamp,
        "is_estimated": False
    }
    
    # Calculate EMA burn rate
    prev_reading = await db.sensor_readings.find_one(
        {"cylinder_id": cylinder_id, "is_estimated": False},
        sort=[("timestamp", -1)]
    )
    
    new_ema = cylinder.get("burn_rate_ema", 0.05) or 0.05
    if prev_reading:
        prev_time = prev_reading["timestamp"]
        if prev_time.tzinfo is None:
            prev_time = prev_time.replace(tzinfo=timezone.utc)
            
        time_diff_hours = (timestamp - prev_time).total_seconds() / 3600.0
        
        if time_diff_hours > 1.0:
            weight_drop = prev_reading["weight"] - reading.weight
            # Only count drops greater than 50g (noise threshold) and less than 4kg (not a refill/error)
            if 0.05 < weight_drop < 4.0:
                observed_rate = weight_drop / time_diff_hours
                alpha = 0.1 # Slower adaptation to prevent sudden spikes
                new_ema = alpha * observed_rate + (1 - alpha) * new_ema
                
    # Update cylinder status using exact weight thresholds from env
    status_label = "NORMAL"
    if gas_weight < settings.CRITICAL_WEIGHT_THRESHOLD:
        status_label = "CRITICAL"
    elif gas_weight <= settings.LOW_WEIGHT_THRESHOLD:
        status_label = "LOW"
        
    await db.cylinders.update_one(
        {"_id": ObjectId(cylinder_id)},
        {"$set": {
            "current_weight": reading.weight,
            "current_percent": percent,
            "temperature": reading.temperature,
            "last_seen": timestamp,
            "is_online": True,
            "burn_rate_ema": new_ema,
            "status": status_label
        }}
    )
    
    # Insert reading
    res = await db.sensor_readings.insert_one(db_reading)
    db_reading["id"] = str(res.inserted_id)
    
    # Check Alerts based on weight thresholds
    if status_label in ["LOW", "CRITICAL"]:
        alert_type = "critical_gas" if status_label == "CRITICAL" else "low_gas"
        title = "Critical Gas Level Alert!" if status_label == "CRITICAL" else "Low Gas Alert"
        message = (
            f"Your cylinder is almost empty ({gas_weight:.1f}kg remaining). Book a new cylinder immediately."
            if status_label == "CRITICAL" else
            f"Your cylinder has reached {gas_weight:.1f}kg. We recommend booking a new cylinder."
        )
        
        time_limit = datetime.now(timezone.utc) - timedelta(hours=12)
        recent_alert = await db.notifications.find_one({
            "user_id": user_id,
            "type": alert_type,
            "created_at": {"$gt": time_limit}
        })
        
        if not recent_alert:
            new_alert = {
                "user_id": user_id,
                "type": alert_type,
                "title": title,
                "message": message,
                "read": False,
                "created_at": datetime.now(timezone.utc)
            }
            await db.notifications.insert_one(new_alert)
            
            await websocket_manager.manager.broadcast_to_user(user_id, {
                "event": "notification",
                "data": {
                    "type": alert_type,
                    "title": title,
                    "message": message,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            })
            
            # Auto-booking logic for critical state
            if status_label == "CRITICAL":
                active_booking = await db.bookings.find_one({
                    "user_id": user_id,
                    "status": {"$in": ["Pending", "Confirmed", "Processing", "Out for Delivery"]}
                })
                if not active_booking:
                    booking_id = f"GAS-AUTO-{secrets.token_hex(4).upper()}"
                    try:
                        user = await db.users.find_one({"_id": ObjectId(user_id)})
                    except:
                        # Fallback for mock/demo users
                        user = await db.users.find_one({"id": user_id})
                    
                    if not user:
                        user = {}
                        
                    new_booking = {
                        "booking_id": booking_id,
                        "user_id": user_id,
                        "cylinder_id": cylinder_id,
                        "status": "Pending",
                        "delivery_address": user.get("address", "Registered Address"),
                        "contact_number": user.get("mobile", "Registered Mobile"),
                        "delivery_preference": "Standard (Auto-Triggered)",
                        "created_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc),
                        "timeline": [
                            {"status": "Pending", "timestamp": datetime.now(timezone.utc)}
                        ]
                    }
                    await db.bookings.insert_one(new_booking)
                    
                    auto_booking_alert = {
                        "user_id": user_id,
                        "type": "booking_status",
                        "title": "Refill Auto-Booked",
                        "message": f"Gas weight critical at {gas_weight:.1f}kg. Auto-booking triggered: ID {booking_id}.",
                        "read": False,
                        "created_at": datetime.now(timezone.utc)
                    }
                    await db.notifications.insert_one(auto_booking_alert)
                    await websocket_manager.manager.broadcast_to_user(user_id, {
                        "event": "notification",
                        "data": {
                            "type": "booking_status",
                            "title": "Refill Auto-Booked",
                            "message": f"Gas weight critical at {gas_weight:.1f}kg. Auto-booking triggered: ID {booking_id}."
                        }
                    })
                    
    # Broadcast new readings
    await websocket_manager.manager.broadcast_to_user(user_id, {
        "event": "cylinder_update",
        "data": {
            "weight": reading.weight,
            "percent": percent,
            "temperature": reading.temperature,
            "status": status_label,
            "is_online": True,
            "last_seen": timestamp.isoformat()
        }
    })
    
    return schemas.ReadingResponse(**db_reading)

@router.get("/latest/{device_id}")
async def get_latest_reading(device_id: str, db = Depends(get_database)):
    # Support for the /api/iot/readings/latest/{device_id} requirement
    try:
        cylinder = await db.cylinders.find_one({"_id": ObjectId(device_id)})
    except:
        cylinder = await db.cylinders.find_one({"api_key": device_id})
        
    if not cylinder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
        
    reading = await db.sensor_readings.find_one(
        {"cylinder_id": str(cylinder["_id"])},
        sort=[("timestamp", -1)]
    )
    
    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No readings found for this device"
        )
        
    return {
        "success": True,
        "device_id": device_id,
        "weight": reading["weight"],
        "unit": "kg",
        "status": cylinder.get("status", "NORMAL"),
        "timestamp": reading["timestamp"].isoformat()
    }

@router.get("/{cylinder_id}/readings", response_model=List[schemas.ReadingResponse])
async def get_cylinder_readings(
    cylinder_id: str,
    limit: int = 100,
    days: Optional[int] = None,
    current_user: dict = Depends(auth.get_current_user),
    db = Depends(get_database)
):
    # Support for the API limit requirement
    limit = min(limit, 500) # Do not allow unlimited database queries
    
    query = {"cylinder_id": cylinder_id}
    if days:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        query["timestamp"] = {"$gte": since}
        
    readings = []
    cursor = db.sensor_readings.find(query).sort([("timestamp", -1)]).limit(limit)
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        if "device_id" not in doc:
            doc["device_id"] = cylinder_id
        readings.append(schemas.ReadingResponse(**doc))
    return readings
