import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://<your-cluster-url>")
DB_NAME = os.getenv("MONGO_DB_NAME", "gas_booking_db")

async def clean_mock_data():
    if "<your-cluster-url>" in MONGO_URI:
        print("Please configure your .env file with the correct MONGO_URI.")
        return
        
    print(f"Connecting to MongoDB: {MONGO_URI}")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Check if we can connect
    try:
        await client.admin.command('ping')
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        return

    # Delete all sensor readings
    print("Deleting old sensor readings...")
    result = await db.sensor_readings.delete_many({})
    print(f"Deleted {result.deleted_count} sensor reading documents.")

    # Reset cylinder stats (burn_rate_ema)
    print("Resetting cylinder burn_rate_ema to default (0.05)...")
    result = await db.cylinders.update_many(
        {},
        {"$set": {"burn_rate_ema": 0.05}}
    )
    print(f"Reset burn_rate_ema for {result.modified_count} cylinders.")

    print("Cleanup complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(clean_mock_data())
