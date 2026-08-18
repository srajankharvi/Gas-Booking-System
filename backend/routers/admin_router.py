from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
from bson import ObjectId
from database import get_database
import schemas
import auth
import websocket_manager

router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard"])

@router.get("/stats", response_model=schemas.AdminStats)
async def get_admin_stats(current_user: dict = Depends(auth.get_admin_user), db = Depends(get_database)):
    total_users = await db.users.count_documents({})
    active_cylinders = await db.cylinders.count_documents({"is_online": True})
    
    # We define Low as between 10% and 39%
    low_gas_cylinders = await db.cylinders.count_documents({
        "current_percent": {"$gte": 10.0, "$lt": 40.0}
    })
    
    # Critical as < 10%
    critical_cylinders = await db.cylinders.count_documents({
        "current_percent": {"$lt": 10.0}
    })
    
    pending_bookings = await db.bookings.count_documents({"status": "Pending"})
    
    # Deliveries updated to Delivered today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_deliveries = await db.bookings.count_documents({
        "status": "Delivered",
        "updated_at": {"$gte": today_start}
    })
    
    return schemas.AdminStats(
        total_users=total_users,
        active_cylinders=active_cylinders,
        low_gas_cylinders=low_gas_cylinders,
        critical_cylinders=critical_cylinders,
        pending_bookings=pending_bookings,
        today_deliveries=today_deliveries
    )

@router.get("/cylinders", response_model=list[schemas.AdminCylinderRow])
async def get_admin_cylinders(current_user: dict = Depends(auth.get_admin_user), db = Depends(get_database)):
    rows = []
    async for cyl in db.cylinders.find():
        user = await db.users.find_one({"_id": ObjectId(cyl["owner_id"])})
        rows.append(schemas.AdminCylinderRow(
            id=str(cyl["_id"]),
            user_name=user["name"] if user else "Unknown User",
            user_email=user["email"] if user else "unknown@gastrack.com",
            level=cyl.get("current_percent", 0.0),
            weight=cyl.get("current_weight", 0.0),
            status=cyl.get("status", "Good"),
            is_online=cyl.get("is_online", False)
        ))
    return rows

@router.get("/bookings", response_model=list[schemas.BookingResponse])
async def get_admin_bookings(current_user: dict = Depends(auth.get_admin_user), db = Depends(get_database)):
    bookings = []
    cursor = db.bookings.find().sort([("created_at", -1)])
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        doc["cylinder_id"] = str(doc["cylinder_id"])
        bookings.append(schemas.BookingResponse(**doc))
    return bookings

@router.patch("/bookings/{booking_id}/status", response_model=schemas.BookingResponse)
async def update_booking_status(
    booking_id: str,
    status_update: dict, # Expect {"status": "Processing"}
    current_user: dict = Depends(auth.get_admin_user),
    db = Depends(get_database)
):
    target_status = status_update.get("status")
    valid_statuses = ["Pending", "Confirmed", "Processing", "Out for Delivery", "Delivered", "Cancelled"]
    if target_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {valid_statuses}"
        )
        
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
        
    now = datetime.now(timezone.utc)
    timeline = booking.get("timeline", [])
    timeline.append({"status": target_status, "timestamp": now})
    
    update_data = {
        "status": target_status,
        "updated_at": now,
        "timeline": timeline
    }
    
    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": update_data}
    )
    
    user_id = str(booking["user_id"])
    cylinder_id = str(booking["cylinder_id"])
    
    # Rule 5: After delivery is completed, reset cylinder state to 100% capacity
    if target_status == "Delivered":
        cylinder = await db.cylinders.find_one({"_id": ObjectId(cylinder_id)})
        if cylinder:
            full_weight = cylinder.get("full_weight", 29.2)
            
            # Reset cylinder
            await db.cylinders.update_one(
                {"_id": ObjectId(cylinder_id)},
                {"$set": {
                    "current_weight": full_weight,
                    "current_percent": 100.0,
                    "status": "Good",
                    "is_online": True,
                    "last_seen": now
                }}
            )
            
            # Write a sensor reading representing the swap
            swap_reading = {
                "cylinder_id": cylinder_id,
                "weight": full_weight,
                "temperature": cylinder.get("temperature", 28.0),
                "percent": 100.0,
                "timestamp": now,
                "is_estimated": False
            }
            await db.sensor_readings.insert_one(swap_reading)
            
            # Broadcast the new cylinder level
            await websocket_manager.manager.broadcast_to_user(user_id, {
                "event": "cylinder_update",
                "data": {
                    "weight": full_weight,
                    "percent": 100.0,
                    "temperature": cylinder.get("temperature", 28.0),
                    "status": "Good",
                    "is_online": True,
                    "last_seen": now.isoformat()
                }
            })
            
    # Notify user of booking status update
    notification = {
        "user_id": user_id,
        "type": "booking_status",
        "title": f"Order {target_status}",
        "message": f"Your booking {booking['booking_id']} is now: {target_status}.",
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification)
    
    # Send WebSocket event to user
    await websocket_manager.manager.broadcast_to_user(user_id, {
        "event": "notification",
        "data": {
            "type": "booking_status",
            "title": f"Order {target_status}",
            "message": f"Your booking {booking['booking_id']} is now: {target_status}."
        }
    })
    
    await websocket_manager.manager.broadcast_to_user(user_id, {
        "event": "booking_update",
        "data": {
            "booking_id": booking["booking_id"],
            "status": target_status
        }
    })
    
    updated_booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    updated_booking["id"] = str(updated_booking["_id"])
    updated_booking["user_id"] = str(updated_booking["user_id"])
    updated_booking["cylinder_id"] = str(updated_booking["cylinder_id"])
    
    return schemas.BookingResponse(**updated_booking)
