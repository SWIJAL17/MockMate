/**
 * Commercial-Grade PDF Resume Editor — Dedicated Coordinate Engine (Phase 5)
 * 
 * Centralizes all coordinate transformations, bounding box mappings, zoom math,
 * scroll offsets, and DPR calculations. No React component calculates coordinates directly.
 */

import { BoundingBox, TransformMatrix } from '../types';

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PdfPoint {
  pdfX: number;
  pdfY: number;
}

export class CoordinateEngineServiceImpl {
  /**
   * Convert PDF user-space bounding box [minX, minY, maxX, maxY] (bottom-left origin)
   * into rendered Viewport CSS rectangle (top-left origin).
   */
  pdfToScreenRect(bbox: BoundingBox, pdfHeight: number, zoom: number): ScreenRect {
    const [minX, minY, maxX, maxY] = bbox;
    const width = maxX - minX;
    const height = maxY - minY;

    return {
      left: Math.round(minX * zoom * 100) / 100,
      top: Math.round((pdfHeight - maxY) * zoom * 100) / 100,
      width: Math.round(width * zoom * 100) / 100,
      height: Math.round(height * zoom * 100) / 100,
    };
  }

  /**
   * Convert screen DOM point (e.g. mouse click relative to page container top-left)
   * into native PDF user-space point (bottom-left origin).
   */
  screenToPdfPoint(screenX: number, screenY: number, pdfHeight: number, zoom: number): PdfPoint {
    const safeZoom = zoom || 1.0;
    return {
      pdfX: Math.round((screenX / safeZoom) * 100) / 100,
      pdfY: Math.round((pdfHeight - (screenY / safeZoom)) * 100) / 100,
    };
  }

  /**
   * Convert absolute window client coordinates (e.g. MouseEvent.clientX / clientY)
   * into page-relative CSS viewport coordinates, accounting for container scrolling.
   */
  clientToPagePoint(clientX: number, clientY: number, pageContainerEl: HTMLElement): { pageX: number; pageY: number } {
    if (!pageContainerEl) return { pageX: 0, pageY: 0 };
    const rect = pageContainerEl.getBoundingClientRect();
    return {
      pageX: clientX - rect.left,
      pageY: clientY - rect.top,
    };
  }

  /**
   * Calculate horizontal scale ratio (scaleX) to align CSS text width with PDF vector kerning.
   * Prevents text drift over long lines when web fallback fonts differ in glyph widths.
   */
  calculateTextScaleX(pdfWidth: number, browserTextWidth: number, zoom: number = 1.0): number {
    if (!browserTextWidth || browserTextWidth <= 0) return 1.0;
    const targetWidth = pdfWidth * zoom;
    const scaleX = targetWidth / browserTextWidth;
    // Bound scaleX between 0.5 and 2.0 to avoid extreme visual distortion
    return Math.round(Math.max(0.5, Math.min(2.0, scaleX)) * 1000) / 1000;
  }

  /**
   * Convert CSS layout dimensions into physical High-DPI bitmap pixels using devicePixelRatio.
   */
  toPhysicalBitmapPixels(cssSize: number, dpr: number = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1): number {
    return Math.round(cssSize * dpr);
  }

  /**
   * Convert physical High-DPI bitmap pixels back to CSS layout dimensions.
   */
  toCssLayoutPixels(bitmapPixels: number, dpr: number = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1): number {
    return Math.round((bitmapPixels / dpr) * 100) / 100;
  }

  /**
   * Convert PDF Space bounding box [minX, minY, maxX, maxY] to Viewport Space CSS rectangle.
   */
  pdfToViewportRect(bbox: BoundingBox, pageHeight: number, zoom: number, rotation = 0): ScreenRect {
    return this.pdfToScreenRect(bbox, pageHeight, zoom);
  }

  /**
   * Convert Viewport Space CSS rectangle back to PDF Space bounding box [minX, minY, maxX, maxY].
   */
  viewportToPdfRect(rect: ScreenRect, pageHeight: number, zoom: number, rotation = 0): BoundingBox {
    const safeZoom = zoom || 1.0;
    const minX = rect.left / safeZoom;
    const maxY = pageHeight - (rect.top / safeZoom);
    const maxX = minX + (rect.width / safeZoom);
    const minY = maxY - (rect.height / safeZoom);
    return [
      Math.round(minX * 100) / 100,
      Math.round(minY * 100) / 100,
      Math.round(maxX * 100) / 100,
      Math.round(maxY * 100) / 100,
    ];
  }

  /**
   * Convert Viewport coordinates to Screen DOM coordinates accounting for scrolling container offset.
   */
  viewportToScreenPoint(viewportX: number, viewportY: number, scrollLeft = 0, scrollTop = 0): { screenX: number; screenY: number } {
    return {
      screenX: Math.round((viewportX - scrollLeft) * 100) / 100,
      screenY: Math.round((viewportY - scrollTop) * 100) / 100,
    };
  }

  /**
   * Convert Screen DOM coordinates to Viewport coordinates accounting for scrolling container offset.
   */
  screenToViewportPoint(screenX: number, screenY: number, scrollLeft = 0, scrollTop = 0): { viewportX: number; viewportY: number } {
    return {
      viewportX: Math.round((screenX + scrollLeft) * 100) / 100,
      viewportY: Math.round((screenY + scrollTop) * 100) / 100,
    };
  }

  /**
   * Convert Viewport CSS coordinates to physical bitmap Canvas Space coordinates using DPR.
   */
  viewportToCanvasPoint(viewportX: number, viewportY: number, dpr: number = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1): { canvasX: number; canvasY: number } {
    return {
      canvasX: Math.round(viewportX * dpr),
      canvasY: Math.round(viewportY * dpr),
    };
  }

  /**
   * Convert physical bitmap Canvas Space coordinates back to Viewport CSS coordinates using DPR.
   */
  canvasToViewportPoint(canvasX: number, canvasY: number, dpr: number = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1): { viewportX: number; viewportY: number } {
    return {
      viewportX: Math.round((canvasX / dpr) * 100) / 100,
      viewportY: Math.round((canvasY / dpr) * 100) / 100,
    };
  }
}

export const coordinateEngine = new CoordinateEngineServiceImpl();
