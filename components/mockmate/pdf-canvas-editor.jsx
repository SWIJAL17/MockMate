'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import usePdfEditorStore from '@/lib/pdf-editor/store'
import { parsePdf, renderPageToCanvas } from '@/lib/pdf-editor/pdf-parser'
import { exportModifiedPdf, downloadPdf } from '@/lib/pdf-editor/pdf-exporter'
import { Loader2 } from 'lucide-react'

/**
 * PdfCanvasEditor — The main PDF editing canvas.
 * 
 * Renders the PDF via PDF.js as background, overlays absolutely-positioned
 * contentEditable text spans for each parsed text object.
 * Click to select, double-click to edit, preserving exact position & font.
 */
export default function PdfCanvasEditor({ pdfBytes, onReady }) {
  const store = usePdfEditorStore()
  const containerRef = useRef(null)
  const canvasRefs = useRef({})      // { pageIndex: canvasEl }
  const [editingId, setEditingId] = useState(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const editRefs = useRef({})

  // ── Initialize: Parse PDF when bytes change ──
  useEffect(() => {
    if (!pdfBytes) return
    let cancelled = false

    const init = async () => {
      store.setLoading(true)
      store.setParsing(true)
      store.loadPdf(pdfBytes, store.fileName || 'resume.pdf')

      try {
        const { pages, objects } = await parsePdf(pdfBytes)
        if (cancelled) return
        store.setPages(pages)
        store.setObjects(objects)
        store.setLoading(false)
        if (onReady) onReady({ pages, objects })
      } catch (err) {
        console.error('PDF parse error:', err)
        store.setError('Failed to parse PDF. Please try a different file.')
        store.setLoading(false)
        store.setParsing(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [pdfBytes])

  // ── Measure container width for fit-to-width scaling ──
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width - 48) // padding
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // ── Calculate zoom to fit page width ──
  const effectiveZoom = useCallback(() => {
    if (store.pages.length === 0) return store.zoom
    const pageWidth = store.pages[0]?.width || 612
    if (store.fitMode === 'width') {
      return Math.min(containerWidth / pageWidth, 2.0)
    }
    return store.zoom
  }, [store.pages, store.zoom, store.fitMode, containerWidth])

  // ── Render PDF pages to canvases ──
  useEffect(() => {
    if (!pdfBytes || store.pages.length === 0) return

    const scale = effectiveZoom()
    store.pages.forEach(async (pageInfo) => {
      const canvas = canvasRefs.current[pageInfo.pageIndex]
      if (!canvas) return
      try {
        await renderPageToCanvas(pdfBytes, pageInfo.pageIndex, canvas, scale)
      } catch (err) {
        console.error(`Failed to render page ${pageInfo.pageIndex}:`, err)
      }
    })
  }, [pdfBytes, store.pages, effectiveZoom])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (editingId) return // Don't intercept when editing text

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        store.undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        store.redo()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (store.selectedObjectId && !editingId) {
          e.preventDefault()
          store.deleteObject(store.selectedObjectId)
        }
      }
      if (e.key === 'Escape') {
        setEditingId(null)
        store.clearSelection()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingId, store.selectedObjectId])

  // ── Handle text editing finish ──
  const finishEditing = useCallback((objId) => {
    const el = editRefs.current[objId]
    if (!el) return
    const newText = el.innerText || el.textContent || ''
    store.updateObject(objId, { text: newText })
    setEditingId(null)
  }, [store])

  // ── Export handler ──
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

  // ── Zoom via scroll ──
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      store.setZoom(effectiveZoom() + delta)
    }
  }, [effectiveZoom, store])

  const zoom = effectiveZoom()

  // ── Loading State ──
  if (store.isLoading || store.isParsing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1a1a2e]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400 mx-auto" />
          <p className="text-neutral-300 font-bold text-sm">
            {store.isParsing ? 'Parsing PDF structure...' : 'Loading PDF...'}
          </p>
          <p className="text-neutral-500 text-xs">Extracting text objects with exact positions and fonts</p>
        </div>
      </div>
    )
  }

  // ── Error State ──
  if (store.error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1a1a2e]">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-bold">{store.error}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-[#1a1a2e] print:bg-white print:overflow-visible"
      onWheel={handleWheel}
      onClick={(e) => {
        // Click on background = deselect
        if (e.target === containerRef.current || e.target.closest('[data-page-container]')) {
          if (!e.target.closest('[data-text-object]')) {
            setEditingId(null)
            store.clearSelection()
          }
        }
      }}
    >
      <div className="flex flex-col items-center py-6 gap-6 px-6" style={{ minHeight: '100%' }}>
        {store.pages.map((pageInfo) => {
          const pageWidth = pageInfo.width * zoom
          const pageHeight = pageInfo.height * zoom
          const pageObjects = store.objects.filter(o => o.page === pageInfo.pageIndex)

          return (
            <div
              key={pageInfo.pageIndex}
              data-page-container
              className="relative bg-white shadow-2xl border border-neutral-300 print:shadow-none print:border-none"
              style={{
                width: pageWidth,
                height: pageHeight,
              }}
            >
              {/* PDF.js rendered background */}
              <canvas
                ref={(el) => { canvasRefs.current[pageInfo.pageIndex] = el }}
                className="absolute inset-0 pointer-events-none"
                style={{ width: pageWidth, height: pageHeight }}
              />

              {/* Editable text overlay layer */}
              <div className="absolute inset-0" style={{ width: pageWidth, height: pageHeight }}>
                {pageObjects.map((obj) => {
                  const isSelected = store.selectedObjectId === obj.id
                  const isEditing = editingId === obj.id
                  const isHovered = store.hoveredObjectId === obj.id
                  const isModified = store.modifiedObjectIds.has(obj.id) || (obj.originalText !== undefined && obj.text !== obj.originalText)

                  return (
                    <div
                      key={obj.id}
                      data-text-object
                      className={`absolute cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20 bg-purple-500/[0.06]'
                          : isHovered
                          ? 'ring-1 ring-purple-400/50 bg-purple-500/[0.03]'
                          : ''
                      }`}
                      style={{
                        left: obj.x * zoom,
                        top: obj.y * zoom,
                        minWidth: obj.width * zoom,
                        minHeight: obj.height * zoom,
                        fontFamily: obj.fontFamily,
                        fontSize: obj.fontSize * zoom,
                        fontWeight: obj.fontWeight,
                        fontStyle: obj.fontStyle,
                        color: isEditing || isModified ? obj.color : 'transparent',
                        lineHeight: obj.lineHeight,
                        letterSpacing: obj.letterSpacing ? `${obj.letterSpacing}px` : undefined,
                        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
                        whiteSpace: 'pre',
                        zIndex: isEditing ? 50 : isSelected ? 20 : isModified ? 15 : isHovered ? 10 : 1,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        store.selectObject(obj.id)
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        store.selectObject(obj.id)
                        setEditingId(obj.id)
                        // Focus the editable after render
                        requestAnimationFrame(() => {
                          const el = editRefs.current[obj.id]
                          if (el) {
                            el.focus()
                            // Place cursor at end
                            const range = document.createRange()
                            const sel = window.getSelection()
                            range.selectNodeContents(el)
                            range.collapse(false)
                            sel.removeAllRanges()
                            sel.addRange(range)
                          }
                        })
                      }}
                      onMouseEnter={() => store.hoverObject(obj.id)}
                      onMouseLeave={() => store.hoverObject(null)}
                    >
                      {isEditing ? (
                        <span
                          ref={(el) => { editRefs.current[obj.id] = el }}
                          contentEditable
                          suppressContentEditableWarning
                          className="outline-none bg-white text-neutral-900 shadow-md ring-2 ring-purple-500 rounded px-1 -mx-1 inline-block min-w-[20px]"
                          style={{
                            fontFamily: obj.fontFamily,
                            fontSize: obj.fontSize * zoom,
                            fontWeight: obj.fontWeight,
                            fontStyle: obj.fontStyle,
                            color: '#111827',
                          }}
                          onBlur={() => finishEditing(obj.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              finishEditing(obj.id)
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              setEditingId(null)
                              store.clearSelection()
                            }
                          }}
                        >
                          {obj.text}
                        </span>
                      ) : (
                        <span className={`pointer-events-none select-none inline-block ${isModified ? 'bg-white text-neutral-900 px-0.5 rounded shadow-sm' : ''}`}>
                          {obj.text}
                        </span>
                      )}

                      {/* Selection handles */}
                      {isSelected && !isEditing && (
                        <>
                          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-purple-500 rounded-full border-2 border-white shadow-sm cursor-nw-resize print:hidden" />
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border-2 border-white shadow-sm cursor-ne-resize print:hidden" />
                          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-purple-500 rounded-full border-2 border-white shadow-sm cursor-sw-resize print:hidden" />
                          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border-2 border-white shadow-sm cursor-se-resize print:hidden" />
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
