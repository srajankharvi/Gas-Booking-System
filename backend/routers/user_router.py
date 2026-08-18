from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from database import get_database
import schemas
import auth

router = APIRouter(prefix="/api/users", tags=["Users & Cylinders"])

@router.get("/me", response_model=schemas.UserResponse)
async def get_me(current_user: dict = Depends(auth.get_current_user)):
    return schemas.UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        mobile=current_user["mobile"],
        address=current_user["address"],
        role=current_user["role"],
        created_at=current_user["created_at"]
    )

@router.get("/cylinders", response_model=list[schemas.CylinderResponse])
async def get_cylinders(current_user: dict = Depends(auth.get_current_user), db = Depends(get_database)):
    cylinders = []
    cursor = db.cylinders.find({"owner_id": current_user["id"]})
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc["owner_id"] = str(doc["owner_id"])
        
        # Calculate estimated remaining days
        # E.g. burn rate is in kg/hour. Gas left is current_weight - tare_weight.
        # remaining_gas = current_weight - tare_weight
        # remaining_hours = remaining_gas / burn_rate
        # remaining_days = remaining_hours / 24
        tare = doc.get("tare_weight", 15.0)
        full = doc.get("full_weight", 29.2)
        curr = doc.get("current_weight", 29.2)
        burn_rate = doc.get("burn_rate_ema", 0.05) or 0.05
        
        remaining_gas = max(0.0, curr - tare)
        if burn_rate > 0:
            remaining_days = remaining_gas / (burn_rate * 24.0)
        else:
            remaining_days = 99.0
            
        doc["estimated_days"] = round(remaining_days, 1)
        cylinders.append(schemas.CylinderResponse(**doc))
    return cylinders

@router.put("/cylinders/{cylinder_id}/calibration", response_model=schemas.CylinderResponse)
async def update_calibration(
    cylinder_id: str, 
    calib: schemas.CylinderBase, 
    current_user: dict = Depends(auth.get_current_user), 
    db = Depends(get_database)
):
    cylinder = await db.cylinders.find_one({"_id": ObjectId(cylinder_id), "owner_id": current_user["id"]})
    if not cylinder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cylinder not found or unauthorized"
        )
        
    # Recalculate percent and status based on new calibration
    tare = calib.tare_weight
    full = calib.full_weight
    curr = cylinder["current_weight"]
    
    if full <= tare:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full weight must be greater than tare weight"
        )
        
    percent = ((curr - tare) / (full - tare)) * 100.0
    percent = max(0.0, min(100.0, percent))
    
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
            "name": calib.name,
            "tare_weight": tare,
            "full_weight": full,
            "current_percent": percent,
            "status": status_label
        }}
    )
    
    updated_cylinder = await db.cylinders.find_one({"_id": ObjectId(cylinder_id)})
    updated_cylinder["id"] = str(updated_cylinder["_id"])
    updated_cylinder["owner_id"] = str(updated_cylinder["owner_id"])
    
    burn_rate = updated_cylinder.get("burn_rate_ema", 0.05) or 0.05
    remaining_gas = max(0.0, curr - tare)
    remaining_days = remaining_gas / (burn_rate * 24.0) if burn_rate > 0 else 99.0
    updated_cylinder["estimated_days"] = round(remaining_days, 1)
    
    return schemas.CylinderResponse(**updated_cylinder)
