"""
hot_swap.py — GrainHero Background Hot-Swap Poller
===================================================
Process 1 ONLY.  Runs as a single background thread inside the FastAPI app.
Never blocks the request path.

Behavior:
  Every POLL_INTERVAL_SECONDS (default 30s), for each supported grain:
    1. Query Supabase model_versions for the latest active version's file_hash.
    2. Compare with the hash of the currently-loaded model in the registry.
    3. If different: download the new .onnx into memory, validate it loads,
       then atomically swap it into the registry.
    4. If same: do nothing.

All Supabase I/O here uses httpx (sync, but in a background thread — the
request-handling event loop is never touched).
"""

from __future__ import annotations

import hashlib
import io
import logging
import threading
import time
from typing import Optional

import httpx
import onnxruntime as ort

from model_registry import ModelRegistry, _GrainModel, SUPPORTED_GRAINS

logger = logging.getLogger(__name__)

# ── Tunable ─────────────────────────────────────────────────────────────────
# Chosen value: 30 s.
# Rationale: nightly retrains finish in ~35 min; a 30 s staleness window means
# the new model reaches production within 1 poll after upload. Supabase free
# tier allows 500 req/day; 5 grains × 2880 polls/day = 14 400 requests, well
# within a paid-tier budget. Adjust down if faster propagation is needed.
POLL_INTERVAL_SECONDS = 30

# Default class label order — must match what the training pipeline encodes.
DEFAULT_CLASS_LABELS = ("Safe", "Risky", "Spoiled")


class HotSwapPoller:
    def __init__(
        self,
        registry: ModelRegistry,
        supabase_url: str,
        supabase_service_key: str,
        bucket: str = "onnx-models",
    ):
        self._registry = registry
        self._url = supabase_url.rstrip("/")
        self._key = supabase_service_key
        self._bucket = bucket
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        self._http = httpx.Client(
            timeout=30.0,
            headers={
                "apikey": supabase_service_key,
                "Authorization": f"Bearer {supabase_service_key}",
            },
        )

    # ── Public ───────────────────────────────────────────────────────────────

    def start(self) -> None:
        """Spawn the background thread. Call once from FastAPI startup event."""
        self._thread = threading.Thread(
            target=self._loop, name="hot-swap-poller", daemon=True
        )
        self._thread.start()
        logger.info("🔁 HotSwapPoller started (interval=%ds)", POLL_INTERVAL_SECONDS)

    def stop(self) -> None:
        """Signal the thread to exit. Call from FastAPI shutdown event."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=10)
        self._http.close()

    # ── Internal ─────────────────────────────────────────────────────────────

    def _loop(self) -> None:
        while not self._stop_event.wait(timeout=POLL_INTERVAL_SECONDS):
            for grain in SUPPORTED_GRAINS:
                try:
                    self._check_grain(grain)
                except Exception as exc:
                    # One grain failing must never crash the whole loop
                    logger.warning("HotSwap poll error for '%s': %s", grain, exc)

    def _check_grain(self, grain: str) -> None:
        remote = self._fetch_active_version(grain)
        if not remote:
            return  # No active version in DB yet

        remote_hash = remote.get("file_hash", "")
        remote_version = remote.get("version", "")
        local_hash = self._registry.current_hash(grain)

        if remote_hash and remote_hash == local_hash:
            return  # Already up to date

        logger.info(
            "🆕 New model detected for '%s' (remote=%s local=%s) — downloading...",
            grain, remote_hash[:8], local_hash[:8],
        )
        storage_path = remote.get("storage_path", f"{grain}/{grain}.onnx")
        onnx_bytes = self._download_onnx(storage_path)
        if not onnx_bytes:
            return

        # Validate: attempt to create a real ORT session before swapping
        new_model = self._validate_and_build(grain, onnx_bytes, remote_hash, remote_version)
        if new_model is None:
            logger.error("❌ New model for '%s' failed ORT validation — keeping old.", grain)
            return

        # Atomic swap — in-flight requests are unaffected
        self._registry._swap(grain, new_model)
        logger.info("✅ Hot-swap complete for '%s' (version=%s)", grain, remote_version)

    def _fetch_active_version(self, grain: str) -> Optional[dict]:
        """Query model_versions for the latest active row for this grain."""
        resp = self._http.get(
            f"{self._url}/rest/v1/model_versions",
            params={
                "grain_type": f"eq.{grain}",
                "is_active":  "eq.true",
                "order":      "created_at.desc",
                "limit":      "1",
                "select":     "version,file_hash,storage_path",
            },
        )
        if resp.status_code != 200:
            logger.warning("model_versions query failed (%d) for '%s'", resp.status_code, grain)
            return None
        rows = resp.json()
        return rows[0] if rows else None

    def _download_onnx(self, storage_path: str) -> Optional[bytes]:
        """Download a .onnx file from Supabase Storage into memory."""
        resp = self._http.get(
            f"{self._url}/storage/v1/object/{self._bucket}/{storage_path}",
        )
        if resp.status_code != 200:
            logger.error("Download failed (%d) for path '%s'", resp.status_code, storage_path)
            return None
        return resp.content

    def _validate_and_build(
        self,
        grain: str,
        onnx_bytes: bytes,
        file_hash: str,
        version: str,
    ) -> Optional["_GrainModel"]:
        """
        Try to instantiate an ORT InferenceSession from bytes.
        Return None on any failure so the old model is never replaced.
        """
        try:
            import numpy as np

            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            session = ort.InferenceSession(
                onnx_bytes,
                sess_options=sess_options,
                providers=["CPUExecutionProvider"],
            )

            # Quick smoke-test: run a zero-vector through the model
            input_name = session.get_inputs()[0].name
            dummy = np.zeros((1, 9), dtype=np.float32)
            session.run(None, {input_name: dummy})

            # Verify hash integrity
            actual_hash = hashlib.sha256(onnx_bytes).hexdigest()
            if file_hash and actual_hash != file_hash:
                logger.error(
                    "Hash mismatch for '%s': expected %s got %s",
                    grain, file_hash[:8], actual_hash[:8],
                )
                return None

            return _GrainModel(
                session=session,
                class_labels=DEFAULT_CLASS_LABELS,
                grain_type=grain,
                file_hash=actual_hash,
                version=version,
            )
        except Exception as exc:
            logger.exception("ORT validation failed for '%s': %s", grain, exc)
            return None
