"""Mindray eGateway ORU^R01. Philips codes do not belong in this module."""

from app.integrations.hl7.parser import decode_hl7

NAME = "mindray"


def matches(raw_hl7: str) -> bool:
    head = (raw_hl7 or "")[:400].upper()
    return "MINDRAY" in head or "EGATEWAY" in head


def decode(raw_hl7: str) -> dict:
    return decode_hl7(raw_hl7)
