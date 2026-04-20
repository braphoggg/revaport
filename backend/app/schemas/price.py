from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PriceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticker: str
    price: float
    prev_close: float | None
    as_of: datetime
    stale: bool = False


class PriceHistoryPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: date
    open: float | None
    high: float | None
    low: float | None
    close: float | None
    volume: int | None


class PortfolioSummary(BaseModel):
    total_value: float
    total_cost: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    day_change: float
    day_change_pct: float
    realized_pnl: float
    positions: int
    allocations: list[PortfolioAllocation] = []


class PortfolioAllocation(BaseModel):
    ticker: str
    market_value: float
    weight_pct: float


class PortfolioHistoryPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: date
    total_value: float
    total_cost: float
    unrealized_pnl: float
    realized_pnl_cumulative: float


PortfolioSummary.model_rebuild()
