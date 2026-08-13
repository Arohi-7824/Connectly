"""
Multi-layer risk scoring pipeline — v5.

Layer 1 — Grooming keyword/regex        (fast, known exact patterns)
Layer 2 — Drug/illegal activity         (fast, known drug slang)
Layer 3 — Coded language + emoji        (fast, obfuscation decode)
Layer 4 — Transformer / toxic-bert      (semantic toxicity)
Layer 5 — Zero-shot classifier          (catches novel grooming by INTENT,
                                          on the current message alone)
Layer 6 — Trajectory zero-shot          (same classifier, but run on the
                                          sender's recent messages combined
                                          into one window)

Why two zero-shot passes instead of one:
Zero-shot/NLI models need enough words to reason about meaningfully — a
message like "you are pretty" (3 words) or "can we meet" (3 words) is too
short on its own for the model to judge with any real confidence, so
Layer 5 requires a minimum word count before it trusts its own score.
But short, individually-mild messages are exactly what grooming looks
like *while it's escalating* — no single message is damning, but the
sequence is. Layer 6 solves both problems at once: concatenating the
sender's last few messages with the current one gives the model enough
context to reason about, and lets it judge the PATTERN (flattery, then
pushing to meet, then reassurance after being rebuffed) rather than
judging one short line in isolation. Layer 6 has no word-count floor and
no history-length requirement to contribute — it just returns 0 when
there's no history yet.

Final score = max across all layers (a single strong signal from any
one layer is enough to flag, whether that's an exact keyword match or an
escalating pattern across the last few messages).
"""
from app.core.config import RISK_THRESHOLD
from app.models.grooming_classifier import score_grooming
from app.models.drug_classifier import score_drugs
from app.models.code_classifier import score_coded
from app.models.transformer_classifier import score_transformer
from app.models.zero_shot_classifier import score_zero_shot
from app.pipelines.preprocess import normalize

ZERO_SHOT_THRESHOLD = 0.87   # higher bar for single-message zero-shot
MIN_WORDS_ZERO_SHOT = 5      # ignore short/ambiguous single messages

# Trajectory layer gets its own (lower) bar — it's already looking at a
# richer, multi-message window, so it doesn't need as high a threshold
# to trust itself, and there's no minimum word count since the combined
# window is naturally long enough once there's any history at all.
TRAJECTORY_THRESHOLD = 0.75


def run_pipeline(text: str, history: list | None = None) -> dict:
    history = history or []

    # Step 1: normalize
    clean = normalize(text)

    # Step 2: decode coded language + emojis first
    code_result = score_coded(clean)
    decoded = code_result.get("decoded_text", clean)

    # Step 3: run all per-message layers on the decoded text
    grooming_result    = score_grooming(decoded)
    drug_result        = score_drugs(decoded)
    transformer_result = score_transformer(decoded)
    zero_shot_result    = score_zero_shot(decoded)

    # Zero-shot guard: must have enough words AND score above its own threshold
    word_count = len(decoded.split())
    zero_shot_raw = zero_shot_result["risk_score"]
    zero_shot_score = (
        zero_shot_raw
        if zero_shot_raw >= ZERO_SHOT_THRESHOLD and word_count >= MIN_WORDS_ZERO_SHOT
        else 0.0
    )

    layers = [
        {"layer": "grooming",       **grooming_result},
        {"layer": "drug_illegal",   **drug_result},
        {"layer": "coded_language", **code_result},
        {"layer": "transformer",    **transformer_result},
        {
            "layer": "zero_shot",
            "risk_score": zero_shot_score,
            "category": zero_shot_result.get("category", "none"),
        },
    ]

    # Step 4: trajectory layer — same classifier, run on the sender's
    # recent messages + this one, combined into a single window. This is
    # a genuinely independent signal (not a multiplier on another
    # layer's score), so a clear escalating pattern can flag on its own
    # even when every individual message looked mild.
    trajectory_score = 0.0
    trajectory_raw = 0.0
    trajectory_top_threat = None
    if history:
        combined = " ".join([*history, decoded])
        trajectory_result = score_zero_shot(combined)
        trajectory_raw = trajectory_result["risk_score"]
        if trajectory_raw >= TRAJECTORY_THRESHOLD:
            trajectory_score = trajectory_raw
            trajectory_top_threat = trajectory_result.get("top_threat")
        layers.append({
            "layer": "trajectory",
            "risk_score": trajectory_score,
            "category": "trajectory_escalation",
        })

    # Final score = highest across all layers
    best = max(layers, key=lambda x: x["risk_score"])
    final_score = round(best["risk_score"], 3)
    flagged = final_score >= RISK_THRESHOLD

    # Build explanation
    triggered = [l for l in layers if l["risk_score"] >= RISK_THRESHOLD]
    if triggered:
        explanation = "Flagged by: " + ", ".join(
            f"{l['layer']} ({l.get('category','')}, {round(l['risk_score']*100)}%)"
            for l in triggered
        )
    else:
        explanation = (
            f"No risk detected. Highest score: "
            f"{round(final_score * 100)}% via {best['layer']}"
        )

    # Include zero-shot / trajectory top threat in explanation if either fired
    if zero_shot_score >= RISK_THRESHOLD:
        explanation += f". Intent detected: \"{zero_shot_result.get('top_threat', '')}\""
    elif trajectory_score >= RISK_THRESHOLD and trajectory_top_threat:
        explanation += f". Escalation pattern detected: \"{trajectory_top_threat}\""

    return {
        "risk_score": final_score,
        "category": best["category"],
        "flagged": flagged,
        "explanation": explanation,
        "layers": {
            "grooming":       round(grooming_result["risk_score"], 3),
            "drug_illegal":   round(drug_result["risk_score"], 3),
            "coded_language": round(code_result["risk_score"], 3),
            "transformer":    round(transformer_result["risk_score"], 3),
            "zero_shot":      round(zero_shot_score, 3),
            "zero_shot_raw":  round(zero_shot_raw, 3),
            "trajectory":     round(trajectory_score, 3),
            "trajectory_raw": round(trajectory_raw, 3),
        },
    }
