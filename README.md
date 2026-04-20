# revaport

A local-first stock portfolio tracker. FastAPI + React, SQLite on disk, prices
from Yahoo. Runs entirely on your machine — your transactions never leave it.

The UI is dressed in the visual language of *Disco Elysium*: parchment paper,
serif typography, oil-paint palette, slight hand-drawn asymmetry. Think
"old leather ledger" rather than "Bloomberg terminal."

```
python scripts/dev.py
```

That's the whole setup. Backend on `:8000`, frontend on `:5173`, browser opens
automatically.

---

## What you get

- **Holdings** with live prices, day change, unrealized P&L, average cost.
- **Transactions** with proper FIFO cost basis: BUY, SELL, DIVIDEND, SPLIT.
  Realized P&L per ticker is recomputed every time you edit history.
- **Dashboard** — total value, day/unrealized/realized P&L, allocation pie,
  portfolio value over time (1W → MAX).
- **Per-ticker detail** — close-price chart with 1M / 3M / 1Y / 5Y / MAX ranges
  and that ticker's full transaction log.
- **CSV import** for bulk loading from a broker export.
- **Live updates** via Server-Sent Events — when the background refresher
  pulls a new quote, the table updates without polling.
- **Stock split handling** — manually entered or auto-injected from yfinance's
  corporate-actions feed; cost basis is rescaled in place.
- **Day / Night / Auto theme**, persisted across reloads.

---

## Quick start

### Prerequisites

| Tool | Why | Get it |
|---|---|---|
| Python 3.12+ | Backend | [python.org](https://www.python.org/downloads/) |
| `uv` | Python deps | `pip install uv` |
| Node 20+ | Frontend | [nodejs.org](https://nodejs.org/) |

### Run

```bash
git clone <this repo>
cd port
python scripts/dev.py
```

First run installs deps for both halves (`uv sync` in `backend/`,
`npm install` in `frontend/`). Subsequent runs are instant.

`Ctrl+C` shuts both processes down cleanly.

---

## Adding data

Three ways to populate the ledger.

**1. Inside the app.** *Holdings* page → "Add holding" → enter ticker. Then
*Transactions* → "Add transaction" for each BUY / SELL / DIVIDEND / SPLIT.

**2. CSV import.** *Transactions* page → "Import CSV". File must have these
columns (case-insensitive header row):

```
date,ticker,tx_type,qty,price,fees,notes
2023-04-12T10:30:00,AAPL,BUY,10,165.42,0,first lot
2024-01-09T14:00:00,AAPL,DIVIDEND,0,4.80,0,Q4 div
2024-08-26T00:00:00,NVDA,SPLIT,10,0,0,10:1
```

`tx_type` is one of `BUY`, `SELL`, `DIVIDEND`, `SPLIT`.
For `DIVIDEND`, `qty=0` and `price` = total cash payout.
For `SPLIT`, `qty` = ratio (e.g. `10` for a 10:1 split) and `price=0`.

**3. Convert a broker export.** If you have a broker history CSV (e.g.
"Full Account History"), `scripts/convert_broker_csv.py` rewrites it into the
format above:

```bash
python scripts/convert_broker_csv.py path/to/broker.csv scripts/out/import.csv
```

Then upload the output through the UI. Edit `TICKER_RENAME` / `TYPE_MAP` in
the script if your broker uses non-standard symbols.

---

## How prices work

- A background scheduler (APScheduler) refreshes every holding **every minute
  during market hours, every 15 minutes when closed**. Cadence and TTLs are
  configurable.
- Each refresh writes a `PriceSnapshot` row and pushes a `PriceUpdate` event
  to an in-process bus.
- The frontend keeps an SSE connection to `/api/stream/prices` and updates the
  React Query cache as events arrive — no polling, no refresh button.
- A daily portfolio snapshot is also persisted, so the value chart has history
  even after you restart the server.

If yfinance is rate-limiting, calls are spaced by `yfinance_min_gap_ms`
(default 500ms) and retried up to `yfinance_max_retries` times.

---

## Project layout

```
port/
├── backend/
│   ├── app/
│   │   ├── models/         SQLAlchemy models (Holding, Transaction, Lot, PriceSnapshot, …)
│   │   ├── routers/        FastAPI endpoints (/api/holdings, /transactions, /prices, /portfolio, /stream)
│   │   ├── services/       Pure logic (cost_basis, splits, price_service, scheduler, yfinance_client)
│   │   ├── schemas/        Pydantic request/response models
│   │   ├── config.py       env-driven settings (PORT_* vars)
│   │   └── main.py         app factory + lifespan
│   ├── data/portfolio.db   local SQLite (gitignored)
│   └── tests/              pytest suite
├── frontend/
│   └── src/
│       ├── pages/          Dashboard / Holdings / Transactions / TickerDetail
│       ├── components/
│       │   ├── ui/         Button, Card, Table, Dialog, Badge, ThemeToggle, Ornament, …
│       │   ├── charts/     Recharts wrappers (theme-aware via useChartPalette)
│       │   ├── layout/     Shell, ConnectionIndicator
│       │   ├── holdings/   page-specific composite components
│       │   └── transactions/
│       ├── hooks/          React Query hooks + PriceStreamProvider
│       ├── lib/            theme, format, query client
│       ├── styles/         theme.css, textures.css, animations.css
│       └── api/            typed fetch wrappers
└── scripts/
    ├── dev.py              one-command launcher
    └── convert_broker_csv.py
```

### Key tables

| Model | Purpose |
|---|---|
| `Holding` | One row per ticker — qty, total cost, realized P&L, notes |
| `Transaction` | The append-only ledger; cost basis is derived, never mutated |
| `Lot` | Open FIFO lots, regenerated from transactions on every change |
| `PriceSnapshot` | Latest quote per ticker (with `is_stale` + `as_of`) |
| `PortfolioSnapshot` | One row per trading day for the value chart |

The cost-basis engine in `services/cost_basis.py` is a pure fold over
transactions — easy to test, easy to reason about, no in-place mutation.

---

## Configuration

All settings come from environment variables prefixed `PORT_` (or a
`backend/.env` file):

| Variable | Default | Notes |
|---|---|---|
| `PORT_DB_PATH` | `backend/data/portfolio.db` | SQLite file location |
| `PORT_API_HOST` / `PORT_API_PORT` | `127.0.0.1` / `8000` | uvicorn bind |
| `PORT_PRICE_CACHE_TTL_MARKET_SECONDS` | `60` | "fresh" window during market hours |
| `PORT_PRICE_CACHE_TTL_CLOSED_SECONDS` | `900` | …and when closed |
| `PORT_SCHEDULER_TICK_MARKET_SECONDS` | `60` | refresh cadence (market hours) |
| `PORT_SCHEDULER_TICK_CLOSED_SECONDS` | `900` | refresh cadence (closed) |
| `PORT_YFINANCE_MIN_GAP_MS` | `500` | space requests this far apart |
| `PORT_YFINANCE_MAX_RETRIES` | `3` | per-ticker retries on failure |
| `PORT_CORS_ORIGINS` | `localhost:5173` | CORS allowlist |

---

## Theming

The aesthetic lives in three CSS files:

- `frontend/src/styles/theme.css` — design tokens (colors, fonts, radii) for
  light + dark, declared in Tailwind 4's `@theme {}` block.
- `frontend/src/styles/textures.css` — body grain, vignette, paper backgrounds.
- `frontend/src/styles/animations.css` — flicker, fade-in-paper, hover-jitter
  (all wrapped in `@media (prefers-reduced-motion: no-preference)`).

To repaint the whole app a different color, change the tokens in `theme.css`
and Tailwind regenerates every utility (`bg-paper`, `text-ink`, `border-edge`,
…). Recharts colors are the one place hex strings live in JS — see
`components/charts/chartTheme.ts`.

---

## Tests

```bash
cd backend
uv run pytest
```

The cost-basis engine has the densest coverage — splits, oversells,
fees, FIFO ordering across edits.

---

## Caveats

- **Single user, no auth.** Don't expose the backend port to the network.
- **USD only.** No FX, no multi-currency reporting.
- **Local Yahoo data.** Subject to yfinance reliability and Yahoo's terms;
  not a substitute for your broker's tax statements.
- **Personal data.** `backend/data/*.db` and `scripts/out/` are gitignored
  by default — keep them that way.

---

## Stack

**Backend** — Python 3.12+, FastAPI, SQLAlchemy 2, SQLite (WAL), yfinance,
APScheduler, sse-starlette, pandas, Pydantic v2.

**Frontend** — React 19, Vite 8, TypeScript, Tailwind CSS 4, React Query 5,
React Router 7, React Hook Form + Zod, Recharts 3, lucide-react.

**Fonts** — Cormorant Garamond (display), EB Garamond (body), JetBrains Mono
(numeric), all from Google Fonts.
