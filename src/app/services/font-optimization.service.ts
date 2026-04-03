import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

export interface FontOptimizationConfig {
  preloadFonts?: string[];
  fontDisplay?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  subsetLanguages?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FontOptimizationService {
  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.optimizeFonts();
    }
  }

  /**
   * Optimize font loading and reduce CLS
   */
  private optimizeFonts(): void {
    // Add Google Fonts with font-display=swap to prevent FOUT/FOIT
    this.addGoogleFontsOptimized();

    // Preload critical fonts
    this.preloadCriticalFonts();

    // Add font loading API listener
    this.monitorFontLoading();
  }

  /**
   * Add Google Fonts with optimization
   */
  private addGoogleFontsOptimized(): void {
    const link = this.document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://fonts.googleapis.com';
    this.document.head.appendChild(link);

    const link2 = this.document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    link2.crossOrigin = 'anonymous';
    this.document.head.appendChild(link2);

    // Load fonts with font-display=swap to prevent layout shift
    const fontLink = this.document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;500;600;700&display=swap';
    this.document.head.appendChild(fontLink);
  }

  /**
   * Preload critical fonts to improve LCP
   */
  private preloadCriticalFonts(): void {
    const criticalFonts = [
      {
        href: 'https://fonts.gstatic.com/s/segoui/v20/va9C4kDNxMZRGS43BH86xJBw1xUvfkqe.woff2',
        type: 'font/woff2',
        crossOrigin: 'anonymous'
      }
    ];

    criticalFonts.forEach(font => {
      const link = this.document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.href = font.href;
      link.type = font.type;
      link.crossOrigin = font.crossOrigin;
      this.document.head.appendChild(link);
    });
  }

  /**
   * Monitor font loading with Font Loading API
   */
  private monitorFontLoading(): void {
    if (isPlatformBrowser(this.platformId)) {
      if ('fonts' in this.document) {
        (this.document as any).fonts.ready.then(() => {
          console.log('All fonts loaded successfully');
          // Remove font loading indicator
          const loader = this.document.querySelector('.font-loading');
          if (loader) {
            loader.classList.add('fonts-loaded');
          }
        });

        // Monitor individual font loading
        (this.document as any).fonts.forEach((font: any) => {
          font.loaded.then(() => {
            console.log(`Font loaded: ${font.family}`);
          }).catch(() => {
            console.warn(`Failed to load font: ${font.family}`);
          });
        });
      }
    }
  }

  /**
   * Add font loading strategy CSS to reduce CLS
   */
  addFontLoadingStrategy(): string {
    return `
      /* Prevent layout shift during font loading */
      @font-face {
        font-family: 'System Font Stack';
        src: local(-apple-system), local(BlinkMacSystemFont), local('Segoe UI'), local(Roboto);
        font-display: swap;
      }

      body {
        font-family: 'System Font Stack', system-ui, -apple-system, sans-serif;
      }

      body.fonts-loaded {
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      }

      /* Prevent FOUT (Flash of Unstyled Text) */
      @supports (font-variation-settings: normal) {
        body {
          font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
        }
      }

      /* Add size-adjust to reduce layout shift */
      @font-face {
        font-family: FallbackFont;
        src: local(system-ui);
        size-adjust: 98%;
      }
    `;
  }

  /**
   * Get system font stack that matches loaded font metrics
   */
  getSystemFontStack(): string {
    return `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
  }

  /**
   * Detect if fonts are loaded
   */
  areFontsLoaded(): boolean {
    if (!isPlatformBrowser(this.platformId)) return true;

    if ('fonts' in this.document) {
      return (this.document as any).fonts.status === 'loaded';
    }
    return true;
  }

  /**
   * Wait for fonts to load (returns promise)
   */
  waitForFonts(): Promise<void> {
    return new Promise((resolve) => {
      if (!isPlatformBrowser(this.platformId)) {
        resolve();
        return;
      }

      if ('fonts' in this.document) {
        (this.document as any).fonts.ready.then(() => resolve());
      } else {
        // Fallback: wait a bit and resolve
        setTimeout(() => resolve(), 3000);
      }
    });
  }
}
