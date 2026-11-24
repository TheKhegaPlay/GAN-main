# GAN Restoration API

FastAPI service for authenticated uploads, SHA-256 evidence tracking,
restoration sessions, audit events, and PDF reports. The image and NetFlow
models load independently once per application process during startup.

## Requirements and startup (PowerShell)

The checked environment is Python 3.15 with CPU PyTorch. The logs model source
also documents Python 3.11 for its original training environment.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
python -m pip install -r requirements-dev.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/models/status
```

Both `image` and `logs` should report `checkpoint_loaded: true` and
`inference_ready: true`. `GET /health` and `GET /api/health` check API health.
The checkpoint load uses safe `weights_only=True` deserialization and strict
state-dictionary matching.

## Environment variables

Copy `.env.example` to `.env`. Settings can also be supplied as process
environment variables.

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | SQLite file under `backend/data/` | SQLAlchemy URL; PostgreSQL works with the included psycopg driver. |
| `STORAGE_DIR` | `backend/storage` | Uploaded and generated evidence files. |
| `MODEL_DIR` | repository `models/` | Contains both checkpoints and source folders. |
| `JWT_SECRET` | random per process | Set a stable secret for persistent sessions/deployments. |
| `ACCESS_TOKEN_MINUTES` | `60` | Bearer-token lifetime. |
| `MAX_UPLOAD_BYTES` | `26214400` | Per-file upload limit. |
| `CORS_ORIGINS` | `http://localhost:4200` | Comma-separated allowed browser origins. |

Set `DATABASE_URL` to a PostgreSQL SQLAlchemy URL, for example
`postgresql+psycopg://user:password@localhost:5432/gan`, before starting the API.
The schema is initialized on startup, including the confidence-method column
for an existing `restoration_sessions` table.

## Inference contracts

### Images

`HybridForensicGenerator` from
`models/AOT-GAN-for-paper/models/hybrid_generator.py` loads the `generator`
state dictionary from `hfi_gan_final.pt`. The input follows the project's
inference script: RGB, aspect-preserving center fit to the checkpoint's
configured size (256 by default), bicubic resampling, values scaled to `[-1,1]`.
The L-channel user mask is fit to the same crop with nearest-neighbor sampling
and thresholded at 128. The model forward is `model(masked_image, mask)`;
known pixels are copied through to the restored output. The result is a PNG at
the configured square model size.

This architecture requires an explicit damage mask and has no damage-localizer.
`mode=masked` with a supplied mask is supported. `mode=auto` is rejected with
HTTP 422; the application does not invent an automatic mask or claim the
network can find damage by itself.

For objective image-quality metrics, the restore request may include an
optional clean `reference` image. It must have the same dimensions as the
damaged image and is used only for evaluation, never as model input. PSNR and
SSIM are computed on the full model-sized output after the same
aspect-preserving fit; LPIPS is reported when its package, compatible
`torchvision`, and pretrained AlexNet weights are already available locally.
Without a clean reference, PSNR/SSIM/LPIPS are `null` with an explanation;
comparing the result to the damaged input would not be a valid quality score.

Image confidence is **not calibrated accuracy**. The API reports a
four-orientation flip-consistency heuristic: inverse-flip four predictions,
compute mean per-pixel standard deviation only inside the mask, then
`100 * exp(-5 * standard_deviation)`. This is a relative stability indicator,
not the probability that a reconstruction is correct.

### Logs

`RecordGenerator` and preprocessing helpers are loaded from
`models/GAN-for-logs/train_log_gan.py`; `logs_best_checkpoint.pt` supplies its
weights, vocabularies, numeric normalization, and model configuration.

This checkpoint is trained for **NetFlow CSV**, not generic text logs or
Windows EVTX. Input must be UTF-8 CSV with the exact 11-column header listed in
`preprocess_wls.py`. A damaged field must be represented by `<MASK>` or an
empty CSV field. Numeric fields use the checkpoint's `log1p` normalization;
categorical values use checkpoint vocabularies. The generator processes a
five-row context and restores masked fields in the center row. File boundaries
are padded by repeating the nearest row. The API returns restored records as
JSON; visible field values are preserved.

Logs confidence is also **not calibrated accuracy**. Eight MC-dropout forward
passes estimate a score for each restored row: masked categorical fields use
the maximum averaged softmax probability; masked numeric fields use
`exp(-standard_deviation)` over predictions in normalized training units.
Those field scores are averaged and multiplied by 100. The response includes
`confidence_method` so reports and clients can display the heuristic.

An optional `reference` CSV can be supplied for an actual quality evaluation.
It must use the exact same 11-column header, contain the same rows in the same
order, and provide clean values wherever the uploaded CSV contains `<MASK>`.
The API reports categorical exact-match accuracy and per-field numeric MAE/RMSE
over masked fields only (each numeric metric stays in that field's raw units).
Without a reference, these quality values are unavailable; record/field
restoration counts and model uncertainty remain available.

## API

- `POST /api/auth/register`, `POST /api/auth/login` return a Bearer access token.
- `POST /api/upload/image`, `POST /api/upload/logs` validate, store, and hash files.
- `POST /api/restore/image` accepts multipart `image_id`, `mask`, and
  `mode=masked`; an optional clean `reference` image enables PSNR/SSIM/LPIPS.
  A direct `image` upload is also accepted instead of `image_id`.
- `POST /api/restore/logs` accepts multipart `file_id` or `file`, plus an
  optional clean `reference` CSV for categorical accuracy and per-field numeric
  MAE/RMSE.
- Both restore endpoints return the session, hashes, confidence score/method,
  inference duration, and restored data. Image results are data URLs; log output
  is JSON.
- `GET /api/restore/{session_id}/result` returns the persisted session result.
- `POST /api/report/generate` accepts `{"session_id":"..."}` and returns a PDF
  with employee, timestamps, model, hashes, confidence method, quality metrics,
  optional reference hash, and original and restored evidence.
- `GET /api/models/status` reports model load and inference readiness.

Inference sessions are first persisted as `processing`; only a successfully
stored result moves them to `completed`. Validation/inference failures produce
a failed session when processing has started, and each start/success/failure is
audited with actor, model, session, file hashes, and the reported metrics.
Optional evaluation references are hashed, stored, linked to the session, and
included in the audit log. Generic request audit middleware records all HTTP
requests.

To enable LPIPS, install `lpips` and a `torchvision` build compatible with the
backend's PyTorch version, then make the pretrained AlexNet weights available
in the local PyTorch cache. The API does not download weights automatically;
if any LPIPS dependency or weight is missing, PSNR/SSIM are still returned and
the LPIPS status explains why it was skipped.

## End-to-end check

1. Start the server and confirm both models are ready at `/api/models/status`.
2. Register or log in using the Angular UI, then upload an image and draw a
   mask. Automatic mode is intentionally unavailable for this architecture.
3. For the logs model, upload a NetFlow CSV with the exact header and at least
   one `<MASK>` field.
4. Confirm the result is `completed`, inspect the result SHA-256 and
   `confidence_method`, then download the PDF report.
5. Backend integration and real-checkpoint smoke tests:

   ```powershell
   .\.venv\Scripts\python.exe -m pytest tests -q
   ```

### Small log test samples from an original NetFlow file

The helper below reads the source in streaming mode, stops after the requested
number of valid records, and never writes to the source. It creates a canonical
original CSV plus separate categorical (`SrcDevice`) and numeric (`SrcPackets`)
masked CSVs, then runs the real log adapter and compares its restored values
with the untouched sample. Keep the output folder outside the source folder.

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\create_log_test_data.py `
  --input "C:\PersonalSpace\DIssertationProject\netflow_day-15\netflow_day-15" `
  --output-dir "C:\PersonalSpace\DIssertationProject\netflow_day-15_test_samples" `
  --rows 100
```

By default, the helper reads only the first 100 valid records (maximum 5,000),
so the 10+ GB source is not uploaded or loaded into memory. Upload either
`netflow_masked_categorical.csv` or `netflow_masked_numeric.csv` through the
logs form to test the web flow. `comparison.json` contains exact categorical
accuracy and numeric MAE/RMSE against `netflow_original.csv`; these empirical
metrics are distinct from the model's heuristic confidence score. Use
`--prepare-only` to create the small CSV files without loading the checkpoint.
