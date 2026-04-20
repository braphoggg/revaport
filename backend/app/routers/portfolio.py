from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.price_cache import PortfolioSnapshot
from ..models.transaction import Transaction
from ..schemas.price import PortfolioHistoryPoint, PortfolioSummary
from ..services.backfill import backfill_snapshots
from ..services.cost_basis import recompute_ticker
from ..services.portfolio_service import build_summary
from ..services.splits import inject_missing_splits

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


_RANGE_DAYS = {"1W": 7, "1M": 35, "3M": 100, "1Y": 370, "5Y": 1830, "MAX": 36500}


@router.get("/summary", response_model=PortfolioSummary)
def summary(db: Session = Depends(get_db)) -> PortfolioSummary:
    return build_summary(db)


@router.get("/history", response_model=list[PortfolioHistoryPoint])
def history(range: str = Query("1M"), db: Session = Depends(get_db)) -> list[PortfolioSnapshot]:
    days = _RANGE_DAYS.get(range.upper(), 35)
    cutoff = date.today() - timedelta(days=days)
    rows = (
        db.query(PortfolioSnapshot)
        .filter(PortfolioSnapshot.date >= cutoff)
        .order_by(PortfolioSnapshot.date.asc())
        .all()
    )
    return rows


@router.post("/backfill")
def backfill(db: Session = Depends(get_db)) -> dict:
    """Walk every trading day since the first transaction, rebuild portfolio_snapshots."""
    return backfill_snapshots(db)


@router.post("/inject-splits")
def inject_splits(db: Session = Depends(get_db)) -> dict:
    """Check all tickers for missing SPLIT transactions from yfinance corporate actions."""
    tickers = {t for (t,) in db.query(Transaction.ticker).distinct().all()}
    injected = inject_missing_splits(db, tickers)
    for s in injected:
        recompute_ticker(db, s["ticker"])
    db.commit()
    return {"injected": len(injected), "splits": injected}
