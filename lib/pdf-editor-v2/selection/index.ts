/**
 * Commercial-Grade PDF Resume Editor — Selection Engine (Phase 7)
 * 
 * Provides high-precision hit testing, drag-box multi-selection, combined bounding boxes,
 * 8-handle resizing geometry, and alignment snap guides at any zoom level.
 */

import { DocumentObject, BoundingBox, ResizeHandleType } from '../types';
import { coordinateEngine, ScreenRect } from '../layout';
import { GuideLine } from '@/components/mockmate/pdf-editor-v2/layers/GuideLayer';

export interface SelectionEngineService {
  /** Find object under mouse screen coordinates */
  hitTestObject(screenX: number, screenY: number, objects: DocumentObject[], pageHeight: number, zoom: number): DocumentObject | null;
  
  /** Find all objects intersecting with a drag selection box */
  getObjectsInScreenRect(selectionRect: ScreenRect, objects: DocumentObject[], pageHeight: number, zoom: number): string[];
  
  /** Compute combined bounding box for multiple selected objects in PDF user space */
  computeCombinedBoundingBox(objects: DocumentObject[]): BoundingBox | null;
  
  /** Calculate new bounding box after dragging an 8-point resize handle */
  calculateResizedBoundingBox(
    initialBBox: BoundingBox,
    handle: ResizeHandleType,
    deltaPdfX: number,
    deltaPdfY: number,
    aspectRatioLock?: boolean
  ): BoundingBox;

  /** Detect alignment snap guides against surrounding objects during drag or resize */
  detectAlignmentGuides(
    targetBBox: BoundingBox,
    otherObjects: DocumentObject[],
    pageHeight: number,
    zoom: number,
    thresholdPx?: number
  ): { snappedBBox: BoundingBox; guides: GuideLine[] };
}

export class SelectionEngineServiceImpl implements SelectionEngineService {
  hitTestObject(
    screenX: number,
    screenY: number,
    objects: DocumentObject[],
    pageHeight: number,
    zoom: number
  ): DocumentObject | null {
    if (!objects || objects.length === 0) return null;

    // Convert mouse screen coordinate to PDF user space point
    const { pdfX, pdfY } = coordinateEngine.screenToPdfPoint(screenX, screenY, pageHeight, zoom);

    // Search in reverse order (top-most rendered element first)
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      const [minX, minY, maxX, maxY] = obj.boundingBox;

      // Add a 2-point hit tolerance padding for ease of clicking thin text lines
      const pad = 2.0 / zoom;
      if (pdfX >= minX - pad && pdfX <= maxX + pad && pdfY >= minY - pad && pdfY <= maxY + pad) {
        return obj;
      }
    }
    return null;
  }

  getObjectsInScreenRect(
    selectionRect: ScreenRect,
    objects: DocumentObject[],
    pageHeight: number,
    zoom: number
  ): string[] {
    const selectedIds: string[] = [];
    const selLeft = selectionRect.left;
    const selTop = selectionRect.top;
    const selRight = selLeft + selectionRect.width;
    const selBottom = selTop + selectionRect.height;

    for (const obj of objects) {
      const rect = coordinateEngine.pdfToScreenRect(obj.boundingBox, pageHeight, zoom);
      const objRight = rect.left + rect.width;
      const objBottom = rect.top + rect.height;

      // Check intersection between selection drag box and object bounding box
      const intersects = !(objRight < selLeft || rect.left > selRight || objBottom < selTop || rect.top > selBottom);
      if (intersects) {
        selectedIds.push(obj.id);
      }
    }

    return selectedIds;
  }

  computeCombinedBoundingBox(objects: DocumentObject[]): BoundingBox | null {
    if (!objects || objects.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const obj of objects) {
      if (obj.boundingBox[0] < minX) minX = obj.boundingBox[0];
      if (obj.boundingBox[1] < minY) minY = obj.boundingBox[1];
      if (obj.boundingBox[2] > maxX) maxX = obj.boundingBox[2];
      if (obj.boundingBox[3] > maxY) maxY = obj.boundingBox[3];
    }

    return [minX, minY, maxX, maxY];
  }

  calculateResizedBoundingBox(
    initialBBox: BoundingBox,
    handle: ResizeHandleType,
    deltaPdfX: number,
    deltaPdfY: number,
    aspectRatioLock = false
  ): BoundingBox {
    let [minX, minY, maxX, maxY] = [...initialBBox];
    const minWidth = 10;
    const minHeight = 8;

    switch (handle) {
      case 'nw':
        minX = Math.min(maxX - minWidth, minX + deltaPdfX);
        maxY = Math.max(minY + minHeight, maxY + deltaPdfY);
        break;
      case 'ne':
        maxX = Math.max(minX + minWidth, maxX + deltaPdfX);
        maxY = Math.max(minY + minHeight, maxY + deltaPdfY);
        break;
      case 'sw':
        minX = Math.min(maxX - minWidth, minX + deltaPdfX);
        minY = Math.min(maxY - minHeight, minY + deltaPdfY);
        break;
      case 'se':
        maxX = Math.max(minX + minWidth, maxX + deltaPdfX);
        minY = Math.min(maxY - minHeight, minY + deltaPdfY);
        break;
      case 'n':
        maxY = Math.max(minY + minHeight, maxY + deltaPdfY);
        break;
      case 's':
        minY = Math.min(maxY - minHeight, minY + deltaPdfY);
        break;
      case 'w':
        minX = Math.min(maxX - minWidth, minX + deltaPdfX);
        break;
      case 'e':
        maxX = Math.max(minX + minWidth, maxX + deltaPdfX);
        break;
    }

    return [
      Math.round(minX * 100) / 100,
      Math.round(minY * 100) / 100,
      Math.round(maxX * 100) / 100,
      Math.round(maxY * 100) / 100,
    ];
  }

  detectAlignmentGuides(
    targetBBox: BoundingBox,
    otherObjects: DocumentObject[],
    pageHeight: number,
    zoom: number,
    thresholdPx = 4
  ): { snappedBBox: BoundingBox; guides: GuideLine[] } {
    const thresholdPdf = thresholdPx / zoom;
    let [minX, minY, maxX, maxY] = [...targetBBox];
    const width = maxX - minX;
    const height = maxY - minY;

    const targetCenterX = minX + width / 2;
    const targetCenterY = minY + height / 2;

    const guides: GuideLine[] = [];
    let snappedX = false;
    let snappedY = false;

    for (const obj of otherObjects) {
      const [oMinX, oMinY, oMaxX, oMaxY] = obj.boundingBox;
      const oCenterX = oMinX + (oMaxX - oMinX) / 2;
      const oCenterY = oMinY + (oMaxY - oMinY) / 2;

      // Vertical guides (snapping X coordinates)
      if (!snappedX) {
        if (Math.abs(minX - oMinX) <= thresholdPdf) {
          minX = oMinX; maxX = minX + width; snappedX = true;
          const screenRect = coordinateEngine.pdfToScreenRect([oMinX, oMinY, oMaxX, oMaxY], pageHeight, zoom);
          guides.push({ type: 'vertical', position: screenRect.left });
        } else if (Math.abs(maxX - oMaxX) <= thresholdPdf) {
          maxX = oMaxX; minX = maxX - width; snappedX = true;
          const screenRect = coordinateEngine.pdfToScreenRect([oMinX, oMinY, oMaxX, oMaxY], pageHeight, zoom);
          guides.push({ type: 'vertical', position: screenRect.left + screenRect.width });
        } else if (Math.abs(targetCenterX - oCenterX) <= thresholdPdf) {
          const newCenter = oCenterX;
          minX = newCenter - width / 2; maxX = newCenter + width / 2; snappedX = true;
          const screenRect = coordinateEngine.pdfToScreenRect([oMinX, oMinY, oMaxX, oMaxY], pageHeight, zoom);
          guides.push({ type: 'vertical', position: screenRect.left + screenRect.width / 2 });
        }
      }

      // Horizontal guides (snapping Y coordinates)
      if (!snappedY) {
        if (Math.abs(minY - oMinY) <= thresholdPdf) {
          minY = oMinY; maxY = minY + height; snappedY = true;
          const screenRect = coordinateEngine.pdfToScreenRect([oMinX, oMinY, oMaxX, oMaxY], pageHeight, zoom);
          guides.push({ type: 'horizontal', position: screenRect.top + screenRect.height });
        } else if (Math.abs(maxY - oMaxY) <= thresholdPdf) {
          maxY = oMaxY; minY = maxY - height; snappedY = true;
          const screenRect = coordinateEngine.pdfToScreenRect([oMinX, oMinY, oMaxX, oMaxY], pageHeight, zoom);
          guides.push({ type: 'horizontal', position: screenRect.top });
        } else if (Math.abs(targetCenterY - oCenterY) <= thresholdPdf) {
          const newCenter = oCenterY;
          minY = newCenter - height / 2; maxY = newCenter + height / 2; snappedY = true;
          const screenRect = coordinateEngine.pdfToScreenRect([oMinX, oMinY, oMaxX, oMaxY], pageHeight, zoom);
          guides.push({ type: 'horizontal', position: screenRect.top + screenRect.height / 2 });
        }
      }

      if (snappedX && snappedY) break;
    }

    return {
      snappedBBox: [minX, minY, maxX, maxY],
      guides,
    };
  }
}

export const selectionEngine = new SelectionEngineServiceImpl();
