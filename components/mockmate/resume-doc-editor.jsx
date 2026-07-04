'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import {
  Edit3, Eye, Download, Undo2, Redo2, Sparkles, ChevronUp, ChevronDown,
  Trash, PlusCircle, FileCode, FileText, CheckCircle2, Zap,
} from 'lucide-react'

// Dynamic imports for PDF editor components (client-only, avoid SSR)
const PdfEditorV2Studio = dynamic(() => import('./pdf-editor-v2/PdfEditorV2Studio'), { ssr: false })

export default function ResumeDocEditor({
  editableText, onTextChange, analysis, isOnePage, wordCount,
  onOptimize, optimizing, fileBase64, mimeType, lastAppliedFixText,
  originalPdfBytes,
}) {
  const isPdfUploaded = mimeType === 'application/pdf' || fileBase64?.startsWith('data:application/pdf')
  // If we have raw PDF bytes or base64 data URI, use the new PDF canvas editor
  const usePdfEditor = isPdfUploaded && (originalPdfBytes || fileBase64)

  // Fallback: text-based WYSIWYG mode for non-PDF uploads
  const [viewMode, setViewMode] = useState(usePdfEditor ? 'pdf-editor' : 'sheet')
  const [history, setHistory] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [hoveredBlock, setHoveredBlock] = useState(null)
  const [highlightedBlockIdx, setHighlightedBlockIdx] = useState(null)

  // Update viewMode when PDF bytes become available
  useEffect(() => {
    if (usePdfEditor) setViewMode('pdf-editor')
  }, [usePdfEditor])

  const parsedBlocks = editableText ? editableText.split('\n\n').filter(Boolean) : []

  // AI Rewrite handler for PDF editor
  const handleAiRewrite = useCallback(async (text, action) => {
    try {
      const res = await fetch('/api/resume/ai-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI rewrite failed')
      return data.rewrittenText
    } catch (err) {
      console.error('AI rewrite error:', err)
      return null
    }
  }, [])

  // Check if any block matches lastAppliedFixText
  useEffect(() => {
    if (!lastAppliedFixText || !parsedBlocks.length) return
    const getWords = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2)
    const targetWords = getWords(lastAppliedFixText)
    if (!targetWords.length) return

    let bestIdx = -1
    let maxMatches = 0
    parsedBlocks.forEach((block, idx) => {
      const blockWords = getWords(block)
      const matches = targetWords.filter(w => blockWords.includes(w)).length
      if (matches > maxMatches && matches >= 2) {
        maxMatches = matches
        bestIdx = idx
      }
    })

    if (bestIdx !== -1) {
      setHighlightedBlockIdx(bestIdx)
      const timer = setTimeout(() => setHighlightedBlockIdx(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [lastAppliedFixText, editableText])

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-20), editableText])
    setRedoStack([])
  }, [editableText])

  const undo = () => {
    if (history.length === 0) return
    setRedoStack(prev => [editableText, ...prev])
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    onTextChange(prev)
  }

  const redo = () => {
    if (redoStack.length === 0) return
    setHistory(prev => [...prev, editableText])
    const next = redoStack[0]
    setRedoStack(r => r.slice(1))
    onTextChange(next)
  }

  const updateBlock = (idx, newContent) => {
    pushHistory()
    const updated = [...parsedBlocks]
    updated[idx] = newContent
    onTextChange(updated.join('\n\n'))
  }

  const moveBlock = (idx, dir) => {
    pushHistory()
    const updated = [...parsedBlocks]
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= updated.length) return
    const temp = updated[idx]
    updated[idx] = updated[swapIdx]
    updated[swapIdx] = temp
    onTextChange(updated.join('\n\n'))
  }

  const deleteBlock = (idx) => {
    pushHistory()
    onTextChange(parsedBlocks.filter((_, i) => i !== idx).join('\n\n'))
  }

  // ── PDF CANVAS EDITOR MODE ──
  if (viewMode === 'pdf-editor' && usePdfEditor) {
    return (
      <div className="flex-1 flex flex-col min-w-0 h-[850px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl print:w-full">
        <PdfEditorV2Studio
          initialPdfBytes={originalPdfBytes ? new Uint8Array(originalPdfBytes) : null}
          initialFileName={analysis?.fileName || 'candidate-resume.pdf'}
        />
      </div>
    )
  }

  // ── FALLBACK: Text-based WYSIWYG Sheet Mode ──
  // (for non-PDF uploads or pasted text)

  // Render High-Fidelity Interactive WYSIWYG Executive Sheet
  const renderWysiwygSheet = () => (
    <div className="space-y-4 text-[#1a1a1a] font-sans leading-relaxed">
      {parsedBlocks.map((block, idx) => {
        const isHeader = block.startsWith('# ') && !block.startsWith('## ')
        const isSection = block.startsWith('## ')
        const isBullets = block.startsWith('- ') || block.startsWith('* ')
        const isHovered = hoveredBlock === idx
        const isHighlighted = highlightedBlockIdx === idx

        return (
          <div
            key={idx}
            className={`relative group transition-all duration-500 rounded-lg p-1 -m-1 ${
              isHighlighted
                ? 'bg-emerald-500/20 shadow-md border border-emerald-500/40 ring-2 ring-emerald-400/50'
                : isHovered
                ? 'bg-purple-500/[0.04] ring-1 ring-purple-500/20'
                : ''
            }`}
            onMouseEnter={() => setHoveredBlock(idx)}
            onMouseLeave={() => setHoveredBlock(null)}
          >
            {/* Floating Executive Toolbar on Hover */}
            {isHovered && (
              <div className="absolute -top-3 right-2 z-20 flex items-center gap-1 bg-purple-600 text-white rounded-lg px-2 py-1 shadow-xl shadow-purple-500/30 print:hidden transition-all animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => onOptimize && onOptimize('insert_keywords')}
                  className="text-yellow-300 hover:text-white flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-700/60 hover:bg-purple-700"
                  title="Enhance keywords with AI"
                >
                  <Sparkles className="h-3 w-3 text-yellow-300 animate-pulse" /> AI Enhance
                </button>
                <div className="h-3 w-px bg-white/20 mx-0.5" />
                <button onClick={() => moveBlock(idx, -1)} className="text-white/80 hover:text-white p-0.5" title="Move Up">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => moveBlock(idx, 1)} className="text-white/80 hover:text-white p-0.5" title="Move Down">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteBlock(idx)} className="text-white/80 hover:text-red-300 p-0.5" title="Delete Block">
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Candidate Name & Contact Info */}
            {isHeader ? (
              <div className="text-center pb-3 mb-3 border-b-2 border-neutral-900">
                <input
                  type="text"
                  value={block.replace('# ', '')}
                  onChange={(e) => updateBlock(idx, `# ${e.target.value}`)}
                  className="w-full text-center text-3xl font-extrabold uppercase tracking-tight text-neutral-950 bg-transparent focus:outline-none focus:bg-purple-50 rounded px-2 py-0.5 transition-colors"
                  placeholder="CANDIDATE NAME"
                />
              </div>
            ) : isSection ? (
              <div className="pt-3 mb-2">
                <input
                  type="text"
                  value={block.replace('## ', '')}
                  onChange={(e) => updateBlock(idx, `## ${e.target.value}`)}
                  className="w-full text-xs font-black uppercase tracking-widest text-neutral-900 border-b-2 border-neutral-900 pb-1 bg-transparent focus:outline-none focus:bg-purple-50 rounded px-1 transition-colors"
                  placeholder="SECTION TITLE"
                />
              </div>
            ) : isBullets ? (
              <ul className="list-disc pl-5 space-y-1.5 text-[13px] text-neutral-800 leading-normal">
                {block.split('\n').map((line, lIdx) => {
                  const clean = line.replace(/^[*-]\s*/, '').trim()
                  if (!clean && lIdx === 0 && block.split('\n').length === 1) return null
                  return (
                    <li key={lIdx} className="relative pl-1 group/bullet hover:bg-purple-50/80 rounded px-1.5 py-0.5 transition-colors">
                      <div className="flex items-start gap-2">
                        <input
                          type="text"
                          value={clean}
                          onChange={(e) => {
                            pushHistory()
                            const lines = block.split('\n')
                            lines[lIdx] = `- ${e.target.value}`
                            updateBlock(idx, lines.join('\n'))
                          }}
                          className="w-full bg-transparent focus:outline-none text-neutral-800 text-[13px] font-medium"
                          placeholder="Quantified achievement bullet point..."
                        />
                        <button
                          onClick={() => {
                            pushHistory()
                            const lines = block.split('\n')
                            lines.splice(lIdx, 1)
                            if (lines.length === 0) deleteBlock(idx)
                            else updateBlock(idx, lines.join('\n'))
                          }}
                          className="opacity-0 group-hover/bullet:opacity-100 text-neutral-400 hover:text-red-500 p-0.5 transition-opacity print:hidden shrink-0"
                          title="Remove bullet"
                        >
                          <Trash className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  )
                })}
                <li className="list-none -ml-5 pt-1 print:hidden">
                  <button
                    onClick={() => updateBlock(idx, block + '\n- New achievement bullet...')}
                    className="text-[11px] text-purple-600 hover:text-purple-500 font-bold flex items-center gap-1 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Add bullet
                  </button>
                </li>
              </ul>
            ) : (
              <div className={`${idx === 1 ? 'text-center text-xs font-semibold text-neutral-600 -mt-2 mb-4 pb-2 border-b border-neutral-200' : 'text-[13px] text-neutral-700 leading-relaxed font-medium'}`}>
                <textarea
                  value={block}
                  onChange={(e) => updateBlock(idx, e.target.value)}
                  rows={idx === 1 ? 1 : Math.max(2, Math.ceil(block.length / 85))}
                  className="w-full bg-transparent focus:outline-none focus:bg-purple-50 rounded px-1 resize-none transition-colors"
                  placeholder="Professional summary or contact details..."
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-w-0 print:w-full">
      {/* Top Toolbar */}
      <div className="h-14 border-b border-white/10 bg-[#0d0d1f] flex items-center justify-between px-4 shrink-0 print:hidden">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setViewMode('sheet')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'sheet'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" /> Interactive WYSIWYG Sheet
          </button>
          {isPdfUploaded && (
            <button
              onClick={() => setViewMode(usePdfEditor ? 'pdf-editor' : 'original')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'original' || viewMode === 'pdf-editor'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title={usePdfEditor ? 'Edit PDF directly' : 'View exact uploaded PDF file'}
            >
              <FileText className="h-3.5 w-3.5 text-purple-400" />
              {usePdfEditor ? 'PDF Canvas Editor' : 'Original Uploaded PDF'}
            </button>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={!history.length} className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30 transition-colors" title="Undo (Ctrl+Z)">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={redo} disabled={!redoStack.length} className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-30 transition-colors" title="Redo (Ctrl+Y)">
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Print / Download */}
        <Button
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
        >
          <Download className="h-3.5 w-3.5" /> Download / Print PDF
        </Button>
      </div>

      {/* Sub Toolbar */}
      <div className="h-10 border-b border-white/10 bg-[#111127] flex items-center justify-between px-4 print:hidden text-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-300 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            {analysis?.fileName || 'candidate-resume.pdf'}
          </span>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-400">
            {viewMode === 'original' ? 'Viewing Original Uploaded PDF' : 'MockMate Live WYSIWYG Editing Mode'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-400 font-bold">
            Page <span className="text-white">1</span> / <span className="text-neutral-400">{isOnePage ? '1' : '2'}</span>
          </span>
          {viewMode === 'sheet' && (
            <button
              onClick={() => onOptimize && onOptimize('fit_one_page')}
              disabled={optimizing || isOnePage}
              className={`px-3 py-1 rounded-md border text-[11px] font-bold transition-all flex items-center gap-1 ${
                isOnePage
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-white/10 text-neutral-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FileCode className="h-3 w-3" /> Fit to 1 Page
            </button>
          )}
        </div>
      </div>

      {/* Document Canvas */}
      <div className="flex-1 overflow-auto bg-[#1a1a2e] p-6 md:p-10 flex justify-center print:p-0 print:bg-white print:m-0">
        {viewMode === 'original' && fileBase64 ? (
          <div className="w-full max-w-[850px] h-[1100px] bg-white rounded-lg shadow-2xl overflow-hidden border border-neutral-300 print:max-w-none print:w-full print:border-none print:shadow-none">
            <iframe src={fileBase64} className="w-full h-full border-none" title="Original Uploaded PDF Resume" />
          </div>
        ) : (
          <div
            id="pdf-paper-document"
            className="w-full max-w-[816px] min-h-[1056px] bg-white text-neutral-900 px-12 py-14 shadow-2xl rounded-sm border border-neutral-300 font-sans flex flex-col justify-between transition-all print:max-w-none print:w-full print:min-h-0 print:shadow-none print:border-none print:px-8 print:py-6 print:m-0"
            style={{ color: '#171717', backgroundColor: '#fff' }}
          >
            <div className="flex-1">
              {renderWysiwygSheet()}
            </div>
            <div className="pt-6 mt-auto border-t border-neutral-200 flex items-center justify-between text-[9px] text-neutral-400 font-mono print:pt-3">
              <span>Verified ATS Executive Resume · MockMate ATS Suite</span>
              <span>Page 1 of {isOnePage ? '1' : '2'} · {wordCount} words</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
