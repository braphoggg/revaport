"""Populate backend/data/demo.db with plausible (but entirely fictional)
portfolio data for screenshots and demos. Idempotent — wipes and rebuilds
the demo DB each run.

Tickers + numbers are made up. Real broker data lives in portfolio.db and
is never touched by this script.
"""
from __future__ import annotations

import os
import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
DEMO_DB = BACKEND / "data" / "demo.db"

# Point the backend modules at the demo DB BEFORE importing them.
os.environ["REVAPORT_DB_PATH"] = str(DEMO_DB)
sys.path.insert(0, str(BACKEND))

# Wipe any prior demo DB so seeding is fully deterministic.
for p in [DEMO_DB, DEMO_DB.with_suffix(".db-shm"), DEMO_DB.with_suffix(".db-wal"),
          DEMO_DB.with_suffix(".db-journal")]:
    if p.exists():
        p.unlink()

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models.holding import Holding  # noqa: E402
from app.models.lot import Lot  # noqa: E402  (registers with Base)
from app.models.price_cache import PortfolioSnapshot, PriceSnapshot  # noqa: E402
from app.models.transaction import Transaction, TxType  # noqa: E402
from app.services.cost_basis import recompute_ticker  # noqa: E402

Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# Fictional portfolio. (ticker, lots: list of (qty, price, days_ago))
# Designed to give:
#   - 2 large positions (~30%/20% of portfolio each)
#   - 4 mid positions (~10–15% each)
#   - 1 tiny warrant position (~0.5%) — exercises the leader-line label
#   - One DIVIDEND, one SPLIT to demo all tx types
# ---------------------------------------------------------------------------
SEED: list[tuple[str, list[tuple[float, float, int]]]] = [
    ("AAPL",  [(50,  142.30, 540), (30, 168.10, 280)]),
    ("MSFT",  [(40,  235.50, 600), (20, 310.20, 200)]),
    ("NVDA",  [(8,    142.00, 720)]),       # pre-split position; we'll inject a 10:1
    ("GOOGL", [(60,  118.40, 410)]),
    ("AMZN",  [(35,  128.60, 460)]),
    ("META",  [(15,  198.20, 380), (10, 305.40, 150)]),
    ("AMD",   [(40,  102.30, 320)]),
    ("VTI",   [(80,  215.40, 800)]),
    ("OPEN-WT", [(120, 0.42,  220)]),       # tiny warrant, demos sub-1% label
]

# Today's "live" prices (fictional, but in the right ballpark).
PRICES: dict[str, tuple[float, float]] = {  # ticker -> (price, prev_close)
    "AAPL":   (212.40, 209.85),
    "MSFT":   (428.10, 425.20),
    "NVDA":   (138.60, 141.50),  # post-split units
    "GOOGL":  (175.30, 173.95),
    "AMZN":   (192.20, 188.40),
    "META":   (565.80, 558.10),
    "AMD":    (132.40, 134.20),
    "VTI":    (288.50, 287.10),
    "OPEN-WT": (0.61, 0.58),
}


def seed() -> None:
    db = SessionLocal()
    try:
        # 1. Holdings + transactions
        for ticker, lots in SEED:
            db.add(Holding(ticker=ticker))
            for qty, price, days_ago in lots:
                db.add(Transaction(
                    ticker=ticker,
                    tx_type=TxType.BUY,
                    qty=qty,
                    price=price,
                    fees=0.99,
                    executed_at=datetime.now() - timedelta(days=days_ago),
                    notes=None,
                ))

        # NVDA 10:1 split (June 2024 vibe — 60 days ago in our fake world)
        db.add(Transaction(
            ticker="NVDA", tx_type=TxType.SPLIT, qty=10.0, price=0.0, fees=0.0,
            executed_at=datetime.now() - timedelta(days=60), notes="10:1 forward split",
        ))
        # An AAPL dividend
        db.add(Transaction(
            ticker="AAPL", tx_type=TxType.DIVIDEND, qty=0.0, price=18.40, fees=0.0,
            executed_at=datetime.now() - timedelta(days=45), notes="Q3 dividend",
        ))
        # A small AMD trim — realized gain
        db.add(Transaction(
            ticker="AMD", tx_type=TxType.SELL, qty=10.0, price=158.20, fees=0.99,
            executed_at=datetime.now() - timedelta(days=30), notes="trim",
        ))
        db.flush()

        # Recompute cost basis for everything via the real engine
        for ticker, _ in SEED:
            recompute_ticker(db, ticker)

        # 2. Live price snapshots (so dashboard renders without waiting on yfinance)
        now = datetime.now()
        for ticker, (price, prev) in PRICES.items():
            db.add(PriceSnapshot(
                ticker=ticker, price=price, prev_close=prev,
                as_of=now, is_stale=0,
            ))

        # 3. Portfolio history — 120 calendar days of snapshots with a gentle
        #    drift + noise so the value chart has something interesting to draw.
        random.seed(42)
        today = date.today()
        # Compute today's market value from the live prices + recomputed qtys
        holdings = db.query(Holding).all()
        live = {h.ticker: h.qty for h in holdings}
        end_value = sum(live.get(t, 0) * p for t, (p, _) in PRICES.items())
        end_cost = sum(h.total_cost for h in holdings)

        # Walk backwards: ~25% lower 120 days ago, then drift back up with noise
        for i, days_ago in enumerate(range(120, -1, -1)):
            d = today - timedelta(days=days_ago)
            progress = (120 - days_ago) / 120  # 0 → 1
            base = end_value * (0.75 + 0.25 * progress)
            noise = random.uniform(-0.015, 0.015) * end_value
            value = max(base + noise, end_cost * 0.9)
            db.add(PortfolioSnapshot(
                date=d,
                total_value=value,
                total_cost=end_cost,
                unrealized_pnl=value - end_cost,
                realized_pnl_cumulative=480.0,  # the AMD trim
            ))

        db.commit()
        print(f"seeded {DEMO_DB}")
        print(f"  holdings: {len(SEED)}")
        print(f"  total cost: ${end_cost:,.2f}")
        print(f"  total value: ${end_value:,.2f}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
