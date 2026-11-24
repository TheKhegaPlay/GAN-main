import io
import importlib
import importlib.util
import math
import os
import sys
import threading
from collections.abc import Callable
from pathlib import Path, PureWindowsPath, WindowsPath

import numpy as np
import torch
from PIL import Image, ImageOps, UnidentifiedImageError
from torch import Tensor, nn

from app.core.config import settings


class ImageInferenceError(ValueError):
    pass


class ImageRestorer:
    confidence_method = (
        "Uncalibrated four-way flip-consistency heuristic: "
        "100 * exp(-5 * mean pixel standard deviation in the masked region)."
    )

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        source_dir = settings.model_dir / "AOT-GAN-for-paper"
        checkpoint_path = settings.model_dir / "hfi_gan_final.pt"
        if not source_dir.is_dir():
            raise FileNotFoundError(f"Image model source is missing: {source_dir}")
        if not checkpoint_path.is_file():
            raise FileNotFoundError(f"Image checkpoint is missing: {checkpoint_path}")

        model_class = self._load_generator_class(source_dir)
        self._psnr = self._load_quality_metric("psnr")
        self._ssim = self._load_quality_metric("ssim")
        self._lpips_model: nn.Module | None = None
        checkpoint = self._load_checkpoint(checkpoint_path)
        config = checkpoint.get("config", {})
        self.image_size = int(config.get("image_size", 256))
        if self.image_size <= 0 or self.image_size % 16:
            raise ValueError(f"Invalid image model input size: {self.image_size}")
        self.model = model_class(
            base_channels=int(config.get("base_channels", 48)),
            cab_count=int(config.get("cab_count", 6)),
        ).to(self.device)
        self.model.load_state_dict(checkpoint["generator"], strict=True)
        self.model.eval()
        del checkpoint
        self._lock = threading.Lock()

    def restore(
        self,
        image_bytes: bytes,
        mask_bytes: bytes | None,
        reference_bytes: bytes | None = None,
    ) -> tuple[bytes, float, dict[str, float | int | str | bool | None]]:
        if mask_bytes is None:
            raise ImageInferenceError(
                "HFI-GAN requires a damage mask. Automatic damage localization is not implemented."
            )
        try:
            with Image.open(io.BytesIO(image_bytes)) as source:
                original = source.convert("RGB")
            with Image.open(io.BytesIO(mask_bytes)) as source_mask:
                raw_mask = source_mask.convert("L")
            reference = None
            if reference_bytes is not None:
                with Image.open(io.BytesIO(reference_bytes)) as source_reference:
                    reference = source_reference.convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise ImageInferenceError("The image, damage mask, or reference image is invalid.") from exc

        size = (self.image_size, self.image_size)
        if reference is not None and reference.size != original.size:
            raise ImageInferenceError("Reference image dimensions must match the damaged image.")
        fitted_image = ImageOps.fit(original, size, method=Image.Resampling.BICUBIC)
        fitted_mask = ImageOps.fit(raw_mask, size, method=Image.Resampling.NEAREST)
        image_array = np.asarray(fitted_image, dtype=np.float32).copy() / 127.5 - 1.0
        mask_array = (np.asarray(fitted_mask, dtype=np.uint8) >= 128).astype(np.float32)
        if not mask_array.any():
            raise ImageInferenceError("The damage mask contains no marked pixels.")

        original_tensor = torch.from_numpy(image_array).permute(2, 0, 1).unsqueeze(0).to(self.device)
        mask_tensor = torch.from_numpy(mask_array).unsqueeze(0).unsqueeze(0).to(self.device)
        masked_input = original_tensor * (1.0 - mask_tensor) + mask_tensor

        with self._lock, torch.inference_mode():
            predictions = [
                self._predict(masked_input, mask_tensor, flip_x, flip_y)
                for flip_x, flip_y in ((False, False), (True, False), (False, True), (True, True))
            ]
        stacked = torch.stack(predictions)
        prediction = stacked.mean(dim=0)
        uncertainty = stacked.std(dim=0, unbiased=False).mean(dim=1, keepdim=True)
        masked_uncertainty = uncertainty[0, 0][mask_tensor[0, 0].bool()].mean().item()
        confidence = 100.0 * math.exp(-5.0 * masked_uncertainty)
        restored = prediction * mask_tensor + original_tensor * (1.0 - mask_tensor)
        output_array = restored[0].clamp(-1, 1).add(1).mul(127.5).byte()
        output_array = output_array.permute(1, 2, 0).cpu().numpy()
        output = io.BytesIO()
        Image.fromarray(output_array, mode="RGB").save(output, format="PNG")
        metrics: dict[str, float | int | str | bool | None] = {
            "mask_coverage": float(mask_array.mean()),
            "quality_reference_available": reference is not None,
            "psnr_db": None,
            "ssim": None,
            "lpips": None,
            "lpips_status": "not_computed",
            "quality_metric_note": (
                "PSNR, SSIM, and LPIPS require a clean reference image with matching dimensions."
            ),
        }
        if reference is not None:
            fitted_reference = ImageOps.fit(reference, size, method=Image.Resampling.BICUBIC)
            reference_array = np.asarray(fitted_reference, dtype=np.float32).copy() / 127.5 - 1.0
            reference_tensor = (
                torch.from_numpy(reference_array).permute(2, 0, 1).unsqueeze(0).to(self.device)
            )
            with self._lock, torch.inference_mode():
                metrics["psnr_db"] = float(self._psnr(restored, reference_tensor).item())
                metrics["ssim"] = float(self._ssim(restored, reference_tensor).item())
                lpips_score, lpips_status, lpips_note = self._compute_lpips(
                    restored, reference_tensor
                )
            metrics["lpips"] = lpips_score
            metrics["lpips_status"] = lpips_status
            metrics["quality_metric_note"] = lpips_note or (
                "Full-image metrics use the reference fitted to the model's 256-square input."
            )
        return output.getvalue(), confidence, metrics

    def _predict(self, image: Tensor, mask: Tensor, flip_x: bool, flip_y: bool) -> Tensor:
        dims = tuple(dimension for dimension, enabled in ((-1, flip_x), (-2, flip_y)) if enabled)
        if dims:
            transformed_image = torch.flip(image, dims=dims)
            transformed_mask = torch.flip(mask, dims=dims)
        else:
            transformed_image, transformed_mask = image, mask
        prediction = self.model(transformed_image, transformed_mask)
        return torch.flip(prediction, dims=dims) if dims else prediction

    @staticmethod
    def _load_quality_metric(name: str) -> Callable[[Tensor, Tensor], Tensor]:
        module = importlib.import_module("_aot_gan_model.losses")
        metric = getattr(module, name, None)
        if not callable(metric):
            raise ImportError(f"The image model source does not provide the {name} metric.")
        return metric

    def _compute_lpips(
        self, prediction: Tensor, reference: Tensor
    ) -> tuple[float | None, str, str | None]:
        try:
            from lpips import LPIPS
        except (ImportError, RuntimeError) as exc:
            return (
                None,
                "unavailable",
                f"LPIPS is unavailable ({type(exc).__name__}); install lpips and compatible torchvision with pretrained AlexNet weights cached locally.",
            )

        alexnet_cache = Path(torch.hub.get_dir()) / "checkpoints"
        if not any(alexnet_cache.glob("alexnet-*.pth")):
            return (
                None,
                "unavailable",
                "LPIPS was not run because pretrained AlexNet weights are not cached locally.",
            )
        try:
            if self._lpips_model is None:
                self._lpips_model = LPIPS(net="alex").to(self.device).eval()
            score = self._lpips_model(prediction, reference).mean().item()
        except (ImportError, OSError, RuntimeError, ValueError) as exc:
            return None, "unavailable", f"LPIPS could not be initialized: {type(exc).__name__}."
        return float(score), "available", None

    @staticmethod
    def _load_checkpoint(path: Path) -> dict:
        windows_path = WindowsPath if os.name == "nt" else (PureWindowsPath, "pathlib.WindowsPath")
        with torch.serialization.safe_globals([windows_path]):
            checkpoint = torch.load(path, map_location="cpu", weights_only=True)
        if not isinstance(checkpoint, dict) or not isinstance(checkpoint.get("generator"), dict):
            raise ValueError("Image checkpoint does not contain generator weights.")
        return checkpoint

    @staticmethod
    def _load_generator_class(source_dir: Path) -> type[nn.Module]:
        package_dir = source_dir / "models"
        spec = importlib.util.spec_from_file_location(
            "_aot_gan_model",
            package_dir / "__init__.py",
            submodule_search_locations=[str(package_dir)],
        )
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not load AOT-GAN package from {package_dir}")
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        model_class = getattr(module, "HybridForensicGenerator", None)
        if model_class is None:
            raise ImportError("AOT-GAN package does not export HybridForensicGenerator")
        return model_class
