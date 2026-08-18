from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

import crud, models, schemas
import ml_estimator
import booking_provider
from database import get_db

router = APIRouter(prefix="/readings", tags=["readings"])

def calculate_percent(weight: float, tare: float, full: float) -> float:
    if full <= tare:
        return 0.0
    percent = ((weight - tare) / (full - tare)) * 100.0
    return max(0.0, min(100.0, percent))

@router.post("/", response_model=schemas.Reading)
def create_reading(reading: schemas.ReadingCreate, db: Session = Depends(get_db)):
    device = crud.get_or_create_default_device(db)
    percent = calculate_percent(reading.weight, device.tare_weight, device.full_weight)
    
    db_reading = models.Reading(
        device_id=device.id,
        weight=reading.weight,
        percent=percent,
        is_estimated=False,
        timestamp=reading.timestamp or datetime.now(timezone.utc)
    )
    
    # Update EMA before saving new reading
    previous_reading = db.query(models.Reading).filter(
        models.Reading.device_id == device.id,
        models.Reading.is_estimated == False
    ).order_by(models.Reading.timestamp.desc()).first()
    
    if previous_reading:
        ml_estimator.update_ema_burn_rate(db, device, db_reading, previous_reading)

    db.add(db_reading)
    
    device.last_seen = db_reading.timestamp
    device.is_online = True
    
    # Trigger live auto-booking if below threshold
    if percent <= 15.0:
        booking_provider.provider.trigger_booking(db, device, trigger_source="live")
        
    db.commit()
    db.refresh(db_reading)
    return db_reading

@router.get("/", response_model=List[schemas.Reading])
def read_readings(limit: int = 50, db: Session = Depends(get_db)):
    device = crud.get_or_create_default_device(db)
    return db.query(models.Reading).filter(models.Reading.device_id == device.id).order_by(models.Reading.timestamp.desc()).limit(limit).all()
