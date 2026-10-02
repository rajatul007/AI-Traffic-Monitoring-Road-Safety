import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure

logger = logging.getLogger("traffic_db")

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "traffic_monitoring_db")

client: AsyncIOMotorClient = None
db = None

# In-memory store fallback if MongoDB daemon is not currently active
in_memory_store = {
    "users": [],
    "traffic_events": [],
    "traffic_statistics": [],
    "cameras": []
}

async def connect_to_mongo():
    global client, db
    try:
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
        # Verify connection
        await client.admin.command('ping')
        db = client[DATABASE_NAME]
        logger.info(f"Connected to MongoDB at {MONGODB_URL}, database: {DATABASE_NAME}")
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB ({e}). Operating in resilient fallback mode.")
        db = None

async def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("Closed MongoDB connection.")

def get_database():
    return db
