import csv
import hashlib

from scripts.create_log_test_data import (
    CATEGORICAL_TEST_FIELD,
    FIELDS,
    NUMERIC_TEST_FIELD,
    create_datasets,
    evaluate_against_original,
)


def _source_row(index: int) -> list[str]:
    return [
        "1209600",
        "0",
        f"device-{index}",
        "destination",
        "17",
        "Port69459",
        "514",
        str(index + 1),
        "0",
        "407",
        "0",
    ]


def _read_csv(path):
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def test_create_small_samples_without_modifying_source(tmp_path):
    source = tmp_path / "source.data"
    with source.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerows(_source_row(index) for index in range(12))
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()

    output_dir = tmp_path / "samples"
    manifest = create_datasets(source, output_dir, row_limit=12, mask_every=10)

    original = _read_csv(output_dir / "netflow_original.csv")
    categorical = _read_csv(output_dir / "netflow_masked_categorical.csv")
    numeric = _read_csv(output_dir / "netflow_masked_numeric.csv")
    assert len(original) == len(categorical) == len(numeric) == 12
    assert categorical[0][CATEGORICAL_TEST_FIELD] == "<MASK>"
    assert categorical[10][CATEGORICAL_TEST_FIELD] == "<MASK>"
    assert numeric[5][NUMERIC_TEST_FIELD] == "<MASK>"
    assert manifest["records"] == 12
    assert hashlib.sha256(source.read_bytes()).hexdigest() == source_hash


def test_compare_restoration_with_untouched_original(tmp_path):
    original_path = tmp_path / "original.csv"
    masked_path = tmp_path / "masked.csv"
    original = [_source_row(index) for index in range(12)]
    masked_categorical = [list(row) for row in original]
    masked_numeric = [list(row) for row in original]
    masked_categorical[0][FIELDS.index(CATEGORICAL_TEST_FIELD)] = "<MASK>"
    masked_numeric[5][FIELDS.index(NUMERIC_TEST_FIELD)] = "<MASK>"

    for path, rows in (
        (original_path, original),
        (masked_path, masked_numeric),
    ):
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(FIELDS)
            writer.writerows(rows)
    restored = [dict(zip(FIELDS, row)) for row in original]
    restored[5][NUMERIC_TEST_FIELD] = "4"

    comparison = evaluate_against_original(original_path, masked_path, restored)
    assert comparison["numeric"]["masked_values"] == 1
    assert comparison["numeric"]["mae"] == 2.0
    assert CATEGORICAL_TEST_FIELD not in comparison
