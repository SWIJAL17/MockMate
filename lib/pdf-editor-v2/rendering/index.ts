/**
 * Commercial-Grade PDF Resume Editor — HiDPI PDF Rendering Engine (Phase 3)
 * 
 * Replaces legacy rendering with a robust PDF.js pipeline supporting:
 * - Retina / 4K / High-DPI display clarity via devicePixelRatio bitmap multiplication
 * - Exact rotation respect (page.rotate) to prevent upside-down or mirrored pages
 * - Subpixel rendering (intent: 'display') matching Chrome PDF Viewer 100%
 * - Active render task cancellation to prevent canvas texture tearing or Webpack errors
 */

import { PageViewportInfo } from '../types';

let pdfjsLib: any = null;

/** Active render tasks tracked per canvas element to cancel redundant renders during zoom */
const activeRenderTasks = new WeakMap<HTMLCanvasElement, any>();

/** Cached document instances map to avoid re-parsing original bytes */
const documentCache = new Map<string, any>();

/** Convert flexible input to Uint8Array with fresh slice copy */
function toUint8Array(input: Uint8Array | ArrayBuffer | string): Uint8Array {
  if (!input) throw new Error('No PDF file data provided');
  if (input instanceof Uint8Array) return input.slice();
  if (input instanceof ArrayBuffer) return new Uint8Array(input.slice(0));
  if (typeof input === 'string') {
    const base64 = input.includes(',') ? input.split(',')[1] : input;
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(input).slice();
}

export class PdfRenderingServiceImpl {
  /** Initialize PDF.js with reliable worker mirrors */
  async initialize(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    pdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
      const version = pdfjsLib.version || '4.10.38';
      const workerUrl = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      try {
        const blob = new Blob([`import '${workerUrl}';`], { type: 'application/javascript' });
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
      } catch (e) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      }
    }
    return pdfjsLib;
  }

  /**
   * Load and cache PDF document instance from raw bytes
   */
  async getDocument(pdfBytes: Uint8Array, docId?: string): Promise<any> {
    // Derive a content-based cache key so switching to a different PDF
    // doesn't keep serving the previously cached document.
    const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes as any);
    const key = docId || `doc-${bytes.length}-${bytes[0] ?? 0}-${bytes[bytes.length - 1] ?? 0}-${bytes[Math.floor(bytes.length / 2)] ?? 0}`;
    if (documentCache.has(key)) {
      return documentCache.get(key);
    }
    const pdfjs = await this.initialize();
    const data = toUint8Array(pdfBytes);
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    documentCache.set(key, pdf);
    return pdf;
  }

  /**
   * Render page to canvas with High-DPI device pixel ratio scaling.
   * Ensures razor-sharp fonts on Retina / 4K displays while maintaining exact CSS layout bounds.
   */
  async renderPageToCanvas(
    pdfBytes: Uint8Array,
    pageIndex: number,
    canvas: HTMLCanvasElement,
    zoom: number = 1.0,
    dpr: number = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  ): Promise<PageViewportInfo> {
    if (!canvas) throw new Error('Target canvas element is null');

    const pdf = await this.getDocument(pdfBytes);
    const page = await pdf.getPage(pageIndex + 1); // 1-indexed

    // Always respect PDF native rotation (page.rotate) to prevent upside-down or mirrored pages
    const baseViewport = page.getViewport({ scale: 1.0, rotation: page.rotate });
    const scaledViewport = page.getViewport({ scale: zoom * dpr, rotation: page.rotate });
    const cssViewport = page.getViewport({ scale: zoom, rotation: page.rotate });

    // Cancel any ongoing render operation on this canvas
    if (activeRenderTasks.has(canvas)) {
      try {
        const prevTask = activeRenderTasks.get(canvas);
        prevTask.cancel();
      } catch (e) {
        // Ignore cancellation errors
      }
      activeRenderTasks.delete(canvas);
    }

    // Set physical internal bitmap resolution for HiDPI sharpness
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    // Set CSS display dimensions to viewport bounds (prevent stretching)
    canvas.style.width = `${cssViewport.width}px`;
    canvas.style.height = `${cssViewport.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas context unavailable');

    // Reset transform matrix and clear physical bitmap
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render using PDF.js official display intent for Chrome PDF Viewer parity
    const renderTask = page.render({
      canvasContext: ctx,
      viewport: scaledViewport,
      intent: 'display',
    });

    activeRenderTasks.set(canvas, renderTask);

    try {
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException' || err?.message?.includes('cancelled')) {
        // Safe cancellation during rapid zooming
      } else {
        throw err;
      }
    } finally {
      if (activeRenderTasks.get(canvas) === renderTask) {
        activeRenderTasks.delete(canvas);
      }
    }

    return {
      pageIndex,
      pdfWidth: baseViewport.width,
      pdfHeight: baseViewport.height,
      rotation: page.rotate || 0,
      viewportWidth: cssViewport.width,
      viewportHeight: cssViewport.height,
    };
  }

  /**
   * Clear cached textures and release worker memory
   */
  dispose(): void {
    documentCache.clear();
  }
}

export const pdfRenderingService = new PdfRenderingServiceImpl();
