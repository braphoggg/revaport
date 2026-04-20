from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.holding import Holding
from ..models.transaction import Transaction
from ..schemas.holding import HoldingCreate, HoldingRead, HoldingUpdate, HoldingWithLivePrice
from ..services.portfolio_service import build_holding_rows
from ..services.ticker import normalize_ticker

router = APIRouter(prefix="/api/holdings", tags=["holdings"])


@router.get("", response_model=list[HoldingWithLivePrice])
def list_holdings(db: Session = Depends(get_db)) -> list[HoldingWithLivePrice]:
    return build_holding_rows(db)


@router.post("", response_model=HoldingRead, status_code=status.HTTP_201_CREATED)
def create_holding(payload: HoldingCreate, db: Session = Depends(get_db)) -> Holding:
    ticker = normalize_ticker(payload.ticker)
    existing = db.query(Holding).filter(Holding.ticker == ticker).one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, f"holding for {ticker} already exists")
    holding = Holding(ticker=ticker, notes=payload.notes)
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding


@router.patch("/{holding_id}", response_model=HoldingRead)
def update_holding(holding_id: int, payload: HoldingUpdate, db: Session = Depends(get_db)) -> Holding:
    holding = db.get(Holding, holding_id)
    if holding is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "holding not found")
    if payload.notes is not None:
        holding.notes = payload.notes
    db.commit()
    db.refresh(holding)
    return holding


@router.delete("/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holding(holding_id: int, db: Session = Depends(get_db)) -> None:
    holding = db.get(Holding, holding_id)
    if holding is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "holding not found")
    db.query(Transaction).filter(Transaction.ticker == holding.ticker).delete(synchronize_session=False)
    db.delete(holding)
    db.commit()
