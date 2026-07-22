from datetime import timedelta
from functools import wraps
from typing import Callable, Optional, Type, TypeVar

from fastapi import Response
from pydantic import BaseModel

from app.base.models import BaseResponse
from app.core import cache

T = TypeVar("T", bound=BaseModel)


def format_response(response_model: Type[T] = None, message: Optional[str] = None):
    """Decorator to format the response of a function"""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> BaseResponse:
            try:
                result = await func(*args, **kwargs)

                if isinstance(result, Response):
                    return result

                success_message = message or "Operation completed successfully"

                # Handle the case when result is None
                if result is None:
                    if (
                        isinstance(response_model, list)
                        or getattr(response_model, "__origin__", None) is list
                    ):
                        result = []

                return BaseResponse(
                    success=True,
                    data=result,
                    message=success_message,
                )
            except Exception as e:
                raise e

        if response_model:
            wrapper.__annotations__ = {
                "return": BaseResponse[response_model],
            }

        return wrapper

    return decorator


def cached(
    key_prefix: str,
    timeout: Optional[timedelta] = None,
    key_builder: Optional[callable] = None,
):
    """
    Cache decorator for API endpoints

    Args:
        key_prefix: Prefix for cache key
        timeout: Cache timeout
        key_builder: Custom function to build cache key
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default key builder using args and kwargs
                key_parts = [key_prefix]
                key_parts.extend(str(arg) for arg in args if arg is not None)
                key_parts.extend(f"{k}:{v}" for k, v in kwargs.items() if v is not None)
                cache_key = ":".join(key_parts)

            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Get fresh value
            result = await func(*args, **kwargs)

            # Cache the result
            await cache.set(cache_key, result, timeout)

            return result

        return wrapper

    return decorator
