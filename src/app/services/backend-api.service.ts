import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export const API_BASE_URL = 'http://localhost:8000/api';

export interface StoredFileResponse {
  file_id: string;
  filename: string;
  kind: 'image' | 'logs';
  sha256: string;
  size_bytes: number;
  created_at: string;
}

export interface RestorationResponse {
  session_id: string;
  kind: 'image' | 'logs';
  status: string;
  model_name: string;
  original_sha256: string;
  mask_sha256?: string | null;
  result_sha256?: string | null;
  confidence_score?: number | null;
  confidence_metric?: string | null;
  confidence_method?: string | null;
  inference_time_ms?: number | null;
  metrics?: Record<string, unknown> | null;
  original_image?: string | null;
  mask_image?: string | null;
  restored_image?: string | null;
  original_text?: string | null;
  restored_text?: string | null;
  original_data?: Array<Record<string, string>> | null;
  restored_data?: Array<Record<string, string>> | null;
}

export interface ModelReadiness {
  checkpoint_loaded: boolean;
  inference_ready: boolean;
  detail: string;
}

export interface ModelsStatusResponse {
  image: ModelReadiness;
  logs: ModelReadiness;
}

@Injectable({ providedIn: 'root' })
export class BackendApiService {
  private readonly http = inject(HttpClient);

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${API_BASE_URL}/health`);
  }

  getModelsStatus(): Observable<ModelsStatusResponse> {
    return this.http.get<ModelsStatusResponse>(`${API_BASE_URL}/models/status`);
  }

  uploadImage(file: File): Observable<StoredFileResponse> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<StoredFileResponse>(`${API_BASE_URL}/upload/image`, body);
  }

  uploadLogs(file: File): Observable<StoredFileResponse> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<StoredFileResponse>(`${API_BASE_URL}/upload/logs`, body);
  }

  restoreImage(
    imageId: string,
    mask: File | null,
    mode: 'auto' | 'masked',
    reference?: File | null
  ): Observable<RestorationResponse> {
    const body = new FormData();
    body.append('image_id', imageId);
    if (mask) {
      body.append('mask', mask, mask.name);
    }
    if (reference) {
      body.append('reference', reference, reference.name);
    }
    body.append('mode', mode);
    return this.http.post<RestorationResponse>(`${API_BASE_URL}/restore/image`, body);
  }

  restoreLogs(fileId: string, reference?: File | null): Observable<RestorationResponse> {
    const body = new FormData();
    body.append('file_id', fileId);
    if (reference) {
      body.append('reference', reference, reference.name);
    }
    return this.http.post<RestorationResponse>(`${API_BASE_URL}/restore/logs`, body);
  }

  getResult(sessionId: string): Observable<RestorationResponse> {
    return this.http.get<RestorationResponse>(
      `${API_BASE_URL}/restore/${encodeURIComponent(sessionId)}/result`
    );
  }

  generateReport(sessionId: string): Observable<Blob> {
    return this.http.post(`${API_BASE_URL}/report/generate`, { session_id: sessionId }, {
      responseType: 'blob'
    });
  }
}
