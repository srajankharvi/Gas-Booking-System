from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from database import get_database
import schemas
import auth

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=list[schemas.NotificationResponse])
async def get_notifications(current_user: dict = Depends(auth.get_current_user), db = Depends(get_database)):
    notifications = []
    cursor = db.notifications.find({"user_id": current_user["id"]}).sort([("created_at", -1)])
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        notifications.append(schemas.NotificationResponse(**doc))
    return notifications

@router.patch("/{notif_id}/read", response_model=schemas.NotificationResponse)
async def mark_as_read(
    notif_id: str, 
    current_user: dict = Depends(auth.get_current_user), 
    db = Depends(get_database)
):
    notif = await db.notifications.find_one({"_id": ObjectId(notif_id), "user_id": current_user["id"]})
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
        
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id)},
        {"$set": {"read": True}}
    )
    
    updated = await db.notifications.find_one({"_id": ObjectId(notif_id)})
    updated["id"] = str(updated["_id"])
    updated["user_id"] = str(updated["user_id"])
    return schemas.NotificationResponse(**updated)

@router.post("/read-all")
async def mark_all_as_read(current_user: dict = Depends(auth.get_current_user), db = Depends(get_database)):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

@router.delete("/{notif_id}")
async def delete_notification(
    notif_id: str, 
    current_user: dict = Depends(auth.get_current_user), 
    db = Depends(get_database)
):
    result = await db.notifications.delete_one({"_id": ObjectId(notif_id), "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return {"message": "Notification deleted"}
