from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logger = logging.getLogger("GasTrack.Database")

client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
db = client[settings.DATABASE_NAME]

def get_database():
    return db

async def ping_database():
    try:
        await client.admin.command("ping")
        return True
    except Exception as e:
        logger.error(f"MongoDB connection failed: {str(e)}")
        return False

def close_database_connection():
    client.close()
