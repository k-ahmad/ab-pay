import re

# Bangladeshi mobile number in local format: 01XXXXXXXXX (11 digits).
_LOCAL_FORMAT = re.compile(r"01\d{9}")


def normalize_bd_phone(value):
    """
    Return a Bangladeshi mobile number in the standard local format
    (01XXXXXXXXX), or None if the value is not a valid number.

    Accepts: 01712345678, 8801712345678, +8801712345678, and the same
    numbers written with spaces, dashes or brackets.
    """
    text = re.sub(r"[\s\-()]", "", str(value or ""))

    if text.startswith("+"):
        text = text[1:]

    if text.startswith("880"):
        text = "0" + text[3:]

    if _LOCAL_FORMAT.fullmatch(text):
        return text

    return None


def phone_variants(normalized):
    """
    All spellings under which the same number may already be stored in the
    database (older records were saved exactly as the user typed them).
    """
    if not normalized:
        return []

    return [
        normalized,
        "880" + normalized[1:],
        "+880" + normalized[1:],
    ]
