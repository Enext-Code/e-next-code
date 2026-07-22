import random
import string
from datetime import datetime


def generate_username(existing_usernames: set = None) -> str:
    """Generate a unique username"""

    while True:
        # Generate 3 random uppercase letters
        letters = "".join(random.choices(string.ascii_uppercase, k=3))

        # Generate 7 random digits
        numbers = "".join(random.choices(string.digits, k=7))

        # Combine to create username
        username = f"{letters}{numbers}"

        if username not in existing_usernames:
            return username


def generate_random_string(prefix: str, length: int = 8) -> str:
    """Generate a random string"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_suffix = "".join(random.choices(string.digits, k=3))
    return f"{prefix.upper()}-{timestamp}-{random_suffix}"
