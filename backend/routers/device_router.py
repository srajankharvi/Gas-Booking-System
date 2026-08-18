from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

import crud, models, schemas
from database import get_db

router = APIRouter(prefix="/devices", tags=["devices"])

@router.get("/default", response_model=schemas.Device)
def read_default_device(db: Session = Depends(get_db)):
    return crud.get_or_create_default_device(db)
