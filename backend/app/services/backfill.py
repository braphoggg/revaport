"""Back-populate portfolio_snapshots from historical transactions + prices.

Walks every trading day from the first transaction to today, maintains
per-ticker FIFO state incrementally, and writes daily snapshots against
historical close prices (forward-filled across non-trading days).
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date as date_cls, datetime, timedelta

from sqlalchemy.orm import Session

from ..models.price_cache import PortfolioSnapshot, PriceHistory
from ..models.transaction import Transaction, TxType
from .cost_basis import HoldingState, _apply_buy, _apply_sell, _apply_split, Tx
from .ticker import is_cash
from .yfinance_client import fetch_history

logger = logging.getLogger(__name__)


def _apply_tx(state: HoldingState, t: Tx) -> None:
    if t.tx_type == TxType.BUY:
        _apply_buy(state, t)
    elif t.tx_type == TxType.SELL:
        _apply_sell(state, t)
    elif t.tx_type == TxType.SPLIT:
        _apply_split(state, t)
    elif t.tx_type == TxType.DIVIDEND:
        state.realized_pnl += t.price


def _totals(state: HoldingState) -> tuple[float, float]:
    qty = sum(l.qty_remaining for l in state.open_lots)
    total_cost = sum(l.qty_remaining * l.cost_per_share for l in state.open_lots)
    return qty, total_cost


def _fetch_and_store_history(db: Session, ticker: str) -> None:
    """Populate price_history for a ticker via yfinance (max period). No-op if rows exist."""
    if is_cash(ticker):
        return  # CASH is always $1.00; no market history to fetch
    existing = db.query(PriceHistory).filter(PriceHistory.ticker == ticker).count()
    if existing > 0:
        return
    try:
        rows = fetch_history(ticker, period="max")
    except Exception as e:
        logger.warning("history fetch failed for %s: %s", ticker, e)
        return
    for r in rows:
        db.add(PriceHistory(
            ticker=ticker,
            date=r["date"],
            open=r["open"],
            high=r["high"],
            low=r["low"],
            close=r["close"],
            volume=r["volume"],
        ))
    db.flush()


def _close_lookup(db: Session, tickers: set[str]) -> dict[str, dict[date_cls, float]]:
    """Return {ticker: {date: close}} for all tickers we've seen."""
    out: dict[str, dict[date_cls, float]] = defaultdict(dict)
    if not tickers:
        return out
    rows = db.query(PriceHistory).filter(PriceHistory.ticker.in_(tickers)).all()
    for r in rows:
        if r.close is not None:
            out[r.ticker][r.date] = r.close
    return out


def _last_known_close(
    ticker: str,
    day: date_cls,
    closes: dict[str, dict[date_cls, float]],
    cursor_cache: dict[str, float],
) -> float | None:
    """Most recent close on or before `day`. Uses a cache of the last-seen value to avoid re-scanning."""
    if is_cash(ticker):
        return 1.0
    day_map = closes.get(ticker)
    if not day_map:
        return cursor_cache.get(ticker)
    exact = day_map.get(day)
    if exact is not None:
        cursor_cache[ticker] = exact
        return exact
    return cursor_cache.get(ticker)


def backfill_snapshots(db: Session) -> dict:
    all_txs = (
        db.query(Transaction)
        .order_by(Transaction.executed_at.asc(), Transaction.id.asc())
        .all()
    )
    if not all_txs:
        return {"days": 0, "tickers": 0, "first_date": None}

    tickers = sorted({t.ticker for t in all_txs})
    for sym in tickers:
        _fetch_and_store_history(db, sym)
    db.commit()

    closes = _close_lookup(db, set(tickers))
    cursor_cache: dict[str, float] = {}
    # Seed the cursor cache with the earliest known close per ticker so days before
    # our first observation don't return None (they'll use the earliest we have).
    for sym, m in closes.items():
        if m:
            earliest = min(m.keys())
            cursor_cache[sym] = m[earliest]

    start_day = all_txs[0].executed_at.date()
    end_day = date_cls.today()

    state_by_ticker: dict[str, HoldingState] = {t: HoldingState(ticker=t) for t in tickers}
    tx_iter = iter(all_txs)
    next_tx = next(tx_iter, None)

    days_written = 0
    day = start_day
    while day <= end_day:
        # Apply every tx executed on or before end-of-day.
        while next_tx is not None and next_tx.executed_at.date() <= day:
            t = Tx(
                id=next_tx.id,
                ticker=next_tx.ticker,
                tx_type=TxType(next_tx.tx_type),
                qty=next_tx.qty,
                price=next_tx.price,
                fees=next_tx.fees,
                executed_at=next_tx.executed_at,
            )
            _apply_tx(state_by_ticker[t.ticker], t)
            next_tx = next(tx_iter, None)

        total_value = 0.0
        total_cost = 0.0
        realized_cum = 0.0
        for sym, st in state_by_ticker.items():
            qty, cost = _totals(st)
            realized_cum += st.realized_pnl
            if qty <= 0:
                continue
            close = _last_known_close(sym, day, closes, cursor_cache)
            if close is None:
                # No market data ever for this ticker; fall back to cost so total_value isn't wrong.
                total_value += cost
            else:
                total_value += qty * close
            total_cost += cost

        snap = db.get(PortfolioSnapshot, day)
        if snap is None:
            db.add(PortfolioSnapshot(
                date=day,
                total_value=total_value,
                total_cost=total_cost,
                unrealized_pnl=total_value - total_cost,
                realized_pnl_cumulative=realized_cum,
            ))
        else:
            snap.total_value = total_value
            snap.total_cost = total_cost
            snap.unrealized_pnl = total_value - total_cost
            snap.realized_pnl_cumulative = realized_cum
        days_written += 1
        day += timedelta(days=1)

    db.commit()
    return {
        "days": days_written,
        "tickers": len(tickers),
        "first_date": start_day.isoformat(),
        "last_date": end_day.isoformat(),
    }
