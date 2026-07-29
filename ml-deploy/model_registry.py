"""
model_registry.py — GrainHero ONNX In-Memory Model Registry
=============================================================
Process 1 ONLY.  Never imported by retraining scripts.

Provides:
    registry       — the global ModelRegistry singleton
    get_session()  — returns the live OrtSession for a grain type

Thread-safety note:
    The dict assignment in _swap() is the only mutation.
    CPython dict.__setitem__ is atomic under the GIL, so no lock is needed
    for the hot-swap use case (one writer, many readers, value is a complete
    object reference — never a partial state).
"""

from __future__ import annotations

import io
import logging
import threading
from typing import Dict, Optional, Tuple

import numpy as np
import onnxruntime as ort

logger = logging.getLogger(__name__)

# Canonical feature order — must match training pipeline exactly.
FEATURE_NAMES: Tuple[str, ...] = (
    "Temperature",
    "Humidity",
    "Storage_Days",
    "Airflow",
    "Dew_Point",
    "Ambient_Light",
    "Pest_Presence",
    "Grain_Moisture",
    "Rainfall",
)
N_FEATURES = len(FEATURE_NAMES)

SUPPORTED_GRAINS = ("rice", "wheat", "maize", "sorghum", "barley")


class _GrainModel:
    """Thin wrapper around an OrtInferenceSession + label mapping."""

    def __init__(
        self,
        session: ort.InferenceSession,
        class_labels: Tuple[str, ...],
        grain_type: str,
        file_hash: str = "",
        version: str = "",
    ):
        self.session = session
        self.class_labels = class_labels
        self.grain_type = grain_type
        self.file_hash = file_hash
        self.version = version

        # Cache these once at load-time (cheap)
        self._input_name: str = session.get_inputs()[0].name
        # ONNX classifiers expose two outputs: label + probabilities map
        self._output_names = [o.name for o in session.get_outputs()]

    def predict(self, X: np.ndarray) -> Dict:
        """
        Run inference synchronously.  ONNX Runtime releases the GIL during
        the native call, so concurrent FastAPI requests genuinely parallelise.

        Returns a dict compatible with the existing PredictionResponse shape.
        """
        # Ensure float32 — ort requires it
        X_f32 = X.astype(np.float32)

        outputs = self.session.run(self._output_names, {self._input_name: X_f32})

        # outputs[0] — predicted label (int or string depending on export)
        # outputs[1] — list of {label: probability} dicts (zipmap format)
        raw_label = outputs[0][0]
        prob_map: Dict = outputs[1][0] if len(outputs) > 1 else {}

        # Normalise label to string
        if isinstance(raw_label, (int, np.integer)):
            label = self.class_labels[int(raw_label)] if self.class_labels else str(raw_label)
        else:
            label = str(raw_label)

        # Build probability array in canonical class order
        proba = np.array(
            [float(prob_map.get(lbl, prob_map.get(i, 0.0)))
             for i, lbl in enumerate(self.class_labels)],
            dtype=np.float64,
        )
        if proba.sum() > 0:
            proba /= proba.sum()  # renormalise floating-point drift

        confidence = float(proba.max())

        p_risky   = float(proba[self.class_labels.index("Risky")])   if "Risky"   in self.class_labels else 0.0
        p_spoiled = float(proba[self.class_labels.index("Spoiled")]) if "Spoiled" in self.class_labels else 0.0
        risk_score = round(p_risky * 50.0 + p_spoiled * 100.0, 1)

        return {
            "prediction":   label,
            "confidence":   round(confidence * 100.0, 1),
            "risk_score":   risk_score,
            "probabilities": {
                lbl: round(float(proba[i]) * 100.0, 1)
                for i, lbl in enumerate(self.class_labels)
            },
            "model_version": self.version,
            "file_hash":     self.file_hash,
        }


class ModelRegistry:
    """
    Singleton in-memory store of one _GrainModel per grain type.

    The only mutation method is _swap(), called exclusively from hot_swap.py
    in a background thread.  hot_swap.py fully downloads + validates the new
    model *before* calling _swap(), so Process 1's request handlers always
    see a fully-initialised session object — never a partially-loaded one.
    """

    def __init__(self):
        self._store: Dict[str, _GrainModel] = {}
        self._lock = threading.Lock()  # only held during the atomic swap write

    # ── Public API ────────────────────────────────────────────────────────────

    def load_from_bytes(
        self,
        grain: str,
        onnx_bytes: bytes,
        class_labels: Tuple[str, ...] = ("Safe", "Risky", "Spoiled"),
        file_hash: str = "",
        version: str = "",
    ) -> None:
        """
        Load an ONNX model from raw bytes into the registry.
        Called on startup (from disk/cache) and by hot_swap on new download.
        """
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        session = ort.InferenceSession(
            io.BytesIO(onnx_bytes).read(),  # ORT accepts bytes directly
            sess_options=sess_options,
            providers=["CPUExecutionProvider"],
        )
        model = _GrainModel(session, class_labels, grain, file_hash, version)

        with self._lock:
            self._store[grain] = model

        logger.info("✅ Model loaded for '%s' (version=%s hash=%s)", grain, version, file_hash[:8])

    def load_from_file(
        self,
        grain: str,
        path: str,
        class_labels: Tuple[str, ...] = ("Safe", "Risky", "Spoiled"),
        version: str = "",
    ) -> None:
        """Load from a local .onnx file (startup bootstrap only)."""
        import hashlib
        with open(path, "rb") as f:
            data = f.read()
        file_hash = hashlib.sha256(data).hexdigest()
        self.load_from_bytes(grain, data, class_labels, file_hash, version)

    def get(self, grain: str) -> Optional[_GrainModel]:
        return self._store.get(grain.lower())

    def loaded_grains(self) -> list:
        return list(self._store.keys())

    def current_hash(self, grain: str) -> str:
        m = self._store.get(grain.lower())
        return m.file_hash if m else ""

    # ── Called by hot_swap.py ─────────────────────────────────────────────────

    def _swap(self, grain: str, new_model: "_GrainModel") -> None:
        """
        Atomically replace the active session for a grain.
        In-flight requests using the old session are unaffected because Python
        object references are stable until the last reference is released.
        """
        with self._lock:
            old = self._store.get(grain)
            self._store[grain] = new_model
        logger.info(
            "🔄 Hot-swapped '%s': %s → %s",
            grain,
            old.version if old else "none",
            new_model.version,
        )


# Global singleton — imported everywhere in Process 1
registry = ModelRegistry()
