"""Composes holdings + live prices into the enriched rows the frontend consumes."""
from __future__ import annotations

from datetime import date as date_cls

from sqlalchemy.orm import Session

from ..models.holding import Holding
from ..models.price_cache import PortfolioSnapshot, PriceSnapshot
from ..schemas.holding import HoldingWithLivePrice
from ..schemas.price import PortfolioAllocation, PortfolioSummary
from .ticker import is_cash


def build_holding_rows(db: Session) -> list[HoldingWithLivePrice]:
    holdings = db.query(Holding).order_by(Holding.ticker.asc()).all()
    if not holdings:
        return []
    tickers = [h.ticker for h in holdings]
    snapshots = {
        s.ticker: s
        for s in db.query(PriceSnapshot).filter(PriceSnapshot.ticker.in_(tickers)).all()
    }
    rows: list[HoldingWithLivePrice] = []
    for h in holdings:
        snap = snapshots.get(h.ticker)
        avg_cost = (h.total_cost / h.qty) if h.qty > 0 else 0.0

        if is_cash(h.ticker):
            mv = h.qty  # qty IS the dollar amount; price is always $1.00
            rows.append(HoldingWithLivePrice(
                id=h.id, ticker=h.ticker, qty=h.qty, total_cost=h.total_cost,
                realized_pnl=h.realized_pnl, notes=h.notes,
                created_at=h.created_at, updated_at=h.updated_at,
                avg_cost=avg_cost, current_price=1.0, prev_close=1.0,
                market_value=mv, unrealized_pnl=0.0, unrealized_pnl_pct=0.0,
                day_change=0.0, day_change_pct=0.0,
                price_as_of=None, price_stale=False,
            ))
            continue

        if snap is not None:
            price = snap.price
            prev = snap.prev_close
            mv = price * h.qty
            upnl = mv - h.total_cost
            upnl_pct = (upnl / h.total_cost * 100) if h.total_cost > 0 else 0.0
            day_change = (price - prev) * h.qty if prev is not None else 0.0
            day_pct = ((price - prev) / prev * 100) if (prev and prev > 0) else 0.0
            rows.append(HoldingWithLivePrice(
                id=h.id, ticker=h.ticker, qty=h.qty, total_cost=h.total_cost,
                realized_pnl=h.realized_pnl, notes=h.notes,
                created_at=h.created_at, updated_at=h.updated_at,
                avg_cost=avg_cost, current_price=price, prev_close=prev,
                market_value=mv, unrealized_pnl=upnl, unrealized_pnl_pct=upnl_pct,
                day_change=day_change, day_change_pct=day_pct,
                price_as_of=snap.as_of, price_stale=bool(snap.is_stale),
            ))
        else:
            rows.append(HoldingWithLivePrice(
                id=h.id, ticker=h.ticker, qty=h.qty, total_cost=h.total_cost,
                realized_pnl=h.realized_pnl, notes=h.notes,
                created_at=h.created_at, updated_at=h.updated_at,
                avg_cost=avg_cost, current_price=None, prev_close=None,
                market_value=0.0, unrealized_pnl=0.0, unrealized_pnl_pct=0.0,
                day_change=0.0, day_change_pct=0.0,
                price_as_of=None, price_stale=True,
            ))
    return rows


def build_summary(db: Session) -> PortfolioSummary:
    all_rows = build_holding_rows(db)
    rows = [r for r in all_rows if r.qty > 0]
    total_value = sum(r.market_value for r in rows)
    total_cost = sum(r.total_cost for r in rows)
    unrealized = total_value - total_cost
    unrealized_pct = (unrealized / total_cost * 100) if total_cost > 0 else 0.0
    day_change = sum(r.day_change for r in rows)
    prev_total = total_value - day_change
    day_pct = (day_change / prev_total * 100) if prev_total > 0 else 0.0
    realized = sum(r.realized_pnl for r in all_rows)
    allocations = [
        PortfolioAllocation(
            ticker=r.ticker,
            market_value=r.market_value,
            weight_pct=(r.market_value / total_value * 100) if total_value > 0 else 0.0,
        )
        for r in rows
    ]
    allocations.sort(key=lambda a: a.weight_pct, reverse=True)
    return PortfolioSummary(
        total_value=total_value,
        total_cost=total_cost,
        unrealized_pnl=unrealized,
        unrealized_pnl_pct=unrealized_pct,
        day_change=day_change,
        day_change_pct=day_pct,
        realized_pnl=realized,
        positions=len(rows),
        allocations=allocations,
    )


def upsert_daily_snapshot(db: Session, today: date_cls | None = None) -> PortfolioSnapshot:
    """Upsert today's portfolio snapshot from current live prices.
    Cumulative realized P&L sums across ALL holdings (including closed positions)."""
    today = today or date_cls.today()
    rows = build_holding_rows(db)
    open_rows = [r for r in rows if r.qty > 0]
    total_value = sum(r.market_value for r in open_rows)
    total_cost = sum(r.total_cost for r in open_rows)
    unrealized = total_value - total_cost
    realized_cum = sum(r.realized_pnl for r in rows)

    snap = db.get(PortfolioSnapshot, today)
    if snap is None:
        snap = PortfolioSnapshot(
            date=today,
            total_value=total_value,
            total_cost=total_cost,
            unrealized_pnl=unrealized,
            realized_pnl_cumulative=realized_cum,
        )
        db.add(snap)
    else:
        snap.total_value = total_value
        snap.total_cost = total_cost
        snap.unrealized_pnl = unrealized
        snap.realized_pnl_cumulative = realized_cum
    db.commit()
    return snap
