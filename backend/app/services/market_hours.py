"""US market hours check (NYSE/NASDAQ): 9:30-16:00 America/New_York, Mon-Fri.

Holiday calendar is not modeled — over-fetching on a holiday is harmless (cache
just refreshes from yfinance which returns prev close).
"""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")


def is_market_open(now: datetime | None = None) -> bool:
    now = (now or datetime.now(tz=ET)).astimezone(ET)
    if now.weekday() >= 5:
        return False
    open_t = now.replace(hour=9, minute=30, second=0, microsecond=0)
    close_t = now.replace(hour=16, minute=0, second=0, microsecond=0)
    return open_t <= now <= close_t
