import re


# Common leetspeak/character substitution map used to evade filters
LEET_MAP = {
    "0": "o", "1": "i", "3": "e", "4": "a",
    "5": "s", "7": "t", "@": "a", "$": "s",
    "!": "i", "+": "t",
}

# Common intentional misspellings/obfuscations
OBFUSCATION_MAP = {
    r"p\.i\.c": "pic",
    r"s\.e\.x": "sex",
    r"d\.r\.u\.g": "drug",
    r"w\.e\.e\.d": "weed",
}


def normalize(text: str) -> str:
    """
    Normalise text before classification:
    1. Lowercase
    2. Collapse whitespace
    3. Decode leetspeak substitutions
    4. Decode dot-separated obfuscation (p.i.c → pic)
    5. Collapse repeated punctuation
    """
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)

    # Decode obfuscation patterns
    for pattern, replacement in OBFUSCATION_MAP.items():
        text = re.sub(pattern, replacement, text)

    # Decode leet characters
    for char, replacement in LEET_MAP.items():
        text = text.replace(char, replacement)

    # Collapse repeated punctuation spam
    text = re.sub(r"([!?.])\1{2,}", r"\1", text)

    return text