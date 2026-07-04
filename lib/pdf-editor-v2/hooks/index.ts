/**
 * Commercial-Grade PDF Resume Editor — Custom Hooks
 * 
 * Provides clean React bindings for accessing the central store,
 * keyboard shortcut interception, and zoom math.
 */

import { useEffect } from 'react';
import { usePdfEditorStore } from '../store';

/**
 * Hook to listen for global keyboard shortcuts (Undo/Redo/Delete/Escape)
 */
export function useEditorShortcuts() {
  const store = usePdfEditorStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore shortcuts if editing inside an input/textarea/contentEditable
      if (store.editingId || ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        // Undo handled by Phase 10 History Engine
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        // Redo handled by Phase 10 History Engine
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedIds = Array.from(store.selection.selectedIds);
        if (selectedIds.length > 0) {
          e.preventDefault();
          selectedIds.forEach((id) => store.deleteObject(id));
        }
      }
      if (e.key === 'Escape') {
        store.clearSelection();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);
}
