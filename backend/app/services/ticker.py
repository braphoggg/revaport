"""Ticker symbol normalization for yfinance."""
from __future__ import annotations

CASH_TICKER = "CASH"
FOREIGN_SUFFIXES = (".L", ".AS", ".T", ".TO", ".HK", ".PA", ".DE", ".SW", ".MI")


def is_cash(ticker: str) -> bool:
    return ticker.upper() == CASH_TICKER


def normalize_ticker(raw: str) -> str:
    """Uppercase + dot-to-dash for class shares (BRK.B -> BRK-B).
    Preserves foreign exchange suffixes (.L, .T, ...) even though v1 is USD-only —
    cheap to keep forward-compatible.
    """
    t = raw.strip().upper()
    if not t:
        raise ValueError("ticker is empty")
    for suffix in FOREIGN_SUFFIXES:
        if t.endswith(suffix):
            return t
    return t.replace(".", "-")
