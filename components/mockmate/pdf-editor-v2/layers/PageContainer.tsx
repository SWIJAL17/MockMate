'use client';

import React, { useState } from 'react';
import { DocumentObject, PageViewportInfo, ResizeHandleType } from '@/lib/pdf-editor-v2/types';
import CanvasLayer from './CanvasLayer';
import TextLayer from './TextLayer';
import SelectionLayer from './SelectionLayer';
import CursorLayer from './CursorLayer';
import OverlayLayer from './OverlayLayer';
import GuideLayer, { GuideLine } from './GuideLayer';

export interface PageContainerProps {
  pdfBytes: Uint8Array | null;
  pageIndex: number;
  zoom: number;
  devicePixelRatio: number;
  objects: Record<string, DocumentObject>;
  pageObjectIds: string[];
  selectedIds: Set<string>;
  hoveredId: string | null;
  editingId: string | null;
  guides?: GuideLine[];
  showGrid?: boolean;
  onSelectObject: (id: string | null, multi?: boolean) => void;
  onHoverObject: (id: string | null) => void;
  onDoubleClickObject?: (id: string) => void;
  onStartDrag?: (id: string, e: React.MouseEvent) => void;
  onStartResize?: (id: string, handle: ResizeHandleType, e: React.MouseEvent) => void;
  onTriggerAIRewrite?: (id: string) => void;
}

/**
 * Master Layer Container — Stacks all 6 rendering layers inside an exact viewport container.
 * Every layer shares identical width/height bounds, ensuring zero coordinate drift or alignment error.
 */
export default function PageContainer({
  pdfBytes,
  pageIndex,
  zoom,
  devicePixelRatio,
  objects,
  pageObjectIds = [],
  selectedIds,
  hoveredId,
  editingId,
  guides = [],
  showGrid = false,
  onSelectObject,
  onHoverObject,
  onDoubleClickObject,
  onStartDrag,
  onStartResize,
  onTriggerAIRewrite,
}: PageContainerProps) {
  const [viewportInfo, setViewportInfo] = useState<PageViewportInfo | null>(null);
  const handleRenderComplete = React.useCallback((info: any) => setViewportInfo(info), []);

  // Extract DocumentObjects for this specific page
  const pageObjects = pageObjectIds
    .map((id) => objects[id])
    .filter((obj): obj is DocumentObject => obj !== undefined);

  // Default CSS dimensions while PDF.js initializes canvas viewport
  const containerWidth = viewportInfo ? viewportInfo.viewportWidth : 612 * zoom;
  const containerHeight = viewportInfo ? viewportInfo.viewportHeight : 792 * zoom;
  const pdfHeight = viewportInfo ? viewportInfo.pdfHeight : 792;

  return (
    <div
      onClick={(e) => {
        // Clicking empty page background clears object selection
        if (e.target === e.currentTarget) {
          onSelectObject(null);
        }
      }}
      className="relative overflow-hidden bg-white shadow-2xl transition-all duration-100 mx-auto border border-neutral-800 shrink-0"
      style={{
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
      }}
    >
      {/* Layer 1: HiDPI Retina PDF Bitmap Canvas */}
      <CanvasLayer
        pdfBytes={pdfBytes}
        pageIndex={pageIndex}
        zoom={zoom}
        devicePixelRatio={devicePixelRatio}
        onRenderComplete={handleRenderComplete}
      />

      {/* Layer 2: Interactive Text Spans with scaleX compensation */}
      <TextLayer
        objects={pageObjects}
        pageHeight={pdfHeight}
        zoom={zoom}
        onSelectObject={onSelectObject}
        onHoverObject={onHoverObject}
        onDoubleClickObject={onDoubleClickObject}
      />

      {/* Layer 3: Selection Bounding Boxes & 8 Resize Handles */}
      <SelectionLayer
        objects={objects}
        selectedIds={selectedIds}
        hoveredId={hoveredId}
        pageHeight={pdfHeight}
        zoom={zoom}
        onStartDrag={onStartDrag}
        onStartResize={onStartResize}
      />

      {/* Layer 4: Subpixel Blinking Caret & Edit Rings */}
      <CursorLayer
        editingId={editingId}
        objects={objects}
        pageHeight={pdfHeight}
        zoom={zoom}
      />

      {/* Layer 5: AI Rewrite Badges & Modification Indicators */}
      <OverlayLayer
        objects={objects}
        pageHeight={pdfHeight}
        zoom={zoom}
        onTriggerAIRewrite={onTriggerAIRewrite}
      />

      {/* Layer 6: Visual Alignment Grids & Snap Guides */}
      <GuideLayer
        guides={guides}
        showGrid={showGrid}
        viewportWidth={containerWidth}
        viewportHeight={containerHeight}
      />
    </div>
  );
}
