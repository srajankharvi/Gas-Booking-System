from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
import secrets
from bson import ObjectId
from database import get_database
import schemas
import auth
import websocket_manager

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])

@router.get("", response_model=list[schemas.BookingResponse])
async def get_bookings(current_user: dict = Depends(auth.get_current_user), db = Depends(get_database)):
    bookings = []
    cursor = db.bookings.find({"user_id": current_user["id"]}).sort([("created_at", -1)])
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        doc["cylinder_id"] = str(doc["cylinder_id"])
        bookings.append(schemas.BookingResponse(**doc))
    return bookings

@router.post("", response_model=schemas.BookingResponse)
async def create_booking(
    booking_in: schemas.BookingCreate, 
    current_user: dict = Depends(auth.get_current_user), 
    db = Depends(get_database)
):
    # Find user's cylinder
    cylinder = await db.cylinders.find_one({"owner_id": current_user["id"]})
    if not cylinder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cylinder registered to this user. Cannot book refill."
        )
        
    cylinder_id = str(cylinder["_id"])
    
    # Rule 4: Prevent duplicate active bookings
    active_booking = await db.bookings.find_one({
        "user_id": current_user["id"],
        "status": {"$in": ["Pending", "Confirmed", "Processing", "Out for Delivery"]}
    })
    
    if active_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active booking. Multiple active bookings are not allowed."
        )
        
    booking_id = f"GAS-{secrets.token_hex(4).upper()}"
    now = datetime.now(timezone.utc)
    
    new_booking = {
        "booking_id": booking_id,
        "user_id": current_user["id"],
        "cylinder_id": cylinder_id,
        "status": "Pending",
        "delivery_address": booking_in.delivery_address,
        "contact_number": booking_in.contact_number,
        "delivery_preference": booking_in.delivery_preference,
        "created_at": now,
        "updated_at": now,
        "timeline": [
            {"status": "Pending", "timestamp": now}
        ]
    }
    
    result = await db.bookings.insert_one(new_booking)
    new_booking["id"] = str(result.inserted_id)
    
    # Notify user
    notification = {
        "user_id": current_user["id"],
        "type": "booking_status",
        "title": "Booking Confirmed",
        "message": f"Your cylinder booking {booking_id} has been created successfully.",
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification)
    
    # Send WebSocket event
    await websocket_manager.manager.broadcast_to_user(current_user["id"], {
        "event": "booking_update",
        "data": {
            "booking_id": booking_id,
            "status": "Pending"
        }
    })
    
    return schemas.BookingResponse(**new_booking)

@router.get("/{booking_id}", response_model=schemas.BookingResponse)
async def get_booking_details(
    booking_id: str, 
    current_user: dict = Depends(auth.get_current_user), 
    db = Depends(get_database)
):
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        # Try finding by order ID instead of DB ObjectID
        booking = await db.bookings.find_one({"booking_id": booking_id})
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
            
    # Check authorization (Only owner or admin)
    if str(booking["user_id"]) != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
        
    booking["id"] = str(booking["_id"])
    booking["user_id"] = str(booking["user_id"])
    booking["cylinder_id"] = str(booking["cylinder_id"])
    return schemas.BookingResponse(**booking)

@router.patch("/{booking_id}/cancel", response_model=schemas.BookingResponse)
async def cancel_booking(
    booking_id: str, 
    current_user: dict = Depends(auth.get_current_user), 
    db = Depends(get_database)
):
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id), "user_id": current_user["id"]})
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
        
    if booking["status"] != "Pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending bookings can be cancelled."
        )
        
    now = datetime.now(timezone.utc)
    timeline = booking["timeline"]
    timeline.append({"status": "Cancelled", "timestamp": now})
    
    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {
            "status": "Cancelled",
            "updated_at": now,
            "timeline": timeline
        }}
    )
    
    # Create notification
    notification = {
        "user_id": current_user["id"],
        "type": "booking_status",
        "title": "Booking Cancelled",
        "message": f"Your booking {booking['booking_id']} has been cancelled.",
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification)
    
    updated_booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    updated_booking["id"] = str(updated_booking["_id"])
    updated_booking["user_id"] = str(updated_booking["user_id"])
    updated_booking["cylinder_id"] = str(updated_booking["cylinder_id"])
    
    return schemas.BookingResponse(**updated_booking)
