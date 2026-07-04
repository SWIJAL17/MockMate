'use client';

import React from 'react';
import { DocumentObject, ResizeHandleType } from '@/lib/pdf-editor-v2/types';
import { coordinateEngine } from '@/lib/pdf-editor-v2/layout';

export interface SelectionLayerProps {
  objects: Record<string, DocumentObject>;
  selectedIds: Set<string>;
  hoveredId: string | null;
  pageHeight: number;
  zoom: number;
  onStartDrag?: (id: string, e: React.MouseEvent) => void;
  onStartResize?: (id: string, handle: ResizeHandleType, e: React.MouseEvent) => void;
}

const HANDLE_TYPES: ResizeHandleType[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];

/**
 * Layer 3: SelectionLayer — Renders high-visibility bounding boxes and 8 resize handles.
 */
export default function SelectionLayer({
  objects,
  selectedIds,
  hoveredId,
  pageHeight,
  zoom,
  onStartDrag,
  onStartResize,
}: SelectionLayerProps) {
  const getHandlePositionStyle = (handle: ResizeHandleType) => {
    const size = 8;
    const half = size / 2;
    switch (handle) {
      case 'nw': return { top: -half, left: -half, cursor: 'nwse-resize' };
      case 'ne': return { top: -half, right: -half, cursor: 'nesw-resize' };
      case 'sw': return { bottom: -half, left: -half, cursor: 'nesw-resize' };
      case 'se': return { bottom: -half, right: -half, cursor: 'nwse-resize' };
      case 'n': return { top: -half, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
      case 's': return { bottom: -half, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
      case 'w': return { top: '50%', left: -half, transform: 'translateY(-50%)', cursor: 'ew-resize' };
      case 'e': return { top: '50%', right: -half, transform: 'translateY(-50%)', cursor: 'ew-resize' };
    }
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none">
      {/* Hover Highlight Box */}
      {hoveredId && !selectedIds.has(hoveredId) && objects[hoveredId] && (
        (() => {
          const obj = objects[hoveredId];
          const rect = coordinateEngine.pdfToScreenRect(obj.boundingBox, pageHeight, zoom);
          return (
            <div
              className="absolute border border-purple-400/60 bg-purple-400/5 rounded-xs pointer-events-none transition-all duration-75"
              style={{ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` }}
            />
          );
        })()
      )}

      {/* Selected Boxes and Handles */}
      {Array.from(selectedIds).map((id) => {
        const obj = objects[id];
        if (!obj) return null;
        const rect = coordinateEngine.pdfToScreenRect(obj.boundingBox, pageHeight, zoom);

        return (
          <div
            key={id}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (onStartDrag) onStartDrag(id, e);
            }}
            className="absolute border-2 border-purple-500 bg-purple-500/10 rounded-xs pointer-events-auto cursor-move shadow-sm"
            style={{ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` }}
          >
            {HANDLE_TYPES.map((handle) => (
              <div
                key={handle}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (onStartResize) onStartResize(id, handle, e);
                }}
                className="absolute w-2 h-2 bg-white border-2 border-purple-600 rounded-full shadow-xs hover:scale-125 transition-transform"
                style={getHandlePositionStyle(handle)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
