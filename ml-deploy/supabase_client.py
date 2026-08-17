"""
supabase_client.py — GrainHero Async Supabase Client
=====================================================
Used by Process 1 (inference server) for fire-and-forget writes only.
Retraining processes use the synchronous httpx client directly.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
# Inference server uses service_role key so it can insert sensor readings.
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",  # don't wait for row echo — faster writes
}


async def log_sensor_reading(row: Dict[str, Any]) -> None:
    """
    Async fire-and-forget: insert one sensor reading row.
    Called from a FastAPI BackgroundTask — never on the response path.
    Swallows all errors so a Supabase hiccup never crashes inference.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/live_sensor_readings",
                headers=_HEADERS,
                json=row,
            )
            if resp.status_code not in (200, 201):
                logger.warning("Supabase insert failed (%d): %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("Supabase log_sensor_reading error: %s", exc)


async def get_active_row_count(grain: str) -> Optional[int]:
    """
    Returns the number of unprocessed rows for a grain since the last fast retrain.
    Used by the retrain trigger watcher.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/live_sensor_readings",
                headers={**_HEADERS, "Prefer": "count=exact"},
                params={
                    "grain_type": f"eq.{grain}",
                    "select": "id",
                    "limit": "0",
                },
            )
            # Supabase returns count in Content-Range header: "0-0/1234"
            cr = resp.headers.get("content-range", "")
            if "/" in cr:
                return int(cr.split("/")[-1])
    except Exception as exc:
        logger.warning("Row count query error for '%s': %s", grain, exc)
    return None
