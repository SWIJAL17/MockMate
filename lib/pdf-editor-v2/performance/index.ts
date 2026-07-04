/**
 * Commercial-Grade PDF Resume Editor — Performance Engine (Phase 12)
 * 
 * Guarantees zero UI lag on 100+ page documents by implementing:
 * - requestAnimationFrame render queuing to coalesce rapid scroll/zoom repaints
 * - LRU texture and document object caching
 * - Virtualized page rendering (rendering only visible viewport + 1-page buffer)
 * - Main-thread yielding for heavy parsing chunks
 */

import { DocumentObject, PageViewportInfo } from '../types';

export interface VirtualViewport {
  scrollTop: number;
  containerHeight: number;
  zoom: number;
  pages: PageViewportInfo[];
}

export interface VisibleRange {
  startPageIndex: number;
  endPageIndex: number;
  visibleIndices: Set<number>;
}

/** Simple LRU Cache for managing high-resolution canvas textures and document models */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private readonly maxEntries: number = 20) {}

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key)!;
    // Refresh insertion order
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export interface PerformanceEngineService {
  /** Schedule a canvas or UI repaint inside a requestAnimationFrame loop */
  scheduleRender(key: string, renderFn: () => void | Promise<void>): void;

  /** Cancel a pending scheduled render */
  cancelScheduledRender(key: string): void;

  /** Cache parsed DocumentObject arrays per page */
  cachePageObjects(pageIndex: number, objects: DocumentObject[]): void;

  /** Retrieve cached DocumentObject array for a page */
  getCachedPageObjects(pageIndex: number): DocumentObject[] | undefined;

  /** Cache font width metrics tables */
  cacheFontMetrics(fontName: string, char: string, width: number): void;

  /** Retrieve cached font width metric */
  getCachedFontMetric(fontName: string, char: string): number | undefined;

  /** Cache rendered bitmap canvases per page/zoom */
  cacheCanvasBitmap(key: string, bitmap: any): void;

  /** Retrieve cached bitmap canvas */
  getCachedCanvasBitmap(key: string): any | undefined;

  /**
   * Calculate which pages are visible inside the current scroll viewport.
   * On 100+ page documents, only visible indices (+/- 1 buffer) should render bitmap canvases.
   */
  getVisiblePageRange(viewport: VirtualViewport, bufferPages?: number): VisibleRange;

  /** Check if a specific page should be rendered or left as a lightweight skeleton */
  shouldRenderPage(pageIndex: number, range: VisibleRange): boolean;

  /** Yield main thread during heavy processing loops to prevent UI freeze */
  yieldMainThread(): Promise<void>;

  /** Clear all performance caches */
  clearCaches(): void;
}

export class PerformanceEngineServiceImpl implements PerformanceEngineService {
  private renderQueue = new Map<string, number>();
  private pageObjectCache = new LRUCache<number, DocumentObject[]>(30);
  private fontMetricCache = new LRUCache<string, number>(1000);
  private canvasBitmapCache = new LRUCache<string, any>(15);

  scheduleRender(key: string, renderFn: () => void | Promise<void>): void {
    if (this.renderQueue.has(key)) {
      cancelAnimationFrame(this.renderQueue.get(key)!);
    }

    const rafId = requestAnimationFrame(async () => {
      this.renderQueue.delete(key);
      try {
        await renderFn();
      } catch (err) {
        console.warn(`[PerformanceEngine] Scheduled render '${key}' failed:`, err);
      }
    });

    this.renderQueue.set(key, rafId);
  }

  cancelScheduledRender(key: string): void {
    if (this.renderQueue.has(key)) {
      cancelAnimationFrame(this.renderQueue.get(key)!);
      this.renderQueue.delete(key);
    }
  }

  cachePageObjects(pageIndex: number, objects: DocumentObject[]): void {
    this.pageObjectCache.set(pageIndex, objects);
  }

  getCachedPageObjects(pageIndex: number): DocumentObject[] | undefined {
    return this.pageObjectCache.get(pageIndex);
  }

  cacheFontMetrics(fontName: string, char: string, width: number): void {
    const key = `${fontName}_${char}`;
    this.fontMetricCache.set(key, width);
  }

  getCachedFontMetric(fontName: string, char: string): number | undefined {
    const key = `${fontName}_${char}`;
    return this.fontMetricCache.get(key);
  }

  cacheCanvasBitmap(key: string, bitmap: any): void {
    this.canvasBitmapCache.set(key, bitmap);
  }

  getCachedCanvasBitmap(key: string): any | undefined {
    return this.canvasBitmapCache.get(key);
  }

  getVisiblePageRange(viewport: VirtualViewport, bufferPages = 1): VisibleRange {
    const { scrollTop, containerHeight, zoom, pages } = viewport;
    const visibleIndices = new Set<number>();

    if (!pages || pages.length === 0) {
      return { startPageIndex: 0, endPageIndex: 0, visibleIndices };
    }

    const scrollBottom = scrollTop + containerHeight;
    let currentY = 0;
    let startPageIndex = 0;
    let endPageIndex = 0;
    let foundStart = false;

    for (let i = 0; i < pages.length; i++) {
      const pageHeightPx = (pages[i].pdfHeight || 792) * (zoom || 1.0);
      const pageTop = currentY;
      const pageBottom = currentY + pageHeightPx;

      // Check if page intersects scroll viewport
      const isVisible = !(pageBottom < scrollTop || pageTop > scrollBottom);
      if (isVisible) {
        if (!foundStart) {
          startPageIndex = i;
          foundStart = true;
        }
        endPageIndex = i;
        visibleIndices.add(i);
      }

      currentY = pageBottom + 24; // Account for 24px gap between pages
    }

    // Add buffer pages above and below
    const safeStart = Math.max(0, startPageIndex - bufferPages);
    const safeEnd = Math.min(pages.length - 1, endPageIndex + bufferPages);

    for (let i = safeStart; i <= safeEnd; i++) {
      visibleIndices.add(i);
    }

    return {
      startPageIndex: safeStart,
      endPageIndex: safeEnd,
      visibleIndices,
    };
  }

  shouldRenderPage(pageIndex: number, range: VisibleRange): boolean {
    return range.visibleIndices.has(pageIndex);
  }

  async yieldMainThread(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  clearCaches(): void {
    this.pageObjectCache.clear();
    this.fontMetricCache.clear();
    this.canvasBitmapCache.clear();
  }
}

export const performanceEngine = new PerformanceEngineServiceImpl();
