import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServerApiService } from '../services/server-api.service';

interface RestorationResult {
  originalImage: string;
  maskedImage: string;
  restoredImage: string;
  confidenceScore: number;
  metrics: {
    ssim: number;
    psnr: number;
    mse: number;
  };
  processingTimeMsMs: number;
}

@Component({
  selector: 'app-gan-restoration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="restoration-container">
      <!-- Title Section -->
      <div class="restoration-header">
        <h2>🔧 Image Restoration & Inpainting</h2>
        <p class="subtitle">Upload a damaged image, apply a mask, and restore it using AOT-GAN</p>
      </div>

      <!-- Backend Status Check -->
      <div [ngClass]="['backend-status', 'status-' + backendStatus]">
        <span class="status-indicator"></span>
        {{ backendStatusMessage }}
      </div>

      <!-- Main Content -->
      <div class="restoration-content">
        <!-- Step 1: Upload Image -->
        <div class="restoration-step">
          <div class="step-header">
            <span class="step-number">1</span>
            <h3>Upload or Drag & Drop Your Image</h3>
          </div>

          <div
            class="upload-area"
            [class.dragover]="isDragover"
            (dragover)="onDragover($event)"
            (dragleave)="onDragleave($event)"
            (drop)="onDrop($event)">
            <div class="upload-content">
              <div class="upload-icon">📷</div>
              <p>Drag and drop your image here, or click to select</p>
              <p class="upload-hint">Supported: PNG, JPG, BMP (max 10MB)</p>
            </div>
            <input
              #fileInput
              type="file"
              accept="image/*"
              (change)="onFileSelected($event)"
              class="file-input" />
          </div>

          <button (click)="fileInput.click()" class="upload-btn">
            📁 Select Image
          </button>

          <!-- Preview of Uploaded Image -->
          <div *ngIf="uploadedImage" class="preview-section">
            <div class="preview-item">
              <div class="preview-label">Original Image</div>
              <img [src]="uploadedImage" alt="Original" class="preview-image" />
              <button (click)="clearUpload()" class="clear-btn">Clear</button>
            </div>
          </div>
        </div>

        <!-- Step 2: Generate or Upload Mask -->
        <div class="restoration-step">
          <div class="step-header">
            <span class="step-number">2</span>
            <h3>Create or Upload Damage Mask</h3>
          </div>

          <div class="mask-options">
            <!-- Mask Type Selection -->
            <div class="mask-type-selector">
              <label>Mask Type:</label>
              <select [(ngModel)]="selectedMaskType" class="form-select">
                <option value="irregular">Irregular</option>
                <option value="center">Center Square</option>
                <option value="rectangular">Random Rectangles</option>
                <option value="random_brush">Brush Strokes</option>
              </select>
            </div>

            <!-- Mask Ratio Slider -->
            <div class="mask-ratio-slider">
              <label>
                Coverage: <strong>{{ (maskRatio * 100).toFixed(0) }}%</strong>
              </label>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                [(ngModel)]="maskRatio"
                class="slider" />
            </div>

            <!-- Action Buttons -->
            <div class="mask-actions">
              <button
                (click)="generateRandomMask()"
                [disabled]="!uploadedImage || isProcessing"
                class="mask-btn primary">
                🎲 Generate Random Damage
              </button>

              <button
                (click)="uploadMaskInput.click()"
                [disabled]="!uploadedImage || isProcessing"
                class="mask-btn">
                📤 Upload Custom Mask
              </button>

              <input
                #uploadMaskInput
                type="file"
                accept="image/*"
                (change)="onMaskFileSelected($event)"
                class="file-input" />
            </div>
          </div>

          <!-- Mask Preview -->
          <div *ngIf="currentMask" class="preview-section">
            <div class="preview-item">
              <div class="preview-label">Damage Mask</div>
              <img [src]="currentMask" alt="Mask" class="preview-image" />
              <button (click)="clearMask()" class="clear-btn">Clear</button>
            </div>
          </div>
        </div>

        <!-- Step 3: Run Restoration -->
        <div class="restoration-step">
          <div class="step-header">
            <span class="step-number">3</span>
            <h3>Restore Image</h3>
          </div>

          <button
            (click)="runRestoration()"
            [disabled]="!uploadedImage || isProcessing"
            class="restore-btn"
            [class.processing]="isProcessing">
            <span *ngIf="!isProcessing">🚀 Run Restoration</span>
            <span *ngIf="isProcessing">⏳ Processing... {{ processingProgress }}%</span>
          </button>

          <div *ngIf="errorMessage" class="error-message">
            ⚠️ {{ errorMessage }}
          </div>
        </div>

        <!-- Results Section -->
        <div *ngIf="restorationResult" class="results-section">
          <h3>✨ Restoration Results</h3>

          <!-- Images Side by Side -->
          <div class="results-grid">
            <div class="result-item">
              <div class="result-label">Original</div>
              <img [src]="restorationResult.originalImage" alt="Original" class="result-image" />
            </div>

            <div class="result-item">
              <div class="result-label">Masked</div>
              <img [src]="restorationResult.maskedImage" alt="Masked" class="result-image" />
            </div>

            <div class="result-item">
              <div class="result-label">Restored</div>
              <img [src]="restorationResult.restoredImage" alt="Restored" class="result-image" />
            </div>
          </div>

          <!-- Metrics Cards -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">SSIM</div>
              <div class="metric-value" [class.good]="restorationResult.metrics.ssim > 0.8">
                {{ restorationResult.metrics.ssim.toFixed(4) }}
              </div>
              <div class="metric-hint">Structural Similarity</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">PSNR</div>
              <div class="metric-value" [class.good]="restorationResult.metrics.psnr > 25">
                {{ restorationResult.metrics.psnr.toFixed(2) }} dB
              </div>
              <div class="metric-hint">Peak Signal-to-Noise Ratio</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Confidence</div>
              <div class="metric-value" [class.good]="restorationResult.confidenceScore > 0.7">
                {{ (restorationResult.confidenceScore * 100).toFixed(1) }}%
              </div>
              <div class="metric-hint">Model Confidence</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">MSE</div>
              <div class="metric-value">
                {{ restorationResult.metrics.mse.toFixed(4) }}
              </div>
              <div class="metric-hint">Mean Squared Error</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Processing Time</div>
              <div class="metric-value">
                {{ restorationResult.processingTimeMsMs.toFixed(0) }} ms
              </div>
              <div class="metric-hint">Backend Processing</div>
            </div>
          </div>

          <!-- Download Results -->
          <div class="results-actions">
            <button (click)="downloadResult('original')" class="download-btn">
              💾 Download Original
            </button>
            <button (click)="downloadResult('masked')" class="download-btn">
              💾 Download Masked
            </button>
            <button (click)="downloadResult('restored')" class="download-btn">
              💾 Download Restored
            </button>
            <button (click)="resetWorkflow()" class="reset-btn">
              🔄 Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .restoration-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .restoration-header {
      margin-bottom: 20px;
      border-bottom: 2px solid #1976d2;
      padding-bottom: 15px;
    }

    .restoration-header h2 {
      margin: 0 0 8px 0;
      color: #1565c0;
      font-size: 24px;
    }

    .subtitle {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .backend-status {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-weight: 500;
      font-size: 14px;
    }

    .backend-status.status-connected {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #81c784;
    }

    .backend-status.status-error {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ef5350;
    }

    .backend-status.status-checking {
      background: #fff3e0;
      color: #e65100;
      border: 1px solid #ffb74d;
    }

    .status-indicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .restoration-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .restoration-step {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      background: #f5f5f5;
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .step-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: #1976d2;
      color: white;
      border-radius: 50%;
      font-weight: bold;
      font-size: 16px;
    }

    .step-header h3 {
      margin: 0;
      color: #1565c0;
      font-size: 18px;
    }

    .upload-area {
      border: 2px dashed #1976d2;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: white;
      margin-bottom: 12px;
    }

    .upload-area:hover {
      background: #f5f5f5;
      border-color: #1565c0;
    }

    .upload-area.dragover {
      background: #e3f2fd;
      border-color: #1565c0;
      box-shadow: 0 0 12px rgba(25, 118, 210, 0.3);
    }

    .upload-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .upload-content p {
      margin: 8px 0;
      color: #666;
    }

    .upload-hint {
      font-size: 12px;
      color: #999 !important;
    }

    .file-input {
      display: none;
    }

    .upload-btn,
    .mask-btn,
    .restore-btn,
    .download-btn,
    .reset-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 14px;
    }

    .upload-btn {
      background: #1976d2;
      color: white;
      width: 100%;
    }

    .upload-btn:hover {
      background: #1565c0;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .preview-section {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .preview-item {
      flex: 1;
      min-width: 150px;
      text-align: center;
    }

    .preview-label {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .preview-image {
      max-width: 100%;
      max-height: 200px;
      border-radius: 6px;
      border: 1px solid #ddd;
      margin-bottom: 8px;
    }

    .clear-btn {
      padding: 6px 12px;
      background: #ff6b6b;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }

    .clear-btn:hover {
      background: #ff5252;
    }

    .mask-options {
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: white;
      padding: 16px;
      border-radius: 6px;
    }

    .mask-type-selector,
    .mask-ratio-slider {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mask-type-selector label,
    .mask-ratio-slider label {
      font-weight: 600;
      min-width: 100px;
      color: #333;
      font-size: 14px;
    }

    .form-select {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .slider {
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: #ddd;
      outline: none;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #1976d2;
      cursor: pointer;
    }

    .slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #1976d2;
      cursor: pointer;
      border: none;
    }

    .mask-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .mask-btn {
      flex: 1;
      min-width: 180px;
      background: #4caf50;
      color: white;
    }

    .mask-btn:hover:not(:disabled) {
      background: #45a049;
    }

    .mask-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .mask-btn.primary {
      background: #2196f3;
    }

    .mask-btn.primary:hover:not(:disabled) {
      background: #0b7dda;
    }

    .restore-btn {
      width: 100%;
      padding: 14px;
      background: #ff9800;
      color: white;
      font-size: 16px;
    }

    .restore-btn:hover:not(:disabled) {
      background: #e68900;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .restore-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .restore-btn.processing {
      background: #ff6f00;
      animation: pulse-bg 1s infinite;
    }

    @keyframes pulse-bg {
      0%, 100% {
        background: #ff9800;
      }
      50% {
        background: #ff6f00;
      }
    }

    .error-message {
      margin-top: 12px;
      padding: 12px;
      background: #ffebee;
      color: #c62828;
      border-left: 4px solid #c62828;
      border-radius: 4px;
      font-size: 14px;
    }

    .results-section {
      background: white;
      border: 2px solid #4caf50;
      border-radius: 8px;
      padding: 24px;
    }

    .results-section h3 {
      margin: 0 0 20px 0;
      color: #2e7d32;
      font-size: 20px;
      text-align: center;
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .result-item {
      text-align: center;
    }

    .result-label {
      font-weight: 700;
      color: #1565c0;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .result-image {
      width: 100%;
      max-height: 300px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      object-fit: contain;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .metric-card {
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .metric-label {
      font-weight: 600;
      color: #666;
      font-size: 12px;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: #1565c0;
      margin-bottom: 8px;
    }

    .metric-value.good {
      color: #2e7d32;
    }

    .metric-hint {
      font-size: 11px;
      color: #999;
    }

    .results-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .download-btn {
      background: #2196f3;
      color: white;
      flex: 1;
      min-width: 150px;
    }

    .download-btn:hover {
      background: #0b7dda;
    }

    .reset-btn {
      background: #757575;
      color: white;
      flex: 1;
      min-width: 150px;
    }

    .reset-btn:hover {
      background: #616161;
    }
  `]
})
export class GanRestorationComponent implements OnInit {
  // Upload state
  uploadedImage: string | null = null;
  isDragover = false;

  // Mask state
  currentMask: string | null = null;
  selectedMaskType = 'irregular';
  maskRatio = 0.3;

  // Processing state
  isProcessing = false;
  processingProgress = 0;
  errorMessage = '';

  // Results
  restorationResult: RestorationResult | null = null;

  // Backend status
  backendStatus: 'connected' | 'error' | 'checking' = 'checking';
  backendStatusMessage = '🔍 Checking backend connection...';

  constructor(private apiService: ServerApiService) {}

  ngOnInit() {
    this.checkBackendConnection();
  }

  checkBackendConnection() {
    this.backendStatus = 'checking';
    this.backendStatusMessage = '🔍 Checking backend connection...';

    this.apiService.checkBackendHealth().subscribe(
      response => {
        if (response.success) {
          this.backendStatus = 'connected';
          this.backendStatusMessage =
            '✅ Backend connected: ' + response.data?.device?.toUpperCase() || 'CPU';
        } else {
          this.backendStatus = 'error';
          this.backendStatusMessage = '❌ Backend unavailable. Ensure backend is running on port 8000.';
        }
      },
      error => {
        this.backendStatus = 'error';
        this.backendStatusMessage =
          '❌ Cannot connect to backend. Ensure it is running: python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000';
      }
    );
  }

  // File Upload Handlers
  onDragover(event: DragEvent) {
    event.preventDefault();
    this.isDragover = true;
  }

  onDragleave(event: DragEvent) {
    event.preventDefault();
    this.isDragover = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragover = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileUpload(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileUpload(input.files[0]);
    }
  }

  handleFileUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (typeof e.target?.result === 'string') {
        this.uploadedImage = e.target.result;
        this.errorMessage = '';
      }
    };
    reader.readAsDataURL(file);
  }

  clearUpload() {
    this.uploadedImage = null;
    this.currentMask = null;
    this.restorationResult = null;
  }

  // Mask Handlers
  onMaskFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (typeof e.target?.result === 'string') {
          this.currentMask = e.target.result;
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  generateRandomMask() {
    this.isProcessing = true;
    this.processingProgress = 25;

    this.apiService
      .generateMask(this.selectedMaskType, 512, 512, this.maskRatio)
      .subscribe(
        response => {
          this.isProcessing = false;
          if (response.success) {
            this.currentMask = response.data.mask;
            this.processingProgress = 0;
          } else {
            this.errorMessage = 'Failed to generate mask: ' + response.error;
          }
        },
        error => {
          this.isProcessing = false;
          this.errorMessage = 'Error generating mask: ' + error.message;
        }
      );
  }

  clearMask() {
    this.currentMask = null;
  }

  // Main Restoration Handler
  runRestoration() {
    if (!this.uploadedImage) {
      this.errorMessage = 'Please upload an image first.';
      return;
    }

    this.isProcessing = true;
    this.processingProgress = 0;
    this.errorMessage = '';

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      if (this.processingProgress < 90) {
        this.processingProgress += Math.random() * 20;
      }
    }, 500);

    this.apiService
      .restoreImage(
        this.uploadedImage,
        this.currentMask || undefined,
        this.selectedMaskType,
        this.maskRatio
      )
      .subscribe(
        response => {
          clearInterval(progressInterval);
          this.isProcessing = false;
          this.processingProgress = 100;

          if (response.success) {
            this.restorationResult = {
              originalImage: response.data.original_image,
              maskedImage: response.data.masked_image,
              restoredImage: response.data.restored_image,
              confidenceScore: response.data.confidence_score,
              metrics: response.data.metrics,
              processingTimeMsMs: response.data.processing_time_ms
            };
          } else {
            this.errorMessage = 'Restoration failed: ' + response.error;
          }
        },
        error => {
          clearInterval(progressInterval);
          this.isProcessing = false;
          this.errorMessage = 'Restoration error: ' + error.message;
        }
      );
  }

  // Download Results
  downloadResult(type: 'original' | 'masked' | 'restored') {
    if (!this.restorationResult) return;

    const images = {
      original: { data: this.restorationResult.originalImage, name: 'original' },
      masked: { data: this.restorationResult.maskedImage, name: 'masked' },
      restored: { data: this.restorationResult.restoredImage, name: 'restored' }
    };

    const image = images[type];
    const link = document.createElement('a');
    link.href = image.data;
    link.download = `forensic_${image.name}_${new Date().getTime()}.png`;
    link.click();
  }

  // Reset Workflow
  resetWorkflow() {
    this.uploadedImage = null;
    this.currentMask = null;
    this.restorationResult = null;
    this.errorMessage = '';
    this.processingProgress = 0;
  }
}
