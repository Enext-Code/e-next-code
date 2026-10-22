"""Philips monitor HL7. Kept separate from Mindray so the two code maps never mix.

Parsing is not implemented yet. A Philips message is acknowledged and logged,
and it is not written with the Mindray observation codes.
"""

NAME = "philips"


class PhilipsNotReady(Exception):
    """Raised when a Philips message arrives before that adapter exists."""


def matches(raw_hl7: str) -> bool:
    head = (raw_hl7 or "")[:400].upper()
    if "MINDRAY" in head or "EGATEWAY" in head:
        return False
    return "PHILIPS" in head


def decode(raw_hl7: str) -> dict:
    raise PhilipsNotReady("Philips HL7 adapter is not built yet")
