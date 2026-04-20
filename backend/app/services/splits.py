"""Auto-inject missing SPLIT transactions from yfinance corporate-action history."""
from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.transaction import Transaction, TxType
from .yfinance_client import fetch_splits

logger = logging.getLogger(__name__)


def inject_missing_splits(db: Session, tickers: set[str]) -> list[dict]:
    """Check yfinance splits for each ticker and insert any not yet in transactions.

    Only considers splits on or after the ticker's earliest transaction.
    Deduplicates by date — existing SPLIT rows for the same ticker+date are skipped.

    Returns list of {ticker, date (ISO), ratio} for every split inserted.
    """
    injected: list[dict] = []

    for ticker in sorted(tickers):
        first_at: datetime | None = (
            db.query(func.min(Transaction.executed_at))
            .filter(Transaction.ticker == ticker)
            .scalar()
        )
        if first_at is None:
            continue

        existing_dates = {
            tx.executed_at.date()
            for tx in db.query(Transaction)
            .filter(Transaction.ticker == ticker, Transaction.tx_type == TxType.SPLIT)
            .all()
        }

        try:
            splits = fetch_splits(ticker)
        except Exception as exc:
            logger.warning("split fetch failed for %s: %s", ticker, exc)
            continue

        for s in splits:
            split_dt: datetime = s["date"]
            if split_dt < first_at:
                continue
            if split_dt.date() in existing_dates:
                continue

            ratio = float(s["ratio"])
            db.add(Transaction(
                ticker=ticker,
                tx_type=TxType.SPLIT,
                qty=ratio,
                price=0.0,
                fees=0.0,
                executed_at=split_dt,
                notes=f"auto: {ratio:.6g}:1 split (yfinance)",
            ))
            injected.append({
                "ticker": ticker,
                "date": split_dt.date().isoformat(),
                "ratio": ratio,
            })
            logger.info("injected split %s @ %s ratio=%g", ticker, split_dt.date(), ratio)

    if injected:
        db.flush()

    return injected
