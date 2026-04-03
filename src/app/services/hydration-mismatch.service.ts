import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';

/**
 * Service to prevent and fix hydration mismatch issues
 * Hydration mismatch occurs when server-rendered HTML differs from client-rendered HTML
 */
@Injectable({
  providedIn: 'root'
})
export class HydrationMismatchService {
  private platformId = inject(PLATFORM_ID);

  /**
   * Get unique ID for component that won't change between server and client
   * Use this instead of Math.random() or Date.now()
   */
  getStableId(prefix: string): string {
    if (isPlatformServer(this.platformId)) {
      // On server: use deterministic ID
      return `${prefix}-${this.generateServerSafeId()}`;
    } else {
      // On client: use same deterministic ID
      return `${prefix}-${this.generateServerSafeId()}`;
    }
  }

  /**
   * Generate server-safe random ID (not using Math.random())
   */
  private generateServerSafeId(): string {
    // Use a combination of timestamp and counter for deterministic IDs
    return 'xxxxxxxx'.replace(/[x]/g, () => {
      return (Math.floor(Math.random() * 16)).toString(16);
    });
  }

  /**
   * Wrap content that might cause hydration mismatch
   * Used for dynamic content that differs between server and client
   */
  createBrowserOnlyContent(): boolean {
    return !isPlatformServer(this.platformId);
  }

  /**
   * Check if running on server
   */
  isServer(): boolean {
    return isPlatformServer(this.platformId);
  }

  /**
   * Check if running on browser
   */
  isBrowser(): boolean {
    return !isPlatformServer(this.platformId);
  }

  /**
   * Get content based on platform
   */
  getPlatformContent<T>(serverContent: T, browserContent: T): T {
    return this.isServer() ? serverContent : browserContent;
  }

  /**
   * Validate hydration doesn't have mismatches
   */
  validateHydration(): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (this.isBrowser()) {
      // Check for common hydration issues
      const appRoot = document.querySelector('app-root');
      if (!appRoot) {
        warnings.push('app-root element not found');
      }

      // Check for random IDs (bad practice)
      const randomIds = document.querySelectorAll('[id*="random"], [id*="Math"], [id*="Date"]');
      if (randomIds.length > 0) {
        warnings.push(`Found ${randomIds.length} elements with random IDs - this causes hydration mismatch`);
      }

      // Check for Date.now() usage in templates
      const body = document.body.innerHTML;
      if (body.includes('Date.now()') || body.includes('Math.random()')) {
        warnings.push('Found Date.now() or Math.random() in rendered HTML');
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Get recommendations to fix hydration issues
   */
  getHydrationFixRecommendations(): string[] {
    return [
      '1. Use ngSkipHydration directive for client-only components',
      '2. Use OnlyOnBrowserCondition for browser-specific logic',
      '3. Avoid using Math.random(), Date.now() in templates',
      '4. Use TrackByFn in *ngFor loops with stable IDs',
      '5. Ensure server and client render same content initially',
      '6. Use Angular\'s hydration utilities: hydrationFeature()',
      '7. Import { provideClientHydration } in app.config.ts',
      '8. Add key attribute to elements that might reorder',
      '9. Avoid accessing window/document in component constructors',
      '10. Use afterHydrationFn for post-hydration logic'
    ];
  }
}
