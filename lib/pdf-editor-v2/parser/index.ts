/**
 * Commercial-Grade PDF Resume Editor — Editable Document Model (Phase 4)
 * 
 * Replaces plain text extraction with a rich object model where every visible element
 * maintains exact user-space bounding boxes, transform matrices, baseline descenders,
 * character-level glyph metrics, and stable UUIDs for surgical modification tracking.
 */

import { DocumentObject, PageViewportInfo, GlyphMetric, BoundingBox, TransformMatrix } from '../types';
import { pdfRenderingService } from '../rendering';
import { typographyEngine } from '../typography';

let idCounter = 0;

/** Generate a stable UUID for document objects */
function generateStableId(pageIndex: number, textPrefix: string): string {
  const cleanPrefix = textPrefix.replace(/[^a-z0-9]/gi, '').slice(0, 8);
  return `doc_obj_p${pageIndex}_${cleanPrefix}_${Date.now()}_${++idCounter}`;
}

/** Normalize PDF internal font names to CSS-friendly font families */
function normalizeFontFamily(fontName: string): string {
  if (!fontName) return 'Helvetica, Arial, sans-serif';
  const name = fontName.toLowerCase();
  if (name.includes('times') || name.includes('serif')) return 'Times New Roman, serif';
  if (name.includes('courier') || name.includes('mono')) return 'Courier New, monospace';
  if (name.includes('helvetica') || name.includes('arial') || name.includes('sans')) return 'Helvetica, Arial, sans-serif';
  if (name.includes('calibri')) return 'Calibri, sans-serif';
  if (name.includes('garamond')) return 'Garamond, serif';
  if (name.includes('georgia')) return 'Georgia, serif';
  if (name.includes('cambria')) return 'Cambria, serif';
  const cleaned = fontName.replace(/^[A-Z]{6}\+/, '');
  return `${cleaned}, sans-serif`;
}

/** Detect font weight from PDF font metadata */
function detectFontWeight(fontName: string): string {
  if (!fontName) return 'normal';
  const name = fontName.toLowerCase();
  if (name.includes('bold') || name.includes('heavy') || name.includes('black')) return 'bold';
  if (name.includes('light') || name.includes('thin')) return '300';
  if (name.includes('medium')) return '500';
  if (name.includes('semibold') || name.includes('demi')) return '600';
  return 'normal';
}

/** Detect font style from PDF font metadata */
function detectFontStyle(fontName: string): string {
  if (!fontName) return 'normal';
  const name = fontName.toLowerCase();
  if (name.includes('italic') || name.includes('oblique')) return 'italic';
  return 'normal';
}

/** Parse PDF RGB color components to Hex string */
function parsePdfColor(colorArray?: number[]): string {
  if (!colorArray || colorArray.length < 3) return '#000000';
  const r = Math.round(colorArray[0] * 255);
  const g = Math.round(colorArray[1] * 255);
  const b = Math.round(colorArray[2] * 255);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Compute character-level glyph metrics for subpixel cursor caret positioning */
function calculateGlyphMetrics(str: string, startX: number, totalWidth: number, fontSize = 12): GlyphMetric[] {
  return typographyEngine.computeGlyphMetrics(str, startX, fontSize, totalWidth);
}

export class DocumentModelServiceImpl {
  /**
   * Parse a single PDF page into rich document objects
   */
  async parsePageObjects(page: any, pageIndex: number, viewport: any): Promise<DocumentObject[]> {
    const textContent = await page.getTextContent({ includeMarkedContent: true });
    const rawObjects: DocumentObject[] = [];
    if (!textContent || !textContent.items) return rawObjects;

    for (const item of textContent.items) {
      if (!item.str || item.str.trim() === '') continue;

      // Extract transformation matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
      const tx: TransformMatrix = item.transform || [1, 0, 0, 1, 0, 0];
      const fontSize = Math.abs(tx[3]) || Math.abs(tx[0]) || 12;
      const x = tx[4] || 0;
      const y = tx[5] || 0; // PDF user-space Y (bottom-left origin)
      const width = item.width || (item.str.length * fontSize * 0.5);
      const height = item.height || fontSize * 1.2;

      // Calculate exact bounding box in PDF user space: [minX, minY, maxX, maxY]
      const bbox: BoundingBox = [x, y, x + width, y + height];

      const fontName = item.fontName || '';
      const font = normalizeFontFamily(fontName);
      const fontWeight = detectFontWeight(fontName);
      const fontStyle = detectFontStyle(fontName);
      const color = parsePdfColor(item.color);
      const glyphMetrics = calculateGlyphMetrics(item.str, x, width, fontSize);

      // Calculate screen coordinates (top-left origin) for UI rendering
      const screenX = x;
      const screenY = viewport.height - y - fontSize;

      rawObjects.push({
        id: generateStableId(pageIndex, item.str),
        page: pageIndex,
        type: 'text',
        boundingBox: bbox,
        originalPdfCoordinates: [...bbox],
        viewportCoordinates: [screenX, screenY, screenX + width, screenY + height],
        transformMatrix: [...tx],
        font,
        fontFamily: font,
        originalFontName: fontName,
        embeddedFontName: fontName,
        fontSize: Math.round(fontSize * 100) / 100,
        fontWeight,
        fontStyle,
        fillColor: color,
        strokeColor: color,
        opacity: 1.0,
        rotation: 0,
        baseline: y,
        ascent: Math.round(fontSize * 0.8 * 100) / 100,
        descent: Math.round(-fontSize * 0.2 * 100) / 100,
        capHeight: Math.round(fontSize * 0.7 * 100) / 100,
        glyphWidths: glyphMetrics.map((g) => g.width),
        glyphMetrics,
        letterSpacing: 0,
        wordSpacing: 0,
        horizontalScaling: 100,
        lineHeight: 1.2,
        alignment: 'left',
        text: item.str,
        originalText: item.str,
        editedText: item.str,
        modificationState: 'unmodified',
        screenX: Math.round(screenX * 100) / 100,
        screenY: Math.round(screenY * 100) / 100,
        screenWidth: Math.round(width * 100) / 100,
        screenHeight: Math.round(height * 100) / 100,
      });
    }

    return this.groupTextBlocks(rawObjects, pageIndex);
  }

  /**
   * Group sequential text fragments on the same line into coherent editable paragraphs
   */
  private groupTextBlocks(objects: DocumentObject[], pageIndex: number): DocumentObject[] {
    if (objects.length === 0) return [];

    // Sort by Y (top to bottom in screen space, highest Y first in PDF user space), then X
    const sorted = [...objects].sort((a, b) => {
      const yDiff = b.boundingBox[1] - a.boundingBox[1]; // Descending PDF Y
      if (Math.abs(yDiff) < 2) return a.boundingBox[0] - b.boundingBox[0]; // Ascending PDF X
      return yDiff;
    });

    const groups: DocumentObject[][] = [];
    let currentGroup: DocumentObject[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = currentGroup[currentGroup.length - 1];
      const curr = sorted[i];

      // Merge criteria: same line (Y within 2.5 pts), matching typography, close X distance
      const sameLine = Math.abs(curr.boundingBox[1] - prev.boundingBox[1]) < 2.5;
      const sameTypography = curr.font === prev.font &&
                             Math.abs(curr.fontSize - prev.fontSize) < 0.5 &&
                             curr.fontWeight === prev.fontWeight &&
                             curr.fillColor === prev.fillColor;
      const closeX = curr.boundingBox[0] - (prev.boundingBox[0] + (prev.boundingBox[2] - prev.boundingBox[0])) < curr.fontSize * 1.5;

      if (sameLine && sameTypography && closeX) {
        currentGroup.push(curr);
      } else {
        groups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    groups.push(currentGroup);

    // Merge group fragments into single unified DocumentObject blocks
    return groups.map((group) => {
      if (group.length === 1) return group[0];

      const first = group[0];
      const last = group[group.length - 1];
      const mergedText = group.map((g) => g.text).join('');
      const minX = Math.min(...group.map((g) => g.boundingBox[0]));
      const minY = Math.min(...group.map((g) => g.boundingBox[1]));
      const maxX = Math.max(...group.map((g) => g.boundingBox[2]));
      const maxY = Math.max(...group.map((g) => g.boundingBox[3]));
      const totalWidth = maxX - minX;
      const totalHeight = maxY - minY;

      const mergedGlyphs = calculateGlyphMetrics(mergedText, minX, totalWidth, first.fontSize);

      return {
        ...first,
        id: generateStableId(pageIndex, mergedText),
        boundingBox: [minX, minY, maxX, maxY],
        originalPdfCoordinates: [minX, minY, maxX, maxY],
        viewportCoordinates: [minX, first.viewportCoordinates[1], maxX, first.viewportCoordinates[1] + totalHeight],
        glyphWidths: mergedGlyphs.map((g) => g.width),
        glyphMetrics: mergedGlyphs,
        text: mergedText,
        originalText: mergedText,
        editedText: mergedText,
        screenWidth: Math.round(totalWidth * 100) / 100,
        screenHeight: Math.round(totalHeight * 100) / 100,
      };
    });
  }

  /**
   * Main Document Model Entry Point: Parse entire PDF into Pages and DocumentObjects
   */
  async parsePdf(pdfBytes: Uint8Array): Promise<{ pages: PageViewportInfo[]; objects: DocumentObject[] }> {
    const pdf = await pdfRenderingService.getDocument(pdfBytes);
    const pages: PageViewportInfo[] = [];
    let allObjects: DocumentObject[] = [];

    for (let i = 0; i < pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i + 1);
        const viewport = page.getViewport({ scale: 1.0, rotation: page.rotate });

        pages.push({
          pageIndex: i,
          pdfWidth: viewport.width,
          pdfHeight: viewport.height,
          rotation: page.rotate || 0,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
        });

        const pageObjects = await this.parsePageObjects(page, i, viewport);
        allObjects = allObjects.concat(pageObjects);
      } catch (err) {
        console.warn(`Could not extract document objects on page ${i + 1}:`, err);
      }
    }

    return { pages, objects: allObjects };
  }
}

export const documentModelService = new DocumentModelServiceImpl();
