import re

_PHONE_SEPARATORS = re.compile(r"[\s\-().]")


def normalize_phone(value):
    """Normalize a phone number for storage while retaining old BD records.

    Accepts 7-15 digits, optionally prefixed with + or 00, and common visual
    separators. Bangladesh local 01XXXXXXXXX remains in its legacy local form
    so existing accounts and integrations continue to match.
    """
    text = _PHONE_SEPARATORS.sub("", str(value or "").strip())
    if not text:
        return None

    if text.startswith("00"):
        text = "+" + text[2:]

    if text.startswith("+"):
        digits = text[1:]
        if not digits.isdigit() or not 7 <= len(digits) <= 15 or digits.startswith("0"):
            return None
        # Keep Bangladesh mobile numbers in the existing local format.
        if digits.startswith("8801") and len(digits) == 13:
            return "0" + digits[3:]
        return "+" + digits

    if not text.isdigit() or not 7 <= len(text) <= 15:
        return None

    # Legacy Bangladesh local mobile number.
    if len(text) == 11 and text.startswith("01"):
        return text
    # International Bangladesh number without +.
    if len(text) == 13 and text.startswith("8801"):
        return "0" + text[3:]

    return text


def normalize_bd_phone(value):
    """Backward-compatible alias for older imports; now accepts international numbers."""
    return normalize_phone(value)


def phone_variants(normalized):
    """Return equivalent stored spellings for duplicate and login lookups."""
    if not normalized:
        return []

    value = str(normalized).strip()
    variants = [value]

    if value.startswith("+"):
        digits = value[1:]
        variants.extend([digits, "00" + digits])
        if digits.startswith("8801") and len(digits) == 13:
            local = "0" + digits[3:]
            variants.extend([local, "880" + local[1:], "+880" + local[1:]])
    elif value.startswith("01") and len(value) == 11:
        variants.extend(["880" + value[1:], "+880" + value[1:]])
    else:
        variants.extend(["+" + value, "00" + value])

    return list(dict.fromkeys(variants))
