"""Convert broker history CSV (Full_Account_History_*.csv) into the format
the /api/transactions/import endpoint expects.

Input columns:  Date,Symbol,Transaction,Qty,Price,Mkt. Value,P/L,Ref #
Output columns: date,ticker,tx_type,qty,price,fees,notes

Rules:
- skip CAS (cash balance snapshots) and any rows with blank Symbol
- BUY -> BUY, SEL -> SELL, ADD -> BUY (corporate-action adds)
- strip timezone suffix (EDT/EST) and emit ISO-8601 local time
- fees defaulted to 0 (not present in broker export)
- carry the broker Ref # into notes for traceability
"""
from __future__ import annotations

import csv
import sys
from datetime import datetime
from pathlib import Path

TYPE_MAP = {"BUY": "BUY", "SEL": "SELL", "ADD": "BUY"}

# Broker-specific ticker → yfinance ticker. Add entries here as you discover them.
TICKER_RENAME = {
    "GME+": "GME-WT",  # GameStop warrants
}


def parse_date(raw: str) -> str:
    # "07/08/2024 11:59:26 EDT" -> drop timezone token, parse, emit ISO
    parts = raw.strip().split()
    if len(parts) >= 3 and parts[-1] in {"EDT", "EST", "CDT", "CST", "PDT", "PST", "UTC", "GMT"}:
        parts = parts[:-1]
    stamp = " ".join(parts)
    dt = datetime.strptime(stamp, "%m/%d/%Y %H:%M:%S")
    return dt.isoformat()


def convert(in_path: Path, out_path: Path) -> tuple[int, int, list[str]]:
    kept = 0
    skipped = 0
    warnings: list[str] = []

    with in_path.open("r", encoding="utf-8-sig", newline="") as fin:
        lines = fin.readlines()

    # The broker file has a title on line 1 and the real header on line 2.
    # Skip until we find a line that looks like the header.
    start = 0
    for i, line in enumerate(lines):
        if line.lower().startswith("date,symbol,transaction"):
            start = i
            break

    reader = csv.DictReader(lines[start:])

    with out_path.open("w", encoding="utf-8", newline="") as fout:
        writer = csv.DictWriter(fout, fieldnames=["date", "ticker", "tx_type", "qty", "price", "fees", "notes"])
        writer.writeheader()
        for row_no, row in enumerate(reader, start=start + 2):
            txn = (row.get("Transaction") or "").strip().upper()
            symbol = (row.get("Symbol") or "").strip()

            if txn == "CAS" or not symbol:
                skipped += 1
                continue

            mapped = TYPE_MAP.get(txn)
            if mapped is None:
                warnings.append(f"row {row_no}: unknown Transaction '{txn}' (skipped)")
                skipped += 1
                continue

            try:
                date = parse_date(row["Date"])
                qty = float(row["Qty"])
                price = float(row["Price"])
            except Exception as e:
                warnings.append(f"row {row_no}: parse error {e!r} (skipped)")
                skipped += 1
                continue

            if qty <= 0 or price < 0:
                warnings.append(f"row {row_no}: non-positive qty/price (skipped)")
                skipped += 1
                continue

            ref = (row.get("Ref #") or "").strip()
            ticker = TICKER_RENAME.get(symbol, symbol)
            writer.writerow(
                {
                    "date": date,
                    "ticker": ticker,
                    "tx_type": mapped,
                    "qty": qty,
                    "price": price,
                    "fees": 0,
                    "notes": f"ref {ref}" if ref and ref != "0" else "",
                }
            )
            kept += 1

    return kept, skipped, warnings


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: convert_broker_csv.py <input.csv> <output.csv>")
        return 2
    kept, skipped, warnings = convert(Path(sys.argv[1]), Path(sys.argv[2]))
    print(f"kept {kept}, skipped {skipped}, warnings {len(warnings)}")
    for w in warnings[:20]:
        print(" ", w)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
