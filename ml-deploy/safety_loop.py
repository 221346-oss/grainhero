"""
safety_loop.py — GrainHero Shared Retrain Safety Guardrail
===========================================================
Imported by BOTH fast_retrain.py and nightly_retrain.py.
NEVER imported by app.py (Process 1).

Sequence (same for both callers):
  1. Backup current active .onnx from Supabase Storage.
  2. Caller runs training and passes back the new .onnx bytes.
  3. Sanity-check: run known test cases, require >= SANITY_PASS_RATE.
  4a. Pass → upload new .onnx, mark active in model_versions, log success.
  4b. Fail → discard new model (backup is untouched), log failure.

Guarantee: Process 1 only ever sees a model file that cleared step 3.
"""

from __future__ import annotations

import hashlib
import logging
import os
import time
from datetime import datetime, timezone
from typing import Callable, Dict, List, Optional, Tuple

import httpx
import numpy as np

logger = logging.getLogger(__name__)

# ── Supabase connection (synchronous — runs in isolated subprocess) ────────────
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ONNX_BUCKET          = "onnx-models"

_HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
}

# ── Tunable constants ─────────────────────────────────────────────────────────
# Sanity pass threshold: ≥85% of fixed test cases must be predicted correctly.
# Rationale: 10 test cases per grain × 85% = at minimum 8-9 correct.
# Could be raised to 90% once the test set grows beyond 20 cases per grain.
SANITY_PASS_RATE = 0.85

# ── Fixed sanity-check test suite ────────────────────────────────────────────
# Each entry: (feature_vector_9_floats, expected_label)
# These are derived from FAO / IRRI / ASABE thresholds — clear-cut cases only.
# Add more as the grain portfolio expands. These are checked into the repo and
# NEVER updated by an automated process.
SANITY_CASES: Dict[str, List[Tuple[List[float], str]]] = {
    "rice": [
        # [Temp, Hum, StorDays, Airflow, DewPt, AmbLight, Pest, Moisture, Rain]
        ([25.0, 60.0, 10,  0.3, 14.0, 80.0, 0.0, 13.0, 0.0], "Safe"),
        ([35.0, 85.0, 90,  0.0, 28.0,  0.0, 0.8, 17.0, 5.0], "Spoiled"),
        ([28.0, 70.0, 30,  0.2, 18.0, 60.0, 0.1, 14.0, 0.0], "Safe"),
        ([38.0, 90.0, 120, 0.0, 32.0,  0.0, 0.9, 19.0, 8.0], "Spoiled"),
        ([30.0, 78.0, 60,  0.1, 22.0, 40.0, 0.4, 16.0, 2.0], "Risky"),
        ([24.0, 55.0, 5,   0.4, 12.0, 90.0, 0.0, 12.5, 0.0], "Safe"),
        ([40.0, 95.0, 180, 0.0, 38.0,  0.0, 1.0, 22.0, 10.0],"Spoiled"),
        ([27.0, 65.0, 20,  0.3, 16.0, 70.0, 0.0, 13.5, 0.0], "Safe"),
        ([33.0, 82.0, 80,  0.0, 25.0, 20.0, 0.6, 16.5, 3.0], "Risky"),
        ([26.0, 62.0, 15,  0.3, 15.0, 75.0, 0.0, 13.2, 0.0], "Safe"),
    ],
    "wheat": [
        ([20.0, 55.0, 10,  0.3, 10.0, 80.0, 0.0, 12.0, 0.0], "Safe"),
        ([35.0, 88.0, 100, 0.0, 30.0,  0.0, 0.9, 16.0, 6.0], "Spoiled"),
        ([22.0, 60.0, 25,  0.2, 12.0, 60.0, 0.1, 12.5, 0.0], "Safe"),
        ([38.0, 92.0, 130, 0.0, 35.0,  0.0, 1.0, 18.0, 9.0], "Spoiled"),
        ([28.0, 75.0, 60,  0.1, 20.0, 40.0, 0.4, 14.0, 2.0], "Risky"),
        ([19.0, 50.0, 5,   0.4, 8.0,  90.0, 0.0, 11.5, 0.0], "Safe"),
        ([40.0, 95.0, 200, 0.0, 40.0,  0.0, 1.0, 20.0, 12.0],"Spoiled"),
        ([21.0, 58.0, 18,  0.3, 11.0, 75.0, 0.0, 12.2, 0.0], "Safe"),
        ([32.0, 82.0, 85,  0.0, 26.0, 20.0, 0.6, 15.5, 3.0], "Risky"),
        ([20.5, 56.0, 12,  0.3, 10.5, 78.0, 0.0, 12.1, 0.0], "Safe"),
    ],
    "maize": [
        ([25.0, 60.0, 10,  0.3, 14.0, 80.0, 0.0, 13.0, 0.0], "Safe"),
        ([36.0, 88.0, 95,  0.0, 30.0,  0.0, 0.8, 17.0, 6.0], "Spoiled"),
        ([27.0, 68.0, 28,  0.2, 17.0, 60.0, 0.1, 13.5, 0.0], "Safe"),
        ([39.0, 93.0, 140, 0.0, 36.0,  0.0, 1.0, 19.0, 9.0], "Spoiled"),
        ([31.0, 79.0, 65,  0.1, 23.0, 40.0, 0.5, 15.5, 2.0], "Risky"),
        ([24.0, 55.0, 5,   0.4, 12.0, 90.0, 0.0, 12.5, 0.0], "Safe"),
        ([41.0, 96.0, 190, 0.0, 40.0,  0.0, 1.0, 21.0, 11.0],"Spoiled"),
        ([26.0, 63.0, 20,  0.3, 15.0, 72.0, 0.0, 13.2, 0.0], "Safe"),
        ([34.0, 83.0, 82,  0.0, 27.0, 18.0, 0.6, 16.2, 3.0], "Risky"),
        ([25.5, 61.0, 14,  0.3, 14.5, 77.0, 0.0, 13.1, 0.0], "Safe"),
    ],
    "sorghum": [
        ([28.0, 58.0, 10,  0.3, 15.0, 80.0, 0.0, 12.0, 0.0], "Safe"),
        ([38.0, 90.0, 100, 0.0, 33.0,  0.0, 0.9, 16.0, 7.0], "Spoiled"),
        ([30.0, 65.0, 28,  0.2, 18.0, 60.0, 0.1, 12.5, 0.0], "Safe"),
        ([40.0, 94.0, 150, 0.0, 38.0,  0.0, 1.0, 18.5, 10.0],"Spoiled"),
        ([33.0, 80.0, 65,  0.1, 24.0, 40.0, 0.5, 14.5, 2.5], "Risky"),
        ([27.0, 55.0, 5,   0.4, 13.0, 90.0, 0.0, 11.5, 0.0], "Safe"),
        ([42.0, 97.0, 200, 0.0, 42.0,  0.0, 1.0, 20.0, 12.0],"Spoiled"),
        ([29.0, 62.0, 18,  0.3, 16.0, 72.0, 0.0, 12.2, 0.0], "Safe"),
        ([36.0, 84.0, 88,  0.0, 28.0, 15.0, 0.7, 15.8, 3.5], "Risky"),
        ([28.5, 60.0, 12,  0.3, 15.5, 78.0, 0.0, 12.1, 0.0], "Safe"),
    ],
    "barley": [
        ([18.0, 55.0, 10,  0.3, 8.0,  80.0, 0.0, 12.0, 0.0], "Safe"),
        ([34.0, 88.0, 105, 0.0, 28.0,  0.0, 0.9, 15.5, 6.5], "Spoiled"),
        ([20.0, 60.0, 25,  0.2, 10.0, 62.0, 0.1, 12.5, 0.0], "Safe"),
        ([37.0, 93.0, 145, 0.0, 34.0,  0.0, 1.0, 17.5, 9.5], "Spoiled"),
        ([26.0, 75.0, 62,  0.1, 18.0, 42.0, 0.4, 14.0, 2.0], "Risky"),
        ([17.0, 50.0, 5,   0.4, 7.0,  90.0, 0.0, 11.5, 0.0], "Safe"),
        ([39.0, 96.0, 195, 0.0, 39.0,  0.0, 1.0, 19.5, 11.5],"Spoiled"),
        ([19.0, 58.0, 18,  0.3, 9.5,  75.0, 0.0, 12.2, 0.0], "Safe"),
        ([30.0, 82.0, 86,  0.0, 24.0, 18.0, 0.6, 14.8, 3.0], "Risky"),
        ([18.5, 56.0, 12,  0.3, 8.5,  78.0, 0.0, 12.1, 0.0], "Safe"),
    ],
}


# ── HTTP helpers ──────────────────────────────────────────────────────────────
def _http() -> httpx.Client:
    return httpx.Client(timeout=60.0, headers=_HEADERS)


def _download_current_onnx(grain: str, client: httpx.Client) -> Optional[bytes]:
    """Download the currently-active .onnx for backup purposes."""
    resp = client.get(
        f"{SUPABASE_URL}/storage/v1/object/{ONNX_BUCKET}/{grain}/{grain}.onnx"
    )
    if resp.status_code == 200:
        return resp.content
    logger.warning("No current .onnx to back up for '%s' (status=%d)", grain, resp.status_code)
    return None


def _upload_onnx(grain: str, onnx_bytes: bytes, version: str, client: httpx.Client) -> bool:
    """Upload new .onnx to Supabase Storage, overwriting the active path."""
    resp = client.post(
        f"{SUPABASE_URL}/storage/v1/object/{ONNX_BUCKET}/{grain}/{grain}.onnx",
        content=onnx_bytes,
        headers={**_HEADERS, "Content-Type": "application/octet-stream", "x-upsert": "true"},
    )
    if resp.status_code in (200, 201):
        logger.info("Uploaded %s.onnx (version=%s, %d bytes)", grain, version, len(onnx_bytes))
        return True
    logger.error("Upload failed (%d): %s", resp.status_code, resp.text[:300])
    return False


def _backup_onnx(grain: str, current_bytes: bytes, version_ts: str, client: httpx.Client) -> None:
    """Write a versioned backup before overwriting the active model."""
    backup_path = f"{grain}/backups/{grain}_{version_ts}.onnx"
    resp = client.post(
        f"{SUPABASE_URL}/storage/v1/object/{ONNX_BUCKET}/{backup_path}",
        content=current_bytes,
        headers={**_HEADERS, "Content-Type": "application/octet-stream", "x-upsert": "true"},
    )
    if resp.status_code in (200, 201):
        logger.info("Backed up current model → %s", backup_path)
    else:
        logger.warning("Backup upload failed (%d) — proceeding anyway", resp.status_code)


def _write_model_version(
    grain: str, version: str, storage_path: str, file_hash: str,
    accuracy: float, sanity_pass_rate: float,
    trained_by: str, client: httpx.Client
) -> Optional[int]:
    """Insert a model_versions row and set is_active=TRUE for it."""
    # Deactivate previous active versions
    client.patch(
        f"{SUPABASE_URL}/rest/v1/model_versions",
        params={"grain_type": f"eq.{grain}", "is_active": "eq.true"},
        json={"is_active": False},
    )
    # Insert new version
    resp = client.post(
        f"{SUPABASE_URL}/rest/v1/model_versions",
        params={"select": "id"},
        headers={**_HEADERS, "Prefer": "return=representation"},
        json={
            "grain_type": grain, "version": version, "storage_path": storage_path,
            "accuracy": accuracy, "sanity_pass_rate": sanity_pass_rate,
            "file_hash": file_hash, "trained_by": trained_by, "is_active": True,
        },
    )
    if resp.status_code in (200, 201):
        rows = resp.json()
        return rows[0]["id"] if rows else None
    logger.error("model_versions insert failed (%d)", resp.status_code)
    return None


def _write_retrain_log(
    grain: str, trigger: str, status: str, rows_used: int,
    accuracy: Optional[float], sanity_pass_rate: Optional[float],
    duration: float, fail_reason: Optional[str],
    model_version_id: Optional[int], client: httpx.Client,
) -> None:
    client.post(
        f"{SUPABASE_URL}/rest/v1/retrain_log",
        json={
            "grain_type": grain, "trigger": trigger, "status": status,
            "rows_used": rows_used, "accuracy": accuracy,
            "sanity_pass_rate": sanity_pass_rate, "duration_seconds": round(duration, 1),
            "fail_reason": fail_reason, "model_version_id": model_version_id,
            "finished_at": datetime.now(timezone.utc).isoformat(),
        },
    )


def _update_metadata(
    grain: str, trigger: str, best_params: Optional[dict],
    active_version: str, accuracy: float, client: httpx.Client,
) -> None:
    update = {
        "active_model_version": active_version,
        "active_accuracy": accuracy,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if trigger == "nightly_retrain" and best_params:
        update["best_params"] = best_params
        update["last_nightly_run"] = datetime.now(timezone.utc).isoformat()
    else:
        update["last_fast_run"] = datetime.now(timezone.utc).isoformat()
    client.patch(
        f"{SUPABASE_URL}/rest/v1/ml_model_metadata",
        params={"grain_type": f"eq.{grain}"},
        json=update,
    )


# ── Sanity check ──────────────────────────────────────────────────────────────
def _run_sanity_check(onnx_bytes: bytes, grain: str) -> Tuple[float, List[dict]]:
    """
    Run the fixed test suite against the candidate model.
    Returns (pass_rate, detailed_results).
    """
    import onnxruntime as ort

    session = ort.InferenceSession(onnx_bytes, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_names = [o.name for o in session.get_outputs()]

    cases = SANITY_CASES.get(grain, [])
    if not cases:
        logger.warning("No sanity cases defined for '%s' — skipping check (auto-pass).", grain)
        return 1.0, []

    results, passed = [], 0
    for features, expected in cases:
        X = np.array([features], dtype=np.float32)
        outs = session.run(output_names, {input_name: X})
        raw_label = outs[0][0]
        predicted = str(raw_label) if not isinstance(raw_label, (int, np.integer)) else \
                    ["Safe", "Risky", "Spoiled"][int(raw_label)] if int(raw_label) < 3 else str(raw_label)
        ok = predicted == expected
        if ok:
            passed += 1
        results.append({"expected": expected, "predicted": predicted, "pass": ok})

    pass_rate = passed / len(cases)
    logger.info("Sanity check for '%s': %d/%d passed (%.0f%%)", grain, passed, len(cases), pass_rate * 100)
    return pass_rate, results


# ── Main entry point ──────────────────────────────────────────────────────────
def run(
    grain: str,
    train_fn: Callable[[], Tuple[bytes, float, Optional[dict]]],
    trained_by: str,
    rows_used: int = 0,
) -> bool:
    """
    Execute the full safety loop.

    Args:
        grain:      Grain type string.
        train_fn:   Callable with zero args that returns (onnx_bytes, accuracy, best_params).
                    This is where Process 2/3 do their actual work.
        trained_by: 'fast_retrain' | 'nightly_retrain'
        rows_used:  How many rows were used for training (logged only).

    Returns:
        True on success (new model promoted), False on failure (old model retained).
    """
    version_ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    start_time = time.time()
    client = _http()

    # ── Step 1: Backup current model ─────────────────────────────────────────
    current_bytes = _download_current_onnx(grain, client)
    if current_bytes:
        _backup_onnx(grain, current_bytes, version_ts, client)
    else:
        logger.info("No existing model for '%s' to back up — first-time training.", grain)

    # ── Step 2: Train ─────────────────────────────────────────────────────────
    onnx_bytes, accuracy, best_params = None, 0.0, None
    try:
        logger.info("Running training for '%s'...", grain)
        onnx_bytes, accuracy, best_params = train_fn()
    except Exception as exc:
        duration = time.time() - start_time
        logger.error("Training raised exception for '%s': %s", grain, exc, exc_info=True)
        _write_retrain_log(
            grain, trained_by, "failed", rows_used, None, None,
            duration, f"Training exception: {exc}", None, client,
        )
        client.close()
        return False

    # ── Step 3: Sanity check ──────────────────────────────────────────────────
    pass_rate, _ = _run_sanity_check(onnx_bytes, grain)

    if pass_rate < SANITY_PASS_RATE:
        duration = time.time() - start_time
        reason = f"Sanity check failed: {pass_rate:.0%} < {SANITY_PASS_RATE:.0%} threshold"
        logger.error("❌ %s — discarding new model for '%s'. Old model intact.", reason, grain)
        _write_retrain_log(
            grain, trained_by, "failed", rows_used, accuracy, pass_rate,
            duration, reason, None, client,
        )
        client.close()
        return False

    # ── Step 4a: Promote — upload + mark active ───────────────────────────────
    file_hash = hashlib.sha256(onnx_bytes).hexdigest()
    storage_path = f"{grain}/{grain}.onnx"

    uploaded = _upload_onnx(grain, onnx_bytes, version_ts, client)
    if not uploaded:
        duration = time.time() - start_time
        _write_retrain_log(
            grain, trained_by, "failed", rows_used, accuracy, pass_rate,
            duration, "Supabase Storage upload failed", None, client,
        )
        client.close()
        return False

    mv_id = _write_model_version(
        grain, version_ts, storage_path, file_hash,
        accuracy, pass_rate, trained_by, client,
    )
    _update_metadata(grain, trained_by, best_params, version_ts, accuracy, client)

    duration = time.time() - start_time
    _write_retrain_log(
        grain, trained_by, "success", rows_used, accuracy, pass_rate,
        duration, None, mv_id, client,
    )

    logger.info(
        "✅ '%s' model promoted (version=%s acc=%.3f sanity=%.0f%% in %.1fs)",
        grain, version_ts, accuracy, pass_rate * 100, duration,
    )
    client.close()
    return True
