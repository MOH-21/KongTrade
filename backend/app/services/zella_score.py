"""Zella Score: 0-100 composite performance rating.

Algorithm:
  Win Rate (30%)       — normalized against 60% target
  Profit Factor (25%)  — normalized against 2.0 target
  Consistency (20%)    — frequency of profitable days vs total trading days
  Risk Management (15%)— inverse of max drawdown severity
  Trade Quality (10%)  — avg rating of trades (A+=100, A=90, B=80, C=60, D=40, F=20)
"""


def compute_zella_score(
    win_rate: float,
    profit_factor: float,
    consistency_pct: float,
    max_drawdown_pct: float,
    avg_trade_rating: float | None,
) -> dict:
    # Win Rate score (target: 60%)
    win_rate_score = min(100, (win_rate / 0.60) * 100)

    # Profit Factor score (target: 2.0)
    pf_score = min(100, (profit_factor / 2.0) * 100)

    # Consistency score: directly the percentage of profitable days
    consistency_score = min(100, consistency_pct * 100)

    # Risk score: inverse of drawdown severity (0% drawdown = 100, 50%+ = 0)
    risk_score = max(0, 100 - (max_drawdown_pct * 2))

    # Quality score: average trade rating normalized
    quality_score = avg_trade_rating if avg_trade_rating else 50

    # Weighted composite
    composite = (
        win_rate_score * 0.30
        + pf_score * 0.25
        + consistency_score * 0.20
        + risk_score * 0.15
        + quality_score * 0.10
    )

    return {
        "score": round(min(100, max(0, composite))),
        "win_rate_score": round(win_rate_score, 1),
        "profit_factor_score": round(pf_score, 1),
        "consistency_score": round(consistency_score, 1),
        "risk_score": round(risk_score, 1),
        "quality_score": round(quality_score, 1),
    }
