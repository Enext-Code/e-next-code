from typing import Optional, Union

from ..enums import ParameterInfo


def calculate_status(
    value: Union[int, float, str], param_info: Optional[ParameterInfo]
) -> Optional[str]:
    """Calculate the status (Normal, Low, High) based on the value and parameter info"""
    if not param_info or value is None:
        return None

    # Try to convert value to float for comparison
    try:
        numeric_value = float(value)
    except (ValueError, TypeError):
        # If value cannot be converted to float, return None
        return None

    min_val = param_info.min_value
    max_val = param_info.max_value

    # If no range defined, return None
    if min_val is None and max_val is None:
        return None

    # Handle cases where only min or max is defined
    if min_val is not None and max_val is not None:
        # Both min and max defined
        if numeric_value < min_val:
            return "Low"
        elif numeric_value > max_val:
            return "High"
        else:
            return "Normal"
    elif min_val is not None:
        # Only min defined
        if numeric_value < min_val:
            return "Low"
        else:
            return "Normal"
    elif max_val is not None:
        # Only max defined
        if numeric_value > max_val:
            return "High"
        else:
            return "Normal"

    return None


def get_formatted_value_with_status(
    value: Union[int, float, str], status: Optional[str]
) -> str:
    """Format value with status for display"""
    if status:
        return f"{value} {status}"
    return str(value)
