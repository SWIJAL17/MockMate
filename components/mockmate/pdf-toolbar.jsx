'use client'
import { useCallback, useState } from 'react'
import usePdfEditorStore from '@/lib/pdf-editor/store'
import { exportModifiedPdf, downloadPdf } from '@/lib/pdf-editor/pdf-exporter'
import { Button } from '@/components/ui/button'
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Download,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Sparkles, Loader2, Type, Palette, Minus, Plus,
} from 'lucide-react'

/**
 * PDF Editor Toolbar — formatting, zoom, undo/redo, export
 */
export default function PdfToolbar({ onAiRewrite }) {
  const store = usePdfEditorStore()
  const selected = store.getSelectedObject()
  const [aiLoading, setAiLoading] = useState(false)

  const handleExport = useCallback(async () => {
    if (!store.originalPdfBytes) return
    store.setExporting(true)
    try {
      const bytes = await exportModifiedPdf(
        store.originalPdfBytes,
        store.objects,
        store.modifiedObjectIds,
        store.pages
      )
      downloadPdf(bytes, store.fileName?.replace('.pdf', '-edited.pdf') || 'resume-edited.pdf')
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      store.setExporting(false)
    }
  }, [store])

  const updateSelected = (updates) => {
    if (!selected) return
    store.updateObject(selected.id, updates)
  }

  const handleAiRewrite = async (action) => {
    if (!selected || !selected.text || !onAiRewrite) return
    setAiLoading(true)
    try {
      const result = await onAiRewrite(selected.text, action)
      if (result) {
        store.updateObject(selected.id, { text: result })
      }
    } finally {
      setAiLoading(false)
    }
  }

  const zoomPercent = Math.round((store.zoom || 1) * 100)

  return (
    <div className="h-12 border-b border-white/10 bg-[#0d0d1f] flex items-center justify-between px-3 shrink-0 print:hidden gap-2">
      {/* Left: Undo/Redo + Zoom */}
      <div className="flex items-center gap-1.5">
        {/* Undo */}
        <button
          onClick={store.undo}
          disabled={store.history.length === 0}
          className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        {/* Redo */}
        <button
          onClick={store.redo}
          disabled={store.redoStack.length === 0}
          className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* Zoom */}
        <button
          onClick={store.zoomOut}
          className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-bold text-neutral-300 w-12 text-center tabular-nums">{zoomPercent}%</span>
        <button
          onClick={store.zoomIn}
          className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={store.fitToWidth}
          className="h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white text-[10px] font-bold transition-colors gap-1"
          title="Fit to Width"
        >
          <Maximize2 className="h-3 w-3" /> Fit
        </button>
      </div>

      {/* Center: Text Formatting (active when text selected) */}
      <div className={`flex items-center gap-1 transition-opacity ${selected ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
        <button
          onClick={() => updateSelected({ fontWeight: selected?.fontWeight === 'bold' ? 'normal' : 'bold' })}
          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
            selected?.fontWeight === 'bold'
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
          }`}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => updateSelected({ fontStyle: selected?.fontStyle === 'italic' ? 'normal' : 'italic' })}
          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
            selected?.fontStyle === 'italic'
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
          }`}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>

        <div className="h-5 w-px bg-white/10 mx-0.5" />

        {/* Font Size */}
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg px-1 h-8">
          <button
            onClick={() => updateSelected({ fontSize: Math.max(6, (selected?.fontSize || 12) - 1) })}
            className="text-neutral-400 hover:text-white p-0.5"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-xs font-bold text-neutral-200 w-7 text-center tabular-nums">
            {Math.round(selected?.fontSize || 12)}
          </span>
          <button
            onClick={() => updateSelected({ fontSize: Math.min(72, (selected?.fontSize || 12) + 1) })}
            className="text-neutral-400 hover:text-white p-0.5"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="h-5 w-px bg-white/10 mx-0.5" />

        {/* Color picker */}
        <div className="relative h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
          <Palette className="h-3.5 w-3.5 text-neutral-400 pointer-events-none z-10" />
          <input
            type="color"
            value={selected?.color || '#000000'}
            onChange={(e) => updateSelected({ color: e.target.value })}
            className="absolute inset-0 opacity-0 cursor-pointer"
            title="Text Color"
          />
        </div>

        <div className="h-5 w-px bg-white/10 mx-0.5" />

        {/* Alignment */}
        <button
          onClick={() => updateSelected({ alignment: 'left' })}
          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
            selected?.alignment === 'left' || !selected?.alignment
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
          }`}
          title="Align Left"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => updateSelected({ alignment: 'center' })}
          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
            selected?.alignment === 'center'
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
          }`}
          title="Align Center"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => updateSelected({ alignment: 'right' })}
          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
            selected?.alignment === 'right'
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
          }`}
          title="Align Right"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </button>

        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* AI Rewrite */}
        <button
          onClick={() => handleAiRewrite('improve')}
          disabled={!selected?.text || aiLoading}
          className="h-8 px-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold flex items-center gap-1 hover:opacity-90 disabled:opacity-30 transition-all shadow-md shadow-purple-500/20"
          title="AI Rewrite Selected Text"
        >
          {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          AI Rewrite
        </button>
      </div>

      {/* Right: Export */}
      <Button
        onClick={handleExport}
        disabled={store.isExporting}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
      >
        {store.isExporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Download PDF
      </Button>
    </div>
  )
}
