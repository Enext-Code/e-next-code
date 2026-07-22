import logging

from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings


class MongoDB:
    """MongoDB client"""

    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_to_database(cls):
        try:
            cls.client = AsyncIOMotorClient(settings.MONGODB_URL)
            cls.db = cls.client[settings.MONGODB_DB_NAME]
            logging.info("Connected to MongoDB!")

            # Verify the connection
            await cls.client.admin.command("ping")
            logging.info(
                "MongoDB connection verified - Pinged your deployment. You successfully connected to MongoDB!"
            )

        except Exception as e:
            logging.error(f"Could not connect to MongoDB: {e}")
            raise

    @classmethod
    async def close_database_connection(cls):
        try:
            if cls.client:
                cls.client.close()
                logging.info("MongoDB connection closed.")
        except Exception as e:
            logging.error(f"Could not close MongoDB connection: {e}")
            raise
