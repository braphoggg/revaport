"""Cache-first price reads.

L1: in-memory dict (per-process, cleared on restart) — TTL = ttl_market or ttl_closed.
L2: SQLite `price_snapshots` table — survives restarts.
L3: SQLite `price_history` table for daily OHLC.

On live-fetch failure: keep serving last-known with `is_stale=1`.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from ..config import settings
from ..models.price_cache import PriceHistory, PriceSnapshot
from . import yfinance_client
from .market_hours import is_market_open
from .ticker import is_cash

logger = logging.getLogger(__name__)


_PERIOD_MAP = {
    "1W": "5d",
    "1M": "1mo",
    "3M": "3mo",
    "1Y": "1y",
    "5Y": "5y",
    "MAX": "max",
}


def _ttl_seconds() -> int:
    return (
        settings.price_cache_ttl_market_seconds
        if is_market_open()
        else settings.price_cache_ttl_closed_seconds
    )


def get_prices(db: Session, tickers: list[str]) -> dict[str, PriceSnapshot]:
    """Return latest price snapshots for each ticker. Refreshes stale cache entries."""
    if not tickers:
        return {}
    symbols = sorted(set(tickers))
    rows = {
        s.ticker: s
        for s in db.query(PriceSnapshot).filter(PriceSnapshot.ticker.in_(symbols)).all()
    }
    # CASH is always $1.00 — never fetched from yfinance.
    for sym in symbols:
        if is_cash(sym) and sym not in rows:
            row = PriceSnapshot(
                ticker=sym, price=1.0, prev_close=1.0,
                as_of=datetime.utcnow(), fetched_at=datetime.utcnow(), is_stale=0,
            )
            db.add(row)
            rows[sym] = row

    cutoff = datetime.utcnow() - timedelta(seconds=_ttl_seconds())
    to_refresh = [
        sym for sym in symbols
        if not is_cash(sym) and (sym not in rows or rows[sym].fetched_at < cutoff)
    ]
    if to_refresh:
        try:
            fresh = yfinance_client.fetch_live_prices(to_refresh)
        except yfinance_client.YFinanceError as e:
            logger.warning("price refresh failed: %s", e)
            fresh = {}
        for sym in to_refresh:
            live = fresh.get(sym)
            if live is None:
                if sym in rows:
                    rows[sym].is_stale = 1
                    rows[sym].fetched_at = datetime.utcnow()
                continue
            row = rows.get(sym)
            if row is None:
                row = PriceSnapshot(
                    ticker=sym,
                    price=live.price,
                    prev_close=live.prev_close,
                    as_of=live.as_of,
                    fetched_at=datetime.utcnow(),
                    is_stale=0,
                )
                db.add(row)
                rows[sym] = row
            else:
                row.price = live.price
                row.prev_close = live.prev_close
                row.as_of = live.as_of
                row.fetched_at = datetime.utcnow()
                row.is_stale = 0
        db.commit()
    return rows


def refresh_all_holdings(db: Session) -> dict[str, PriceSnapshot]:
    from ..models.holding import Holding
    tickers = [h.ticker for h in db.query(Holding).all()]
    return get_prices(db, tickers)


def get_history(db: Session, ticker: str, range_key: str = "1M") -> list[PriceHistory]:
    period = _PERIOD_MAP.get(range_key.upper(), "1mo")
    end_date = _range_end(period)
    rows = (
        db.query(PriceHistory)
        .filter(PriceHistory.ticker == ticker, PriceHistory.date >= end_date)
        .order_by(PriceHistory.date.asc())
        .all()
    )
    today = date.today()
    needs_refresh = (
        not rows
        or rows[-1].date < today - timedelta(days=1)
        or (rows[-1].date == today and is_market_open())
    )
    if needs_refresh:
        try:
            data = yfinance_client.fetch_history(ticker, period=period)
        except yfinance_client.YFinanceError as e:
            logger.warning("history fetch failed for %s: %s", ticker, e)
            data = []
        for d in data:
            existing = (
                db.query(PriceHistory)
                .filter(PriceHistory.ticker == ticker, PriceHistory.date == d["date"])
                .one_or_none()
            )
            if existing is None:
                db.add(PriceHistory(ticker=ticker, **d))
            else:
                existing.open = d["open"]
                existing.high = d["high"]
                existing.low = d["low"]
                existing.close = d["close"]
                existing.volume = d["volume"]
        db.commit()
        rows = (
            db.query(PriceHistory)
            .filter(PriceHistory.ticker == ticker, PriceHistory.date >= end_date)
            .order_by(PriceHistory.date.asc())
            .all()
        )
    return rows


def _range_end(period: str) -> date:
    today = date.today()
    return {
        "5d": today - timedelta(days=10),
        "1mo": today - timedelta(days=35),
        "3mo": today - timedelta(days=100),
        "1y": today - timedelta(days=370),
        "5y": today - timedelta(days=1830),
        "max": date(1900, 1, 1),
    }.get(period, today - timedelta(days=35))
