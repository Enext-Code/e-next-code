import os
from typing import Any, Dict


def get_logging_config() -> Dict[str, Any]:
    """Get logging configuration"""

    LOG_DIR = "/var/log/e-next-backend"
    LOG_FILE = os.path.join(LOG_DIR, "e-next-backend.log")

    return {
        "LOG_DIR": LOG_DIR,
        "LOG_FILE": LOG_FILE,
        "ROTATION_SETTINGS": {
            "when": "midnight",
            "interval": 1,
            "backup_count": 30,
            "encoding": "utf-8",
        },
        "LOG_FORMAT": "%(asctime)s - %(levelname)s - [%(request_id)s] %(message)s",
        "DATE_FORMAT": "%Y-%m-%d %H:%M:%S",
    }
