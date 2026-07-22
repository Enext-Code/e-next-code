import os
import sys

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import the Celry App
from app.celery_app.celery import celery

# This allows Celery to find the app when workers are spawned
if __name__ == "__main__":
    celery.start()
