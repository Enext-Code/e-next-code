"""Pick a vendor adapter from the HL7 header. Matching a bed stays outside this package."""

from app.base.models import ValidationError

from . import mindray, philips
from .philips import PhilipsNotReady


class VendorNotReady(Exception):
    def __init__(self, vendor: str, message: str):
        self.vendor = vendor
        super().__init__(message)


def decode_monitor_message(raw_hl7: str) -> dict:
    if philips.matches(raw_hl7):
        try:
            return philips.decode(raw_hl7)
        except PhilipsNotReady as exc:
            raise VendorNotReady("philips", str(exc)) from exc
    if mindray.matches(raw_hl7):
        return mindray.decode(raw_hl7)
    raise ValidationError(
        message="HL7 vendor is not Mindray or Philips",
        error_code="HL7_VENDOR_UNKNOWN",
    )
