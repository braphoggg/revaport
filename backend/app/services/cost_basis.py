"""Pure-function FIFO cost-basis engine.

Given an ordered list of transactions for a single ticker, compute the terminal
state: open FIFO lots, total qty, total cost, cumulative realized P&L.

The engine is intentionally database-unaware. `recompute_ticker` (the
database-bound wrapper) lives below and orchestrates persistence.

Dividend encoding:  qty = 0,  price = total cash payout.
Split encoding:     qty = ratio (2.0 = 2:1),  price = 0.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy.orm import Session

from ..models.holding import Holding
from ..models.lot import Lot
from ..models.transaction import Transaction, TxType


class OversellError(ValueError):
    """Raised when a SELL exceeds the open quantity available."""


@dataclass
class Tx:
    """Transaction tuple consumed by the engine — decouples from the ORM model."""

    id: int
    ticker: str
    tx_type: TxType
    qty: float
    price: float
    fees: float
    executed_at: datetime


@dataclass
class OpenLot:
    buy_tx_id: int
    opened_at: datetime
    qty_remaining: float
    cost_per_share: float


@dataclass
class HoldingState:
    ticker: str = ""
    qty: float = 0.0
    total_cost: float = 0.0
    realized_pnl: float = 0.0
    open_lots: list[OpenLot] = field(default_factory=list)

    @property
    def avg_cost(self) -> float:
        return self.total_cost / self.qty if self.qty > 0 else 0.0


def fold_transactions(txs: list[Tx]) -> HoldingState:
    state = HoldingState()
    if not txs:
        return state
    state.ticker = txs[0].ticker

    for t in txs:
        match t.tx_type:
            case TxType.BUY:
                _apply_buy(state, t)
            case TxType.SELL:
                _apply_sell(state, t)
            case TxType.SPLIT:
                _apply_split(state, t)
            case TxType.DIVIDEND:
                state.realized_pnl += t.price

    _recompute_totals(state)
    return state


def _apply_buy(state: HoldingState, t: Tx) -> None:
    cost_per_share = (t.price * t.qty + t.fees) / t.qty if t.qty > 0 else t.price
    state.open_lots.append(
        OpenLot(
            buy_tx_id=t.id,
            opened_at=t.executed_at,
            qty_remaining=t.qty,
            cost_per_share=cost_per_share,
        )
    )


def _apply_sell(state: HoldingState, t: Tx) -> None:
    total_open = sum(lot.qty_remaining for lot in state.open_lots)
    if t.qty > total_open + 1e-9:
        raise OversellError(
            f"cannot sell {t.qty} {t.ticker}; only {total_open} open"
        )

    remaining = t.qty
    pnl = 0.0
    i = 0
    while remaining > 1e-9 and i < len(state.open_lots):
        lot = state.open_lots[i]
        consume = min(lot.qty_remaining, remaining)
        pnl += consume * (t.price - lot.cost_per_share)
        lot.qty_remaining -= consume
        remaining -= consume
        if lot.qty_remaining <= 1e-9:
            state.open_lots.pop(i)
        else:
            i += 1

    pnl -= t.fees
    state.realized_pnl += pnl


def _apply_split(state: HoldingState, t: Tx) -> None:
    ratio = t.qty
    if ratio <= 0:
        return
    for lot in state.open_lots:
        lot.qty_remaining *= ratio
        lot.cost_per_share /= ratio


def _recompute_totals(state: HoldingState) -> None:
    state.qty = sum(lot.qty_remaining for lot in state.open_lots)
    state.total_cost = sum(
        lot.qty_remaining * lot.cost_per_share for lot in state.open_lots
    )


def _tx_from_orm(row: Transaction) -> Tx:
    return Tx(
        id=row.id,
        ticker=row.ticker,
        tx_type=TxType(row.tx_type),
        qty=row.qty,
        price=row.price,
        fees=row.fees,
        executed_at=row.executed_at,
    )


def recompute_ticker(session: Session, ticker: str) -> HoldingState:
    """Rebuild lots + holdings row for `ticker` from its transaction history."""
    rows = (
        session.query(Transaction)
        .filter(Transaction.ticker == ticker)
        .order_by(Transaction.executed_at.asc(), Transaction.id.asc())
        .all()
    )
    state = fold_transactions([_tx_from_orm(r) for r in rows])

    session.query(Lot).filter(Lot.ticker == ticker).delete(synchronize_session=False)
    for lot in state.open_lots:
        session.add(
            Lot(
                ticker=ticker,
                buy_tx_id=lot.buy_tx_id,
                opened_at=lot.opened_at,
                qty_remaining=lot.qty_remaining,
                cost_per_share=lot.cost_per_share,
            )
        )

    holding = session.query(Holding).filter(Holding.ticker == ticker).one_or_none()
    if holding is None:
        holding = Holding(ticker=ticker)
        session.add(holding)
    holding.qty = state.qty
    holding.total_cost = state.total_cost
    holding.realized_pnl = state.realized_pnl

    session.flush()
    return state
