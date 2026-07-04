/**
 * Commercial-Grade PDF Resume Editor — Inline Editing Engine (Phase 9)
 * 
 * Manages atomic text mutations, clipboard operations, and typography formatting.
 * Modifies only the Document Model; never mutates original PDF ArrayBuffers.
 */

import { DocumentObject, TextAlignment, GlyphMetric } from '../types';
import { typographyEngine } from '../typography';

export interface FormattingOptions {
  font?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  fillColor?: string;
  alignment?: TextAlignment;
  letterSpacing?: number;
  wordSpacing?: number;
  lineHeight?: number;
}

export interface EditResult {
  updatedObject: DocumentObject;
  newCaretIndex: number;
}

/** Recompute character glyph metrics after text insertion or deletion */
function recomputeGlyphMetrics(
  text: string,
  startX: number,
  totalWidth: number,
  fontSize = 12,
  letterSpacing = 0,
  wordSpacing = 0,
  horizontalScaling = 100
): GlyphMetric[] {
  return typographyEngine.computeGlyphMetrics(
    text,
    startX,
    fontSize,
    totalWidth,
    letterSpacing,
    wordSpacing,
    horizontalScaling
  );
}

export interface EditingEngineService {
  /** Update inline text content for a specific object */
  updateText(obj: DocumentObject, newText: string): DocumentObject;
  
  /** Insert character(s) at specific caret position */
  insertCharAt(obj: DocumentObject, caretIndex: number, char: string): EditResult;
  
  /** Delete character(s) at specific caret position (backspace vs delete) */
  deleteCharAt(obj: DocumentObject, caretIndex: number, direction: 'backspace' | 'delete', selectionRange?: { start: number; end: number }): EditResult;
  
  /** Replace entire text string (e.g. from AI Rewrite or Paste) */
  replaceText(obj: DocumentObject, newText: string): DocumentObject;
  
  /** Apply typography formatting options to one or more document objects */
  applyFormatting(objects: DocumentObject[], format: FormattingOptions): DocumentObject[];
}

export class EditingEngineServiceImpl implements EditingEngineService {
  updateText(obj: DocumentObject, newText: string): DocumentObject {
    return this.replaceText(obj, newText);
  }

  insertCharAt(obj: DocumentObject, caretIndex: number, char: string): EditResult {
    const safeIndex = Math.max(0, Math.min(caretIndex, obj.text.length));
    const before = obj.text.slice(0, safeIndex);
    const after = obj.text.slice(safeIndex);
    const newText = before + char + after;

    const totalWidth = obj.boundingBox[2] - obj.boundingBox[0];
    const newMetrics = recomputeGlyphMetrics(
      newText,
      obj.boundingBox[0],
      totalWidth,
      obj.fontSize,
      obj.letterSpacing,
      obj.wordSpacing,
      obj.horizontalScaling
    );
    const isModified = newText !== obj.originalText;

    const updatedObject: DocumentObject = {
      ...obj,
      text: newText,
      editedText: newText,
      glyphWidths: newMetrics.map((g) => g.width),
      glyphMetrics: newMetrics,
      modificationState: isModified ? 'modified' : 'unmodified',
    };

    return {
      updatedObject,
      newCaretIndex: safeIndex + char.length,
    };
  }

  deleteCharAt(
    obj: DocumentObject,
    caretIndex: number,
    direction: 'backspace' | 'delete',
    selectionRange?: { start: number; end: number }
  ): EditResult {
    let newText = obj.text;
    let newCaretIndex = caretIndex;

    if (selectionRange && selectionRange.start !== selectionRange.end) {
      const min = Math.min(selectionRange.start, selectionRange.end);
      const max = Math.max(selectionRange.start, selectionRange.end);
      newText = obj.text.slice(0, min) + obj.text.slice(max);
      newCaretIndex = min;
    } else {
      if (direction === 'backspace' && caretIndex > 0) {
        newText = obj.text.slice(0, caretIndex - 1) + obj.text.slice(caretIndex);
        newCaretIndex = caretIndex - 1;
      } else if (direction === 'delete' && caretIndex < obj.text.length) {
        newText = obj.text.slice(0, caretIndex) + obj.text.slice(caretIndex + 1);
        newCaretIndex = caretIndex;
      }
    }

    const totalWidth = obj.boundingBox[2] - obj.boundingBox[0];
    const newMetrics = recomputeGlyphMetrics(
      newText,
      obj.boundingBox[0],
      totalWidth,
      obj.fontSize,
      obj.letterSpacing,
      obj.wordSpacing,
      obj.horizontalScaling
    );
    const isModified = newText !== obj.originalText;
    const isDeleted = newText.trim() === '';

    const updatedObject: DocumentObject = {
      ...obj,
      text: newText,
      editedText: newText,
      glyphWidths: newMetrics.map((g) => g.width),
      glyphMetrics: newMetrics,
      modificationState: isDeleted ? 'deleted' : (isModified ? 'modified' : 'unmodified'),
    };

    return {
      updatedObject,
      newCaretIndex,
    };
  }

  replaceText(obj: DocumentObject, newText: string): DocumentObject {
    const totalWidth = obj.boundingBox[2] - obj.boundingBox[0];
    const newMetrics = recomputeGlyphMetrics(
      newText,
      obj.boundingBox[0],
      totalWidth,
      obj.fontSize,
      obj.letterSpacing,
      obj.wordSpacing,
      obj.horizontalScaling
    );
    const isModified = newText !== obj.originalText;

    return {
      ...obj,
      text: newText,
      editedText: newText,
      glyphWidths: newMetrics.map((g) => g.width),
      glyphMetrics: newMetrics,
      modificationState: isModified ? 'modified' : 'unmodified',
    };
  }

  applyFormatting(objects: DocumentObject[], format: FormattingOptions): DocumentObject[] {
    return objects.map((obj) => {
      const isModified = true; // Formatting change explicitly marks object as modified
      return {
        ...obj,
        font: format.font !== undefined ? format.font : obj.font,
        fontSize: format.fontSize !== undefined ? format.fontSize : obj.fontSize,
        fontWeight: format.fontWeight !== undefined ? format.fontWeight : obj.fontWeight,
        fontStyle: format.fontStyle !== undefined ? format.fontStyle : obj.fontStyle,
        fillColor: format.fillColor !== undefined ? format.fillColor : obj.fillColor,
        alignment: format.alignment !== undefined ? format.alignment : obj.alignment,
        letterSpacing: format.letterSpacing !== undefined ? format.letterSpacing : obj.letterSpacing,
        lineHeight: format.lineHeight !== undefined ? format.lineHeight : obj.lineHeight,
        modificationState: isModified ? 'modified' : obj.modificationState,
      };
    });
  }
}

export const editingEngine = new EditingEngineServiceImpl();
