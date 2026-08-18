from datetime import datetime, timezone
import models
from sqlalchemy.orm import Session

ALPHA = 0.2
DEFAULT_BURN_RATE = 0.05 # kg per hour

def update_ema_burn_rate(db: Session, device: models.Device, current_reading: models.Reading, previous_reading: models.Reading):
    if not previous_reading:
        return
        
    time_diff_hours = (current_reading.timestamp - previous_reading.timestamp).total_seconds() / 3600.0
    if time_diff_hours <= 0:
        return

    weight_drop = previous_reading.weight - current_reading.weight
    
    # Filter out cylinder swaps (weight increases) or massive drops
    if weight_drop < 0 or weight_drop > 5.0:
        return

    observed_rate = weight_drop / time_diff_hours
    prev_ema = device.burn_rate_ema or DEFAULT_BURN_RATE
    
    new_ema = ALPHA * observed_rate + (1 - ALPHA) * prev_ema
    device.burn_rate_ema = new_ema
    db.commit()

def estimate_current_weight(last_weight: float, burn_rate: float, hours_offline: float) -> float:
    estimated = last_weight - (burn_rate * hours_offline)
    return max(0.0, estimated)
