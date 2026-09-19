"""Map monitor observation codes to e-next vitals. Mindray first; other vendors later."""

from typing import Dict, Optional, Tuple

# vital_key -> preference (lower wins)
CODE_MAP: Dict[str, Tuple[str, int]] = {
    "147842": ("heart_rate", 1),
    "MDC_ECG_HEART_RATE": ("heart_rate", 1),
    "149530": ("heart_rate", 2),
    "MDC_PULS_OXIM_PULS_RATE": ("heart_rate", 2),
    "150456": ("spo2", 1),
    "MDC_PULS_OXIM_SAT_O2": ("spo2", 1),
    "150021": ("systolic", 1),
    "MDC_PRESS_BLD_NONINV_SYS": ("systolic", 1),
    "150037": ("systolic", 2),
    "150022": ("diastolic", 1),
    "MDC_PRESS_BLD_NONINV_DIA": ("diastolic", 1),
    "150038": ("diastolic", 2),
    "188424": ("temp_oral", 1),
    "MDC_TEMP_ORAL": ("temp_oral", 1),
    "150344": ("temp_oral", 2),
    "MDC_TEMP": ("temp_oral", 2),
    "150085": ("cvp", 1),
    "151562": ("respiratory_rate", 1),
    "MDC_RESP_RATE": ("respiratory_rate", 1),
    "151578": ("respiratory_rate", 2),
    "MDC_TTHOR_RESP_RATE": ("respiratory_rate", 2),
    # First decoder (Philips F001 / extra MDC) — kept commented, do not delete.
    # "F001-0013": ("heart_rate", 1),
    # "F001-000E": ("spo2", 1),
    # "MDC_PRESS_BLD_ART_SYS": ("systolic", 2),
    # "F001-08D3": ("systolic", 2),
    # "F001-01F5": ("systolic", 3),
    # "MDC_PRESS_BLD_ART_DIA": ("diastolic", 2),
    # "F001-08D4": ("diastolic", 2),
    # "F001-01F6": ("diastolic", 3),
    # "F001-0B5B": ("temp_oral", 2),
    # "283": ("temp_oral", 3),
    # "MNDRY_EWS_TEMP": ("temp_oral", 3),
    # "MDC_PRESS_BLD_VEN_CENT": ("cvp", 1),
    # "F001-0016": ("respiratory_rate", 1),
    # "150023": ("mean_bp", 1),
    # "MDC_PRESS_BLD_NONINV_MEAN": ("mean_bp", 1),
    # "150039": ("mean_bp", 2),
    # "F001-08D5": ("mean_bp", 2),
    # "F001-01F7": ("mean_bp", 3),
}

PROGRESS_SHEET_LABELS = {
    "heart_rate": "Heart Rate",
    "spo2": "SpO2",
    "systolic": "Systolic",
    "diastolic": "Diastolic",
    "temp_oral": "Temp Oral",
    "cvp": "CVP",
}


def lookup_code(code: str, name: str) -> Optional[Tuple[str, int]]:
    for key in (code, (code or "").upper(), name, (name or "").upper()):
        if key and key in CODE_MAP:
            return CODE_MAP[key]
    return None


def unit_is_celsius(unit_text: str) -> bool:
    text = (unit_text or "").upper()
    if "FAHR" in text:
        return False
    if text in {"CEL", "C", "°C", "DEGC"}:
        return True
    if "CEL" in text and "UCUM" in text:
        return True
    return "DEGC" in text


def celsius_to_fahrenheit(value: float) -> float:
    return round(value * 9 / 5 + 32, 1)
