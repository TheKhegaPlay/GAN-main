import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface ImageOptimizationConfig {
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high';
  format?: 'webp' | 'avif' | 'jpg' | 'png';
}

export interface ImageMetrics {
  loadTime: number;
  fileSize: number;
  format: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageOptimizationService {
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  private http = inject(HttpClient);
  private imageMetrics = new Map<string, ImageMetrics>();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.optimizeExistingImages();
      this.enableLazyLoadingIntersectionObserver();
    }
  }

  /**
   * Optimize all existing images
   */
  private optimizeExistingImages(): void {
    const images = this.document.querySelectorAll('img');
    images.forEach(img => {
      this.optimizeImage(img);
    });
  }

  /**
   * Optimize individual image
   */
  private optimizeImage(img: HTMLImageElement): void {
    // Add lazy loading
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }

    // Add loading placeholder
    img.style.backgroundColor = '#f0f0f0';

    // Track image loading time
    const startTime = performance.now();

    img.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      this.recordImageMetrics(img.src, loadTime);
    });

    img.addEventListener('error', () => {
      console.warn(`Failed to load image: ${img.src}`);
    });
  }

  /**
   * Enable Intersection Observer for lazy loading
   */
  private enableLazyLoadingIntersectionObserver(): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;

            // Load image data-src if available
            if (img.dataset['src']) {
              img.src = img.dataset['src'];
              img.removeAttribute('data-src');
            }

            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px' // Start loading 50px before image enters viewport
      });

      // Observe all lazy-loading images
      const lazyImages = this.document.querySelectorAll('img[data-src]');
      lazyImages.forEach(img => imageObserver.observe(img));
    }
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(imagePath: string, sizes: number[] = [320, 640, 1200]): string {
    return sizes
      .map(size => `${imagePath}?w=${size} ${size}w`)
      .join(', ');
  }

  /**
   * Generate picture element for modern image format support
   */
  generatePictureElement(basePath: string, alt: string): HTMLPictureElement {
    const picture = this.document.createElement('picture');

    // AVIF support (best compression)
    const avifSource = this.document.createElement('source');
    avifSource.type = 'image/avif';
    avifSource.srcset = this.generateSrcSet(basePath.replace(/\.[^.]+$/, '.avif'));
    picture.appendChild(avifSource);

    // WebP support (good compression)
    const webpSource = this.document.createElement('source');
    webpSource.type = 'image/webp';
    webpSource.srcset = this.generateSrcSet(basePath.replace(/\.[^.]+$/, '.webp'));
    picture.appendChild(webpSource);

    // Fallback to original format
    const img = this.document.createElement('img');
    img.src = basePath;
    img.alt = alt;
    img.loading = 'lazy';
    img.srcset = this.generateSrcSet(basePath);
    picture.appendChild(img);

    return picture;
  }

  /**
   * Record image loading metrics
   */
  private recordImageMetrics(src: string, loadTime: number): void {
    this.imageMetrics.set(src, {
      loadTime,
      fileSize: 0, // Would need server-side tracking
      format: src.split('.').pop() || 'unknown'
    });
  }

  /**
   * Get image metrics
   */
  getImageMetrics(): Map<string, ImageMetrics> {
    return this.imageMetrics;
  }

  /**
   * Get average image load time
   */
  getAverageImageLoadTime(): number {
    if (this.imageMetrics.size === 0) return 0;

    const totalTime = Array.from(this.imageMetrics.values())
      .reduce((sum, metric) => sum + metric.loadTime, 0);

    return totalTime / this.imageMetrics.size;
  }

  /**
   * Compress image server-side (requires backend support)
   */
  compressImage(imageFile: File, config?: ImageOptimizationConfig): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = this.document.createElement('canvas');
          const width = config?.width || img.width;
          const height = config?.height || img.height;

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(blob => {
              if (blob) resolve(blob);
              else reject(new Error('Compression failed'));
            }, 'image/webp', 0.8);
          }
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = event.target?.result as string;
      };

      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(imageFile);
    });
  }
}
