from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path
from typing import Any


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = BACKEND_ROOT.parent
MODEL_SOURCE = REPOSITORY_ROOT / "models" / "GAN-for-logs"
for import_path in (str(BACKEND_ROOT), str(MODEL_SOURCE)):
    if import_path not in sys.path:
        sys.path.insert(0, import_path)

from app.services.log_restorer import LogRestorer  # noqa: E402
from preprocess_wls import FIELDS  # noqa: E402  # type: ignore[reportMissingImports]


CATEGORICAL_TEST_FIELD = "SrcDevice"
NUMERIC_TEST_FIELD = "SrcPackets"
MAX_SAMPLE_ROWS = 5_000


def source_files(input_path: Path) -> list[Path]:
    if input_path.is_file():
        return [input_path]
    if input_path.is_dir():
        return sorted(
            path
            for path in input_path.rglob("*")
            if path.is_file() and path.suffix.lower() != ".bz2"
        )
    raise FileNotFoundError(f"NetFlow source does not exist: {input_path}")


def read_sample(input_path: Path, limit: int) -> tuple[list[list[str]], int, list[Path]]:
    files = source_files(input_path)
    if not files:
        raise ValueError(f"No readable source files found in {input_path}")

    sample: list[list[str]] = []
    invalid_rows = 0
    for path in files:
        with path.open("r", newline="", encoding="utf-8-sig", errors="replace") as handle:
            for raw_row in csv.reader(handle):
                row = [value.strip() for value in raw_row]
                if row == FIELDS:
                    continue
                if len(row) != len(FIELDS):
                    invalid_rows += 1
                    continue
                sample.append(row)
                if len(sample) == limit:
                    return sample, invalid_rows, files

    if not sample:
        raise ValueError(f"No valid {len(FIELDS)}-column NetFlow rows found in {input_path}")
    return sample, invalid_rows, files


def _write_csv(path: Path, rows: list[list[str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(FIELDS)
        writer.writerows(rows)


def create_datasets(
    input_path: Path,
    output_dir: Path,
    row_limit: int = 100,
    mask_every: int = 10,
) -> dict[str, Any]:
    if not 1 <= row_limit <= MAX_SAMPLE_ROWS:
        raise ValueError(f"row_limit must be between 1 and {MAX_SAMPLE_ROWS}")
    if mask_every < 2 or mask_every > row_limit:
        raise ValueError("mask_every must be between 2 and row_limit")
    if output_dir.exists() and (not output_dir.is_dir() or any(output_dir.iterdir())):
        raise FileExistsError(f"Output directory must be empty: {output_dir}")

    rows, invalid_rows, files = read_sample(input_path, row_limit)
    output_dir.mkdir(parents=True, exist_ok=True)

    original_path = output_dir / "netflow_original.csv"
    categorical_path = output_dir / "netflow_masked_categorical.csv"
    numeric_path = output_dir / "netflow_masked_numeric.csv"
    _write_csv(original_path, rows)

    categorical_index = FIELDS.index(CATEGORICAL_TEST_FIELD)
    numeric_index = FIELDS.index(NUMERIC_TEST_FIELD)
    categorical_rows = [list(row) for row in rows]
    numeric_rows = [list(row) for row in rows]
    categorical_count = 0
    numeric_count = 0
    numeric_offset = mask_every // 2
    for index in range(len(rows)):
        if index % mask_every == 0:
            categorical_rows[index][categorical_index] = "<MASK>"
            categorical_count += 1
        if index % mask_every == numeric_offset:
            numeric_rows[index][numeric_index] = "<MASK>"
            numeric_count += 1
    _write_csv(categorical_path, categorical_rows)
    _write_csv(numeric_path, numeric_rows)

    manifest = {
        "dataset": "NetFlow (not Windows Event Log / EVTX)",
        "source_files": [path.name for path in files],
        "source_bytes": sum(path.stat().st_size for path in files),
        "sampling": "first valid records; source is read only until row_limit is reached",
        "records": len(rows),
        "invalid_rows_skipped_before_sample_complete": invalid_rows,
        "max_sample_rows": MAX_SAMPLE_ROWS,
        "masked_fields": {
            "categorical": {"field": CATEGORICAL_TEST_FIELD, "masked_records": categorical_count},
            "numeric": {"field": NUMERIC_TEST_FIELD, "masked_records": numeric_count},
        },
        "files": {
            "original": original_path.name,
            "masked_categorical": categorical_path.name,
            "masked_numeric": numeric_path.name,
        },
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return manifest


def evaluate_against_original(
    original_path: Path,
    masked_path: Path,
    restored_rows: list[dict[str, str]],
) -> dict[str, Any]:
    with original_path.open("r", newline="", encoding="utf-8-sig") as handle:
        original_reader = csv.DictReader(handle)
        if original_reader.fieldnames != FIELDS:
            raise ValueError(f"Unexpected original CSV header in {original_path}")
        original_rows = list(original_reader)

    with masked_path.open("r", newline="", encoding="utf-8-sig") as handle:
        masked_reader = csv.DictReader(handle)
        if masked_reader.fieldnames != FIELDS:
            raise ValueError(f"Unexpected masked CSV header in {masked_path}")
        masked_rows = list(masked_reader)

    if not (len(original_rows) == len(masked_rows) == len(restored_rows)):
        raise ValueError("Original, masked, and restored record counts do not match")

    categorical_expected = 0
    categorical_matches = 0
    numeric_differences: list[float] = []
    for original, masked, restored in zip(original_rows, masked_rows, restored_rows):
        for field in FIELDS:
            if masked[field] != "<MASK>":
                continue
            if field == CATEGORICAL_TEST_FIELD:
                categorical_expected += 1
                categorical_matches += restored[field] == original[field]
            elif field == NUMERIC_TEST_FIELD:
                try:
                    expected_value = float(original[field])
                    restored_value = float(restored[field])
                except (TypeError, ValueError) as exc:
                    raise ValueError(f"Cannot compare non-numeric {NUMERIC_TEST_FIELD} values") from exc
                numeric_differences.append(abs(restored_value - expected_value))

    if categorical_expected == 0 and not numeric_differences:
        raise ValueError("No masked evaluation fields were found")

    comparison: dict[str, Any] = {"records_compared": len(original_rows)}
    if categorical_expected:
        comparison["categorical"] = {
            "field": CATEGORICAL_TEST_FIELD,
            "masked_values": categorical_expected,
            "exact_matches": categorical_matches,
            "accuracy_percent": 100.0 * categorical_matches / categorical_expected,
        }
    if numeric_differences:
        comparison["numeric"] = {
            "field": NUMERIC_TEST_FIELD,
            "masked_values": len(numeric_differences),
            "mae": math.fsum(numeric_differences) / len(numeric_differences),
            "rmse": math.sqrt(math.fsum(value * value for value in numeric_differences) / len(numeric_differences)),
        }
    return comparison


def run_evaluation(output_dir: Path, restorer: LogRestorer) -> dict[str, Any]:
    original_path = output_dir / "netflow_original.csv"
    reports: dict[str, Any] = {}
    for sample_kind in ("categorical", "numeric"):
        masked_path = output_dir / f"netflow_masked_{sample_kind}.csv"
        restored_bytes, confidence, model_metrics, _, restored_rows = restorer.restore_csv(
            masked_path.read_bytes()
        )
        restored_path = output_dir / f"netflow_restored_{sample_kind}.json"
        restored_path.write_bytes(restored_bytes)
        reports[sample_kind] = {
            "comparison_with_original": evaluate_against_original(
                original_path, masked_path, restored_rows
            ),
            "model_confidence_score": confidence,
            "confidence_method": restorer.confidence_method,
            "model_metrics": model_metrics,
            "restored_file": restored_path.name,
        }

    report = {
        "note": "The model confidence score is a heuristic, not measured accuracy. Accuracy/MAE/RMSE below compare restored masked values with the untouched sample.",
        "samples": reports,
    }
    (output_dir / "comparison.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create small masked NetFlow samples and compare model output with untouched source rows."
    )
    parser.add_argument("--input", type=Path, required=True, help="Original file or directory; it is read only")
    parser.add_argument("--output-dir", type=Path, required=True, help="New or empty folder for generated samples")
    parser.add_argument("--rows", type=int, default=100, help=f"Sample row limit (max {MAX_SAMPLE_ROWS})")
    parser.add_argument("--mask-every", type=int, default=10, help="Mask one test field every N records")
    parser.add_argument("--prepare-only", action="store_true", help="Create CSVs without loading/running the model")
    args = parser.parse_args()

    restorer = None if args.prepare_only else LogRestorer()
    manifest = create_datasets(args.input, args.output_dir, args.rows, args.mask_every)
    output: dict[str, Any] = {"manifest": manifest}
    if restorer is not None:
        output["evaluation"] = run_evaluation(args.output_dir, restorer)
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
