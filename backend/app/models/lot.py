from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


class Lot(Base):
    __tablename__ = "lots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String, nullable=False)
    buy_tx_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False
    )
    opened_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    qty_remaining: Mapped[float] = mapped_column(Float, nullable=False)
    cost_per_share: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (Index("idx_lots_ticker_open", "ticker", "opened_at", "id"),)
