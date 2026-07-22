import gzip
import json
import logging
import os
import shutil
import sys
import time
import uuid
from datetime import datetime
from logging.handlers import TimedRotatingFileHandler
from typing import Callable

from colorama import Back, Fore, Style, init
from fastapi import Request

# Initialize colorama
init(autoreset=True)


class GZipRotator:
    """Custom log rotator that compresses old log files"""

    def __call__(self, source, dest):
        """Rotate log files"""
        if os.path.exists(source):
            with open(source, "rb") as f_in:
                with gzip.open(f"{dest}.gz", "wb") as f_out:
                    shutil.copyfileobj(f_in, f_out)
            os.remove(source)


class CustomTimedRotatingFileHandler(TimedRotatingFileHandler):
    """Enhanced TimedRotatingFileHandler with custom naming and compression"""

    def __init__(
        self,
        filename,
        when="midnight",
        interval=1,
        backup_count=30,
        encoding="utf-8",
        delay=False,
        utc=False,
    ):
        """Initialize the custom timed rotating file handler"""
        # Ensure the log directory exists
        log_dir = os.path.dirname(filename)
        try:
            if not os.path.exists(log_dir):
                os.makedirs(log_dir, exist_ok=True)
                # Set directory permissions (755)
                os.chmod(log_dir, 0o755)
        except Exception as e:
            print(f"Error creating log directory: {e}")

        super().__init__(
            filename=filename,
            when=when,
            interval=interval,
            backupCount=backup_count,
            encoding=encoding,
            delay=delay,
            utc=utc,
        )
        self.rotator = GZipRotator()

    def rotation_filename(self, default_name):
        """Generate the rotated file name"""
        dir_name, base_name = os.path.split(default_name)
        date_str = datetime.now().strftime("%Y-%m-%d")
        return os.path.join(dir_name, f"{base_name}.{date_str}")


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for different log levels"""

    COLORS = {
        "DEBUG": Fore.CYAN,
        "INFO": Fore.GREEN,
        "WARNING": Fore.YELLOW,
        "ERROR": Fore.RED,
        "CRITICAL": Fore.WHITE + Back.RED,
    }

    ICONS = {
        "DEBUG": "🔍",
        "INFO": "✨",
        "WARNING": "⚠️",
        "ERROR": "❌",
        "CRITICAL": "💥",
    }

    def __init__(self, colored=True):
        """Initialize the colored formatter"""
        super().__init__()
        self.colored = colored

    def format(self, record):
        """Format the log record"""
        # Generate a short request ID if not present
        if not hasattr(record, "request_id"):
            record.request_id = str(uuid.uuid4())[:8]

        # Calculate timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S")

        # Format the message
        if isinstance(record.msg, dict):
            record.msg = json.dumps(record.msg, indent=2)

        if self.colored:
            # Colored output for console
            level_color = self.COLORS.get(record.levelname, "")
            icon = self.ICONS.get(record.levelname, "•")

            header = (
                f"{Fore.BLUE}{timestamp}{Style.RESET_ALL} "
                f"{level_color}{icon} {record.levelname:<8}{Style.RESET_ALL} "
                f"{Fore.MAGENTA}[{record.request_id}]{Style.RESET_ALL}"
            )
        else:
            # Plain output for file
            icon = self.ICONS.get(record.levelname, "•")
            header = f"{timestamp} {icon} {record.levelname:<8} [{record.request_id}]"

        # Format the message with indentation for multiline logs
        message_lines = str(record.msg).split("\n")
        formatted_message = "\n".join(f"{'':>4}{line}" for line in message_lines)

        return f"{header} {formatted_message}"


class RequestLogger:
    """Request logger middleware"""

    def __init__(self, app: Callable):
        """Initialize the request logger middleware"""
        self.app = app
        self.logger = self._setup_logger()

    def _setup_logger(self):
        """Setup the logger"""
        logger = logging.getLogger("request_logger")
        logger.setLevel(logging.INFO)

        # Remove any existing handlers
        logger.handlers.clear()

        try:
            # Console Handler with colors
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(ColoredFormatter(colored=True))
            logger.addHandler(console_handler)

            # File Handler with rotation
            log_file = "/var/log/e-next-backend/e-next-backend.log"
            file_handler = CustomTimedRotatingFileHandler(
                filename=log_file,
                when="midnight",
                interval=1,
                backup_count=30,
                encoding="utf-8",
            )
            file_handler.setFormatter(ColoredFormatter(colored=False))
            logger.addHandler(file_handler)

        except Exception as e:
            print(f"Error setting up logger: {e}")
            # If file logging fails, continue with console logging only
            pass

        return logger

    def _get_request_details(self, request: Request) -> dict:
        """Get detailed request information"""
        try:
            return {
                "method": request.method,
                "url": str(request.url),
                "client_host": request.client.host if request.client else "unknown",
                "headers": dict(request.headers),
                "path_params": dict(request.path_params),
                "query_params": str(request.query_params),
            }
        except Exception as e:
            return {
                "method": request.method,
                "url": str(request.url),
                "error": f"Failed to get complete request details: {str(e)}",
            }

    async def __call__(self, scope, receive, send):
        """Call the request logger middleware"""
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        start_time = time.time()
        request_id = str(uuid.uuid4())[:8]
        request = Request(scope, receive)

        # Add request ID to log record
        old_factory = logging.getLogRecordFactory()

        def record_factory(*args, **kwargs):
            record = old_factory(*args, **kwargs)
            record.request_id = request_id
            return record

        logging.setLogRecordFactory(record_factory)

        try:
            # Get request details
            request_details = self._get_request_details(request)

            # Log request start
            self.logger.info(
                {
                    "event": "Request Started",
                    "request": {
                        "id": request_id,
                        "method": request_details["method"],
                        "url": request_details["url"],
                        "client": request_details.get("client_host", "unknown"),
                    },
                }
            )

            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    duration = time.time() - start_time
                    status_code = message["status"]

                    # Log response
                    self.logger.info(
                        {
                            "event": "Request Completed",
                            "response": {
                                "status_code": status_code,
                                "duration_ms": f"{duration * 1000:.2f}ms",
                                "request_id": request_id,
                            },
                        }
                    )

                await send(message)

            await self.app(scope, receive, send_wrapper)

        except Exception as e:
            self.logger.error(
                {
                    "event": "Request Failed",
                    "error": {
                        "type": type(e).__name__,
                        "message": str(e),
                        "request_id": request_id,
                    },
                }
            )
            raise
        finally:
            # Reset log record factory
            logging.setLogRecordFactory(old_factory)
