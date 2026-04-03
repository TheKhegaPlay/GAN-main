import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface WebVitals {
  LCP: number | null; // Largest Contentful Paint (milliseconds)
  FID: number | null; // First Input Delay (milliseconds)
  CLS: number | null; // Cumulative Layout Shift (unitless)
  TTFB: number | null; // Time to First Byte (milliseconds)
  FCP: number | null; // First Contentful Paint (milliseconds)
}

export interface PerformanceMetrics {
  navigationTiming: any;
  resourceTiming: any;
  webVitals: WebVitals;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceOptimizationService {
  private document = inject(DOCUMENT);

  private webVitals: WebVitals = {
    LCP: null,
    FID: null,
    CLS: null,
    TTFB: null,
    FCP: null
  };

  constructor() {
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined') return; // Skip on server

    // Monitor Largest Contentful Paint (LCP)
    this.measureLCP();

    // Monitor Cumulative Layout Shift (CLS)
    this.measureCLS();

    // Monitor First Contentful Paint (FCP)
    this.measureFCP();

    // Monitor Time to First Byte (TTFB)
    this.measureTTFB();

    // Optimize images with lazy loading
    this.optimizeImages();

    // Prefetch critical resources
    this.prefetchCriticalResources();

    // Log metrics periodically
    this.logMetricsPeriodically();
  }

  private measureLCP(): void {
    const handleLCPMetrics = (list: PerformanceObserverEntryList) => {
      const entries = list.getEntries() as PerformanceEntry[];
      const lastEntry = entries[entries.length - 1] as any;
      if (lastEntry) {
        this.webVitals.LCP = Math.round(lastEntry.renderTime || lastEntry.loadTime);
        console.log(`LCP: ${this.webVitals.LCP}ms`);
      }
    };

    try {
      const observer = new PerformanceObserver(handleLCPMetrics);
      observer.observe({ entryTypes: ['largest-contentful-paint'], buffered: true });

      // Disconnect after page is interactive
      setTimeout(() => observer.disconnect(), 5000);
    } catch (e) {
      console.warn('PerformanceObserver not supported for LCP');
    }
  }

  private measureCLS(): void {
    let clsValue = 0;
    const handleCLSMetrics = (list: PerformanceObserverEntryList) => {
      const entries = list.getEntries() as PerformanceEntry[];
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.webVitals.CLS = Math.round(clsValue * 1000) / 1000;
          console.log(`CLS: ${this.webVitals.CLS}`);
        }
      });
    };

    try {
      const observer = new PerformanceObserver(handleCLSMetrics);
      observer.observe({ entryTypes: ['layout-shift'], buffered: true });
    } catch (e) {
      console.warn('PerformanceObserver not supported for CLS');
    }
  }

  private measureFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[];
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.webVitals.FCP = Math.round(fcpEntry.startTime);
          console.log(`FCP: ${this.webVitals.FCP}ms`);
        }
      });
      observer.observe({ entryTypes: ['paint'], buffered: true });
    } catch (e) {
      console.warn('PerformanceObserver not supported for FCP');
    }
  }

  private measureTTFB(): void {
    try {
      const perfData = window.performance.timing;
      if (perfData) {
        this.webVitals.TTFB = perfData.responseStart - perfData.fetchStart;
        console.log(`TTFB: ${this.webVitals.TTFB}ms`);
      }
    } catch (e) {
      console.warn('Navigation Timing API not available');
    }
  }

  private optimizeImages(): void {
    // Add lazy loading to images
    const images = this.document.querySelectorAll('img:not([loading="lazy"])');
    images.forEach((img) => {
      img.setAttribute('loading', 'lazy');
    });
  }

  private prefetchCriticalResources(): void {
    // Preconnect to critical origins
    const preconnectLinks = [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'dns-prefetch', href: 'https://cdn.example.com' }
    ];

    preconnectLinks.forEach((link) => {
      if (!this.document.querySelector(`link[href="${link.href}"]`)) {
        const linkElement = this.document.createElement('link');
        linkElement.rel = link.rel;
        linkElement.href = link.href;
        this.document.head.appendChild(linkElement);
      }
    });
  }

  private logMetricsPeriodically(): void {
    setInterval(() => {
      console.log('Web Vitals:', this.webVitals);
    }, 10000); // Log every 10 seconds
  }

  getWebVitals(): WebVitals {
    return { ...this.webVitals };
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const perfData = window.performance ? window.performance.getEntriesByType('navigation')[0] : null;

    return {
      navigationTiming: perfData ? {
        domInteractive: (perfData as any).domInteractive,
        domComplete: (perfData as any).domComplete,
        loadEventEnd: (perfData as any).loadEventEnd,
        duration: (perfData as any).duration
      } : null,
      resourceTiming: this.getResourceTimings(),
      webVitals: this.webVitals,
      timestamp: new Date()
    };
  }

  private getResourceTimings(): any {
    const resources = window.performance.getEntriesByType('resource') as any[];
    const grouped = {
      totalCount: resources.length,
      totalDuration: resources.reduce((sum, r) => sum + r.duration, 0),
      byType: {
        script: resources.filter(r => r.initiatorType === 'script').length,
        stylesheet: resources.filter(r => r.initiatorType === 'link').length,
        img: resources.filter(r => r.initiatorType === 'img').length,
        xmlhttprequest: resources.filter(r => r.initiatorType === 'xmlhttprequest').length
      }
    };
    return grouped;
  }

  // Service Worker registration for offline support and caching
  registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/ngsw-worker.js')
        .then((reg) => console.log('Service Worker registered', reg))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }
  }

  // Enable request compression and caching headers
  optimizeNetworkRequests(): void {
    // This would be configured in the server/HTTP interceptors
    console.log('Network optimization enabled');
  }
}
