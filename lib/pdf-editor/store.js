'use client'
import { create } from 'zustand'

/**
 * PDF Editor Zustand Store
 * Central state for the entire PDF editing engine.
 */
const usePdfEditorStore = create((set, get) => ({
  // ── Original PDF ──
  originalPdfBytes: null,       // ArrayBuffer of the uploaded PDF
  fileName: '',

  // ── Pages ──
  pages: [],                    // [{ width, height, pageIndex }]
  currentPage: 0,
  zoom: 1.0,
  fitMode: 'width',             // 'width' | 'page' | 'custom'

  // ── Document Object Model ──
  objects: [],                  // Parsed text/image objects from the PDF
  selectedObjectId: null,
  hoveredObjectId: null,

  // ── Modified tracking (for surgical export) ──
  modifiedObjectIds: new Set(),

  // ── History (undo/redo) ──
  history: [],
  redoStack: [],
  maxHistory: 50,

  // ── UI State ──
  isLoading: false,
  isParsing: false,
  isExporting: false,
  error: null,

  // ── Actions ──

  /** Load a new PDF into the editor */
  loadPdf: (bytes, fileName) => {
    set({
      originalPdfBytes: bytes,
      fileName,
      objects: [],
      pages: [],
      selectedObjectId: null,
      hoveredObjectId: null,
      modifiedObjectIds: new Set(),
      history: [],
      redoStack: [],
      currentPage: 0,
      zoom: 1.0,
      error: null,
    })
  },

  /** Set parsed pages info */
  setPages: (pages) => set({ pages }),

  /** Set parsed objects from PDF */
  setObjects: (objects) => set({ objects, isParsing: false }),

  /** Select an object */
  selectObject: (id) => set({ selectedObjectId: id }),

  /** Hover an object */
  hoverObject: (id) => set({ hoveredObjectId: id }),

  /** Deselect */
  clearSelection: () => set({ selectedObjectId: null }),

  /** Update a single object (tracks modification for export) */
  updateObject: (id, updates) => {
    const state = get()
    // Push current state to history
    const historyEntry = JSON.parse(JSON.stringify(state.objects))
    const newHistory = [...state.history.slice(-(state.maxHistory - 1)), historyEntry]

    const newObjects = state.objects.map(obj =>
      obj.id === id ? { ...obj, ...updates } : obj
    )
    const newModified = new Set(state.modifiedObjectIds)
    newModified.add(id)

    set({
      objects: newObjects,
      modifiedObjectIds: newModified,
      history: newHistory,
      redoStack: [],
    })
  },

  /** Batch update multiple objects */
  updateObjects: (updates) => {
    const state = get()
    const historyEntry = JSON.parse(JSON.stringify(state.objects))
    const newHistory = [...state.history.slice(-(state.maxHistory - 1)), historyEntry]
    const newModified = new Set(state.modifiedObjectIds)

    const newObjects = state.objects.map(obj => {
      const upd = updates.find(u => u.id === obj.id)
      if (upd) {
        newModified.add(obj.id)
        return { ...obj, ...upd.changes }
      }
      return obj
    })

    set({
      objects: newObjects,
      modifiedObjectIds: newModified,
      history: newHistory,
      redoStack: [],
    })
  },

  /** Undo */
  undo: () => {
    const state = get()
    if (state.history.length === 0) return
    const prev = state.history[state.history.length - 1]
    set({
      redoStack: [JSON.parse(JSON.stringify(state.objects)), ...state.redoStack],
      objects: prev,
      history: state.history.slice(0, -1),
    })
  },

  /** Redo */
  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return
    const next = state.redoStack[0]
    set({
      history: [...state.history, JSON.parse(JSON.stringify(state.objects))],
      objects: next,
      redoStack: state.redoStack.slice(1),
    })
  },

  /** Zoom controls */
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4.0, zoom)) }),
  zoomIn: () => set(s => ({ zoom: Math.min(4.0, s.zoom + 0.15) })),
  zoomOut: () => set(s => ({ zoom: Math.max(0.25, s.zoom - 0.15) })),
  fitToWidth: () => set({ fitMode: 'width' }),

  /** Page navigation */
  setCurrentPage: (page) => set({ currentPage: page }),

  /** Loading states */
  setLoading: (v) => set({ isLoading: v }),
  setParsing: (v) => set({ isParsing: v }),
  setExporting: (v) => set({ isExporting: v }),
  setError: (e) => set({ error: e }),

  /** Get object by ID */
  getObjectById: (id) => get().objects.find(o => o.id === id),

  /** Get selected object */
  getSelectedObject: () => {
    const s = get()
    return s.objects.find(o => o.id === s.selectedObjectId) || null
  },

  /** Get objects for a specific page */
  getPageObjects: (pageIndex) => get().objects.filter(o => o.page === pageIndex),

  /** Delete an object */
  deleteObject: (id) => {
    const state = get()
    const historyEntry = JSON.parse(JSON.stringify(state.objects))
    const newHistory = [...state.history.slice(-(state.maxHistory - 1)), historyEntry]
    set({
      objects: state.objects.filter(o => o.id !== id),
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
      history: newHistory,
      redoStack: [],
    })
  },

  /** Reset editor */
  reset: () => set({
    originalPdfBytes: null,
    fileName: '',
    pages: [],
    objects: [],
    selectedObjectId: null,
    hoveredObjectId: null,
    modifiedObjectIds: new Set(),
    history: [],
    redoStack: [],
    currentPage: 0,
    zoom: 1.0,
    isLoading: false,
    isParsing: false,
    isExporting: false,
    error: null,
  }),
}))

export default usePdfEditorStore
