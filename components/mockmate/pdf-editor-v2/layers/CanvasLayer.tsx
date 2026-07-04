'use client';

import React, { useEffect, useRef } from 'react';
import { pdfRenderingService } from '@/lib/pdf-editor-v2/rendering';
import { PageViewportInfo } from '@/lib/pdf-editor-v2/types';

export interface CanvasLayerProps {
  pdfBytes: Uint8Array | null;
  pageIndex: number;
  zoom: number;
  devicePixelRatio: number;
  onRenderComplete?: (info: PageViewportInfo) => void;
}

/**
 * Layer 1: CanvasLayer — Renders razor-sharp High-DPI PDF background bitmap.
 * Shares exact CSS viewport bounds without CSS transform distortion.
 */
function CanvasLayer({
  pdfBytes,
  pageIndex,
  zoom,
  devicePixelRatio,
  onRenderComplete,
}: CanvasLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!pdfBytes || !canvasRef.current) return;

    let isMounted = true;
    pdfRenderingService
      .renderPageToCanvas(pdfBytes, pageIndex, canvasRef.current, zoom, devicePixelRatio)
      .then((info) => {
        if (isMounted && onRenderComplete) {
          onRenderComplete(info);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn(`[CanvasLayer] Page ${pageIndex + 1} render cancelled or failed:`, err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pdfBytes, pageIndex, zoom, devicePixelRatio, onRenderComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none select-none shadow-md bg-white"
      style={{ display: 'block' }}
    />
  );
}

export default React.memo(CanvasLayer);
