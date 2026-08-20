import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()

# Extract exactly as requested by user
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "gas_iot")
DEVICE_API_KEY = os.getenv("DEVICE_API_KEY")
LOW_WEIGHT_THRESHOLD = float(os.getenv("LOW_WEIGHT_THRESHOLD", "10"))
CRITICAL_WEIGHT_THRESHOLD = float(os.getenv("CRITICAL_WEIGHT_THRESHOLD", "5"))

if not MONGO_URI:
    print("MONGO_URI is not configured. Please create a .env file.")
    # We allow the app to continue so the lifespan ping can fail gracefully
    # rather than crashing on import, allowing the health check to work.

# Keep Pydantic settings for existing app components (JWT, etc.)
class Settings(BaseSettings):
    MONGODB_URL: str = MONGO_URI or "mongodb://localhost:27017"
    DATABASE_NAME: str = MONGO_DB_NAME
    DEVICE_API_KEY: str = DEVICE_API_KEY or "fallback-key"
    LOW_WEIGHT_THRESHOLD: float = LOW_WEIGHT_THRESHOLD
    CRITICAL_WEIGHT_THRESHOLD: float = CRITICAL_WEIGHT_THRESHOLD
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-jwt-key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

settings = Settings()
