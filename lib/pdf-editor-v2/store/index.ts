/**
 * Commercial-Grade PDF Resume Editor — Central State Store
 * 
 * Manages the Document Model, Page Viewports, Selection state, and UI loading flags
 * using dictionary-based O(1) object lookups for high performance.
 */

import { create } from 'zustand';
import { EditorState, DocumentObject, PageViewportInfo, ZoomLevel, FitMode, SelectionState, ResizeHandleType } from '../types';

interface EditorActions {
  // Document actions
  loadPdf: (bytes: Uint8Array, fileName: string) => void;
  setPages: (pages: PageViewportInfo[]) => void;
  setObjects: (objects: DocumentObject[]) => void;
  updateObject: (id: string, updates: Partial<DocumentObject>) => void;
  batchUpdateObjects: (updates: Array<{ id: string; changes: Partial<DocumentObject> }>) => void;
  deleteObject: (id: string) => void;
  
  // Selection actions
  selectObject: (id: string | null, multi?: boolean) => void;
  hoverObject: (id: string | null) => void;
  setDragging: (isDragging: boolean, handle?: ResizeHandleType | null, startX?: number, startY?: number) => void;
  clearSelection: () => void;
  setEditingId: (id: string | null) => void;

  // Viewport & Zoom actions
  setZoom: (zoom: ZoomLevel) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setFitMode: (mode: FitMode) => void;
  setCurrentPage: (pageIndex: number) => void;
  setDevicePixelRatio: (dpr: number) => void;

  // Status actions
  setLoading: (isLoading: boolean) => void;
  setParsing: (isParsing: boolean) => void;
  setExporting: (isExporting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialSelection: SelectionState = {
  selectedIds: new Set(),
  hoveredId: null,
  isDragging: false,
  activeHandle: null,
  dragStartX: 0,
  dragStartY: 0,
};

const initialState: EditorState = {
  originalPdfBytes: null,
  fileName: '',
  pages: [],
  currentPage: 0,
  zoom: 1.0,
  fitMode: 'width',
  devicePixelRatio: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
  objects: {},
  pageObjectIds: {},
  selection: initialSelection,
  editingId: null,
  isLoading: false,
  isParsing: false,
  isExporting: false,
  isDirty: false,
  error: null,
};

export const usePdfEditorStore = create<EditorState & EditorActions>((set, get) => ({
  ...initialState,

  loadPdf: (bytes, fileName) => set({
    ...initialState,
    originalPdfBytes: bytes,
    fileName,
    devicePixelRatio: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
  }),

  setPages: (pages) => set({ pages }),

  setObjects: (objectArray) => {
    const objects: Record<string, DocumentObject> = {};
    const pageObjectIds: Record<number, string[]> = {};

    for (const obj of objectArray) {
      objects[obj.id] = obj;
      if (!pageObjectIds[obj.page]) {
        pageObjectIds[obj.page] = [];
      }
      pageObjectIds[obj.page].push(obj.id);
    }

    set({ objects, pageObjectIds, isParsing: false });
  },

  updateObject: (id, updates) => set((state) => {
    const existing = state.objects[id];
    if (!existing) return state;

    const isTextChange = updates.text !== undefined && updates.text !== existing.originalText;
    const modState = isTextChange ? 'modified' : existing.modificationState;

    const updatedObj: DocumentObject = {
      ...existing,
      ...updates,
      modificationState: modState,
    };

    return {
      objects: {
        ...state.objects,
        [id]: updatedObj,
      },
      isDirty: true,
    };
  }),

  batchUpdateObjects: (updates) => set((state) => {
    const newObjects = { ...state.objects };
    for (const item of updates) {
      const existing = newObjects[item.id];
      if (existing) {
        const isTextChange = item.changes.text !== undefined && item.changes.text !== existing.originalText;
        const modState = isTextChange ? 'modified' : existing.modificationState;
        newObjects[item.id] = {
          ...existing,
          ...item.changes,
          modificationState: modState,
        };
      }
    }
    return { objects: newObjects, isDirty: true };
  }),

  deleteObject: (id) => set((state) => {
    const existing = state.objects[id];
    if (!existing) return state;

    const newObjects = { ...state.objects };
    delete newObjects[id];

    const pageIndex = existing.page;
    const newPageIds = { ...state.pageObjectIds };
    if (newPageIds[pageIndex]) {
      newPageIds[pageIndex] = newPageIds[pageIndex].filter((i) => i !== id);
    }

    const newSelected = new Set(state.selection.selectedIds);
    newSelected.delete(id);

    return {
      objects: newObjects,
      pageObjectIds: newPageIds,
      selection: {
        ...state.selection,
        selectedIds: newSelected,
      },
      editingId: state.editingId === id ? null : state.editingId,
      isDirty: true,
    };
  }),

  selectObject: (id, multi = false) => set((state) => {
    const newSelected = new Set(multi ? state.selection.selectedIds : []);
    if (id) {
      if (multi && newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    }
    return {
      selection: {
        ...state.selection,
        selectedIds: newSelected,
      },
      editingId: id && !multi ? state.editingId : null,
    };
  }),

  hoverObject: (id) => set((state) => {
    if (state.selection.hoveredId === id) return state; // no-op: avoid re-render storm on mousemove
    return {
      selection: {
        ...state.selection,
        hoveredId: id,
      },
    };
  }),

  setDragging: (isDragging, activeHandle = null, dragStartX = 0, dragStartY = 0) => set((state) => ({
    selection: {
      ...state.selection,
      isDragging,
      activeHandle,
      dragStartX,
      dragStartY,
    },
  })),

  clearSelection: () => set((state) => ({
    selection: {
      ...state.selection,
      selectedIds: new Set(),
      activeHandle: null,
      isDragging: false,
    },
    editingId: null,
  })),

  setEditingId: (id) => set({ editingId: id }),

  setZoom: (zoom) => set({ zoom: typeof zoom === 'number' ? Math.max(0.25, Math.min(8.0, zoom)) : 1.0 }),
  zoomIn: () => set((state) => {
    const current = typeof state.zoom === 'number' ? state.zoom : 1.0;
    return { zoom: Math.min(8.0, current + 0.25) };
  }),
  zoomOut: () => set((state) => {
    const current = typeof state.zoom === 'number' ? state.zoom : 1.0;
    return { zoom: Math.max(0.25, current - 0.25) };
  }),
  setFitMode: (fitMode) => set({ fitMode }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setDevicePixelRatio: (devicePixelRatio) => set({ devicePixelRatio }),

  setLoading: (isLoading) => set({ isLoading }),
  setParsing: (isParsing) => set({ isParsing }),
  setExporting: (isExporting) => set((s) => ({ isExporting, isDirty: isExporting ? s.isDirty : false })),
  setError: (error) => set({ error, isLoading: false, isParsing: false, isExporting: false }),
  reset: () => set(initialState),
}));
