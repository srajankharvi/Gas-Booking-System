from fastapi import APIRouter, Depends, HTTPException, status, Header
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from bson import ObjectId
from database import get_database
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

@router.post("/readings", response_model=schemas.ReadingResponse)
async def create_reading(
    reading: schemas.ReadingCreate, 
    x_api_key: str = Header(..., alias="X-API-Key"),
    db = Depends(get_database)
):
    # Verify device by API key
    cylinder = await db.cylinders.find_one({"api_key": x_api_key})
    if not cylinder:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Device API Key"
        )
        
    cylinder_id = str(cylinder["_id"])
    user_id = str(cylinder["owner_id"])
    
    tare = cylinder.get("tare_weight", 15.0)
    full = cylinder.get("full_weight", 29.2)
    percent = calculate_percent(reading.weight, tare, full)
    
    timestamp = reading.timestamp or datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
        
    db_reading = {
        "cylinder_id": cylinder_id,
        "weight": reading.weight,
        "temperature": reading.temperature,
        "percent": percent,
        "timestamp": timestamp,
        "is_estimated": False
    }
    
    # Calculate EMA burn rate
    # Fetch last non-estimated reading
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
        
        # Only update if some time has passed (e.g., > 1 minute)
        if time_diff_hours > 0.016:
            weight_drop = prev_reading["weight"] - reading.weight
            # Filter out refills/swaps (weight goes up) or anomalous huge drops
            if 0 < weight_drop < 4.0:
                observed_rate = weight_drop / time_diff_hours
                alpha = 0.2
                new_ema = alpha * observed_rate + (1 - alpha) * new_ema
                
    # Update cylinder status
    status_label = "Good"
    if percent < 10.0:
        status_label = "Critical"
    elif percent < 20.0:
        status_label = "Very Low"
    elif percent < 40.0:
        status_label = "Low"
    elif percent < 70.0:
        status_label = "Normal"
        
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
    
    # Check Alerts
    # Auto Low-gas notification throttling (only 1 per 12 hours)
    if percent <= 20.0:
        alert_type = "critical_gas" if percent <= 9.0 else "low_gas"
        title = "Critical Gas Level Alert!" if percent <= 9.0 else "Low Gas Alert"
        message = (
            f"Your cylinder is almost empty ({percent:.1f}% remaining). Book a new cylinder immediately."
            if percent <= 9.0 else
            f"Your cylinder has reached {percent:.1f}%. We recommend booking a new cylinder."
        )
        
        # Check if we created one recently
        time_limit = datetime.now(timezone.utc) - timedelta(hours=12)
        recent_alert = await db.notifications.find_one({
            "user_id": user_id,
            "type": alert_type,
            "created_at": {"$gt": time_limit}
        })
        
        if not recent_alert:
            # Create notification
            new_alert = {
                "user_id": user_id,
                "type": alert_type,
                "title": title,
                "message": message,
                "read": False,
                "created_at": datetime.now(timezone.utc)
            }
            await db.notifications.insert_one(new_alert)
            
            # Broadcast notification
            await websocket_manager.manager.broadcast_to_user(user_id, {
                "event": "notification",
                "data": {
                    "type": alert_type,
                    "title": title,
                    "message": message,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            })
            
            # Auto-booking if level drops below 15% and no active bookings exist
            if percent <= 15.0:
                active_booking = await db.bookings.find_one({
                    "user_id": user_id,
                    "status": {"$in": ["Pending", "Confirmed", "Processing", "Out for Delivery"]}
                })
                if not active_booking:
                    # Trigger auto-booking
                    booking_id = f"GAS-AUTO-{secrets.token_hex(4).upper()}"
                    user = await db.users.find_one({"_id": ObjectId(user_id)})
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
                    
                    # Create notification
                    auto_booking_alert = {
                        "user_id": user_id,
                        "type": "booking_status",
                        "title": "Refill Auto-Booked",
                        "message": f"Gas level at {percent:.1f}%. Auto-booking triggered: ID {booking_id}.",
                        "read": False,
                        "created_at": datetime.now(timezone.utc)
                    }
                    await db.notifications.insert_one(auto_booking_alert)
                    await websocket_manager.manager.broadcast_to_user(user_id, {
                        "event": "notification",
                        "data": {
                            "type": "booking_status",
                            "title": "Refill Auto-Booked",
                            "message": f"Gas level at {percent:.1f}%. Auto-booking triggered: ID {booking_id}."
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

@router.get("/{cylinder_id}/readings", response_model=List[schemas.ReadingResponse])
async def get_cylinder_readings(
    cylinder_id: str,
    limit: int = 100,
    days: Optional[int] = None,
    current_user: dict = Depends(auth.get_current_user),
    db = Depends(get_database)
):
    query = {"cylinder_id": cylinder_id}
    if days:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        query["timestamp"] = {"$gte": since}
        
    readings = []
    cursor = db.sensor_readings.find(query).sort([("timestamp", -1)]).limit(limit)
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        readings.append(schemas.ReadingResponse(**doc))
    return readings

