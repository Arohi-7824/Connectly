"""
Layer 1 — Regex/keyword classifier.
Catches known grooming phrases with pattern flexibility.
Fast, zero latency, runs before the transformer layer.
"""
import re

RISK_PATTERNS = {
    "high": [
        r"send\s+(me\s+)?a?\s*pic(s|ture)?",
        r"don'?t\s+tell\s+(your\s+)?(parents?|mom|dad|anyone|family)",
        r"our\s+secret",
        r"keep\s+this\s+(between\s+us|secret|private)",
        r"what\s+are\s+you\s+wearing",
        r"meet\s+me\s+(alone|somewhere|tonight|later|outside|nearby)",
        r"delete\s+this\s+(chat|conversation|message|thread)",
        r"you'?re?\s+so\s+mature",
        r"you\s+look\s+(so\s+)?(hot|sexy|beautiful|cute)\s+for\s+your\s+age",
        r"i'?ll\s+buy\s+you",
        r"video\s+call\s+(me|tonight|alone)",
        r"no\s+one\s+(has\s+to\s+)?know",
        r"just\s+between\s+(you\s+and\s+me|us)",
    ],
    "medium": [
        r"how\s+old\s+are\s+you",
        r"are\s+your\s+parents\s+(home|there|around|awake)",
        r"where\s+do\s+you\s+live",
        r"what'?s?\s+your\s+address",
        r"(add|follow|message|text|dm)\s+me\s+on",
        r"let'?s?\s+talk\s+somewhere\s+else",
        r"switch\s+to\s+(whatsapp|telegram|snapchat|instagram|signal)",
        r"are\s+you\s+alone",
        r"what\s+time\s+do\s+your\s+parents\s+(sleep|go\s+to\s+bed|get\s+home)",
    ],
}


def score_grooming(text: str) -> dict:
    hits_high = [p for p in RISK_PATTERNS["high"] if re.search(p, text)]
    hits_medium = [p for p in RISK_PATTERNS["medium"] if re.search(p, text)]

    if hits_high:
        return {"risk_score": 0.92, "category": "grooming_high_risk", "matched": hits_high}
    if hits_medium:
        return {"risk_score": 0.55, "category": "grooming_watch", "matched": hits_medium}
    return {"risk_score": 0.0, "category": "none", "matched": []}
