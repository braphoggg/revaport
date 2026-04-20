"""SSE endpoint that streams PriceUpdate events to the browser."""
from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from ..db import get_db
from ..models.price_cache import PriceSnapshot
from ..services.event_bus import PriceUpdate, price_bus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stream", tags=["stream"])


async def _event_stream(request: Request, db: Session):
    initial = db.query(PriceSnapshot).all()
    for snap in initial:
        yield {
            "event": "price",
            "data": json.dumps(PriceUpdate(
                ticker=snap.ticker,
                price=snap.price,
                prev_close=snap.prev_close,
                as_of=snap.as_of,
                stale=bool(snap.is_stale),
            ).to_json()),
        }
    async with price_bus.subscribe() as queue:
        while True:
            if await request.is_disconnected():
                break
            try:
                update = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield {"event": "price", "data": json.dumps(update.to_json())}
            except asyncio.TimeoutError:
                yield {"event": "ping", "data": "keepalive"}


@router.get("/prices")
async def stream_prices(request: Request, db: Session = Depends(get_db)) -> EventSourceResponse:
    return EventSourceResponse(_event_stream(request, db))
