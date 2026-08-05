"""
test_windowing.py — Unit Tests for Time-Series Windowing Utilities
===================================================================
Run with:
    python -m unittest ml-deploy/test_windowing.py
"""

import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

# Add ml-deploy to sys.path
HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from window_utils import build_windows, pad_or_truncate_window, DEFAULT_FEATURE_NAMES


class TestWindowUtils(unittest.TestCase):
    def setUp(self):
        self.feature_cols = DEFAULT_FEATURE_NAMES

    def _make_dummy_df(self, n_rows: int, grain_type: str = "rice") -> pd.DataFrame:
        data = {
            "created_at": pd.date_range("2026-08-01", periods=n_rows, freq="min").astype(str),
            "grain_type": [grain_type] * n_rows,
            "prediction": [f"label_{i}" for i in range(n_rows)],
        }
        for idx, feat in enumerate(self.feature_cols):
            data[feat] = [(i + 1) * 10 + idx for i in range(n_rows)]
        return pd.DataFrame(data)

    def test_standard_windowing_shape(self):
        """N=10 rows, W=3 -> output should be (8, 27) and 8 labels."""
        df = self._make_dummy_df(n_rows=10, grain_type="rice")
        X, y = build_windows(df, W=3)

        self.assertEqual(X.shape, (8, 27))
        self.assertEqual(len(y), 8)
        # Check label matching: window 0 corresponds to row index 2 ('label_2')
        self.assertEqual(y[0], "label_2")
        self.assertEqual(y[-1], "label_9")

    def test_fewer_rows_than_window_size(self):
        """N=3 rows, W=5 -> output should be empty (0, 45)."""
        df = self._make_dummy_df(n_rows=3, grain_type="rice")
        X, y = build_windows(df, W=5)

        self.assertEqual(X.shape, (0, 45))
        self.assertEqual(len(y), 0)

    def test_grain_boundary_isolation(self):
        """2 grains with 10 rows each, W=4 -> 2 * (10 - 4 + 1) = 14 windows, no cross-bleeding."""
        df_rice = self._make_dummy_df(n_rows=10, grain_type="rice")
        df_wheat = self._make_dummy_df(n_rows=10, grain_type="wheat")
        df_combined = pd.concat([df_rice, df_wheat], ignore_index=True)

        X, y = build_windows(df_combined, W=4)
        self.assertEqual(X.shape, (14, 36))
        self.assertEqual(len(y), 14)

    def test_causality_flatten_order(self):
        """Verify features in window 0 match row 0 + row 1 + row 2 concatenated."""
        df = self._make_dummy_df(n_rows=5, grain_type="rice")
        X, _ = build_windows(df, W=2)

        # First row features
        row0_feats = df[self.feature_cols].iloc[0].values.astype(np.float32)
        row1_feats = df[self.feature_cols].iloc[1].values.astype(np.float32)
        expected_window0 = np.concatenate([row0_feats, row1_feats])

        np.testing.assert_array_almost_equal(X[0], expected_window0)

    def test_pad_or_truncate_window_exact(self):
        readings = [[float(i)] * 9 for i in range(5)]
        out = pad_or_truncate_window(readings, W=5)
        self.assertEqual(len(out), 5)
        self.assertEqual(out, readings)

    def test_pad_or_truncate_window_truncate(self):
        readings = [[float(i)] * 9 for i in range(8)]
        out = pad_or_truncate_window(readings, W=5)
        self.assertEqual(len(out), 5)
        self.assertEqual(out, readings[-5:])

    def test_pad_or_truncate_window_pad(self):
        readings = [[1.0] * 9, [2.0] * 9]
        out = pad_or_truncate_window(readings, W=5)
        self.assertEqual(len(out), 5)
        # First 3 rows should be repeats of [1.0]*9
        self.assertEqual(out[0], [1.0] * 9)
        self.assertEqual(out[1], [1.0] * 9)
        self.assertEqual(out[2], [1.0] * 9)
        self.assertEqual(out[3], [1.0] * 9)
        self.assertEqual(out[4], [2.0] * 9)


if __name__ == "__main__":
    unittest.main()
