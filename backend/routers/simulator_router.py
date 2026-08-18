from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
from bson import ObjectId
from database import get_database
import schemas
import auth
import websocket_manager
import secrets

router = APIRouter(prefix="/api/simulator", tags=["Simulator Control"])

@router.post("/action")
async def trigger_simulator_action(payload: dict, db = Depends(get_database)):
    action = payload.get("action")
    cylinder_id = payload.get("cylinder_id")
    
    if not cylinder_id or not action:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cylinder_id and action are required parameters"
        )
        
    cylinder = await db.cylinders.find_one({"_id": ObjectId(cylinder_id)})
    if not cylinder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cylinder not found"
        )
        
    user_id = str(cylinder["owner_id"])
    tare = cylinder.get("tare_weight", 15.0)
    full = cylinder.get("full_weight", 29.2)
    current_weight = cylinder.get("current_weight", 29.2)
    now = datetime.now(timezone.utc)
    
    # Process actions
    if action == "disconnect":
        await db.cylinders.update_one(
            {"_id": ObjectId(cylinder_id)},
            {"$set": {"is_online": False}}
        )
        # Broadcast disconnect event
        await websocket_manager.manager.broadcast_to_user(user_id, {
            "event": "cylinder_update",
            "data": {
                "weight": current_weight,
                "percent": cylinder.get("current_percent", 100.0),
                "temperature": cylinder.get("temperature", 28.0),
                "status": cylinder.get("status", "Good"),
                "is_online": False,
                "last_seen": now.isoformat()
            }
        })
        return {"message": "Cylinder marked offline"}
        
    elif action == "adjust":
        adjustment = payload.get("amount", -0.5)
        new_weight = max(tare, min(full, current_weight + adjustment))
        percent = ((new_weight - tare) / (full - tare)) * 100.0 if full > tare else 0.0
        percent = max(0.0, min(100.0, percent))
    
    elif action == "set_level":
        target_percent = float(payload.get("percent", 100.0))
        target_percent = max(0.0, min(100.0, target_percent))
        new_weight = tare + (target_percent / 100.0) * (full - tare)
        percent = target_percent
        
    elif action == "delivery":
        # Find active bookings for this user and mark as Delivered
        active_booking = await db.bookings.find_one({
            "user_id": user_id,
            "status": {"$in": ["Pending", "Confirmed", "Processing", "Out for Delivery"]}
        })
        if not active_booking:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active booking found to simulate delivery."
            )
            
        timeline = active_booking.get("timeline", [])
        timeline.append({"status": "Delivered", "timestamp": now})
        
        await db.bookings.update_one(
            {"_id": active_booking["_id"]},
            {"$set": {
                "status": "Delivered",
                "updated_at": now,
                "timeline": timeline
            }}
        )
        
        # Reset cylinder weight to full
        new_weight = full
        percent = 100.0
        
        # Notify
        notification = {
            "user_id": user_id,
            "type": "booking_status",
            "title": "Cylinder Refill Delivered",
            "message": f"Your booking {active_booking['booking_id']} has been delivered. Cylinder refilled to 100%.",
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification)
        await websocket_manager.manager.broadcast_to_user(user_id, {
            "event": "notification",
            "data": {
                "type": "booking_status",
                "title": "Cylinder Refill Delivered",
                "message": f"Your booking {active_booking['booking_id']} has been delivered."
            }
        })
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unknown action"
        )
        
    # Recalculate status
    status_label = "Good"
    if percent < 10.0:
        status_label = "Critical"
    elif percent < 20.0:
        status_label = "Very Low"
    elif percent < 40.0:
        status_label = "Low"
    elif percent < 70.0:
        status_label = "Normal"
        
    # Update DB
    await db.cylinders.update_one(
        {"_id": ObjectId(cylinder_id)},
        {"$set": {
            "current_weight": new_weight,
            "current_percent": percent,
            "status": status_label,
            "is_online": True,
            "last_seen": now
        }}
    )
    
    # Store reading
    db_reading = {
        "cylinder_id": cylinder_id,
        "weight": new_weight,
        "temperature": cylinder.get("temperature", 28.0),
        "percent": percent,
        "timestamp": now,
        "is_estimated": False
    }
    await db.sensor_readings.insert_one(db_reading)
    
    # Check alert thresholds and throttle notifications
    if percent <= 20.0:
        alert_type = "critical_gas" if percent <= 9.0 else "low_gas"
        title = "Critical Gas Level Alert!" if percent <= 9.0 else "Low Gas Alert"
        message = (
            f"Your cylinder is almost empty ({percent:.1f}% remaining). Book a new cylinder immediately."
            if percent <= 9.0 else
            f"Your cylinder has reached {percent:.1f}%. We recommend booking a new cylinder."
        )
        
        # Check throttling
        time_limit = now - timedelta(hours=12)
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
                "created_at": now
            }
            await db.notifications.insert_one(new_alert)
            await websocket_manager.manager.broadcast_to_user(user_id, {
                "event": "notification",
                "data": {
                    "type": alert_type,
                    "title": title,
                    "message": message,
                    "created_at": now.isoformat()
                }
            })
            
            # Auto-booking if level <= 15% and no active bookings exist
            if percent <= 15.0:
                active_booking = await db.bookings.find_one({
                    "user_id": user_id,
                    "status": {"$in": ["Pending", "Confirmed", "Processing", "Out for Delivery"]}
                })
                if not active_booking:
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
                        "created_at": now,
                        "updated_at": now,
                        "timeline": [
                            {"status": "Pending", "timestamp": now}
                        ]
                    }
                    await db.bookings.insert_one(new_booking)
                    
                    auto_booking_alert = {
                        "user_id": user_id,
                        "type": "booking_status",
                        "title": "Refill Auto-Booked",
                        "message": f"Gas level at {percent:.1f}%. Auto-booking triggered: ID {booking_id}.",
                        "read": False,
                        "created_at": now
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

    # Broadcast updates over WebSockets
    await websocket_manager.manager.broadcast_to_user(user_id, {
        "event": "cylinder_update",
        "data": {
            "weight": new_weight,
            "percent": percent,
            "temperature": cylinder.get("temperature", 28.0),
            "status": status_label,
            "is_online": True,
            "last_seen": now.isoformat()
        }
    })
    
    return {
        "message": "Action completed successfully",
        "percent": percent,
        "weight": new_weight,
        "status": status_label
    }
