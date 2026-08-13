"""
Layer 5 — Zero-shot classification.

This layer catches novel grooming/threat language that no keyword list
or toxicity model would catch — because it reasons about INTENT,
not specific words.

"you seem really lonely i could keep you company if you share something with me"
→ scores high on "adult trying to exploit a child's loneliness"
→ scores high on "someone asking a child to share something in secret"

No training examples needed. The model compares the message against
plain-English descriptions of threat categories.

Model: facebook/bart-large-mnli (~1.6GB, downloads once)
"""
import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

_classifier = None


def _get_classifier():
    global _classifier
    if _classifier is None:
        try:
            from transformers import pipeline
            print("[AI] Loading zero-shot classifier (bart-large-mnli)...")
            _classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
            )
            print("[AI] Zero-shot classifier loaded")
        except Exception as e:
            print(f"[AI] Failed to load zero-shot model: {e}")
            _classifier = None
    return _classifier


# These are plain-English descriptions of threat categories.
# The model scores how well the message matches each description.
# Add new threat types here without retraining anything.
THREAT_LABELS = [
    "an adult trying to exploit a child's loneliness or emotions",
    "someone trying to get photos or videos from a child",
    "someone selling or offering drugs to a minor",
    "someone trying to meet a child alone in secret",
    "someone repeatedly asking to meet a child in person",
    "someone asking a child to keep secrets from their parents",
    "someone offering money gifts or opportunities to a child for something",
    "someone trying to isolate a child from family or friends",
    "someone sending sexual or inappropriate messages to a child",
    "someone using emotional manipulation to gain a child's trust",
    "someone threatening or coercing a child",
    "normal safe friendly conversation between people",
]

SAFE_LABEL = "normal safe friendly conversation between people"

# Threat labels that are especially serious — weighted higher
HIGH_WEIGHT_LABELS = {
    "someone sending sexual or inappropriate messages to a child": 1.4,
    "someone selling or offering drugs to a minor": 1.3,
    "someone threatening or coercing a child": 1.4,
    "someone trying to get photos or videos from a child": 1.3,
}


def score_zero_shot(text: str) -> dict:
    clf = _get_classifier()
    if clf is None:
        return {
            "risk_score": 0.0,
            "category": "zero_shot_unavailable",
            "top_threat": None,
        }

    try:
        result = clf(text, candidate_labels=THREAT_LABELS, multi_label=True)
        label_scores = dict(zip(result["labels"], result["scores"]))

        safe_score = label_scores.get(SAFE_LABEL, 0)

        # Get weighted threat scores
        threat_scores = {}
        for label, score in label_scores.items():
            if label == SAFE_LABEL:
                continue
            weight = HIGH_WEIGHT_LABELS.get(label, 1.0)
            threat_scores[label] = min(score * weight, 1.0)

        if not threat_scores:
            return {"risk_score": 0.0, "category": "none", "top_threat": None}

        best_label = max(threat_scores, key=threat_scores.get)
        best_score = threat_scores[best_label]

        # Reduce score if the safe label also scores high (ambiguous message)
        adjusted = best_score * (1 - safe_score * 0.4)
        adjusted = round(min(adjusted, 1.0), 3)

        return {
            "risk_score": adjusted,
            "category": "zero_shot_threat",
            "top_threat": best_label,
            "safe_score": round(safe_score, 3),
            "all_threats": {
                k: round(v, 3)
                for k, v in sorted(
                    threat_scores.items(), key=lambda x: x[1], reverse=True
                )[:3]
            },
        }

    except Exception as e:
        print(f"[AI] Zero-shot inference error: {e}")
        return {"risk_score": 0.0, "category": "zero_shot_error", "top_threat": None}