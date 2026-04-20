"""Background price refresh job.

Runs every minute during market hours, every 15 minutes otherwise.
After each refresh, publishes per-ticker PriceUpdate events to the bus so
SSE subscribers can push to the browser without polling.
"""
from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from ..config import settings
from ..db import SessionLocal
from .event_bus import PriceUpdate, price_bus
from .market_hours import is_market_open
from .portfolio_service import upsert_daily_snapshot
from .price_service import refresh_all_holdings

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def _tick_seconds() -> int:
    return (
        settings.scheduler_tick_market_seconds
        if is_market_open()
        else settings.scheduler_tick_closed_seconds
    )


def _refresh_job_sync() -> dict:
    with SessionLocal() as db:
        snapshots = refresh_all_holdings(db)
        upsert_daily_snapshot(db)
        return snapshots


async def _refresh_job() -> None:
    try:
        snapshots = await asyncio.to_thread(_refresh_job_sync)
        updates = [
            PriceUpdate(
                ticker=s.ticker,
                price=s.price,
                prev_close=s.prev_close,
                as_of=s.as_of,
                stale=bool(s.is_stale),
            )
            for s in snapshots.values()
        ]
        if updates:
            await price_bus.publish_many(updates)
    except Exception:
        logger.exception("scheduled refresh failed")


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _refresh_job,
        IntervalTrigger(seconds=_tick_seconds()),
        id="refresh_prices",
        next_run_time=None,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("scheduler started, tick=%ds", _tick_seconds())

    loop = asyncio.get_running_loop()
    loop.call_later(2.0, lambda: loop.create_task(_refresh_job()))


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
