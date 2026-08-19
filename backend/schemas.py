from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    mobile: str = Field(..., min_length=10)
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    address: str = Field(..., min_length=5)

class UserLogin(BaseModel):
    email: str # Can be email or mobile
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    mobile: str
    address: str
    role: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# Cylinder Schemas
class CylinderBase(BaseModel):
    name: str = "Gas Cylinder"
    tare_weight: float = 15.0 # kg
    full_weight: float = 29.2 # kg (14.2kg gas + 15kg tare)

class CylinderCreate(CylinderBase):
    pass

class CylinderResponse(CylinderBase):
    id: str
    owner_id: str
    current_weight: float
    current_percent: float
    temperature: float
    api_key: str
    last_seen: Optional[datetime] = None
    is_online: bool
    burn_rate_ema: float
    status: str
    estimated_days: Optional[float] = None

# Sensor Reading Schemas
class ReadingBase(BaseModel):
    device_id: str
    weight: float
    temperature: float = 28.0

class ReadingCreate(ReadingBase):
    timestamp: Optional[datetime] = None

class ReadingResponse(ReadingBase):
    id: str
    cylinder_id: str
    percent: float
    timestamp: datetime
    is_estimated: bool

# Booking Timeline Event
class TimelineEvent(BaseModel):
    status: str
    timestamp: datetime

# Booking Schemas
class BookingCreate(BaseModel):
    delivery_address: str
    contact_number: str
    delivery_preference: str = "Standard"

class BookingResponse(BaseModel):
    id: str
    booking_id: str
    user_id: str
    cylinder_id: str
    status: str
    delivery_address: str
    contact_number: str
    delivery_preference: str
    created_at: datetime
    updated_at: datetime
    timeline: List[TimelineEvent]

# Notification Schemas
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    read: bool
    created_at: datetime

# Admin Schemas
class AdminStats(BaseModel):
    total_users: int
    active_cylinders: int
    low_gas_cylinders: int
    critical_cylinders: int
    pending_bookings: int
    today_deliveries: int

class AdminCylinderRow(BaseModel):
    id: str
    user_name: str
    user_email: str
    level: float
    weight: float
    status: str
    is_online: bool
