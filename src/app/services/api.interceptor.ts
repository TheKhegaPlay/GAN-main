import { Injectable, Inject, Optional } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, retry, timeout, tap } from 'rxjs/operators';
import { DOCUMENT } from '@angular/common';

export interface ApiRequestConfig {
  retryAttempts?: number;
  timeoutMs?: number;
  addTimestamp?: boolean;
  cacheResponse?: boolean;
}

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  private requestsInProgress$ = new BehaviorSubject<number>(0);
  private responseCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Optional() @Inject(DOCUMENT) private document: Document | null
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip caching for non-GET requests
    const cacheKey = `${req.method}-${req.url}`;

    if (req.method === 'GET') {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return new Observable(observer => {
          observer.next(new HttpResponse({ body: cached, status: 200 }));
          observer.complete();
        });
      }
    }

    // Add request timing info
    const startTime = performance.now();

    // Clone request and add custom headers
    const modifiedReq = this.addCustomHeaders(req);

    // Track request progress
    this.requestsInProgress$.next(this.requestsInProgress$.value + 1);

    return next.handle(modifiedReq).pipe(
      timeout(10000), // 10 second timeout
      retry({ count: 1, delay: 500 }), // Retry once after 500ms
      tap(event => {
        if (event instanceof HttpResponse) {
          // Cache successful responses
          if (req.method === 'GET') {
            this.cacheResponse(cacheKey, event.body);
          }

          // Log performance metrics
          const duration = performance.now() - startTime;
          console.log(`API Response: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);

          // Update request counter
          this.requestsInProgress$.next(Math.max(0, this.requestsInProgress$.value - 1));
        }
      }),
      catchError(error => {
        this.requestsInProgress$.next(Math.max(0, this.requestsInProgress$.value - 1));

        if (error instanceof HttpErrorResponse) {
          console.error(`API Error: ${error.status} - ${error.message}`, error);

          // Handle specific error codes
          switch (error.status) {
            case 401:
              // Unauthorized - handle session expiry
              console.warn('Session expired. Redirecting to login...');
              break;
            case 403:
              // Forbidden
              console.warn('Access forbidden');
              break;
            case 404:
              // Not found
              console.warn('Resource not found');
              break;
            case 500:
              // Server error
              console.error('Server error occurred');
              break;
          }
        }

        return throwError(() => error);
      })
    );
  }

  private addCustomHeaders(req: HttpRequest<any>): HttpRequest<any> {
    let headers = req.headers;

    // Add timestamp for cache busting if needed
    if (req.method === 'GET') {
      headers = headers.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    }

    // Add request ID for tracing
    const requestId = this.generateRequestId();
    headers = headers.set('X-Request-ID', requestId);

    // Add API version header
    headers = headers.set('X-API-Version', '1.0');

    return req.clone({ headers });
  }

  private cacheResponse(key: string, data: any): void {
    this.responseCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private getFromCache(key: string): any | null {
    const cached = this.responseCache.get(key);

    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_DURATION) {
      this.responseCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getRequestsInProgress$(): Observable<number> {
    return this.requestsInProgress$.asObservable();
  }

  clearCache(): void {
    this.responseCache.clear();
  }
}
