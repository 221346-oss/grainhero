"""
retrain_watcher.py — GrainHero Fast Retrain Trigger Watcher
============================================================
A lightweight standalone process that polls live_sensor_readings row counts.
When a grain's unprocessed row count crosses FAST_RETRAIN_THRESHOLD, it
spawns fast_retrain.py as a separate subprocess.

Run this as a long-running service (e.g., systemd unit, PM2, Docker sidecar).
It is completely separate from Process 1 (app.py) — they share no memory.

Usage:
    python retrain_watcher.py

Tunable constants — documented inline.
"""

from __future__ import annotations

import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

import httpx

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  watcher  %(message)s",
)
logger = logging.getLogger("retrain_watcher")

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
_HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}

# ── Tunable constants ─────────────────────────────────────────────────────────
# Row threshold: how many new rows in live_sensor_readings trigger a fast retrain.
# Rationale: at 1 reading/min per grain, 500 rows ≈ ~8 hours of fresh data.
# Lower (e.g., 200) for faster freshness; raise if retrain overhead is too frequent.
FAST_RETRAIN_THRESHOLD = 500

# Polling interval for the watcher loop (seconds).
# Rationale: 10 minutes is the right balance — the ESP32 sends data every ~15s,
# so 500 rows accumulate in ~8 hours. Checking every 10 mins is more than fast
# enough to catch that without hammering the Supabase free-tier rate limits.
WATCHER_POLL_INTERVAL = 600  # seconds (10 minutes)

SUPPORTED_GRAINS = ("rice", "wheat", "maize", "sorghum", "barley")

HERE = Path(__file__).resolve().parent


def _get_new_row_count(grain: str, since_ts: str, client: httpx.Client) -> int:
    """Count rows for this grain created after since_ts."""
    resp = client.get(
        f"{SUPABASE_URL}/rest/v1/live_sensor_readings",
        headers={**_HEADERS, "Prefer": "count=exact"},
        params={
            "grain_type": f"eq.{grain}",
            "created_at": f"gt.{since_ts}",
            "select":     "id",
            "limit":      "0",
        },
    )
    cr = resp.headers.get("content-range", "0/0")
    try:
        return int(cr.split("/")[-1])
    except (ValueError, IndexError):
        return 0


def _get_last_retrain_ts(grain: str, client: httpx.Client) -> str:
    """Return the timestamp of the last successful fast retrain for this grain.
    Defaults to Unix epoch if no record exists yet."""
    resp = client.get(
        f"{SUPABASE_URL}/rest/v1/retrain_log",
        params={
            "grain_type": f"eq.{grain}",
            "trigger":    "eq.fast_retrain",
            "status":     "eq.success",
            "order":      "finished_at.desc",
            "limit":      "1",
            "select":     "finished_at",
        },
    )
    if resp.status_code == 200:
        rows = resp.json()
        if rows and rows[0].get("finished_at"):
            return rows[0]["finished_at"]
    return "1970-01-01T00:00:00+00:00"


def _spawn_fast_retrain(grain: str) -> None:
    """
    Spawn fast_retrain.py for this grain as a separate OS subprocess.
    This is a non-blocking call — the watcher does not wait for it to finish.
    The subprocess inherits the environment (including SUPABASE_URL etc).
    """
    logger.info("🚀 Spawning fast_retrain.py for '%s'...", grain)
    subprocess.Popen(
        [sys.executable, str(HERE / "fast_retrain.py"), grain],
        cwd=str(HERE),
        env=os.environ.copy(),
        # Detach stdout/stderr so the watcher's console isn't cluttered
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main() -> None:
    # Track which grains currently have a running retrain subprocess.
    # We don't start a second subprocess if one is already running for a grain.
    active_subprocesses: Dict[str, bool] = {g: False for g in SUPPORTED_GRAINS}

    client = httpx.Client(timeout=15.0, headers=_HEADERS)
    logger.info(
        "Watcher started. Threshold=%d rows, poll_interval=%ds",
        FAST_RETRAIN_THRESHOLD, WATCHER_POLL_INTERVAL,
    )

    try:
        while True:
            for grain in SUPPORTED_GRAINS:
                try:
                    last_ts = _get_last_retrain_ts(grain, client)
                    count   = _get_new_row_count(grain, last_ts, client)

                    if count >= FAST_RETRAIN_THRESHOLD:
                        if not active_subprocesses[grain]:
                            logger.info(
                                "Threshold hit for '%s': %d new rows since %s",
                                grain, count, last_ts,
                            )
                            _spawn_fast_retrain(grain)
                            # Mark as active briefly — reset after WATCHER_POLL_INTERVAL
                            # (subprocess will write a retrain_log row when done,
                            #  which _get_last_retrain_ts will pick up next cycle)
                            active_subprocesses[grain] = True
                    else:
                        # Reset flag once row count drops (new retrain started)
                        active_subprocesses[grain] = False

                except Exception as exc:
                    logger.warning("Watcher error for '%s': %s", grain, exc)

            time.sleep(WATCHER_POLL_INTERVAL)

    except KeyboardInterrupt:
        logger.info("Watcher stopped.")
    finally:
        client.close()


if __name__ == "__main__":
    main()
