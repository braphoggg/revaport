"""FIFO cost-basis engine tests. These define the contract — implementation follows."""
from __future__ import annotations

from datetime import datetime

import pytest

from app.models.transaction import TxType
from app.services.cost_basis import (
    OversellError,
    Tx,
    fold_transactions,
)


def tx(tx_type: TxType, qty: float, price: float, *, day: int = 1, fees: float = 0.0, tx_id: int = 0) -> Tx:
    return Tx(
        id=tx_id or day,
        ticker="AAPL",
        tx_type=tx_type,
        qty=qty,
        price=price,
        fees=fees,
        executed_at=datetime(2024, 1, day),
    )


def test_single_buy_creates_one_lot() -> None:
    state = fold_transactions([tx(TxType.BUY, qty=10, price=100, day=1)])
    assert len(state.open_lots) == 1
    lot = state.open_lots[0]
    assert lot.qty_remaining == 10
    assert lot.cost_per_share == pytest.approx(100.0)
    assert state.qty == 10
    assert state.total_cost == pytest.approx(1000.0)
    assert state.realized_pnl == 0.0


def test_buy_folds_fees_into_cost_basis() -> None:
    state = fold_transactions([tx(TxType.BUY, qty=10, price=100, day=1, fees=5)])
    assert state.open_lots[0].cost_per_share == pytest.approx(100.5)
    assert state.total_cost == pytest.approx(1005.0)


def test_multiple_buys_stack_as_separate_lots() -> None:
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.BUY, qty=5, price=120, day=2),
    ])
    assert len(state.open_lots) == 2
    assert state.open_lots[0].cost_per_share == pytest.approx(100.0)
    assert state.open_lots[1].cost_per_share == pytest.approx(120.0)
    assert state.qty == 15
    assert state.total_cost == pytest.approx(1600.0)


def test_partial_sell_consumes_oldest_lot_first() -> None:
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.BUY, qty=10, price=150, day=2),
        tx(TxType.SELL, qty=4, price=200, day=3),
    ])
    assert len(state.open_lots) == 2
    assert state.open_lots[0].qty_remaining == 6
    assert state.open_lots[1].qty_remaining == 10
    assert state.realized_pnl == pytest.approx(4 * (200 - 100))
    assert state.qty == 16


def test_sell_spans_multiple_lots() -> None:
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.BUY, qty=10, price=150, day=2),
        tx(TxType.SELL, qty=15, price=200, day=3),
    ])
    assert len(state.open_lots) == 1
    assert state.open_lots[0].qty_remaining == 5
    assert state.open_lots[0].cost_per_share == pytest.approx(150.0)
    assert state.realized_pnl == pytest.approx(
        10 * (200 - 100) + 5 * (200 - 150)
    )
    assert state.qty == 5


def test_full_sell_closes_all_lots() -> None:
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.SELL, qty=10, price=120, day=2),
    ])
    assert state.open_lots == []
    assert state.qty == 0
    assert state.total_cost == 0.0
    assert state.realized_pnl == pytest.approx(200.0)


def test_sell_fees_reduce_realized_pnl() -> None:
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.SELL, qty=10, price=120, day=2, fees=3),
    ])
    assert state.realized_pnl == pytest.approx(200.0 - 3.0)


def test_oversell_raises() -> None:
    with pytest.raises(OversellError):
        fold_transactions([
            tx(TxType.BUY, qty=5, price=100, day=1),
            tx(TxType.SELL, qty=10, price=120, day=2),
        ])


def test_sell_with_no_lots_raises() -> None:
    with pytest.raises(OversellError):
        fold_transactions([tx(TxType.SELL, qty=1, price=120, day=1)])


def test_split_doubles_qty_halves_cost() -> None:
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.SPLIT, qty=2.0, price=0, day=2),  # 2:1 split
    ])
    assert len(state.open_lots) == 1
    assert state.open_lots[0].qty_remaining == 20
    assert state.open_lots[0].cost_per_share == pytest.approx(50.0)
    assert state.qty == 20
    assert state.total_cost == pytest.approx(1000.0)


def test_split_applies_to_all_open_lots() -> None:
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.BUY, qty=5, price=200, day=2),
        tx(TxType.SPLIT, qty=2.0, price=0, day=3),
    ])
    assert state.qty == 30
    assert state.open_lots[0].qty_remaining == 20
    assert state.open_lots[0].cost_per_share == pytest.approx(50.0)
    assert state.open_lots[1].qty_remaining == 10
    assert state.open_lots[1].cost_per_share == pytest.approx(100.0)


def test_dividend_payout_semantics() -> None:
    """Dividend semantics: qty ignored, price = total cash payout."""
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.DIVIDEND, qty=0, price=25, day=2),
    ])
    assert state.qty == 10
    assert state.total_cost == pytest.approx(1000.0)
    assert state.realized_pnl == pytest.approx(25.0)


def test_buy_sell_buy_sequence_preserves_fifo() -> None:
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.SELL, qty=10, price=120, day=2),
        tx(TxType.BUY, qty=5, price=150, day=3),
    ])
    assert len(state.open_lots) == 1
    assert state.open_lots[0].qty_remaining == 5
    assert state.open_lots[0].cost_per_share == pytest.approx(150.0)
    assert state.realized_pnl == pytest.approx(200.0)


def test_avg_cost_display_from_open_lots() -> None:
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.BUY, qty=10, price=200, day=2),
    ])
    assert state.avg_cost == pytest.approx(150.0)


def test_avg_cost_after_partial_sell() -> None:
    state = fold_transactions([
        tx(TxType.BUY, qty=10, price=100, day=1),
        tx(TxType.BUY, qty=10, price=200, day=2),
        tx(TxType.SELL, qty=5, price=300, day=3),  # consumes 5 from the $100 lot
    ])
    # Remaining: 5 @ 100, 10 @ 200 -> total cost 500 + 2000 = 2500, qty 15, avg = 166.67
    assert state.qty == 15
    assert state.avg_cost == pytest.approx(2500.0 / 15)


def test_empty_transaction_list_zero_state() -> None:
    state = fold_transactions([])
    assert state.qty == 0
    assert state.total_cost == 0.0
    assert state.realized_pnl == 0.0
    assert state.open_lots == []
