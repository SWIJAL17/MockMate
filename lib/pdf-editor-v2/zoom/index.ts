/**
 * Commercial-Grade PDF Resume Editor — Zoom Engine (Phase 11)
 * 
 * Manages precise preset zoom steps (25% to 800%), Fit-to-Width / Fit-to-Page ratios,
 * and scroll-anchor focal point adjustments. Re-renders vector graphics via PDF.js
 * without ever resorting to blurry CSS transform scaling.
 */

import { ZoomLevel, FitMode } from '../types';
import { usePdfEditorStore } from '../store';

export const PRESET_ZOOM_LEVELS: number[] = [
  0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0, 8.0
];

export interface ZoomEngineService {
  /** Get next preset zoom level greater than current */
  getNextZoomIn(current: number): number;
  
  /** Get next preset zoom level less than current */
  getNextZoomOut(current: number): number;
  
  /** Calculate zoom ratio to fit page width inside container (with margin padding) */
  calculateFitWidthZoom(pdfWidth: number, containerWidth: number, paddingPx?: number): number;
  
  /** Calculate zoom ratio to fit entire page inside container height */
  calculateFitPageZoom(pdfWidth: number, pdfHeight: number, containerWidth: number, containerHeight: number, paddingPx?: number): number;
  
  /** Apply zoom step and update central store, triggering fresh vector canvas re-render */
  applyZoom(targetZoom: number | FitMode, containerEl?: HTMLElement): void;

  /** Calculate new scroll offsets to keep screen focal point anchored during zoom */
  calculateZoomScrollOffset(
    oldZoom: number,
    newZoom: number,
    focalScreenX: number,
    focalScreenY: number,
    oldScrollLeft: number,
    oldScrollTop: number
  ): { scrollLeft: number; scrollTop: number };
}

export class ZoomEngineServiceImpl implements ZoomEngineService {
  getNextZoomIn(current: number): number {
    const safe = typeof current === 'number' && !isNaN(current) ? current : 1.0;
    for (const preset of PRESET_ZOOM_LEVELS) {
      if (preset > safe + 0.01) {
        return preset;
      }
    }
    return PRESET_ZOOM_LEVELS[PRESET_ZOOM_LEVELS.length - 1]; // Max 8.0 (800%)
  }

  getNextZoomOut(current: number): number {
    const safe = typeof current === 'number' && !isNaN(current) ? current : 1.0;
    for (let i = PRESET_ZOOM_LEVELS.length - 1; i >= 0; i--) {
      const preset = PRESET_ZOOM_LEVELS[i];
      if (preset < safe - 0.01) {
        return preset;
      }
    }
    return PRESET_ZOOM_LEVELS[0]; // Min 0.25 (25%)
  }

  calculateFitWidthZoom(pdfWidth: number, containerWidth: number, paddingPx = 48): number {
    if (!pdfWidth || pdfWidth <= 0 || !containerWidth || containerWidth <= 0) return 1.0;
    const availableWidth = Math.max(100, containerWidth - paddingPx);
    const ratio = availableWidth / pdfWidth;
    return Math.round(Math.max(0.25, Math.min(8.0, ratio)) * 100) / 100;
  }

  calculateFitPageZoom(
    pdfWidth: number,
    pdfHeight: number,
    containerWidth: number,
    containerHeight: number,
    paddingPx = 48
  ): number {
    if (!pdfWidth || !pdfHeight || !containerWidth || !containerHeight) return 1.0;
    const availableWidth = Math.max(100, containerWidth - paddingPx);
    const availableHeight = Math.max(100, containerHeight - paddingPx);

    const widthRatio = availableWidth / pdfWidth;
    const heightRatio = availableHeight / pdfHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    return Math.round(Math.max(0.25, Math.min(8.0, ratio)) * 100) / 100;
  }

  applyZoom(targetZoom: number | FitMode, containerEl?: HTMLElement): void {
    const store = usePdfEditorStore.getState();
    if (!store) return;

    let newZoom = 1.0;
    if (typeof targetZoom === 'string') {
      store.setFitMode(targetZoom);
      const currentPageInfo = store.pages[store.currentPage] || store.pages[0];
      const pdfW = currentPageInfo ? currentPageInfo.pdfWidth : 612;
      const pdfH = currentPageInfo ? currentPageInfo.pdfHeight : 792;
      const contW = containerEl ? containerEl.clientWidth : (typeof window !== 'undefined' ? window.innerWidth - 300 : 800);
      const contH = containerEl ? containerEl.clientHeight : (typeof window !== 'undefined' ? window.innerHeight - 100 : 900);

      if (targetZoom === 'width') {
        newZoom = this.calculateFitWidthZoom(pdfW, contW);
      } else if (targetZoom === 'page') {
        newZoom = this.calculateFitPageZoom(pdfW, pdfH, contW, contH);
      }
    } else {
      store.setFitMode('custom');
      newZoom = Math.max(0.25, Math.min(8.0, targetZoom));
    }

    store.setZoom(newZoom);
  }

  calculateZoomScrollOffset(
    oldZoom: number,
    newZoom: number,
    focalScreenX: number,
    focalScreenY: number,
    oldScrollLeft: number,
    oldScrollTop: number
  ): { scrollLeft: number; scrollTop: number } {
    if (oldZoom <= 0 || newZoom <= 0 || oldZoom === newZoom) {
      return { scrollLeft: oldScrollLeft, scrollTop: oldScrollTop };
    }

    const zoomRatio = newZoom / oldZoom;
    const newScrollLeft = (oldScrollLeft + focalScreenX) * zoomRatio - focalScreenX;
    const newScrollTop = (oldScrollTop + focalScreenY) * zoomRatio - focalScreenY;

    return {
      scrollLeft: Math.max(0, Math.round(newScrollLeft)),
      scrollTop: Math.max(0, Math.round(newScrollTop)),
    };
  }
}

export const zoomEngine = new ZoomEngineServiceImpl();
