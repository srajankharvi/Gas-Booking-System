from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from config import settings
from database import get_database

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

from fastapi import Header

def verify_iot_api_key(x_api_key: str = Header(default=None, alias="X-API-Key")):
    if not settings.DEVICE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Device API authentication is not configured"
        )
        
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing Device API Key"
        )
        
    if x_api_key != settings.DEVICE_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid Device API Key"
        )
        
    return True

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_database)):
    # Auto-login a default user for simplicity
    default_user = await db.users.find_one({"email": "demo@gastrack.com"})
    if not default_user:
        hashed_password = get_password_hash("password123")
        new_user = {
            "name": "John Student",
            "email": "demo@gastrack.com",
            "mobile": "9876543210",
            "hashed_password": hashed_password,
            "address": "123 Smart Street, Tech City",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        }
        result = await db.users.insert_one(new_user)
        default_user = new_user
        
    # Ensure cylinder always exists for demo-user-id
    cylinder = await db.cylinders.find_one({"owner_id": "demo-user-id"})
    if not cylinder:
        new_cylinder = {
            "owner_id": "demo-user-id",
            "name": "Primary Cylinder",
            "tare_weight": 15.0,
            "full_weight": 29.2,
            "current_weight": 29.2,
            "current_percent": 100.0,
            "temperature": 27.5,
            "api_key": "GT-DEMODEVICEKEY",
            "last_seen": datetime.now(timezone.utc),
            "is_online": True,
            "burn_rate_ema": 0.05,
            "status": "Good"
        }
        await db.cylinders.insert_one(new_cylinder)
        
    default_user["id"] = "demo-user-id"
    return default_user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    return current_user
