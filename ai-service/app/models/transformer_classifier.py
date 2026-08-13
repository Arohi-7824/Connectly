"""
Layer 3 — Transformer-based classifier using HuggingFace.
Uses 'unitary/toxic-bert' which is trained on the Jigsaw dataset and
detects: toxic, severe_toxic, obscene, threat, insult, identity_hate.

This catches what the regex layers miss:
- Novel phrasing not in any keyword list
- Implicit threats and coercion
- Sexually explicit content
- Hate speech targeting minors

Model is loaded once at startup (~500ms) and reused for all requests.
"""
import os

# Suppress tokenizer parallelism warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"

_classifier = None


def _get_classifier():
    global _classifier
    if _classifier is None:
        try:
            from transformers import pipeline
            print("[AI] Loading toxic-bert transformer model...")
            _classifier = pipeline(
                "text-classification",
                model="unitary/toxic-bert",
                top_k=None,
                truncation=True,
                max_length=512,
            )
            print("[AI] Transformer model loaded successfully")
        except Exception as e:
            print(f"[AI] Failed to load transformer model: {e}")
            _classifier = None
    return _classifier


# Category weights — threat and identity_hate are weighted higher
# in a child safety context than general toxicity
CATEGORY_WEIGHTS = {
    "toxic": 1.0,
    "severe_toxic": 1.5,
    "obscene": 1.2,
    "threat": 1.6,
    "insult": 0.9,
    "identity_hate": 1.3,
}


def score_transformer(text: str) -> dict:
    """
    Returns a risk score from the transformer model.
    Falls back to 0.0 gracefully if model isn't loaded.
    """
    clf = _get_classifier()
    if clf is None:
        return {"risk_score": 0.0, "category": "transformer_unavailable", "labels": {}}

    try:
        results = clf(text)[0]
        label_scores = {r["label"]: r["score"] for r in results}

        # Weighted combination
        weighted = max(
            label_scores.get(label, 0) * weight
            for label, weight in CATEGORY_WEIGHTS.items()
        )
        weighted = min(weighted, 1.0)

        # Determine dominant category
        dominant = max(label_scores, key=lambda l: label_scores[l] * CATEGORY_WEIGHTS.get(l, 1.0))

        return {
            "risk_score": round(weighted, 3),
            "category": f"transformer_{dominant}",
            "labels": label_scores,
        }
    except Exception as e:
        print(f"[AI] Transformer inference error: {e}")
        return {"risk_score": 0.0, "category": "transformer_error", "labels": {}}