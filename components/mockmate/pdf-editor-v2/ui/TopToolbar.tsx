'use client';

import React from 'react';
import { usePdfEditorStore } from '@/lib/pdf-editor-v2/store';
import { historyEngine } from '@/lib/pdf-editor-v2/history';
import { zoomEngine, PRESET_ZOOM_LEVELS } from '@/lib/pdf-editor-v2/zoom';
import { 
  ZoomIn, ZoomOut, Undo2, Redo2, Download, Sparkles, FileText, 
  HelpCircle, CheckCircle2, RotateCcw
} from 'lucide-react';

export interface TopToolbarProps {
  onExport: () => void;
  onOpenAudit: () => void;
  onOpenShortcuts: () => void;
  isExporting?: boolean;
}

/**
 * TopToolbar — Canva/Figma style header controls for file status, zoom steps, undo/redo, and export.
 */
export default function TopToolbar({
  onExport,
  onOpenAudit,
  onOpenShortcuts,
  isExporting = false,
}: TopToolbarProps) {
  const { fileName, zoom, setZoom, fitMode, isDirty } = usePdfEditorStore();
  const stats = historyEngine.getStats();

  const handleZoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'width' || val === 'page') {
      zoomEngine.applyZoom(val as any, document.getElementById('editor-v2-canvas-viewport') || undefined);
    } else {
      zoomEngine.applyZoom(parseFloat(val), document.getElementById('editor-v2-canvas-viewport') || undefined);
    }
  };

  return (
    <header className="h-14 bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between text-white shrink-0 select-none z-50">
      {/* Left: Branding & File Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-1.5 rounded-lg shadow-md">
          <FileText className="h-4 w-4 text-white" />
          <span className="font-bold text-sm tracking-wide">Editor V2</span>
        </div>
        <div className="h-4 w-[1px] bg-neutral-700 mx-1" />
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-neutral-200 truncate max-w-[200px]" title={fileName}>
            {fileName || 'Untitled_Resume.pdf'}
          </span>
          {isDirty ? (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold">
              Unsaved Edits
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Center: Zoom Controls & Undo/Redo */}
      <div className="flex items-center gap-2 bg-neutral-800/80 p-1 rounded-lg border border-neutral-700/50">
        <button
          onClick={() => historyEngine.undo()}
          disabled={stats.undoCount === 0}
          className="p-1.5 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-neutral-300 hover:text-white"
          title={`Undo (Ctrl+Z) — ${stats.undoCount} steps`}
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => historyEngine.redo()}
          disabled={stats.redoCount === 0}
          className="p-1.5 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-neutral-300 hover:text-white"
          title={`Redo (Ctrl+Y) — ${stats.redoCount} steps`}
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="h-4 w-[1px] bg-neutral-700 mx-1" />

        <button
          onClick={() => zoomEngine.applyZoom(zoomEngine.getNextZoomOut(zoom), document.getElementById('editor-v2-canvas-viewport') || undefined)}
          className="p-1.5 rounded hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <select
          value={fitMode === 'custom' ? zoom.toString() : fitMode}
          onChange={handleZoomChange}
          className="bg-neutral-900 border border-neutral-700 text-xs font-semibold text-neutral-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
        >
          <option value="width">Fit Width</option>
          <option value="page">Fit Page</option>
          <option disabled>──────────</option>
          {PRESET_ZOOM_LEVELS.map((level) => (
            <option key={level} value={level.toString()}>
              {Math.round(level * 100)}%
            </option>
          ))}
        </select>

        <button
          onClick={() => zoomEngine.applyZoom(zoomEngine.getNextZoomIn(zoom), document.getElementById('editor-v2-canvas-viewport') || undefined)}
          className="p-1.5 rounded hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* Right: AI Audit, Shortcuts & Surgical Export */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAudit}
          className="flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
          title="AI Resume ATS Audit"
        >
          <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
          ATS Audit
        </button>

        <button
          onClick={onOpenShortcuts}
          className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          title="Keyboard Shortcuts (F1)"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md hover:shadow-emerald-900/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>
    </header>
  );
}
