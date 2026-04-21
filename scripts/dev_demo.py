"""Parallel-instance dev launcher for screenshots and demos.

Runs:
  - backend (uvicorn) on :8001 against backend/data/demo.db
  - frontend (vite)   on :5174 with vite.demo.config.ts (proxies /api -> :8001)

Leaves the regular `python scripts/dev.py` instance on :5173/:8000 alone.
"""
from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
DEMO_DB = BACKEND / "data" / "demo.db"

IS_WINDOWS = os.name == "nt"

PREFIX_COLORS = {"api": "\033[36m", "web": "\033[35m"}
RESET = "\033[0m"


def log(prefix: str, line: str) -> None:
    color = PREFIX_COLORS.get(prefix, "")
    sys.stdout.write(f"{color}[{prefix}]{RESET} {line}")
    sys.stdout.flush()


def stream_output(proc: subprocess.Popen, prefix: str) -> None:
    assert proc.stdout is not None
    for raw in proc.stdout:
        log(prefix, raw if raw.endswith("\n") else raw + "\n")


def launch_backend() -> subprocess.Popen:
    env = os.environ.copy()
    env["REVAPORT_DB_PATH"] = str(DEMO_DB)
    cmd = ["uv", "run", "uvicorn", "app.main:app",
           "--host", "127.0.0.1", "--port", "8001"]
    kwargs: dict = dict(
        cwd=BACKEND, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, bufsize=1,
    )
    if IS_WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
        kwargs["shell"] = True
    return subprocess.Popen(cmd, **kwargs)


def launch_frontend() -> subprocess.Popen:
    npm_cmd = "npm.cmd" if IS_WINDOWS else "npm"
    cmd = [npm_cmd, "exec", "--", "vite", "--config", "vite.demo.config.ts"]
    kwargs: dict = dict(
        cwd=FRONTEND,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, bufsize=1,
    )
    if IS_WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
        kwargs["shell"] = True
    return subprocess.Popen(cmd, **kwargs)


def terminate(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        if IS_WINDOWS:
            proc.send_signal(signal.CTRL_BREAK_EVENT)  # type: ignore[attr-defined]
        else:
            proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    except Exception:
        proc.kill()


def main() -> int:
    if not DEMO_DB.exists():
        print(f"demo DB not found at {DEMO_DB}; run scripts/seed_demo.py first",
              file=sys.stderr)
        return 1
    if shutil.which("uv") is None:
        print("error: `uv` not on PATH", file=sys.stderr)
        return 1

    api = launch_backend()
    web = launch_frontend()

    threading.Thread(target=stream_output, args=(api, "api"), daemon=True).start()
    threading.Thread(target=stream_output, args=(web, "web"), daemon=True).start()

    try:
        while True:
            if api.poll() is not None:
                log("api", f"exited with code {api.returncode}\n"); break
            if web.poll() is not None:
                log("web", f"exited with code {web.returncode}\n"); break
            time.sleep(0.5)
    except KeyboardInterrupt:
        log("dev", "\nshutting down demo instance...\n")
    finally:
        terminate(web)
        terminate(api)

    return 0


if __name__ == "__main__":
    sys.exit(main())
