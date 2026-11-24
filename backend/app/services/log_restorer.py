import csv
import io
import json
import math
import sys
import threading
import types
import importlib.util
from pathlib import Path
from typing import Any

import torch
from torch import Tensor

from app.core.config import settings


class LogInferenceError(ValueError):
    pass


class LogRestorer:
    mc_samples = 8
    confidence_method = (
        "Uncalibrated 8-pass MC-dropout heuristic: categorical masked fields use "
        "mean maximum softmax probability; numeric masked fields use exp(-MC "
        "standard deviation in training-normalized units); field values are averaged."
    )

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.source_dir = settings.model_dir / "GAN-for-logs"
        checkpoint_path = settings.model_dir / "logs_best_checkpoint.pt"
        if not self.source_dir.is_dir():
            raise FileNotFoundError(f"Logs model source is missing: {self.source_dir}")
        if not checkpoint_path.is_file():
            raise FileNotFoundError(f"Logs checkpoint is missing: {checkpoint_path}")

        self.training_module = self._load_training_module(self.source_dir)
        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
        if not isinstance(checkpoint, dict) or not isinstance(checkpoint.get("generator"), dict):
            raise ValueError("Logs checkpoint does not contain generator weights.")
        self.metadata = checkpoint["metadata"]
        config = checkpoint["config"]
        self.fields = list(self.training_module.FIELDS)
        self.cat_fields = list(self.training_module.CAT_FIELDS)
        self.num_fields = list(self.training_module.NUM_FIELDS)
        self.context_window = int(config["context_window"])
        cat_sizes = [len(self.metadata["cat_vocabs"][field]) for field in self.cat_fields]
        self.model = self.training_module.RecordGenerator(
            cat_sizes,
            context_window=self.context_window,
            d_model=int(config["d_model"]),
            nhead=int(config["nhead"]),
            layers=int(config["layers"]),
            dropout=float(config["dropout"]),
        ).to(self.device)
        self.model.load_state_dict(checkpoint["generator"], strict=True)
        self.model.eval()
        del checkpoint
        self._lock = threading.Lock()

    def restore_csv(
        self, content: bytes
    ) -> tuple[
        bytes,
        float,
        dict[str, Any],
        list[dict[str, str]],
        list[dict[str, str]],
    ]:
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise LogInferenceError("NetFlow input must be UTF-8 CSV.") from exc

        reader = csv.reader(io.StringIO(text))
        header = next(reader, None)
        if header != self.fields:
            raise LogInferenceError(
                "The logs model only supports NetFlow CSV with the exact header: "
                + ", ".join(self.fields)
            )
        rows = list(reader)
        if not rows:
            raise LogInferenceError("NetFlow CSV contains no records.")
        for line_number, row in enumerate(rows, start=2):
            if len(row) != len(self.fields):
                raise LogInferenceError(
                    f"CSV row {line_number} has {len(row)} columns; expected {len(self.fields)}."
                )
            for index, value in enumerate(row):
                if value == "" or value == "<MASK>":
                    row[index] = "<MASK>"

        target_indices = {self.fields.index(field) for field in self.cat_fields + self.num_fields}
        masked_rows = [
            row_index for row_index, row in enumerate(rows)
            if any(row[index] == "<MASK>" for index in target_indices)
        ]
        if not masked_rows:
            raise LogInferenceError(
                "No damaged fields found. Mark missing values with <MASK> or leave them empty."
            )

        restored_rows = [list(row) for row in rows]
        row_confidences: list[float] = []
        categorical_confidences: list[float] = []
        numeric_uncertainties: list[float] = []
        radius = self.context_window // 2
        for row_index in masked_rows:
            context = [
                rows[min(max(row_index + offset, 0), len(rows) - 1)]
                for offset in range(-radius, radius + 1)
            ]
            context_cats, context_nums = self.training_module.encode_context(context, self.metadata)
            context_cats = context_cats.unsqueeze(0).to(self.device)
            context_nums = context_nums.unsqueeze(0).to(self.device)
            damaged = rows[row_index]
            mask_cats = torch.tensor(
                [[damaged[self.fields.index(field)] == "<MASK>" for field in self.cat_fields]],
                dtype=torch.bool,
                device=self.device,
            )
            mask_nums = torch.tensor(
                [[damaged[self.fields.index(field)] == "<MASK>" for field in self.num_fields]],
                dtype=torch.bool,
                device=self.device,
            )
            if not (mask_cats.any() or mask_nums.any()):
                continue

            with self._lock:
                cat_logits_samples, numeric_samples = self._mc_predict(
                    context_cats, context_nums, mask_cats, mask_nums
                )
            mean_cat_logits = [
                torch.stack([sample[index] for sample in cat_logits_samples]).mean(dim=0)
                for index in range(len(self.cat_fields))
            ]
            mean_numeric = torch.stack(numeric_samples).mean(dim=0)
            restored_rows[row_index] = self.training_module.restore_row(
                damaged, damaged, mean_cat_logits, mean_numeric, 0, self.metadata
            )

            field_scores: list[float] = []
            mean_cat_probabilities = [
                torch.stack([sample[index].softmax(dim=-1) for sample in cat_logits_samples]).mean(dim=0)
                for index in range(len(self.cat_fields))
            ]
            for index in range(len(self.cat_fields)):
                if mask_cats[0, index]:
                    probabilities = mean_cat_probabilities[index][0]
                    field_scores.append(float(probabilities.max().item()))
            for index in range(len(self.num_fields)):
                if mask_nums[0, index]:
                    normalized_std = torch.stack(numeric_samples)[:, 0, index].std(unbiased=False).item()
                    field_scores.append(math.exp(-max(0.0, normalized_std)))
                    numeric_uncertainties.append(normalized_std)
            if field_scores:
                row_confidences.append(sum(field_scores) / len(field_scores))
            for index in range(len(self.cat_fields)):
                if mask_cats[0, index]:
                    probabilities = mean_cat_probabilities[index][0]
                    categorical_confidences.append(float(probabilities.max().item()))

        if not row_confidences:
            raise LogInferenceError("No restorable categorical or numeric fields found.")
        original_data = [dict(zip(self.fields, row)) for row in rows]
        restored_data = [dict(zip(self.fields, row)) for row in restored_rows]
        serialized = json.dumps(restored_data, ensure_ascii=False, indent=2).encode("utf-8")
        metrics: dict[str, float | int | str | bool | None] = {
            "records_processed": len(rows),
            "records_restored": len(masked_rows),
        }
        masked_field_count = 0
        restored_field_count = 0
        visible_field_count = 0
        preserved_visible_field_count = 0
        for damaged, restored in zip(rows, restored_rows):
            for index, value in enumerate(damaged):
                if value == "<MASK>":
                    masked_field_count += 1
                    restored_field_count += restored[index] != "<MASK>"
                else:
                    visible_field_count += 1
                    preserved_visible_field_count += restored[index] == value
        metrics.update({
            "masked_fields": masked_field_count,
            "fields_restored": restored_field_count,
            "visible_fields": visible_field_count,
            "visible_fields_preserved": preserved_visible_field_count,
        })
        if categorical_confidences:
            metrics["mean_categorical_max_probability"] = sum(categorical_confidences) / len(categorical_confidences)
        if numeric_uncertainties:
            metrics["mean_numeric_mc_std_normalized"] = sum(numeric_uncertainties) / len(numeric_uncertainties)
        confidence = 100.0 * sum(row_confidences) / len(row_confidences)
        return serialized, confidence, metrics, original_data, restored_data

    def compare_with_reference(
        self,
        damaged_rows: list[dict[str, str]],
        restored_rows: list[dict[str, str]],
        reference_content: bytes,
    ) -> dict[str, Any]:
        try:
            reference_text = reference_content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise LogInferenceError("The reference CSV must be UTF-8 encoded.") from exc

        reader = csv.reader(io.StringIO(reference_text))
        header = next(reader, None)
        if header != self.fields:
            raise LogInferenceError(
                "The reference CSV must have the exact NetFlow header: " + ", ".join(self.fields)
            )
        reference_rows = list(reader)
        if not (len(damaged_rows) == len(restored_rows) == len(reference_rows)):
            raise LogInferenceError(
                "Reference CSV must have the same number of records and row order as the uploaded logs."
            )
        for row_number, row in enumerate(reference_rows, start=2):
            if len(row) != len(self.fields):
                raise LogInferenceError(
                    f"Reference CSV row {row_number} has {len(row)} columns; expected {len(self.fields)}."
                )

        categorical_matches: dict[str, int] = {}
        categorical_counts: dict[str, int] = {}
        numeric_errors: dict[str, list[float]] = {}
        for row_index, (damaged, restored, reference) in enumerate(
            zip(damaged_rows, restored_rows, reference_rows),
            start=2,
        ):
            for field in self.cat_fields:
                if damaged[field] != "<MASK>":
                    continue
                truth = reference[self.fields.index(field)].strip()
                if truth in {"", "<MASK>"}:
                    raise LogInferenceError(
                        f"Reference row {row_index} is missing the masked {field} value."
                    )
                categorical_counts[field] = categorical_counts.get(field, 0) + 1
                categorical_matches[field] = categorical_matches.get(field, 0) + (
                    restored[field].strip() == truth
                )
            for field in self.num_fields:
                if damaged[field] != "<MASK>":
                    continue
                truth = reference[self.fields.index(field)]
                if truth in {"", "<MASK>"}:
                    raise LogInferenceError(
                        f"Reference row {row_index} is missing the masked {field} value."
                    )
                try:
                    expected = _parse_metric_number(truth)
                    actual = _parse_metric_number(restored[field])
                except ValueError as exc:
                    raise LogInferenceError(
                        f"Reference or restored {field} value in row {row_index} is not numeric."
                    ) from exc
                numeric_errors.setdefault(field, []).append(abs(actual - expected))

        categorical_count = sum(categorical_counts.values())
        categorical_match_count = sum(categorical_matches.values())
        numeric_count = sum(len(errors) for errors in numeric_errors.values())
        if not categorical_count and not numeric_count:
            raise LogInferenceError("No masked fields could be evaluated against the reference CSV.")
        return {
            "quality_reference_available": True,
            "categorical_accuracy_percent": (
                100.0 * categorical_match_count / categorical_count if categorical_count else None
            ),
            "categorical_fields_evaluated": categorical_count,
            "categorical_accuracy_by_field": {
                field: {
                    "masked_values": count,
                    "exact_matches": categorical_matches[field],
                    "accuracy_percent": 100.0 * categorical_matches[field] / count,
                }
                for field, count in categorical_counts.items()
            },
            "numeric_fields_evaluated": numeric_count,
            "numeric_metrics_by_field": {
                field: {
                    "masked_values": len(errors),
                    "mae": sum(errors) / len(errors),
                    "rmse": math.sqrt(sum(error * error for error in errors) / len(errors)),
                }
                for field, errors in numeric_errors.items()
            },
            "quality_metric_note": (
                "Categorical accuracy is exact-match percentage. Numeric MAE/RMSE are reported "
                "per field in that field's raw units, using masked values and same-order clean rows."
            ),
        }

    def _mc_predict(
        self,
        context_cats: Tensor,
        context_nums: Tensor,
        mask_cats: Tensor,
        mask_nums: Tensor,
    ) -> tuple[list[list[Tensor]], list[Tensor]]:
        self.model.train()
        try:
            with torch.inference_mode():
                categorical_samples = []
                numeric_samples = []
                for _ in range(self.mc_samples):
                    cat_logits, numeric = self.model(context_cats, context_nums, mask_cats, mask_nums)
                    categorical_samples.append([logits.detach() for logits in cat_logits])
                    numeric_samples.append(numeric.detach())
                return categorical_samples, numeric_samples
        finally:
            self.model.eval()

    @staticmethod
    def _load_training_module(source_dir: Path) -> types.ModuleType:
        module_name = "_gan_for_logs_training"
        if module_name in sys.modules:
            return sys.modules[module_name]
        source_path = source_dir / "train_log_gan.py"
        source_path_text = str(source_dir)
        inserted = source_path_text not in sys.path
        if inserted:
            sys.path.insert(0, source_path_text)
        try:
            spec = importlib.util.spec_from_file_location(module_name, source_path)
            if spec is None or spec.loader is None:
                raise ImportError(f"Could not load logs training module from {source_path}")
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            return module
        except Exception:
            sys.modules.pop(module_name, None)
            raise
        finally:
            if inserted:
                sys.path.remove(source_path_text)


def _parse_metric_number(value: str) -> float:
    text = value.strip()
    if text.lower().startswith("port"):
        text = text[4:]
    number = float(text)
    if not math.isfinite(number):
        raise ValueError("Numeric metric values must be finite")
    return max(0.0, number)
