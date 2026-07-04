/**
 * Commercial-Grade PDF Resume Editor — Custom Cursor Engine (Phase 8)
 * 
 * Replaces browser native text selection and contentEditable quirks with an autonomous,
 * deterministic subpixel caret positioning and keyboard navigation engine.
 */

import { DocumentObject, GlyphMetric } from '../types';

export interface CaretPosition {
  index: number;
  offsetX: number; // Subpixel offset from object left edge in PDF user space
}

export interface SelectionRange {
  startIndex: number;
  endIndex: number;
}

export interface HighlightRect {
  left: number;  // Relative to object left in PDF user space
  top: number;   // Relative to object top
  width: number; // Width of selected characters
  height: number;// Height of line
}

export interface CursorEngineService {
  /** Calculate exact subpixel X offset for drawing the caret at a specific character index */
  getCaretPosition(obj: DocumentObject, index: number): CaretPosition;
  
  /** Find character index closest to a relative mouse X coordinate (e.g. on click) */
  getCaretIndexFromPoint(obj: DocumentObject, relativePdfX: number): number;
  
  /** Calculate new character index after keyboard navigation (arrows, Home, End, Ctrl+arrows) */
  navigateCaret(
    obj: DocumentObject,
    currentIndex: number,
    key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End' | 'ArrowUp' | 'ArrowDown',
    ctrlKey?: boolean
  ): number;

  /** Compute subpixel geometry rectangles for highlighting selected character ranges */
  getSelectionHighlightRects(obj: DocumentObject, range: SelectionRange): HighlightRect[];

  /** Find word boundary indices around a specific character index (for double-click) */
  findWordBoundary(text: string, index: number): SelectionRange;

  /** Find paragraph/line boundary indices around a specific character index (for triple-click) */
  findParagraphBoundary(text: string, index: number): SelectionRange;
}

export class CursorEngineServiceImpl implements CursorEngineService {
  getCaretPosition(obj: DocumentObject, index: number): CaretPosition {
    const safeIndex = Math.max(0, Math.min(index, obj.text.length));
    let offsetX = 0;

    if (obj.glyphWidths && obj.glyphWidths.length > 0) {
      const bound = Math.min(safeIndex, obj.glyphWidths.length);
      for (let i = 0; i < bound; i++) {
        offsetX += obj.glyphWidths[i];
      }
    } else if (obj.glyphMetrics && obj.glyphMetrics.length > 0) {
      const bound = Math.min(safeIndex, obj.glyphMetrics.length);
      for (let i = 0; i < bound; i++) {
        offsetX += obj.glyphMetrics[i].advance || obj.glyphMetrics[i].width;
      }
    } else {
      // Fallback approximation if metrics array is missing
      const totalWidth = obj.boundingBox[2] - obj.boundingBox[0];
      const avgWidth = totalWidth / Math.max(1, obj.text.length);
      offsetX = safeIndex * avgWidth;
    }

    return {
      index: safeIndex,
      offsetX: Math.round(offsetX * 100) / 100,
    };
  }

  getCaretIndexFromPoint(obj: DocumentObject, relativePdfX: number): number {
    if (relativePdfX <= 0) return 0;
    const totalWidth = obj.boundingBox[2] - obj.boundingBox[0];
    if (relativePdfX >= totalWidth) return obj.text.length;

    if (obj.glyphWidths && obj.glyphWidths.length > 0) {
      let currentX = 0;
      for (let i = 0; i < obj.glyphWidths.length; i++) {
        const charWidth = obj.glyphWidths[i];
        const midPoint = currentX + charWidth / 2;
        if (relativePdfX < midPoint) {
          return i;
        }
        currentX += charWidth;
      }
      return obj.text.length;
    } else if (obj.glyphMetrics && obj.glyphMetrics.length > 0) {
      let currentX = 0;
      for (let i = 0; i < obj.glyphMetrics.length; i++) {
        const charWidth = obj.glyphMetrics[i].advance || obj.glyphMetrics[i].width;
        const midPoint = currentX + charWidth / 2;
        if (relativePdfX < midPoint) {
          return i;
        }
        currentX += charWidth;
      }
      return obj.text.length;
    }

    // Fallback linear calculation
    const ratio = relativePdfX / totalWidth;
    return Math.round(ratio * obj.text.length);
  }

  navigateCaret(
    obj: DocumentObject,
    currentIndex: number,
    key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End' | 'ArrowUp' | 'ArrowDown',
    ctrlKey = false
  ): number {
    const len = obj.text.length;
    let nextIndex = currentIndex;

    switch (key) {
      case 'Home':
        return 0;
      case 'End':
        return len;
      case 'ArrowLeft':
        if (ctrlKey) {
          // Jump to beginning of previous word
          const wordRange = this.findWordBoundary(obj.text, Math.max(0, currentIndex - 1));
          nextIndex = wordRange.startIndex;
        } else {
          nextIndex = Math.max(0, currentIndex - 1);
        }
        break;
      case 'ArrowRight':
        if (ctrlKey) {
          // Jump to end of next word
          const wordRange = this.findWordBoundary(obj.text, Math.min(len, currentIndex + 1));
          nextIndex = wordRange.endIndex;
        } else {
          nextIndex = Math.min(len, currentIndex + 1);
        }
        break;
      case 'ArrowUp':
        // For single-line or paragraph blocks, ArrowUp moves to start of line
        nextIndex = 0;
        break;
      case 'ArrowDown':
        // For single-line or paragraph blocks, ArrowDown moves to end of line
        nextIndex = len;
        break;
    }

    return nextIndex;
  }

  getSelectionHighlightRects(obj: DocumentObject, range: SelectionRange): HighlightRect[] {
    const start = Math.max(0, Math.min(range.startIndex, range.endIndex));
    const end = Math.min(obj.text.length, Math.max(range.startIndex, range.endIndex));
    if (start === end) return [];

    const startPos = this.getCaretPosition(obj, start);
    const endPos = this.getCaretPosition(obj, end);
    const height = obj.boundingBox[3] - obj.boundingBox[1];

    return [
      {
        left: startPos.offsetX,
        top: 0,
        width: Math.max(1, endPos.offsetX - startPos.offsetX),
        height,
      },
    ];
  }

  findWordBoundary(text: string, index: number): SelectionRange {
    if (!text || text.length === 0) return { startIndex: 0, endIndex: 0 };
    const safeIndex = Math.max(0, Math.min(index, text.length - 1));

    // Word character regex: alphanumeric and underscores
    const isWordChar = (char: string) => /\w/.test(char);

    let start = safeIndex;
    while (start > 0 && isWordChar(text[start - 1])) {
      start--;
    }

    let end = safeIndex;
    while (end < text.length && isWordChar(text[end])) {
      end++;
    }

    return { startIndex: start, endIndex: end };
  }

  findParagraphBoundary(text: string, index: number): SelectionRange {
    if (!text || text.length === 0) return { startIndex: 0, endIndex: 0 };
    const safeIndex = Math.max(0, Math.min(index, text.length - 1));

    let start = text.lastIndexOf('\n', safeIndex - 1);
    start = start === -1 ? 0 : start + 1;

    let end = text.indexOf('\n', safeIndex);
    end = end === -1 ? text.length : end;

    return { startIndex: start, endIndex: end };
  }
}

export const cursorEngine = new CursorEngineServiceImpl();
