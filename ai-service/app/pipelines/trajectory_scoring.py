"""
Trajectory scoring — scores the CONVERSATION as a whole, not just the
latest message. Grooming follows a predictable arc (trust-building ->
personal questions -> secrecy -> escalation), so an individually mild
message can still be part of a risky pattern.
"""

ESCALATION_SIGNALS = [
    "compliments on appearance",       # building trust/flattery
    "asking personal questions",       # information gathering
    "expressing special connection",   # grooming bond
    "suggesting secrecy",              # isolation
    "requesting photo/video",          # exploitation attempt
]

def score_trajectory(last_n_messages: list[str]) -> float:
    """
    Score the CONVERSATION as a whole, not just the last message.
    Grooming follows a predictable arc — this detects the arc.
    """
    # Lazy import: risk_scoring.py imports this module, so importing
    # run_pipeline at module load time would create a circular import.
    from app.pipelines.risk_scoring import run_pipeline

    stage_scores = []
    for msg in last_n_messages:
        result = run_pipeline(msg)
        stage_scores.append(result["risk_score"])

    if len(stage_scores) < 3:
        return 0.0

    # Is the conversation escalating? (each message riskier than the last)
    escalating = all(
        stage_scores[i] <= stage_scores[i+1]
        for i in range(len(stage_scores)-1)
    )

    avg_score = sum(stage_scores) / len(stage_scores)
    peak_score = max(stage_scores)

    if escalating and avg_score > 0.3:
        return min(peak_score * 1.5, 1.0)

    return avg_score