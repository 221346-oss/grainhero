"""
GrainHero – Live-Append Dataset Pipeline
=========================================
Safely appends new real-world IoT readings to the per-grain CSV datasets.

Features
--------
* Bounds validation (physiologically plausible sensor ranges)
* Deduplication (skips rows too similar to the previous appended row)
* Atomic file writes (writes to a tmp file, then replaces the target)
* Detailed logging and a dry-run mode
* Works as a standalone CLI **and** as an importable module for the API

Usage – CLI
-----------
  python live_append_pipeline.py                          # reads from Supabase
  python live_append_pipeline.py --csv export.csv        # reads from a CSV export
  python live_append_pipeline.py --dry-run --verbose     # preview without writing

Usage – programmatic
--------------------
  from ml.live_append_pipeline import append_readings
  result = append_readings(records=[...], grain_type='rice')
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import logging
import math
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("live_append")

# ─── Paths ───────────────────────────────────────────────────────────────────
SCRIPT_DIR  = Path(__file__).resolve().parent           # farmHomeBackend-main/ml/
DATASET_DIR = SCRIPT_DIR                               # datasets live here too

# Maps grain type → CSV filename
DATASET_FILES: Dict[str, str] = {
    "rice":    "grain_spoilage_dataset.csv",   # combined 10k-per-grain dataset
    "wheat":   "wheat_spoilage_10k.csv",
    "maize":   "maize_spoilage_10k.csv",
    "sorghum": "sorghum_spoilage_10k.csv",
    "barley":  "barley_spoilage_10k.csv",
    # Fallback: if grain-specific file doesn't exist, use the combined one
    "combined": "grain_spoilage_dataset.csv",
}

# ─── Validation bounds ───────────────────────────────────────────────────────
# Physical limits for stored grain environments.
# References:
#   ASABE D245.6   – safe moisture limits per grain
#   FAO Ch.4       – temperature & humidity guidelines
#   Bosch BSEC     – BME680 sensor output range
BOUNDS: Dict[str, tuple] = {
    "Temperature":    (0.0,  60.0),    # °C  (grain stores can be very hot)
    "Humidity":       (0.0,  100.0),   # %   RH
    "Storage_Days":   (0,    730),     # up to 2 years
    "Airflow":        (0.0,  1.0),     # normalised
    "Dew_Point":      (-30.0, 60.0),   # °C
    "Ambient_Light":  (0.0,  400.0),   # lux proxy
    "Pest_Presence":  (0.0,  1.0),     # 0-1 score
    "Grain_Moisture": (4.0,  40.0),    # %   (very wet grain can reach 40 %)
    "Rainfall":       (0.0,  300.0),   # mm/day
}

# Deduplication thresholds – a row is skipped if ALL primary sensors are
# within these deltas of the previously accepted row.
DEDUP_DELTAS: Dict[str, float] = {
    "Temperature":    0.1,   # °C
    "Humidity":       0.5,   # %
    "Grain_Moisture": 0.1,   # %
}

# Expected CSV columns (must match existing dataset headers)
CSV_COLUMNS = [
    "Grain_Type", "Temperature", "Humidity", "Storage_Days",
    "Airflow", "Dew_Point", "Ambient_Light", "Pest_Presence",
    "Grain_Moisture", "Rainfall", "Spoilage_Class", "Hours_To_Spoilage",
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

class ValidationError(ValueError):
    """Raised when a record fails bounds checking."""


def _to_float(value: Any, field: str) -> float:
    """Cast value to float, raise ValidationError on failure."""
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"Field '{field}' is not numeric: {value!r}")


def validate_record(rec: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and normalise a single record.

    Returns the cleaned record dict (with numeric fields as floats).
    Raises ValidationError if any bound is exceeded.
    """
    clean: Dict[str, Any] = {}

    # Grain type
    grain = str(rec.get("Grain_Type", rec.get("grain_type", ""))).strip().capitalize()
    if not grain:
        raise ValidationError("Grain_Type is missing")
    clean["Grain_Type"] = grain

    # Numeric fields
    for field, (lo, hi) in BOUNDS.items():
        raw = rec.get(field, rec.get(field.lower()))
        if raw is None:
            raise ValidationError(f"Required field '{field}' is missing")
        val = _to_float(raw, field)
        if not (lo <= val <= hi):
            raise ValidationError(
                f"Field '{field}' = {val} is out of bounds [{lo}, {hi}]"
            )
        clean[field] = val

    # Spoilage label (optional for live data)
    label_raw = rec.get("Spoilage_Class", rec.get("spoilage_class", None))
    if label_raw is not None:
        try:
            label = int(label_raw)
            if label not in (0, 1, 2):
                raise ValidationError(f"Spoilage_Class must be 0, 1, or 2 – got {label}")
            clean["Spoilage_Class"] = label
        except (TypeError, ValueError):
            raise ValidationError(f"Spoilage_Class is not an integer: {label_raw!r}")
    else:
        clean["Spoilage_Class"] = ""  # unknown for new real-world readings

    # Hours to spoilage (optional)
    hrs_raw = rec.get("Hours_To_Spoilage", rec.get("hours_to_spoilage", None))
    if hrs_raw is not None:
        try:
            hrs = float(hrs_raw)
            clean["Hours_To_Spoilage"] = int(hrs)
        except (TypeError, ValueError):
            clean["Hours_To_Spoilage"] = ""
    else:
        clean["Hours_To_Spoilage"] = ""

    return clean


def is_duplicate(new: Dict[str, Any], previous: Optional[Dict[str, Any]]) -> bool:
    """Return True if *new* is too similar to *previous* to be worth appending."""
    if previous is None:
        return False

    # Must be same grain type to even compare
    if new.get("Grain_Type") != previous.get("Grain_Type"):
        return False

    for field, threshold in DEDUP_DELTAS.items():
        try:
            diff = abs(float(new[field]) - float(previous[field]))
        except (KeyError, TypeError, ValueError):
            return False
        if diff >= threshold:
            return False

    return True   # all primary sensors within thresholds → duplicate


def _read_last_row(csv_path: Path) -> Optional[Dict[str, Any]]:
    """Read and return the last data row from a CSV file, or None."""
    if not csv_path.exists():
        return None
    last: Optional[Dict[str, Any]] = None
    with csv_path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            last = row
    return last


def _append_rows_atomic(csv_path: Path, rows: List[Dict[str, Any]]) -> int:
    """
    Atomically append validated rows to the CSV.

    Writes to a sibling tmp file, then replaces the target.
    Returns the number of rows actually written.
    """
    if not rows:
        return 0

    # Check if file exists and has a header
    file_exists = csv_path.exists()

    # Use a NamedTemporaryFile in the same directory (same filesystem)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=csv_path.parent, suffix=".tmp")
    written = 0

    try:
        with os.fdopen(tmp_fd, "w", newline="", encoding="utf-8") as tmp_fh:
            writer = csv.DictWriter(tmp_fh, fieldnames=CSV_COLUMNS, extrasaction="ignore")

            if file_exists:
                # Copy existing content verbatim
                with csv_path.open(newline="", encoding="utf-8") as src:
                    shutil.copyfileobj(src, tmp_fh)
            else:
                writer.writeheader()

            for row in rows:
                writer.writerow(row)
                written += 1

        # Atomic replace
        shutil.move(tmp_path, csv_path)

    except Exception:
        # Clean up tmp on error
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise

    return written


# ─── Public API ───────────────────────────────────────────────────────────────

class AppendResult:
    """Summary of a pipeline run."""
    def __init__(self):
        self.accepted:   List[Dict[str, Any]] = []
        self.rejected:   List[Dict[str, str]] = []   # {"record": ..., "reason": ...}
        self.duplicates: List[Dict[str, Any]] = []
        self.written:    int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "accepted":        len(self.accepted),
            "rejected":        len(self.rejected),
            "duplicates":      len(self.duplicates),
            "written":         self.written,
            "rejection_detail": self.rejected,
        }


def append_readings(
    records:    List[Dict[str, Any]],
    grain_type: str = "combined",
    dry_run:    bool = False,
    verbose:    bool = False,
) -> AppendResult:
    """
    Validate and append a list of IoT readings to the appropriate grain CSV.

    Parameters
    ----------
    records    : list of dicts, each representing one sensor reading
    grain_type : grain to target (rice, wheat, maize, sorghum, barley, combined)
    dry_run    : if True, validate and report but do NOT write to disk
    verbose    : extra logging

    Returns
    -------
    AppendResult with accepted / rejected / duplicate counts
    """
    result = AppendResult()
    grain_l = grain_type.lower()

    # Resolve target CSV
    csv_name = DATASET_FILES.get(grain_l, DATASET_FILES["combined"])
    csv_path = DATASET_DIR / csv_name

    # Read last persisted row for deduplication
    last_row = _read_last_row(csv_path)

    for i, raw_rec in enumerate(records):
        tag = f"row {i + 1}"
        try:
            clean = validate_record(raw_rec)
        except ValidationError as exc:
            result.rejected.append({"record": str(raw_rec), "reason": str(exc)})
            if verbose:
                logger.warning("[%s] REJECTED: %s", tag, exc)
            continue

        if is_duplicate(clean, last_row):
            result.duplicates.append(clean)
            if verbose:
                logger.debug("[%s] DUPLICATE (skipped)", tag)
            continue

        result.accepted.append(clean)
        last_row = clean  # update dedup reference

        if verbose:
            logger.info("[%s] ACCEPTED: T=%.1f H=%.1f GM=%.1f",
                        tag,
                        clean["Temperature"],
                        clean["Humidity"],
                        clean["Grain_Moisture"])

    if not dry_run:
        result.written = _append_rows_atomic(csv_path, result.accepted)
        logger.info("Appended %d rows to %s  (rejected=%d, dupes=%d)",
                    result.written, csv_path.name,
                    len(result.rejected), len(result.duplicates))
    else:
        logger.info("[DRY RUN] Would append %d rows to %s  (rejected=%d, dupes=%d)",
                    len(result.accepted), csv_path.name,
                    len(result.rejected), len(result.duplicates))

    return result


# ─── Supabase source ──────────────────────────────────────────────────────────

def fetch_from_supabase(limit: int = 500) -> List[Dict[str, Any]]:
    """
    Fetch the most recent unprocessed sensor_readings from Supabase and
    transform them into the pipeline record format.

    Requires environment variables:
        SUPABASE_URL           – e.g. https://<project>.supabase.co
        SUPABASE_SERVICE_KEY   – service-role key
    """
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not url or not key:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set to fetch from Supabase."
        )

    try:
        import urllib.request
        import urllib.parse
        query = urllib.parse.urlencode({
            "select":    "device_id,temperature_value,humidity_value,grain_moisture_pct,"
                         "dew_point,airflow,tvoc_ppb,condensation_risk,ingested_at",
            "order":     "ingested_at.desc",
            "limit":     str(limit),
        })
        req = urllib.request.Request(
            f"{url}/rest/v1/sensor_readings?{query}",
            headers={
                "apikey":        key,
                "Authorization": f"Bearer {key}",
                "Accept":        "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            rows = json.loads(resp.read())

        records = []
        for r in rows:
            tvoc    = float(r.get("tvoc_ppb") or 0)
            voc_rel = max(0.0, tvoc / 1000.0)
            records.append({
                "Grain_Type":    "Rice",       # default – enrich with device metadata if available
                "Temperature":   r.get("temperature_value", 0),
                "Humidity":      r.get("humidity_value", 0),
                "Storage_Days":  0,            # not available in sensor readings
                "Airflow":       r.get("airflow", 0),
                "Dew_Point":     r.get("dew_point", 0),
                "Ambient_Light": 0,            # not in sensor_readings table
                "Pest_Presence": min(1.0, voc_rel * 0.5),
                "Grain_Moisture":r.get("grain_moisture_pct", 0),
                "Rainfall":      0,            # not in sensor_readings table
            })
        return records

    except Exception as exc:
        logger.error("Failed to fetch from Supabase: %s", exc)
        raise


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="GrainHero live-append dataset pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--grain", default="combined",
        help="Target grain type (rice, wheat, maize, sorghum, barley, combined)"
    )
    parser.add_argument(
        "--csv", default=None,
        help="Path to a CSV export to import instead of Supabase"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Validate and report without writing to disk"
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Print per-row acceptance/rejection details"
    )
    parser.add_argument(
        "--limit", type=int, default=500,
        help="Maximum rows to fetch from Supabase (default: 500)"
    )
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Load records
    if args.csv:
        csv_path = Path(args.csv)
        if not csv_path.exists():
            logger.error("Input CSV not found: %s", csv_path)
            sys.exit(1)
        records = []
        with csv_path.open(newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                records.append(dict(row))
        logger.info("Loaded %d rows from %s", len(records), csv_path.name)
    else:
        logger.info("Fetching up to %d rows from Supabase…", args.limit)
        records = fetch_from_supabase(limit=args.limit)
        logger.info("Fetched %d rows", len(records))

    result = append_readings(
        records    = records,
        grain_type = args.grain,
        dry_run    = args.dry_run,
        verbose    = args.verbose,
    )

    print(json.dumps(result.to_dict(), indent=2))
    sys.exit(0 if not result.rejected else 1)


if __name__ == "__main__":
    main()
