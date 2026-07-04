'use client';

import React from 'react';
import { usePdfEditorStore } from '@/lib/pdf-editor-v2/store';
import { zoomEngine } from '@/lib/pdf-editor-v2/zoom';
import { Layers, Maximize2, MousePointer } from 'lucide-react';

/**
 * BottomStatusBar — Figma/Canva style footer bar displaying page status, selection count,
 * subpixel bounding box dimensions, and interactive zoom slider.
 */
export default function BottomStatusBar() {
  const { pages, currentPage, zoom, selection, objects, isDirty } = usePdfEditorStore();
  const selectedIds = selection.selectedIds;

  const selectedArray = Array.from(selectedIds).map((id) => objects[id]).filter(Boolean);
  const firstObj = selectedArray[0];

  return (
    <footer className="h-8 bg-neutral-950 border-t border-neutral-800 px-4 flex items-center justify-between text-[11px] text-neutral-400 font-mono select-none z-50 shrink-0">
      {/* Left: Page Number & Selection Count */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-neutral-300">
          <Layers className="h-3.5 w-3.5 text-purple-400" />
          <span>Page {currentPage + 1} of {Math.max(1, pages.length)}</span>
        </div>

        <div className="h-3 w-[1px] bg-neutral-800" />

        <div className="flex items-center gap-1.5">
          <MousePointer className="h-3 w-3 text-neutral-500" />
          <span>{selectedIds.size === 0 ? 'No selection' : `${selectedIds.size} element(s) selected`}</span>
        </div>

        <div className="h-3 w-[1px] bg-neutral-800" />

        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isDirty ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <span className={isDirty ? 'text-amber-300' : 'text-emerald-300'}>{isDirty ? 'Unsaved changes' : 'Saved'}</span>
        </div>
      </div>

      {/* Center: Selected Element Subpixel Geometry */}
      {firstObj ? (
        <div className="flex items-center gap-3 bg-neutral-900 px-2.5 py-0.5 rounded border border-neutral-800 text-neutral-300">
          <span className="flex items-center gap-1 text-purple-300">
            <Maximize2 className="h-3 w-3" /> Subpixel Bounds:
          </span>
          <span>X: {firstObj.boundingBox[0].toFixed(1)}</span>
          <span>Y: {firstObj.boundingBox[1].toFixed(1)}</span>
          <span>W: {(firstObj.boundingBox[2] - firstObj.boundingBox[0]).toFixed(1)}</span>
          <span>H: {(firstObj.boundingBox[3] - firstObj.boundingBox[1]).toFixed(1)}</span>
        </div>
      ) : (
        <div className="text-neutral-600 italic">Ready — Click and drag to select elements</div>
      )}

      {/* Right: Interactive Zoom Slider */}
      <div className="flex items-center gap-2">
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <input
          type="range"
          min="0.25"
          max="8.0"
          step="0.05"
          value={zoom}
          onChange={(e) => zoomEngine.applyZoom(parseFloat(e.target.value), document.getElementById('editor-v2-canvas-viewport') || undefined)}
          className="w-24 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>
    </footer>
  );
}
