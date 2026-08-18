from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    api_key = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, default="My Gas Cylinder")
    
    # Configuration
    tare_weight = Column(Float, default=15.0) # kg
    full_weight = Column(Float, default=29.2) # kg (14.2kg gas + 15kg tare)
    
    # Status
    last_seen = Column(DateTime(timezone=True), nullable=True)
    is_online = Column(Boolean, default=False)
    burn_rate_ema = Column(Float, default=0.05) # kg/hour
    
    readings = relationship("Reading", back_populates="device")
    bookings = relationship("Booking", back_populates="device")

class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    weight = Column(Float, nullable=False)
    percent = Column(Float, nullable=False)
    is_estimated = Column(Boolean, default=False)

    device = relationship("Device", back_populates="readings")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    status = Column(String, default="PENDING") 
    triggered_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    device = relationship("Device", back_populates="bookings")
