from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.holding import Holding
from ..models.transaction import Transaction, TxType
from ..schemas.transaction import TransactionCreate, TransactionRead, TransactionUpdate
from ..services.cost_basis import OversellError, recompute_ticker
from ..services.splits import inject_missing_splits
from ..services.ticker import normalize_ticker

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionRead])
def list_transactions(
    ticker: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    db: Session = Depends(get_db),
) -> list[Transaction]:
    q = db.query(Transaction)
    if ticker:
        q = q.filter(Transaction.ticker == normalize_ticker(ticker))
    if start:
        q = q.filter(Transaction.executed_at >= start)
    if end:
        q = q.filter(Transaction.executed_at <= end)
    return q.order_by(Transaction.executed_at.desc(), Transaction.id.desc()).all()


def _ensure_holding(db: Session, ticker: str) -> None:
    if db.query(Holding).filter(Holding.ticker == ticker).one_or_none() is None:
        db.add(Holding(ticker=ticker))
        db.flush()


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)) -> Transaction:
    ticker = normalize_ticker(payload.ticker)
    _ensure_holding(db, ticker)
    row = Transaction(
        ticker=ticker,
        tx_type=payload.tx_type,
        qty=payload.qty,
        price=payload.price,
        fees=payload.fees,
        executed_at=payload.executed_at,
        notes=payload.notes,
    )
    db.add(row)
    db.flush()
    try:
        recompute_ticker(db, ticker)
    except OversellError as e:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{tx_id}", response_model=TransactionRead)
def update_transaction(tx_id: int, payload: TransactionUpdate, db: Session = Depends(get_db)) -> Transaction:
    row = db.get(Transaction, tx_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "transaction not found")
    old_ticker = row.ticker

    if payload.ticker is not None:
        row.ticker = normalize_ticker(payload.ticker)
        _ensure_holding(db, row.ticker)
    if payload.tx_type is not None:
        row.tx_type = payload.tx_type
    if payload.qty is not None:
        row.qty = payload.qty
    if payload.price is not None:
        row.price = payload.price
    if payload.fees is not None:
        row.fees = payload.fees
    if payload.executed_at is not None:
        row.executed_at = payload.executed_at
    if payload.notes is not None:
        row.notes = payload.notes

    db.flush()
    try:
        recompute_ticker(db, row.ticker)
        if row.ticker != old_ticker:
            recompute_ticker(db, old_ticker)
    except OversellError as e:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)) -> None:
    row = db.get(Transaction, tx_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "transaction not found")
    ticker = row.ticker
    db.delete(row)
    db.flush()
    try:
        recompute_ticker(db, ticker)
    except OversellError as e:
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    db.commit()


@router.post("/import", response_model=dict)
async def import_csv(file: UploadFile, commit: bool = True, db: Session = Depends(get_db)) -> dict:
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    required = {"date", "ticker", "tx_type", "qty", "price"}
    if not required.issubset({c.lower() for c in (reader.fieldnames or [])}):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"csv must have columns: {sorted(required)}")

    parsed: list[dict] = []
    errors: list[str] = []
    for i, raw in enumerate(reader, start=2):
        try:
            row = {k.lower(): (v or "").strip() for k, v in raw.items()}
            tx_type = row["tx_type"].upper()
            if tx_type not in TxType.__members__:
                raise ValueError(f"unknown tx_type '{tx_type}'")
            parsed.append({
                "ticker": normalize_ticker(row["ticker"]),
                "tx_type": tx_type,
                "qty": float(row["qty"]),
                "price": float(row["price"]),
                "fees": float(row.get("fees") or 0),
                "executed_at": datetime.fromisoformat(row["date"]),
                "notes": row.get("notes") or None,
            })
        except Exception as e:
            errors.append(f"row {i}: {e}")

    if errors:
        return {"ok": False, "rows": len(parsed), "errors": errors}

    if not commit:
        return {"ok": True, "rows": len(parsed), "errors": [], "preview": parsed}

    affected: set[str] = set()
    for p in parsed:
        _ensure_holding(db, p["ticker"])
        db.add(Transaction(**p))
        affected.add(p["ticker"])
    db.flush()
    splits_info = inject_missing_splits(db, affected)
    for ticker in affected:
        try:
            recompute_ticker(db, ticker)
        except OversellError as e:
            db.rollback()
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{ticker}: {e}")
    db.commit()
    return {
        "ok": True,
        "rows": len(parsed),
        "errors": [],
        "tickers": sorted(affected),
        "splits_injected": splits_info,
    }
