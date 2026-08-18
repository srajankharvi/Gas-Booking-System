from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
import models
from database import SessionLocal
import ml_estimator
import booking_provider

scheduler = BackgroundScheduler()

OFFLINE_THRESHOLD_MINUTES = 30
AUTO_BOOKING_THRESHOLD_PERCENT = 15.0

def process_offline_devices():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        # Get devices that are marked online but haven't been seen recently
        devices = db.query(models.Device).all()
        for device in devices:
            if not device.last_seen:
                continue
                
            # ensure tz aware
            last_seen = device.last_seen
            if last_seen.tzinfo is None:
                last_seen = last_seen.replace(tzinfo=timezone.utc)

            time_since_last_seen = (now - last_seen).total_seconds() / 60.0
            
            if time_since_last_seen > OFFLINE_THRESHOLD_MINUTES:
                device.is_online = False
                
                # Create estimated reading
                latest_reading = db.query(models.Reading).filter(
                    models.Reading.device_id == device.id,
                    models.Reading.is_estimated == False
                ).order_by(models.Reading.timestamp.desc()).first()
                
                if latest_reading:
                    hours_offline = time_since_last_seen / 60.0
                    burn_rate = device.burn_rate_ema or ml_estimator.DEFAULT_BURN_RATE
                    
                    est_weight = ml_estimator.estimate_current_weight(
                        latest_reading.weight, burn_rate, hours_offline
                    )
                    
                    # Calculate percentage
                    tare = device.tare_weight
                    full = device.full_weight
                    percent = 0.0
                    if full > tare:
                        percent = ((est_weight - tare) / (full - tare)) * 100.0
                        percent = max(0.0, min(100.0, percent))
                    
                    # Store estimated reading
                    est_reading = models.Reading(
                        device_id=device.id,
                        weight=est_weight,
                        percent=percent,
                        is_estimated=True,
                        timestamp=now
                    )
                    db.add(est_reading)
                    
                    # Trigger auto-booking if below threshold
                    if percent <= AUTO_BOOKING_THRESHOLD_PERCENT:
                        booking_provider.provider.trigger_booking(db, device, trigger_source="ml_estimate")
                        
        db.commit()
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(process_offline_devices, 'interval', minutes=15)
    scheduler.start()
