"""
Layer 4 — Coded language, emoji, and slang decoder.

Predators and dealers use coded language specifically to evade
keyword filters. This layer decodes emojis, number codes, and
innocent-sounding phrases that carry hidden meaning in context.

Sources:
- Law enforcement drug slang databases
- NCMEC grooming pattern research
- DEA drug slang reference
"""
import re

# ---------------------------------------------------------------------------
# Emoji codes
# ---------------------------------------------------------------------------
DRUG_EMOJIS = {
    "🍃": "weed",
    "🌿": "weed",
    "🍀": "weed",
    "🌱": "weed",
    "🌳": "weed",         # "tree" slang
    "❄️": "cocaine",
    "⛄": "cocaine",
    "🏔️": "cocaine",
    "🌨️": "cocaine",       # "snow" reference
    "🍄": "shrooms",
    "💊": "pills",
    "💉": "injection drugs",
    "🎱": "cocaine 8ball",
    "🧪": "drugs",
    "⚗️": "drug manufacturing",
    "🔫": "gun",
    "🪖": "weapon",
    "🔪": "weapon",
    "🦋": "trafficking",   # used in trafficking networks
    "🌹": "heroin",        # dark web markets
    "🍬": "mdma pills",
    "🍭": "mdma pills",
    "🍫": "drug package",
    "📦": "drug package",
    "🎁": "drug package",
    "✉️": "drug shipment",   # "mailing" drugs
    "💰": "money deal",
    "💵": "money deal",
    "🤑": "money deal",
    "👻": "snapchat/disappearing",  # moving to disappearing messages
    "🔒": "secrecy",
    "🤫": "secrecy keep quiet",
    "🙈": "secrecy hide",
    "🚬": "smoking reference",
}

GROOMING_EMOJIS = {
    "😏": "suggestive",
    "🍆": "sexual",
    "🍑": "sexual",
    "💦": "sexual",
    "🔥": "sexual flirting",   # in context with minors
    "❤️‍🔥": "sexual flirting",
    "🥵": "sexual",
    "👅": "sexual",
    "😈": "sexual/manipulative",
    "👙": "sexual nudity request",
    "🩲": "sexual nudity request",
    "📸": "photo request",
    "🤳": "selfie request",
    "📹": "video request",
    "🎥": "video request",
    "🍼": "age-related grooming reference",  # baby/infantilizing language
    "🎈": "meetup coordination",              # innocuous-seeming meetup code
    "📍": "location sharing request",
    "🗺️": "location sharing request",
}

# ---------------------------------------------------------------------------
# Number / alphanumeric codes
# ---------------------------------------------------------------------------
NUMBER_CODES = {
    r"\b420\b": "cannabis reference",
    r"\b710\b": "cannabis oil reference",
    r"\b187\b": "violence threat",
    r"\b411\b": "information hookup",
    r"\b4:20\b": "cannabis reference",
    r"\bcp\b": "child pornography",      # must be matched carefully
    r"\bjb\b": "jailbait reference",
    r"\bbd\b": "big dealer",
    r"\bqp\b": "quarter pound drugs",
    r"\bhp\b": "half pound drugs",
    r"\bqo\b": "quarter ounce drugs",
}

# ---------------------------------------------------------------------------
# Coded innocent-sounding phrases used in drug dealing / grooming
# ---------------------------------------------------------------------------
CODE_PHRASES = {
    "high": [
        # drug dealing
        r"(are\s+you\s+)?(hungry|thirsty|craving)\s*\?",          # "are you hungry?" = want drugs
        r"i\s+have\s+a\s+(present|gift|surprise)\s+for\s+you",    # gift = drugs
        r"(looking\s+for\s+)?(party\s+)?(supplies|favours|goods)",# party supplies = drugs
        r"(can\s+you\s+)?hook\s+me\s+up",
        r"(i\s+know\s+a\s+)?guy\s+(who\s+can\s+get|that\s+has)",
        r"white\s+(rabbit|girl|lady|horse)",                       # cocaine/heroin code
        r"(the\s+)?green\s+(stuff|thing|goods)",                   # cannabis code
        r"(do\s+you\s+)?(want\s+to\s+)?party(\s+tonight|\s+with\s+me)?",
        r"(i\s+can\s+)?(make\s+it\s+worth\s+your\s+while)",
        # grooming
        r"you\s+(remind\s+me\s+of|look\s+like)\s+(a\s+)?(model|actress|influencer)",
        r"(modelling|acting|photoshoot)\s+(opportunity|job|gig|offer|work)",
        r"i\s+(work\s+for|represent|know\s+people\s+at)\s+.{0,20}(agency|studio|label)",
        r"(you\s+could\s+be\s+)?(famous|a\s+star|on\s+tv)",
        r"(just\s+)?between\s+(us|you\s+and\s+me|the\s+two\s+of\s+us)",
    ],
    "medium": [
        r"(want\s+to\s+)?chill(\s+sometime|\s+later|\s+tonight)?",
        r"(come\s+)?(hang\s+out|link\s+up|meet\s+up)\s+(with\s+me|tonight|later|somewhere)",
        r"(do\s+you\s+)?smoke\b",
        r"(ever\s+)?(tried|try)\s+(it|them|this\s+stuff|anything)",
        r"(it\s+)?feels\s+(amazing|so\s+good|great|nice)",
        r"(my\s+)?(place|flat|house|crib)\s+(is\s+)?(free|empty|clear)",
    ],
}

# ---------------------------------------------------------------------------
# Obfuscated drug/explicit words (deliberate misspelling to evade filters)
# ---------------------------------------------------------------------------
OBFUSCATED_WORDS = [
    (r"\bc[o0]k[e3]\b",       "cocaine"),
    (r"\bw[e3]{2}d\b",        "weed"),
    (r"\bdr[u\*]g[sz]?\b",    "drugs"),
    (r"\bm[e3]th\b",          "meth"),
    (r"\bh[e3]r[o0][i!]n\b",  "heroin"),
    (r"\bp[i!]ll[sz]\b",      "pills"),
    (r"\bs[e3]x\b",           "sex"),
    (r"\bn[u\*]d[e3][sz]?\b", "nudes"),
    (r"\bp[o0]rn\b",          "porn"),
    (r"\bn@k[e3]d?\b",        "naked"),
]


def decode_emojis(text: str) -> tuple[str, list]:
    """Replace coded emojis with their decoded meaning for downstream classifiers."""
    decoded = text
    found = []
    for emoji, meaning in {**DRUG_EMOJIS, **GROOMING_EMOJIS}.items():
        if emoji in text:
            decoded = decoded.replace(emoji, f" {meaning} ")
            found.append({"emoji": emoji, "meaning": meaning})
    return decoded, found


def score_coded(text: str) -> dict:
    """
    Scores text for coded language signals across all four code types:
    emoji codes, number codes, innocent-sounding coded phrases, and obfuscated words.
    """
    decoded_text, emoji_hits = decode_emojis(text)
    all_matches = []

    # Check number codes
    number_hits = [
        {"type": "number_code", "pattern": p, "meaning": m}
        for p, m in NUMBER_CODES.items()
        if re.search(p, decoded_text, re.IGNORECASE)
    ]

    # Check coded innocent phrases
    phrase_hits_high = [
        {"type": "coded_phrase_high", "pattern": p}
        for p in CODE_PHRASES["high"]
        if re.search(p, decoded_text, re.IGNORECASE)
    ]
    phrase_hits_medium = [
        {"type": "coded_phrase_medium", "pattern": p}
        for p in CODE_PHRASES["medium"]
        if re.search(p, decoded_text, re.IGNORECASE)
    ]

    # Check obfuscated words
    obfuscated_hits = [
        {"type": "obfuscated", "pattern": p, "decoded": d}
        for p, d in OBFUSCATED_WORDS
        if re.search(p, decoded_text, re.IGNORECASE)
    ]

    # Score based on what we found
    grooming_emoji_hits = [e for e in emoji_hits if e["emoji"] in GROOMING_EMOJIS]
    drug_emoji_hits = [e for e in emoji_hits if e["emoji"] in DRUG_EMOJIS]

    all_matches = emoji_hits + number_hits + phrase_hits_high + obfuscated_hits

    if phrase_hits_high or obfuscated_hits or (drug_emoji_hits and len(drug_emoji_hits) >= 2):
        return {
            "risk_score": 0.85,
            "category": "coded_language_high",
            "matched": all_matches,
            "decoded_text": decoded_text,
        }

    if grooming_emoji_hits or drug_emoji_hits or number_hits or phrase_hits_medium:
        return {
            "risk_score": 0.58,
            "category": "coded_language_medium",
            "matched": all_matches,
            "decoded_text": decoded_text,
        }
    if len(phrase_hits_medium) >= 2 or (phrase_hits_medium and number_hits):
        return {
            "risk_score": 0.82,  # boost when multiple medium signals combine
            "category": "coded_language_high",
            "matched": all_matches,
            "decoded_text": decoded_text,
        }

    return {
        "risk_score": 0.0,
        "category": "none",
        "matched": [],
        "decoded_text": decoded_text,
    }