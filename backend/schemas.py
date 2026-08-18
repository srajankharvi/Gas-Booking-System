from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Device Schemas
class DeviceBase(BaseModel):
    name: str = "Gas Cylinder"
    tare_weight: float = 15.0
    full_weight: float = 29.2

class DeviceCreate(DeviceBase):
    pass

class Device(DeviceBase):
    id: int
    api_key: str
    last_seen: Optional[datetime] = None
    is_online: bool = False
    burn_rate_ema: float

    class Config:
        from_attributes = True

# Reading Schemas
class ReadingBase(BaseModel):
    weight: float
    timestamp: Optional[datetime] = None

class ReadingCreate(ReadingBase):
    pass

class ReadingBatchCreate(BaseModel):
    readings: List[ReadingBase]

class Reading(ReadingBase):
    id: int
    device_id: int
    timestamp: datetime
    percent: float
    is_estimated: bool

    class Config:
        from_attributes = True

# Booking Schemas
class BookingBase(BaseModel):
    pass

class BookingCreate(BookingBase):
    pass

class Booking(BookingBase):
    id: int
    device_id: int
    status: str
    triggered_by: str
    created_at: datetime

    class Config:
        from_attributes = True
