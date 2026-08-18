from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
import secrets
from bson import ObjectId
from database import get_database
import schemas
import auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.Token)
async def register(user_in: schemas.UserRegister, db = Depends(get_database)):
    # Check if passwords match
    if user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
        
    # Check if user already exists
    existing_email = await db.users.find_one({"email": user_in.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    existing_mobile = await db.users.find_one({"mobile": user_in.mobile})
    if existing_mobile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number already registered"
        )
        
    # Determine role (first user can be admin, or we check if email is admin@gastrack.com)
    role = "user"
    if user_in.email.lower().endswith("admin@gastrack.com") or user_in.email.lower() == "admin@gmail.com":
        role = "admin"
        
    hashed_password = auth.get_password_hash(user_in.password)
    
    new_user = {
        "name": user_in.name,
        "email": user_in.email,
        "mobile": user_in.mobile,
        "hashed_password": hashed_password,
        "address": user_in.address,
        "role": role,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(new_user)
    user_id = str(result.inserted_id)
    new_user["id"] = user_id
    
    # Create default cylinder for the user
    api_key = f"GT-{secrets.token_hex(8).upper()}"
    new_cylinder = {
        "owner_id": user_id,
        "name": "Primary Cylinder",
        "tare_weight": 15.0,
        "full_weight": 29.2,
        "current_weight": 29.2,
        "current_percent": 100.0,
        "temperature": 27.5,
        "api_key": api_key,
        "last_seen": datetime.now(timezone.utc),
        "is_online": True,
        "burn_rate_ema": 0.05,
        "status": "Good"
    }
    await db.cylinders.insert_one(new_cylinder)
    
    # Initial connection notification
    notification = {
        "user_id": user_id,
        "type": "cylinder_connection",
        "title": "Cylinder Connected",
        "message": f"Cylinder 'Primary Cylinder' has been successfully linked. API Key: {api_key}",
        "read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.notifications.insert_one(notification)
    
    # Generate token
    access_token = auth.create_access_token(data={"sub": user_in.email, "role": role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": schemas.UserResponse(
            id=user_id,
            name=new_user["name"],
            email=new_user["email"],
            mobile=new_user["mobile"],
            address=new_user["address"],
            role=new_user["role"],
            created_at=new_user["created_at"]
        )
    }

@router.post("/login", response_model=schemas.Token)
async def login(credentials: schemas.UserLogin, db = Depends(get_database)):
    # Find user by email or mobile
    user = await db.users.find_one({"$or": [{"email": credentials.email}, {"mobile": credentials.email}]})
    if not user or not auth.verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/mobile or password"
        )
        
    user["id"] = str(user["_id"])
    access_token = auth.create_access_token(data={"sub": user["email"], "role": user["role"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": schemas.UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            mobile=user["mobile"],
            address=user["address"],
            role=user["role"],
            created_at=user["created_at"]
        )
    }
