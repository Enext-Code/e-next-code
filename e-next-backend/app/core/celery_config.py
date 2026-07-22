from functools import lru_cache

from kombu import Queue

from .config import settings


class CeleryConfig:
    """Celery configuration"""

    # Broker settings
    broker_url = settings.CELERY_BROKER_URL
    result_backend = settings.CELERY_RESULT_BACKEND

    broker_connection_retry_on_startup = True

    # Task settings
    task_serializer = "json"
    accept_content = ["json"]
    result_serializer = "json"
    timezone = "UTC"
    enable_utc = True

    # Queue settings
    task_queues = (
        Queue("default", routing_key="default"),
        Queue("high_priority", routing_key="high_priority"),
        Queue("low_priority", routing_key="low_priority"),
        Queue("email_tasks", routing_key="email_tasks"),
    )

    task_default_queue = "default"
    task_default_routing_key = "default"

    # Task routes
    task_routes = {
        "app.celery_app.tasks.email_tasks.*": {"queue": "email_tasks"},
    }

    # Beat settings
    beat_schedule = {}

    # Task retry settings
    task_annotations = {
        "*": {
            "rate_limit": "10/s",
            "retry_backoff": True,
            "retry_backoff_max": 3600,
            "retry_jitter": False,
        }
    }


@lru_cache
def get_celery_config():
    """Get the celery configuration"""
    return CeleryConfig
