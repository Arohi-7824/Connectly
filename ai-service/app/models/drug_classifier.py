"""
Layer 2 — Drug, substance, and illegal activity classifier.
Covers both explicit mentions and slang/code words commonly
used when selling drugs or illegal items to minors.
Updated periodically as new slang emerges.
"""
import re

# Slang is constantly evolving — this list should be treated as a seed,
# not a complete list. The transformer layer catches what this misses.
DRUG_SLANG = {
    "cannabis":    ["weed", "weed", "mary jane", "420", "blunt", "joint", "bud", "ganja", "herb", "dope", "kush", "grass", "pot", "reefer", "spliff"],
    "cocaine":     ["coke", "snow", "blow", "white", "charlie", "powder", "nose candy", "yeyo"],
    "mdma":        ["molly", "ecstasy", "x", "xtc", "beans", "pills", "mandy"],
    "heroin":      ["smack", "horse", "junk", "brown", "skag", "h"],
    "meth":        ["meth", "crystal", "ice", "glass", "tina", "crank", "speed"],
    "pills":       ["xanax", "xans", "bars", "percs", "percocet", "oxy", "oxycodone", "adderall", "ritalin", "lean", "syrup", "purple drank"],
    "psychedelics":["lsd", "acid", "shrooms", "mushrooms", "tabs", "trips", "dmt"],
    "generic":     ["plug", "trap", "re-up", "dime bag", "8ball", "eight ball", "fronting", "score some", "hook me up", "hook you up"],
}

ILLEGAL_PATTERNS = [
    # drug dealing/buying
    r"(buy|sell|get|score|grab|cop)\s+(some\s+)?(weed|drugs?|pills?|coke|molly|meth|acid|shrooms|lean)",
    r"(i\s+(can\s+)?get\s+you|want\s+to\s+try|wanna\s+try)\s+(some\s+)?(weed|drugs?|pills?|coke|molly|meth|acid)",
    r"(plug|dealer|trap(per)?)\s+(got|has|selling)",
    r"(hit|smoke|snort|pop|drop)\s+(a\s+)?(blunt|joint|line|pill|tab|cap)",
    r"(free\s+sample|first\s+one'?s?\s+free|try\s+it\s+for\s+free)",
    # weapons
    r"(buy|sell|get)\s+(a\s+)?(gun|knife|blade|weapon|piece|strap|tool)",
    r"(illegal|unregistered|untraceable)\s+(gun|firearm|weapon)",
    # trafficking signals
    r"(make\s+a\s+lot\s+of\s+money|easy\s+cash|quick\s+money)\s+(if\s+you|by)",
    r"(model(ing)?|acting|photoshoot)\s+(job|opportunity|gig|offer)",
    r"(no\s+one\s+will\s+know|parents?\s+don'?t\s+need\s+to\s+know)\s+.*(money|cash|job|work)",
]

HIGH_RISK_SLANG = [
    word
    for words in DRUG_SLANG.values()
    for word in words
]


def score_drugs(text: str) -> dict:
    """
    Returns a risk score specifically for drug/illegal activity signals.
    """
    matched_patterns = [p for p in ILLEGAL_PATTERNS if re.search(p, text)]
    matched_slang = [s for s in HIGH_RISK_SLANG if re.search(rf"\b{re.escape(s)}\b", text)]

    # Pattern match is higher confidence than slang alone
    if matched_patterns:
        return {
            "risk_score": 0.88,
            "category": "drug_illegal_activity",
            "matched": matched_patterns,
        }

    # Slang alone is medium — context matters (e.g. "weed" in a gardening chat)
    # The transformer layer adds context on top of this
    if matched_slang:
        return {
            "risk_score": 0.55,
            "category": "substance_mention",
            "matched": matched_slang,
        }

    return {"risk_score": 0.0, "category": "none", "matched": []}