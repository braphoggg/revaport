from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas.price import PriceHistoryPoint, PriceRead
from ..services import price_service, yfinance_client
from ..services.ticker import normalize_ticker

router = APIRouter(prefix="/api/prices", tags=["prices"])


@router.get("", response_model=list[PriceRead])
def get_prices(tickers: str = Query(..., description="comma-separated symbols"), db: Session = Depends(get_db)) -> list[PriceRead]:
    syms = [normalize_ticker(s) for s in tickers.split(",") if s.strip()]
    snapshots = price_service.get_prices(db, syms)
    return [
        PriceRead(
            ticker=s.ticker,
            price=s.price,
            prev_close=s.prev_close,
            as_of=s.as_of,
            stale=bool(s.is_stale),
        )
        for s in snapshots.values()
    ]


@router.get("/history/{ticker}", response_model=list[PriceHistoryPoint])
def get_history(ticker: str, range: str = Query("1M"), db: Session = Depends(get_db)) -> list[PriceHistoryPoint]:
    sym = normalize_ticker(ticker)
    rows = price_service.get_history(db, sym, range_key=range)
    return [
        PriceHistoryPoint(
            date=r.date, open=r.open, high=r.high, low=r.low, close=r.close, volume=r.volume,
        )
        for r in rows
    ]


@router.get("/validate/{ticker}")
def validate(ticker: str) -> dict:
    sym = normalize_ticker(ticker)
    ok = yfinance_client.validate_ticker(sym)
    if not ok:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"unknown ticker: {sym}")
    return {"ticker": sym, "ok": True}
