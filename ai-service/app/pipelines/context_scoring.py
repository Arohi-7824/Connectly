def adjust_for_relationship(risk_score: float, context: dict) -> float:
    trust = context.get("trust_level", "unknown")
    conv_age_days = context.get("conversation_age_days", 0)
    total_messages = context.get("total_messages", 0)
    flagged_before = context.get("flagged_count", 0)

    # Trusted contact (parent-approved) — reduce score significantly
    if trust == "trusted":
        risk_score *= 0.3

    # New contact (less than 3 days, fewer than 20 messages) — increase score
    if conv_age_days < 3 and total_messages < 20:
        risk_score *= 1.6

    # Already flagged before in this conversation — increase score
    if flagged_before > 0:
        risk_score *= 1.4

    # Complete stranger (0 messages before this one) — maximum risk
    if total_messages == 0:
        risk_score *= 2.0

    return min(risk_score, 1.0)

def adjust_for_age_gap(risk_score: float, sender_age: int, recipient_age: int) -> float:
    """
    Same message, very different risk based on who's sending it.
    """
    if sender_age is None or recipient_age is None:
        return risk_score  # can't assess, don't penalise

    age_gap = sender_age - recipient_age

    # Adult messaging a child
    if age_gap >= 5 and recipient_age < 18:
        risk_score *= 1.8

    # Very large gap (30yo messaging a 13yo)
    if age_gap >= 15 and recipient_age < 16:
        risk_score *= 2.5

    # Peer-to-peer (similar age) — reduce score
    if abs(age_gap) <= 2:
        risk_score *= 0.5

    return min(risk_score, 1.0)