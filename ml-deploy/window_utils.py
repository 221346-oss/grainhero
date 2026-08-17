"""
window_utils.py — Shared Time-Series Windowing Utility for GrainHero ML
========================================================================
Used by fast_retrain.py, nightly_retrain.py, app.py, and test_windowing.py.

Transforms 2D tabular sensor data into 2D flattened rolling-window vectors:
  Input:  N rows of 9 features per reading
  Output: (N - W + 1) rows of (9 * W) flat features for model consumption

Guarantees:
  - Windows NEVER cross grain boundaries (grouped by grain_type if present).
  - Preserves strict temporal causality (sorted by created_at).
  - Target label y corresponds to the last (most recent) reading in each window.
"""

from __future__ import annotations

from typing import List, Optional, Tuple, Union
import numpy as np
import pandas as pd

DEFAULT_FEATURE_NAMES: List[str] = [
    "temperature", "humidity", "storage_days", "airflow",
    "dew_point", "ambient_light", "pest_presence", "grain_moisture", "rainfall",
]
LABEL_COLUMN = "prediction"


def build_windows(
    df: pd.DataFrame,
    W: int,
    feature_cols: Optional[List[str]] = None,
    label_col: str = LABEL_COLUMN,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Build sliding windows of W consecutive rows per grain type.

    Args:
        df: DataFrame containing sensor readings.
        W: Window size (number of consecutive readings).
        feature_cols: List of 9 feature column names (defaults to DEFAULT_FEATURE_NAMES).
        label_col: Column name containing target labels.

    Returns:
        X: np.ndarray of shape (N_windows, 9 * W), dtype float32
        y: np.ndarray of shape (N_windows,), dtype object/str
    """
    if W < 1:
        raise ValueError(f"Window size W must be >= 1, got {W}")

    if feature_cols is None:
        feature_cols = DEFAULT_FEATURE_NAMES

    # Normalise column lookup (case-insensitive check)
    col_map = {c.lower(): c for c in df.columns}
    norm_features = [col_map.get(f.lower(), f) for f in feature_cols]
    norm_label = col_map.get(label_col.lower(), label_col)

    # Filter invalid/null rows
    req_cols = norm_features + ([norm_label] if norm_label in df.columns else [])
    df_clean = df.dropna(subset=req_cols).copy()

    if df_clean.empty:
        return (
            np.empty((0, len(feature_cols) * W), dtype=np.float32),
            np.empty((0,), dtype=object),
        )

    # Ensure chronological order if created_at is present
    created_at_col = col_map.get("created_at")
    if created_at_col and created_at_col in df_clean.columns:
        df_clean = df_clean.sort_values(by=created_at_col, ascending=True)

    grain_col = col_map.get("grain_type")

    X_windows: List[np.ndarray] = []
    y_labels: List[Union[str, int, float]] = []

    # Process per grain group to prevent window bleeding across grains
    if grain_col and grain_col in df_clean.columns:
        groups = [group for _, group in df_clean.groupby(grain_col, sort=False)]
    else:
        groups = [df_clean]

    for grp in groups:
        L = len(grp)
        if L < W:
            continue

        F = grp[norm_features].values.astype(np.float32)
        if norm_label in grp.columns:
            L_arr = grp[norm_label].values
        else:
            L_arr = np.array([None] * L)

        for i in range(L - W + 1):
            window = F[i : i + W]  # shape (W, 9)
            X_windows.append(window.flatten())  # shape (9 * W,)
            y_labels.append(L_arr[i + W - 1])   # label of latest row in window

    if not X_windows:
        return (
            np.empty((0, len(feature_cols) * W), dtype=np.float32),
            np.empty((0,), dtype=object),
        )

    X_out = np.vstack(X_windows).astype(np.float32)
    y_out = np.array(y_labels)

    return X_out, y_out


def pad_or_truncate_window(readings: List[List[float]], W: int) -> List[List[float]]:
    """
    Ensures a readings list has exactly W 9-element feature vectors.

    - If len(readings) == W: returns readings unchanged.
    - If len(readings) > W: returns the latest W readings.
    - If len(readings) < W: prepends repeats of the earliest reading until len == W.
      If readings is empty, pads with zero vectors of length 9.
    """
    if W < 1:
        raise ValueError(f"Window size W must be >= 1, got {W}")

    if not readings:
        return [[0.0] * 9 for _ in range(W)]

    if len(readings) == W:
        return readings

    if len(readings) > W:
        return readings[-W:]

    # len(readings) < W: edge padding with earliest reading
    first_row = list(readings[0])
    needed = W - len(readings)
    padded = [first_row] * needed + list(readings)
    return padded
