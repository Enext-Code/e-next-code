from celery import Celery

from app.core import get_celery_config


def create_celery():
    """Create a Celery app"""
    celery_app = Celery("enext_backend")

    # Load config
    celery_config = get_celery_config()
    celery_app.config_from_object(celery_config)

    # Add email task routing
    celery_app.conf.task_routes = {
        "app.celery_app.tasks.email_tasks.*": {"queue": "email_tasks"},
    }

    # Auto-discover tasks
    celery_app.autodiscover_tasks(
        [
            "app.celery_app.tasks",
            "app.celery_app.tasks.email_tasks",
        ]
    )

    return celery_app


celery = create_celery()

app = celery
