from datetime import UTC, date, datetime, timedelta
from typing import Optional, Union


def utc_now() -> datetime:
    """Get current UTC datetime"""
    return datetime.now(UTC)


def parse_datetime(date_str: str) -> Optional[datetime]:
    """Parse datetime string to UTC datetime object"""
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.astimezone(UTC)
    except ValueError:
        return None


def add_time_delta(
    dt: datetime, days: int = 0, hours: int = 0, minutes: int = 0, seconds: int = 0
) -> datetime:
    """Add time delta to datetime"""
    delta = timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)
    return dt + delta


def is_future_date(dt: datetime) -> bool:
    """Check if datetime is in the future"""
    return dt > datetime.now(UTC)


def is_past_date(dt: datetime) -> bool:
    """Check if datetime is in the past"""
    return dt < datetime.now(UTC)


def get_start_of_day(dt: datetime) -> datetime:
    """Get start of day in UTC"""
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def get_end_of_day(dt: datetime) -> datetime:
    """Get end of day in UTC"""
    return dt.replace(hour=23, minute=59, second=59, microsecond=999999)


def to_datetime(
    date_value: Union[str, date, datetime, None], start_of_day: bool = True
) -> Optional[datetime]:
    """
    Convert various date formats to datetime object with UTC timezone.

    Args:
        date_value: Can be:
            - string in 'YYYY-MM-DD' format
            - datetime.date object
            - datetime.datetime object
            - None
        start_of_day: If True, sets time to 00:00:00, if False, sets time to 23:59:59

    Returns:
        datetime object with UTC timezone or None if input is None

    Examples:
        >>> to_datetime("2024-01-01")
        datetime(2024, 1, 1, 0, 0, tzinfo=UTC)
        >>> to_datetime(date(2024, 1, 1))
        datetime(2024, 1, 1, 0, 0, tzinfo=UTC)
        >>> to_datetime("2024-01-01", start_of_day=False)
        datetime(2024, 1, 1, 23, 59, 59, tzinfo=UTC)
    """
    if date_value is None:
        return None

    if isinstance(date_value, datetime):
        return (
            date_value.replace(tzinfo=UTC) if date_value.tzinfo is None else date_value
        )

    if isinstance(date_value, str):
        try:
            date_value = datetime.strptime(date_value, "%Y-%m-%d").date()
        except ValueError as e:
            raise ValueError(
                f"Invalid date format. Expected YYYY-MM-DD, got: {date_value}"
            ) from e

    if isinstance(date_value, date):
        time_component = datetime.min.time() if start_of_day else datetime.max.time()
        return datetime.combine(date_value, time_component, tzinfo=UTC)
