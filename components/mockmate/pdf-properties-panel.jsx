'use client'
import usePdfEditorStore from '@/lib/pdf-editor/store'
import {
  Type, Move, Palette, LetterText, Space, AlignVerticalSpaceAround,
  RotateCw, Clock, Sparkles, ChevronDown, Hash,
} from 'lucide-react'

/**
 * PDF Properties Panel — Right sidebar showing selected object properties
 */
export default function PdfPropertiesPanel() {
  const store = usePdfEditorStore()
  const selected = store.getSelectedObject()
  const modifiedCount = store.modifiedObjectIds?.size || 0
  const totalObjects = store.objects?.length || 0

  const updateSelected = (updates) => {
    if (!selected) return
    store.updateObject(selected.id, updates)
  }

  return (
    <div className="w-[280px] shrink-0 bg-[#0d0d1f] border-l border-white/10 overflow-y-auto print:hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm font-bold text-white">Properties</h3>
        <p className="text-[10px] text-neutral-500 mt-1">
          {selected ? `Editing: ${selected.type} object` : 'Select an object to edit'}
        </p>
      </div>

      {selected ? (
        <div className="p-4 space-y-5">
          {/* Text Content */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
              <Type className="h-3 w-3" /> Text Content
            </label>
            <textarea
              value={selected.text || ''}
              onChange={(e) => updateSelected({ text: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-neutral-200 font-mono resize-none focus:border-purple-500/40 focus:outline-none transition-colors"
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
              <Move className="h-3 w-3" /> Position
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-neutral-500">X</span>
                <input
                  type="number"
                  value={Math.round(selected.x || 0)}
                  onChange={(e) => updateSelected({ x: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono focus:border-purple-500/40 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[9px] text-neutral-500">Y</span>
                <input
                  type="number"
                  value={Math.round(selected.y || 0)}
                  onChange={(e) => updateSelected({ y: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono focus:border-purple-500/40 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[9px] text-neutral-500">Width</span>
                <input
                  type="number"
                  value={Math.round(selected.width || 0)}
                  onChange={(e) => updateSelected({ width: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono focus:border-purple-500/40 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[9px] text-neutral-500">Height</span>
                <input
                  type="number"
                  value={Math.round(selected.height || 0)}
                  onChange={(e) => updateSelected({ height: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono focus:border-purple-500/40 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Font */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
              <LetterText className="h-3 w-3" /> Typography
            </label>
            <div className="space-y-2">
              <div>
                <span className="text-[9px] text-neutral-500">Font Family</span>
                <select
                  value={selected.fontFamily || 'Helvetica, Arial, sans-serif'}
                  onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-neutral-200 focus:border-purple-500/40 focus:outline-none appearance-none"
                >
                  <option value="Helvetica, Arial, sans-serif">Helvetica / Arial</option>
                  <option value="Times New Roman, serif">Times New Roman</option>
                  <option value="Courier New, monospace">Courier New</option>
                  <option value="Calibri, sans-serif">Calibri</option>
                  <option value="Garamond, serif">Garamond</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Cambria, serif">Cambria</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-neutral-500">Size</span>
                  <input
                    type="number"
                    value={Math.round((selected.fontSize || 12) * 10) / 10}
                    onChange={(e) => updateSelected({ fontSize: parseFloat(e.target.value) || 12 })}
                    min={6}
                    max={72}
                    step={0.5}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono focus:border-purple-500/40 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-neutral-500">Color</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={selected.color || '#000000'}
                      onChange={(e) => updateSelected({ color: e.target.value })}
                      className="h-7 w-7 rounded border border-white/10 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={selected.color || '#000000'}
                      onChange={(e) => updateSelected({ color: e.target.value })}
                      className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-[10px] text-neutral-200 font-mono focus:border-purple-500/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-neutral-500">Weight</span>
                  <select
                    value={selected.fontWeight || 'normal'}
                    onChange={(e) => updateSelected({ fontWeight: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-neutral-200 focus:border-purple-500/40 focus:outline-none appearance-none"
                  >
                    <option value="300">Light</option>
                    <option value="normal">Regular</option>
                    <option value="500">Medium</option>
                    <option value="600">Semi Bold</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
                <div>
                  <span className="text-[9px] text-neutral-500">Style</span>
                  <select
                    value={selected.fontStyle || 'normal'}
                    onChange={(e) => updateSelected({ fontStyle: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-neutral-200 focus:border-purple-500/40 focus:outline-none appearance-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Italic</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Spacing */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
              <AlignVerticalSpaceAround className="h-3 w-3" /> Spacing
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-neutral-500">Letter Spacing</span>
                <input
                  type="number"
                  value={selected.letterSpacing || 0}
                  onChange={(e) => updateSelected({ letterSpacing: parseFloat(e.target.value) || 0 })}
                  step={0.1}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono focus:border-purple-500/40 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[9px] text-neutral-500">Line Height</span>
                <input
                  type="number"
                  value={selected.lineHeight || 1.2}
                  onChange={(e) => updateSelected({ lineHeight: parseFloat(e.target.value) || 1.2 })}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono focus:border-purple-500/40 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Object Info */}
          <div className="pt-3 border-t border-white/10 space-y-1.5">
            <p className="text-[9px] text-neutral-500 font-mono">ID: {selected.id}</p>
            <p className="text-[9px] text-neutral-500 font-mono">Page: {(selected.page || 0) + 1}</p>
            <p className="text-[9px] text-neutral-500 font-mono">Original Font: {selected.originalFontName || 'Unknown'}</p>
          </div>
        </div>
      ) : (
        /* No selection state */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Type className="h-6 w-6 text-purple-400" />
          </div>
          <p className="text-xs text-neutral-400 font-semibold">Click any text on the PDF to select it</p>
          <p className="text-[10px] text-neutral-500">Double-click to start editing in place</p>
        </div>
      )}

      {/* Document Stats */}
      <div className="mt-auto p-4 border-t border-white/10 space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
          <Hash className="h-3 w-3" /> Document Stats
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
            <span className="text-neutral-500">Pages</span>
            <span className="block text-white font-bold">{store.pages?.length || 0}</span>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
            <span className="text-neutral-500">Objects</span>
            <span className="block text-white font-bold">{totalObjects}</span>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
            <span className="text-neutral-500">Modified</span>
            <span className="block text-emerald-400 font-bold">{modifiedCount}</span>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
            <span className="text-neutral-500">History</span>
            <span className="block text-purple-400 font-bold">{store.history?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
