"""Single-command dev launcher. Runs backend + frontend, opens browser, handles Ctrl+C."""
from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"

IS_WINDOWS = os.name == "nt"

PREFIX_COLORS = {
    "api": "\033[36m",   # cyan
    "web": "\033[35m",   # magenta
}
RESET = "\033[0m"


def log(prefix: str, line: str) -> None:
    color = PREFIX_COLORS.get(prefix, "")
    sys.stdout.write(f"{color}[{prefix}]{RESET} {line}")
    sys.stdout.flush()


def stream_output(proc: subprocess.Popen, prefix: str) -> None:
    assert proc.stdout is not None
    for raw in proc.stdout:
        log(prefix, raw if raw.endswith("\n") else raw + "\n")


def ensure_backend_env() -> None:
    venv = BACKEND / ".venv"
    if not venv.exists():
        log("api", "creating venv via uv sync...\n")
        subprocess.run(["uv", "sync"], cwd=BACKEND, check=True, shell=IS_WINDOWS)


def ensure_frontend_env() -> None:
    nm = FRONTEND / "node_modules"
    if not nm.exists():
        log("web", "installing npm dependencies...\n")
        subprocess.run(["npm", "install"], cwd=FRONTEND, check=True, shell=IS_WINDOWS)


def launch_backend() -> subprocess.Popen:
    cmd = ["uv", "run", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"]
    kwargs: dict = dict(
        cwd=BACKEND,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    if IS_WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP  # type: ignore[attr-defined]
        kwargs["shell"] = True
    return subprocess.Popen(cmd, **kwargs)


def launch_frontend() -> subprocess.Popen:
    npm_cmd = "npm.cmd" if IS_WINDOWS else "npm"
    cmd = [npm_cmd, "run", "dev"]
    kwargs: dict = dict(
        cwd=FRONTEND,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
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
    if shutil.which("uv") is None:
        print("error: `uv` not on PATH. install with `pip install uv`", file=sys.stderr)
        return 1
    if shutil.which("npm") is None and shutil.which("npm.cmd") is None:
        print("error: `npm` not on PATH. install Node.js from https://nodejs.org", file=sys.stderr)
        return 1

    ensure_backend_env()
    ensure_frontend_env()

    api = launch_backend()
    web = launch_frontend()

    t_api = threading.Thread(target=stream_output, args=(api, "api"), daemon=True)
    t_web = threading.Thread(target=stream_output, args=(web, "web"), daemon=True)
    t_api.start()
    t_web.start()

    browser_opened = False

    def open_browser_soon() -> None:
        nonlocal browser_opened
        time.sleep(3.0)
        if not browser_opened:
            browser_opened = True
            webbrowser.open("http://localhost:5173")

    threading.Thread(target=open_browser_soon, daemon=True).start()

    try:
        while True:
            if api.poll() is not None:
                log("api", f"exited with code {api.returncode}\n")
                break
            if web.poll() is not None:
                log("web", f"exited with code {web.returncode}\n")
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        log("dev", "\nshutting down...\n")
    finally:
        terminate(web)
        terminate(api)

    return 0


if __name__ == "__main__":
    sys.exit(main())
