from sqlalchemy.orm import Session
import models

class BookingProvider:
    def trigger_booking(self, db: Session, device: models.Device, trigger_source: str):
        raise NotImplementedError

class MockBookingProvider(BookingProvider):
    def trigger_booking(self, db: Session, device: models.Device, trigger_source: str):
        # Check if there's already a pending booking
        existing_booking = db.query(models.Booking).filter(
            models.Booking.device_id == device.id,
            models.Booking.status == "PENDING"
        ).first()
        
        if existing_booking:
            return existing_booking
            
        print(f"[MOCK BOOKING] Triggering auto-booking for device {device.id} via {trigger_source}")
        
        booking = models.Booking(
            device_id=device.id,
            status="PENDING",
            triggered_by=trigger_source
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
        return booking

provider = MockBookingProvider()
