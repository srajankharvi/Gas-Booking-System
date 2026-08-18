from sqlalchemy.orm import Session
import models
import secrets

def get_device_by_api_key(db: Session, api_key: str):
    return db.query(models.Device).filter(models.Device.api_key == api_key).first()

def get_or_create_default_device(db: Session):
    device = db.query(models.Device).first()
    if not device:
        api_key = secrets.token_urlsafe(32)
        device = models.Device(api_key=api_key)
        db.add(device)
        db.commit()
        db.refresh(device)
    return device
