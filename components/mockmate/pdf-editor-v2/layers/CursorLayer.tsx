'use client';

import React from 'react';
import { DocumentObject } from '@/lib/pdf-editor-v2/types';
import { coordinateEngine } from '@/lib/pdf-editor-v2/layout';

export interface CursorLayerProps {
  editingId: string | null;
  objects: Record<string, DocumentObject>;
  pageHeight: number;
  zoom: number;
  caretIndex?: number;
}

/**
 * Layer 4: CursorLayer — Renders subpixel caret and inline text selection highlight
 * without relying on DOM contentEditable focus jumping.
 */
export default function CursorLayer({
  editingId,
  objects,
  pageHeight,
  zoom,
  caretIndex = 0,
}: CursorLayerProps) {
  if (!editingId || !objects[editingId]) return null;

  const obj = objects[editingId];
  const rect = coordinateEngine.pdfToScreenRect(obj.boundingBox, pageHeight, zoom);
  
  // Compute subpixel caret X offset using proportional glyph widths
  let caretOffsetX = 0;
  if (obj.glyphWidths && obj.glyphWidths.length > 0) {
    const safeIndex = Math.min(caretIndex, obj.glyphWidths.length);
    for (let i = 0; i < safeIndex; i++) {
      caretOffsetX += obj.glyphWidths[i] * zoom;
    }
  } else if (obj.glyphMetrics && obj.glyphMetrics.length > 0) {
    const safeIndex = Math.min(caretIndex, obj.glyphMetrics.length);
    for (let i = 0; i < safeIndex; i++) {
      caretOffsetX += (obj.glyphMetrics[i].advance || obj.glyphMetrics[i].width) * zoom;
    }
  } else {
    // Fallback approximation if metrics are missing
    const avgCharWidth = (rect.width / Math.max(1, obj.text.length));
    caretOffsetX = caretIndex * avgCharWidth;
  }

  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none">
      {/* Editing Box Ring */}
      <div
        className="absolute border-2 border-dashed border-purple-500 rounded-xs pointer-events-none"
        style={{ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` }}
      />

      {/* Subpixel Blinking Caret */}
      <div
        className="absolute w-[2px] bg-purple-600 animate-pulse shadow-xs"
        style={{
          left: `${rect.left + caretOffsetX}px`,
          top: `${rect.top}px`,
          height: `${rect.height}px`,
        }}
      />
    </div>
  );
}
