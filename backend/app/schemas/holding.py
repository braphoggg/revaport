from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HoldingCreate(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    notes: str | None = None


class HoldingUpdate(BaseModel):
    notes: str | None = None


class HoldingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    qty: float
    total_cost: float
    realized_pnl: float
    notes: str | None
    created_at: datetime
    updated_at: datetime


class HoldingWithLivePrice(HoldingRead):
    avg_cost: float = 0.0
    current_price: float | None = None
    prev_close: float | None = None
    market_value: float = 0.0
    unrealized_pnl: float = 0.0
    unrealized_pnl_pct: float = 0.0
    day_change: float = 0.0
    day_change_pct: float = 0.0
    price_as_of: datetime | None = None
    price_stale: bool = False
