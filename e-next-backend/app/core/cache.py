import asyncio
import json
import logging
from datetime import UTC, date, datetime, timedelta
from typing import Any, Awaitable, Callable, Optional

from bson import ObjectId
from redis import Redis

from .config import settings

logger = logging.getLogger(__name__)


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for Redis cache"""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return {"__datetime__": obj.isoformat()}
        if isinstance(obj, date):
            return {"__date__": obj.isoformat()}
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)


def json_decoder(obj: dict) -> Any:
    """Custom JSON decoder for Redis cache"""
    if "__datetime__" in obj:
        return datetime.fromisoformat(obj["__datetime__"])
    if "__date__" in obj:
        return date.fromisoformat(obj["__date__"])
    return obj


class RedisCache:
    """Redis cache manager"""

    def __init__(self):
        self.connection_params = {
            "host": settings.REDIS_HOST,
            "port": settings.REDIS_PORT,
            "db": settings.REDIS_DB1,
            "decode_responses": True,
            "socket_timeout": 5,
            "socket_connect_timeout": 5,
        }

        try:
            logger.info(
                f"Connecting to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}"
            )
            self.redis_client = Redis(**self.connection_params)
            self.redis_client.ping()
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None

        self.default_timeout = timedelta(minutes=settings.REDIS_CACHE_TIMEOUT)
        self.refresh_threshold = 0.75
        self.background_tasks = set()

    async def get(self, key: str) -> Any:
        """Get value from cache"""
        try:
            if not self.redis_client:
                return None

            value = self.redis_client.get(key)
            if value:
                return json.loads(value, object_hook=json_decoder)
            return None
        except Exception as e:
            return None

    async def set(
        self, key: str, value: Any, timeout: Optional[timedelta] = None
    ) -> bool:
        """Set value in cache with optional timeout"""
        try:
            if not self.redis_client:
                return False

            timeout = timeout or self.default_timeout
            serialized_value = json.dumps(value, cls=JSONEncoder)

            return self.redis_client.setex(
                key, int(timeout.total_seconds()), serialized_value
            )
        except Exception as e:
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            if not self.redis_client:
                return False
            return bool(self.redis_client.delete(key))
        except Exception as e:
            return False

    async def delete_pattern(self, pattern: str) -> bool:
        """Delete all keys matching pattern"""
        try:
            if not self.redis_client:
                return False

            keys = self.redis_client.keys(pattern)
            if keys:
                return bool(self.redis_client.delete(*keys))
            return True
        except Exception as e:
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            if not self.redis_client:
                return False
            return bool(self.redis_client.exists(key))
        except Exception as e:
            return False

    async def ttl(self, key: str) -> int:
        """Get remaining TTL for key in seconds"""
        try:
            if not self.redis_client:
                return -2
            return self.redis_client.ttl(key)
        except Exception as e:
            return -2

    async def get_with_refresh(
        self,
        key: str,
        fetch_func: Callable[..., Awaitable[Any]],
        *fetch_args,
        timeout: Optional[timedelta] = None,
        **fetch_kwargs,
    ) -> Optional[Any]:
        """
        Get value from cache with background refresh capability

        Args:
            key: Cache key
            fetch_func: Async function to fetch fresh data
            fetch_args: Arguments for fetch function
            timeout: Cache timeout
            fetch_kwargs: Keyword arguments for fetch function
        """
        try:
            # Get current data and metadata
            data = await self.get(key)
            metadata = await self.get(f"{key}:meta")

            current_time = datetime.now(UTC)

            if data is not None and metadata:
                # Check if we need to trigger background refresh
                last_update = datetime.fromisoformat(metadata.get("last_update"))
                ttl = metadata.get("ttl")

                if ttl:
                    expiry_time = last_update + timedelta(seconds=ttl)
                    time_until_expiry = (expiry_time - current_time).total_seconds()

                    # If 75% of TTL has passed, trigger background refresh
                    if time_until_expiry > 0 and time_until_expiry < (
                        ttl * (1 - self.refresh_threshold)
                    ):
                        self._schedule_background_refresh(
                            key, fetch_func, timeout, fetch_args, fetch_kwargs
                        )

                return data

            # If no data in cache, fetch synchronously
            return await self._fetch_and_cache(
                key, fetch_func, timeout, fetch_args, fetch_kwargs
            )

        except Exception as e:
            # On cache error, fetch directly
            return await fetch_func(*fetch_args, **fetch_kwargs)

    def _schedule_background_refresh(
        self,
        key: str,
        fetch_func: Callable,
        timeout: Optional[timedelta],
        fetch_args: tuple,
        fetch_kwargs: dict,
    ) -> None:
        """Schedule background refresh of cache data"""
        task = asyncio.create_task(
            self._fetch_and_cache(key, fetch_func, timeout, fetch_args, fetch_kwargs)
        )
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)

    async def _fetch_and_cache(
        self,
        key: str,
        fetch_func: Callable,
        timeout: Optional[timedelta],
        fetch_args: tuple,
        fetch_kwargs: dict,
    ) -> Any:
        """Fetch fresh data and update cache"""
        try:
            # Fetch fresh data
            fresh_data = await fetch_func(*fetch_args, **fetch_kwargs)

            if fresh_data is not None:
                # Store data
                timeout = timeout or self.default_timeout
                await self.set(key, fresh_data, timeout)

                # Store metadata
                metadata = {
                    "last_update": datetime.utcnow().isoformat(),
                    "ttl": int(timeout.total_seconds()),
                }
                await self.set(f"{key}:meta", metadata, timeout)

            return fresh_data

        except Exception as e:
            return None

    async def set_through(
        self,
        key: str,
        value: Any,
        store_func: Callable[..., Awaitable[Any]],
        *store_args,
        timeout: Optional[timedelta] = None,
        **store_kwargs,
    ) -> bool:
        """
        Write Through cache implementation

        Args:
            key: Cache key
            value: Value to store
            store_func: Async function to store data in primary storage
            store_args: Arguments for store function
            timeout: Cache timeout
            store_kwargs: Keyword arguments for store function
        """
        try:
            # Store in primary storage first
            await store_func(*store_args, **store_kwargs)

            # Then cache
            return await self.set(key, value, timeout)

        except Exception as e:
            return False


cache = RedisCache()
