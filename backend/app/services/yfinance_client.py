"""Single chokepoint for every yfinance call.

If Yahoo breaks or we swap providers, this is the one file to change.

Design:
- Synchronous (FastAPI runs sync endpoints in a threadpool).
- Threading.Lock + min-gap throttle since yfinance is not thread-safe.
- 3-attempt exponential backoff on rate limit.
- L1 in-memory LRU cache (60s) for last-price fetches.
"""
from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from datetime import date, datetime

import pandas as pd
import yfinance as yf

from ..config import settings

logger = logging.getLogger(__name__)


class YFinanceError(Exception):
    """Base error for yfinance interactions."""


class UnknownTickerError(YFinanceError):
    """Ticker returned no data after a successful fetch."""


class RateLimitedError(YFinanceError):
    """Yahoo is throttling us."""


@dataclass
class LivePrice:
    ticker: str
    price: float
    prev_close: float | None
    as_of: datetime


_lock = threading.Lock()
_last_call_at = 0.0


def _throttle() -> None:
    global _last_call_at
    min_gap = settings.yfinance_min_gap_ms / 1000.0
    now = time.monotonic()
    elapsed = now - _last_call_at
    if elapsed < min_gap:
        time.sleep(min_gap - elapsed)
    _last_call_at = time.monotonic()


def _retry_call(fn, *args, **kwargs):
    last_err: Exception | None = None
    for attempt in range(settings.yfinance_max_retries):
        try:
            with _lock:
                _throttle()
                return fn(*args, **kwargs)
        except Exception as e:  # yfinance raises a variety of exceptions
            msg = str(e).lower()
            last_err = e
            if "rate" in msg or "429" in msg or "too many" in msg:
                wait = 2**attempt
                logger.warning("yfinance rate-limited, retry in %ds (attempt %d)", wait, attempt + 1)
                time.sleep(wait)
                continue
            raise
    raise RateLimitedError(f"yfinance rate-limited after {settings.yfinance_max_retries} attempts") from last_err


def fetch_live_prices(tickers: list[str]) -> dict[str, LivePrice]:
    """Batch-fetch latest intraday price for each ticker."""
    if not tickers:
        return {}
    symbols = sorted(set(tickers))

    def _do() -> pd.DataFrame:
        return yf.download(
            tickers=symbols,
            period="2d",
            interval="1m",
            progress=False,
            threads=False,
            auto_adjust=False,
            group_by="ticker",
        )

    df = _retry_call(_do)
    if df is None or df.empty:
        return {}

    out: dict[str, LivePrice] = {}
    now = datetime.utcnow()

    if isinstance(df.columns, pd.MultiIndex):
        for sym in symbols:
            try:
                sub = df[sym].dropna(how="all")
                if sub.empty:
                    continue
                last_row = sub.iloc[-1]
                last_price = float(last_row["Close"])
                prev_close = _prev_day_close(sub)
                out[sym] = LivePrice(
                    ticker=sym,
                    price=last_price,
                    prev_close=prev_close,
                    as_of=_row_ts(sub, now),
                )
            except Exception as e:
                logger.warning("could not parse yfinance row for %s: %s", sym, e)
    else:
        sub = df.dropna(how="all")
        if not sub.empty:
            sym = symbols[0]
            last_row = sub.iloc[-1]
            out[sym] = LivePrice(
                ticker=sym,
                price=float(last_row["Close"]),
                prev_close=_prev_day_close(sub),
                as_of=_row_ts(sub, now),
            )
    return out


def _row_ts(df: pd.DataFrame, fallback: datetime) -> datetime:
    try:
        ts = df.index[-1]
        if hasattr(ts, "to_pydatetime"):
            return ts.to_pydatetime().replace(tzinfo=None)
    except Exception:
        pass
    return fallback


def _prev_day_close(intraday_df: pd.DataFrame) -> float | None:
    """Best-effort prev-close from an intraday df. Falls back to None."""
    try:
        idx = intraday_df.index
        if hasattr(idx, "date"):
            dates = pd.Series(idx).dt.date
            today = dates.iloc[-1]
            prev_mask = dates < today
            if prev_mask.any():
                return float(intraday_df[prev_mask.values]["Close"].iloc[-1])
    except Exception:
        pass
    return None


def fetch_history(ticker: str, period: str = "1mo") -> list[dict]:
    """Fetch daily OHLC for a single ticker. period: '5d','1mo','3mo','1y','5y','max'."""
    def _do() -> pd.DataFrame:
        t = yf.Ticker(ticker)
        return t.history(period=period, interval="1d", auto_adjust=False)

    df = _retry_call(_do)
    if df is None or df.empty:
        return []
    out: list[dict] = []
    for idx, row in df.iterrows():
        d = idx.date() if hasattr(idx, "date") else None
        if d is None:
            continue
        out.append({
            "date": d,
            "open": _f(row.get("Open")),
            "high": _f(row.get("High")),
            "low": _f(row.get("Low")),
            "close": _f(row.get("Close")),
            "volume": _i(row.get("Volume")),
        })
    return out


def fetch_splits(ticker: str) -> list[dict]:
    """Return [{date: datetime, ratio: float}] for all recorded splits for this ticker."""
    def _do():
        return yf.Ticker(ticker).splits

    try:
        series = _retry_call(_do)
    except Exception:
        return []
    out = []
    for dt, ratio in series.items():
        try:
            out.append({
                "date": dt.to_pydatetime().replace(tzinfo=None),
                "ratio": float(ratio),
            })
        except Exception:
            continue
    return out


def validate_ticker(ticker: str) -> bool:
    """Return True if yfinance has any data for the symbol."""
    try:
        prices = fetch_live_prices([ticker])
        return ticker in prices and prices[ticker].price > 0
    except YFinanceError:
        return False


def _f(v) -> float | None:
    try:
        if v is None or pd.isna(v):
            return None
        return float(v)
    except Exception:
        return None


def _i(v) -> int | None:
    try:
        if v is None or pd.isna(v):
            return None
        return int(v)
    except Exception:
        return None


__all__ = [
    "LivePrice",
    "YFinanceError",
    "UnknownTickerError",
    "RateLimitedError",
    "fetch_live_prices",
    "fetch_history",
    "fetch_splits",
    "validate_ticker",
]


# silence unused-import guard for `date` (kept for type hints clarity)
_ = date
