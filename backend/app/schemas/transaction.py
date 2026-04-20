from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


TxTypeStr = Literal["BUY", "SELL", "DIVIDEND", "SPLIT"]


class TransactionCreate(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    tx_type: TxTypeStr
    qty: float = Field(..., ge=0)
    price: float = Field(..., ge=0)
    fees: float = Field(0.0, ge=0)
    executed_at: datetime
    notes: str | None = None


class TransactionUpdate(BaseModel):
    ticker: str | None = Field(None, min_length=1, max_length=20)
    tx_type: TxTypeStr | None = None
    qty: float | None = Field(None, ge=0)
    price: float | None = Field(None, ge=0)
    fees: float | None = Field(None, ge=0)
    executed_at: datetime | None = None
    notes: str | None = None


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    tx_type: TxTypeStr
    qty: float
    price: float
    fees: float
    executed_at: datetime
    notes: str | None
    created_at: datetime


class LotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    buy_tx_id: int
    opened_at: datetime
    qty_remaining: float
    cost_per_share: float
