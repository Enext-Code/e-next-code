from datetime import UTC, datetime
from typing import Any, Dict


def remove_none_values(data: Dict[str, Any]) -> Dict[str, Any]:
    """Remove None values from a dictionary"""
    return {k: v for k, v in data.items() if v is not None}


def get_current_timestamp() -> datetime:
    """Get current timestamp"""
    return datetime.now(UTC)


def format_timestamp(dt: datetime, include_tz: bool = True) -> str:
    """Format datetime to ISO 8601 format"""
    if include_tz:
        return dt.isoformat()
    return dt.replace(tzinfo=None).isoformat()
