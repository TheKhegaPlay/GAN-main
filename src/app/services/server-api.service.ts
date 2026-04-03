import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface ApiHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  responseTime: number;
  endpoint: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * Server-side API handler service
 * This service provides middleware-like functionality for API requests
 */
@Injectable({
  providedIn: 'root'
})
export class ServerApiService {
  private apiBaseUrl = '/api';
  private readonly REQUEST_TIMEOUT = 10000;

  constructor(private http: HttpClient) {}

  /**
   * Health check for API endpoints
   */
  healthCheck(endpoint: string): Observable<ApiHealthCheck> {
    const startTime = performance.now();

    return this.http.get<{ status: string }>(`${this.apiBaseUrl}/health`).pipe(
      map(response => ({
        status: (response.status === 'ok' ? 'healthy' : 'degraded') as 'healthy' | 'degraded' | 'unhealthy',
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
        endpoint
      })),
      catchError(error => {
        return of({
          status: 'unhealthy' as const,
          timestamp: Date.now(),
          responseTime: performance.now() - startTime,
          endpoint
        });
      })
    );
  }

  /**
   * Generic GET request with error handling
   */
  get<T>(endpoint: string, options?: any): Observable<ApiResponse<T>> {
    return this.http.get<T>(`${this.apiBaseUrl}${endpoint}`, options).pipe(
      map(data => ({
        success: true,
        data,
        timestamp: Date.now()
      } as ApiResponse<T>)),
      catchError(error => {
        console.error(`API Error on GET ${endpoint}:`, error);
        return of({
          success: false,
          error: error.message || 'Unknown error',
          timestamp: Date.now()
        } as ApiResponse<T>);
      })
    );
  }

  /**
   * Generic POST request with error handling
   */
  post<T>(endpoint: string, body: any, options?: any): Observable<ApiResponse<T>> {
    return this.http.post<T>(`${this.apiBaseUrl}${endpoint}`, body, options).pipe(
      map(data => ({
        success: true,
        data,
        timestamp: Date.now()
      } as ApiResponse<T>)),
      catchError(error => {
        console.error(`API Error on POST ${endpoint}:`, error);
        return of({
          success: false,
          error: error.message || 'Unknown error',
          timestamp: Date.now()
        } as ApiResponse<T>);
      })
    );
  }

  /**
   * Generic PUT request with error handling
   */
  put<T>(endpoint: string, body: any, options?: any): Observable<ApiResponse<T>> {
    return this.http.put<T>(`${this.apiBaseUrl}${endpoint}`, body, options).pipe(
      map(data => ({
        success: true,
        data,
        timestamp: Date.now()
      } as ApiResponse<T>)),
      catchError(error => {
        console.error(`API Error on PUT ${endpoint}:`, error);
        return of({
          success: false,
          error: error.message || 'Unknown error',
          timestamp: Date.now()
        } as ApiResponse<T>);
      })
    );
  }

  /**
   * Generic DELETE request with error handling
   */
  delete<T>(endpoint: string, options?: any): Observable<ApiResponse<T>> {
    return this.http.delete<T>(`${this.apiBaseUrl}${endpoint}`, options).pipe(
      map(data => ({
        success: true,
        data,
        timestamp: Date.now()
      } as ApiResponse<T>)),
      catchError(error => {
        console.error(`API Error on DELETE ${endpoint}:`, error);
        return of({
          success: false,
          error: error.message || 'Unknown error',
          timestamp: Date.now()
        } as ApiResponse<T>);
      })
    );
  }

  /**
   * Batch API requests
   */
  batch<T>(requests: Array<() => Observable<T>>): Observable<T[]> {
    return new Observable(observer => {
      const results: T[] = [];
      let completed = 0;

      requests.forEach((request, index) => {
        request().subscribe({
          next: (result) => {
            results[index] = result;
            completed++;
            if (completed === requests.length) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            observer.error(error);
          }
        });
      });
    });
  }

  /**
   * Retry failed requests with exponential backoff
   */
  retryWithBackoff<T>(
    request: () => Observable<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Observable<T> {
    return new Observable(observer => {
      let attempt = 0;

      const executeRequest = () => {
        attempt++;
        request().subscribe({
          next: (result) => observer.next(result),
          error: (error) => {
            if (attempt < maxAttempts) {
              const backoffDelay = delay * Math.pow(2, attempt - 1);
              console.log(`Retrying after ${backoffDelay}ms (attempt ${attempt}/${maxAttempts})`);
              setTimeout(executeRequest, backoffDelay);
            } else {
              observer.error(error);
            }
          },
          complete: () => observer.complete()
        });
      };

      executeRequest();
    });
  }

  /**
   * Convert API errors to user-friendly messages
   */
  getErrorMessage(error: any): string {
    if (error.status === 0) {
      return 'Network error. Please check your connection.';
    } else if (error.status === 401) {
      return 'Session expired. Please login again.';
    } else if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    } else if (error.status === 404) {
      return 'The requested resource was not found.';
    } else if (error.status === 500) {
      return 'Server error. Please try again later.';
    } else if (error.status === 503) {
      return 'Service unavailable. Please try again later.';
    } else {
      return error.error?.message || 'An error occurred. Please try again.';
    }
  }
}
