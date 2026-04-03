import {
  ApplicationConfig,
  EnvironmentProviders,
  Provider,
  provideZoneChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';

import { routes } from './app.routes';
import { PerformanceOptimizationService } from './services/performance-optimization.service';
import { ApiInterceptor } from './services/api.interceptor';
import { ImageOptimizationService } from './services/image-optimization.service';
import { FontOptimizationService } from './services/font-optimization.service';
import { HydrationMismatchService } from './services/hydration-mismatch.service';
import { ServerApiService } from './services/server-api.service';

/** Shared providers; hydration is browser-only (breaks Node SSR if included on the server). */
export function baseAppProviders(withClientHydration: boolean): (Provider | EnvironmentProviders)[] {
  return [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    ...(withClientHydration ? [provideClientHydration()] : []),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiInterceptor,
      multi: true
    },
    PerformanceOptimizationService,
    ImageOptimizationService,
    FontOptimizationService,
    HydrationMismatchService,
    ServerApiService
  ];
}

export const appConfig: ApplicationConfig = {
  providers: baseAppProviders(true)
};

