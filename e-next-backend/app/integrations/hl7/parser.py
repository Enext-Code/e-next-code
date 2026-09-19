"""Parse HL7 v2 ORU^R01 into hospital, bed, and vitals."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from .codes import (
    PROGRESS_SHEET_LABELS,
    celsius_to_fahrenheit,
    lookup_code,
    unit_is_celsius,
)

UNIT_ALIASES = {
    "MDC_DIM_BEAT_PER_MIN": "beats/min",
    "MDC_DIM_PERCENT": "%",
    "MDC_DIM_MMHG": "mmHg",
    "MDC_DIM_FAHR": "°F",
    "MDC_DIM_RESP_PER_MIN": "/min",
}

SEGMENT_START = re.compile(r"^[A-Z]{2,3}[0-9]?\|")
NUMERIC_ONLY = re.compile(r"^\d+$")
HL7_DTM = re.compile(
    r"^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?(?:\.\d+)?([+-]\d{4}|Z)?$"
)
IST = timezone(timedelta(hours=5, minutes=30))


def _strip_mllp(raw: str) -> str:
    return raw.replace("\x0b", "").replace("\x1c", "\n")


def _join_wrapped_lines(raw: str) -> str:
    text = _strip_mllp(raw).replace("\r\n", "\n").replace("\r", "\n")
    segments: List[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped or NUMERIC_ONLY.match(stripped):
            continue
        if SEGMENT_START.match(stripped):
            segments.append(stripped)
        elif segments:
            segments[-1] += stripped
    return "\r".join(segments)


def _split_messages(raw: str) -> List[str]:
    joined = _join_wrapped_lines(raw)
    if "MSH|" not in joined:
        return []
    parts = re.split(r"(?=MSH\|)", joined)
    return [part.strip("\r\n") for part in parts if part.strip().startswith("MSH|")]


def _fields(segment: str) -> List[str]:
    return segment.split("|")


def _component(field: str, index: int, separator: str = "^") -> str:
    parts = field.split(separator)
    if index >= len(parts):
        return ""
    return parts[index].strip()


def _parse_number(value: str) -> Optional[float]:
    text = (value or "").strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def parse_hl7_datetime(value: str) -> Optional[datetime]:
    """Parse HL7 TS (YYYYMMDDHHMMSS[.frac][+ZZZZ]) into an IST datetime."""
    text = (value or "").strip()
    if not text:
        return None
    match = HL7_DTM.match(text)
    if not match:
        return None
    year, month, day, hour, minute, second, tz_text = match.groups()
    try:
        dt = datetime(
            int(year),
            int(month),
            int(day),
            int(hour or 0),
            int(minute or 0),
            int(second or 0),
        )
    except ValueError:
        return None
    if tz_text and tz_text != "Z":
        sign = 1 if tz_text[0] == "+" else -1
        offset = timezone(
            sign * timedelta(hours=int(tz_text[1:3]), minutes=int(tz_text[3:5]))
        )
        dt = dt.replace(tzinfo=offset)
    elif tz_text == "Z":
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.replace(tzinfo=IST)
    return dt.astimezone(IST)


def resolve_progress_sheet_slot(
    observed: Optional[datetime],
    admission_date: date,
) -> Tuple[date, str, Optional[str]]:
    """Use HL7 date + hour the same way a nurse picks a progress-sheet slot."""
    now = datetime.now(IST)
    today = now.date()

    if observed is None:
        return today, f"{now.hour:02d}:00", "No HL7 timestamp; used current time"

    target_date = observed.date()
    target_hour = observed.hour

    # Old remapping (moved date/hour away from HL7) — kept commented, do not delete.
    # notes: List[str] = []
    # if target_date < admission_date:
    #     notes.append(
    #         f"HL7 time {observed.strftime('%d %b %Y %H:%M')} is before admission "
    #         f"({admission_date.strftime('%d %b %Y')}), so the sheet date was moved"
    #     )
    #     target_date = today if today >= admission_date else admission_date
    # if target_date > today:
    #     notes.append("HL7 date is in the future; using today")
    #     target_date = today
    # if target_date == today and target_hour > now.hour:
    #     notes.append(
    #         f"HL7 hour {target_hour:02d}:00 is still ahead of now; using current hour"
    #     )
    #     target_hour = now.hour

    notes: List[str] = []
    if target_date < admission_date:
        notes.append(
            f"HL7 date {target_date.strftime('%d %b %Y')} is before admission "
            f"({admission_date.strftime('%d %b %Y')})"
        )

    return target_date, f"{target_hour:02d}:00", "; ".join(notes) or None


# First decoder ACK helper — kept commented, do not delete.
# def generate_ack(
#     control_id: str,
#     sending_app: str = "",
#     sending_facility: str = "",
#     ack_code: str = "AA",
# ) -> str:
#     now = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
#     msh = (
#         f"MSH|^~\\&|eNext||{sending_app}|{sending_facility}|{now}"
#         f"||ACK^R01^ACK|{control_id}|P|2.6"
#     )
#     msa = f"MSA|{ack_code}|{control_id}"
#     return f"{msh}\r{msa}"


def _parse_bed_number(raw_bed: str) -> Optional[int]:
    text = (raw_bed or "").strip()
    if not text:
        return None
    if text.isdigit():
        return int(text)
    match = re.search(r"(\d+)", text)
    return int(match.group(1)) if match else None


def decode_hl7(raw_hl7: str) -> Dict[str, Any]:
    messages = _split_messages(raw_hl7 or "")
    if not messages:
        raise ValueError("No HL7 MSH message found")
    return {
        "message_count": len(messages),
        "messages": [_decode_one(message) for message in messages],
    }


def _decode_one(message: str) -> Dict[str, Any]:
    segments = [seg for seg in message.split("\r") if seg]
    msh = _fields(segments[0])
    encoding = msh[1] if len(msh) > 1 else "^~\\&"
    component_sep = encoding[0] if encoding else "^"

    pid = next((_fields(s) for s in segments if s.startswith("PID|")), None)
    pv1 = next((_fields(s) for s in segments if s.startswith("PV1|")), None)
    obr = next((_fields(s) for s in segments if s.startswith("OBR|")), None)
    obx_rows = [_fields(s) for s in segments if s.startswith("OBX|")]

    sending_app = msh[2] if len(msh) > 2 else ""
    sending_facility = msh[3] if len(msh) > 3 else ""
    sent_at = msh[6] if len(msh) > 6 else ""
    message_type = msh[8] if len(msh) > 8 else ""
    control_id = msh[9] if len(msh) > 9 else ""

    vendor = "unknown"
    sending_upper = f"{sending_app} {sending_facility}".upper()
    if "MINDRAY" in sending_upper or "EGATEWAY" in sending_upper:
        vendor = "mindray"
    elif "PHILIPS" in sending_upper:
        vendor = "philips"

    patient_id = ""
    patient_name = ""
    if pid:
        patient_id = _component(pid[3] if len(pid) > 3 else "", 0, component_sep)
        name_field = pid[5] if len(pid) > 5 else ""
        family = _component(name_field, 0, component_sep)
        given = _component(name_field, 1, component_sep)
        patient_name = " ".join(part for part in (given, family) if part).strip()
        if not patient_name and len(pid) > 4:
            patient_name = (pid[4] or "").strip()

    icu_name = room = bed_raw = hospital_name = device_mac = ""
    if pv1 and len(pv1) > 3:
        loc = pv1[3]
        icu_name = _component(loc, 0, component_sep)
        room = _component(loc, 1, component_sep)
        bed_raw = _component(loc, 2, component_sep)
        hospital_name = _component(loc, 3, component_sep)
        parts = loc.split(component_sep)
        if parts:
            last = parts[-1].strip()
            if re.match(r"^([0-9A-Fa-f]{2}[-:]){5}[0-9A-Fa-f]{2}$", last):
                device_mac = last

    observed_at = obr[7] if obr and len(obr) > 7 else sent_at
    device_id = ""
    candidates: Dict[str, Tuple[int, Dict[str, Any]]] = {}

    for obx in obx_rows:
        value_type = obx[2] if len(obx) > 2 else ""
        ident = obx[3] if len(obx) > 3 else ""
        code = _component(ident, 0, component_sep)
        name = _component(ident, 1, component_sep)
        raw_value = obx[5] if len(obx) > 5 else ""
        unit_field = obx[6] if len(obx) > 6 else ""
        unit_name = _component(unit_field, 1, component_sep) or _component(
            unit_field, 0, component_sep
        )
        obx_time = obx[14] if len(obx) > 14 else observed_at
        if not device_id and len(obx) > 18:
            device_id = _component(obx[18], 0, component_sep)

        mapped = lookup_code(code, name)
        numeric = _parse_number(raw_value) if value_type in ("", "NM", "NA") else None
        if not mapped or numeric is None:
            continue

        vital_key, preference = mapped
        value = numeric
        if vital_key == "temp_oral":
            if unit_is_celsius(unit_field or unit_name):
                value = celsius_to_fahrenheit(numeric)
            unit = "°F"
        else:
            unit = UNIT_ALIASES.get((unit_name or "").upper(), unit_name)

        current = candidates.get(vital_key)
        if current is None or preference < current[0]:
            candidates[vital_key] = (
                preference,
                {
                    "value": value,
                    "unit": unit,
                    "source": name or code,
                    "code": code,
                    "observed_at": obx_time,
                },
            )

    vitals = {key: payload for key, (_, payload) in candidates.items()}
    progress_sheet: Dict[str, str] = {}
    for key, label in PROGRESS_SHEET_LABELS.items():
        item = vitals.get(key)
        if item is None:
            continue
        value = item["value"]
        progress_sheet[label] = (
            str(int(value)) if float(value).is_integer() else str(value)
        )

    return {
        "vendor": vendor,
        "message_type": message_type,
        "control_id": control_id,
        "sent_at": sent_at,
        "observed_at": observed_at,
        "device_id": device_id,
        "device_mac": device_mac,
        "patient": {"id": patient_id, "name": patient_name},
        "location": {
            "hospital": hospital_name,
            "icu": icu_name,
            "room": room,
            "bed": bed_raw,
            "bed_number": _parse_bed_number(bed_raw),
        },
        "vitals": vitals,
        "progress_sheet_vitals": progress_sheet,
    }
