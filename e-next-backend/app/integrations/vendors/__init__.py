"""One adapter per monitor vendor. The bed match in the service is shared."""

from .registry import VendorNotReady, decode_monitor_message

__all__ = ["VendorNotReady", "decode_monitor_message"]
