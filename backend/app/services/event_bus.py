"""In-memory pub/sub for price updates. One queue per SSE subscriber."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class PriceUpdate:
    ticker: str
    price: float
    prev_close: float | None
    as_of: datetime
    stale: bool

    def to_json(self) -> dict:
        d = asdict(self)
        d["as_of"] = self.as_of.isoformat()
        return d


class PriceBus:
    """Simple fan-out: publisher appends to every subscriber's queue."""

    def __init__(self) -> None:
        self._subs: list[asyncio.Queue[PriceUpdate]] = []
        self._lock = asyncio.Lock()

    async def publish(self, update: PriceUpdate) -> None:
        async with self._lock:
            subs = list(self._subs)
        for q in subs:
            try:
                q.put_nowait(update)
            except asyncio.QueueFull:
                pass

    async def publish_many(self, updates: list[PriceUpdate]) -> None:
        for u in updates:
            await self.publish(u)

    @asynccontextmanager
    async def subscribe(self):
        q: asyncio.Queue[PriceUpdate] = asyncio.Queue(maxsize=256)
        async with self._lock:
            self._subs.append(q)
        try:
            yield q
        finally:
            async with self._lock:
                try:
                    self._subs.remove(q)
                except ValueError:
                    pass


price_bus = PriceBus()
