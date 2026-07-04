/**
 * Commercial-Grade PDF Resume Editor — Command Pattern History Engine (Phase 10)
 * 
 * Replaces memory-heavy array snapshots with atomic, reversible Command objects.
 * Enforces a 50-step stack limit and provides automated background autosaving.
 */

import { HistoryCommand, DocumentObject, BoundingBox } from '../types';
import { usePdfEditorStore } from '../store';
import { editingEngine, FormattingOptions } from '../editing';

export interface HistoryEngineService {
  /** Execute a command, apply its effect, and push onto the undo stack */
  execute(command: HistoryCommand): void;
  
  /** Undo the most recent command */
  undo(): boolean;
  
  /** Redo the most recently undone command */
  redo(): boolean;
  
  /** Clear undo and redo stacks */
  clear(): void;
  
  /** Get current stack counts */
  getStats(): { undoCount: number; redoCount: number };
  
  /** Initialize background autosaving interval */
  setupAutosave(intervalMs?: number, onSave?: (objects: Record<string, DocumentObject>) => void): () => void;
}

export class HistoryEngineServiceImpl implements HistoryEngineService {
  private undoStack: HistoryCommand[] = [];
  private redoStack: HistoryCommand[] = [];
  private readonly maxStackSize = 50;
  private autosaveTimer: any = null;

  execute(command: HistoryCommand): void {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift(); // Evict oldest command to preserve RAM
    }
    this.redoStack = []; // New execution clears redo branch
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    const command = this.redoStack.pop()!;
    command.execute();
    this.undoStack.push(command);
    return true;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getStats(): { undoCount: number; redoCount: number } {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    };
  }

  setupAutosave(
    intervalMs = 30000,
    onSave?: (objects: Record<string, DocumentObject>) => void
  ): () => void {
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);

    this.autosaveTimer = setInterval(() => {
      const store = usePdfEditorStore.getState();
      if (store && Object.keys(store.objects).length > 0) {
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('mockmate_pdf_editor_autosave', JSON.stringify({
              fileName: store.fileName,
              timestamp: Date.now(),
              objects: store.objects,
            }));
          }
          if (onSave) onSave(store.objects);
        } catch (e) {
          console.warn('[HistoryEngine] Autosave failed:', e);
        }
      }
    }, intervalMs);

    return () => {
      if (this.autosaveTimer) {
        clearInterval(this.autosaveTimer);
        this.autosaveTimer = null;
      }
    };
  }
}

export const historyEngine = new HistoryEngineServiceImpl();

/* ============================================================================
 * ATOMIC COMMAND IMPLEMENTATIONS
 * ============================================================================ */

export class InsertTextCommand implements HistoryCommand {
  readonly id = `cmd_insert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  readonly type = 'InsertText';
  readonly timestamp = Date.now();

  constructor(
    private objectId: string,
    private caretIndex: number,
    private char: string
  ) {}

  execute(): void {
    const store = usePdfEditorStore.getState();
    const obj = store.objects[this.objectId];
    if (!obj) return;
    const res = editingEngine.insertCharAt(obj, this.caretIndex, this.char);
    store.updateObject(this.objectId, res.updatedObject);
  }

  undo(): void {
    const store = usePdfEditorStore.getState();
    const obj = store.objects[this.objectId];
    if (!obj) return;
    const res = editingEngine.deleteCharAt(obj, this.caretIndex + this.char.length, 'backspace', {
      start: this.caretIndex,
      end: this.caretIndex + this.char.length,
    });
    store.updateObject(this.objectId, res.updatedObject);
  }
}

export class DeleteTextCommand implements HistoryCommand {
  readonly id = `cmd_delete_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  readonly type = 'DeleteText';
  readonly timestamp = Date.now();

  constructor(
    private objectId: string,
    private deletedText: string,
    private startIndex: number
  ) {}

  execute(): void {
    const store = usePdfEditorStore.getState();
    const obj = store.objects[this.objectId];
    if (!obj) return;
    const res = editingEngine.deleteCharAt(obj, this.startIndex, 'delete', {
      start: this.startIndex,
      end: this.startIndex + this.deletedText.length,
    });
    store.updateObject(this.objectId, res.updatedObject);
  }

  undo(): void {
    const store = usePdfEditorStore.getState();
    const obj = store.objects[this.objectId];
    if (!obj) return;
    const res = editingEngine.insertCharAt(obj, this.startIndex, this.deletedText);
    store.updateObject(this.objectId, res.updatedObject);
  }
}

export class ReplaceTextCommand implements HistoryCommand {
  readonly id = `cmd_replace_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  readonly type = 'ReplaceText';
  readonly timestamp = Date.now();

  constructor(
    private objectId: string,
    private oldText: string,
    private newText: string
  ) {}

  execute(): void {
    const store = usePdfEditorStore.getState();
    const obj = store.objects[this.objectId];
    if (!obj) return;
    const updated = editingEngine.replaceText(obj, this.newText);
    store.updateObject(this.objectId, updated);
  }

  undo(): void {
    const store = usePdfEditorStore.getState();
    const obj = store.objects[this.objectId];
    if (!obj) return;
    const updated = editingEngine.replaceText(obj, this.oldText);
    store.updateObject(this.objectId, updated);
  }
}

export class AIRewriteCommand extends ReplaceTextCommand {
  readonly type = 'AIRewrite' as any;
}

export class MoveObjectCommand implements HistoryCommand {
  readonly id = `cmd_move_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  readonly type = 'MoveObject';
  readonly timestamp = Date.now();

  constructor(
    private objectId: string,
    private oldBBox: BoundingBox,
    private newBBox: BoundingBox
  ) {}

  execute(): void {
    const store = usePdfEditorStore.getState();
    store.updateObject(this.objectId, { boundingBox: [...this.newBBox] });
  }

  undo(): void {
    const store = usePdfEditorStore.getState();
    store.updateObject(this.objectId, { boundingBox: [...this.oldBBox] });
  }
}

export class ResizeObjectCommand implements HistoryCommand {
  readonly id = `cmd_resize_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  readonly type = 'ResizeObject';
  readonly timestamp = Date.now();

  constructor(
    private objectId: string,
    private oldBBox: BoundingBox,
    private newBBox: BoundingBox
  ) {}

  execute(): void {
    const store = usePdfEditorStore.getState();
    store.updateObject(this.objectId, { boundingBox: [...this.newBBox] });
  }

  undo(): void {
    const store = usePdfEditorStore.getState();
    store.updateObject(this.objectId, { boundingBox: [...this.oldBBox] });
  }
}

export class FormatObjectCommand implements HistoryCommand {
  readonly id = `cmd_format_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  readonly type = 'FormatObject';
  readonly timestamp = Date.now();

  constructor(
    private objectIds: string[],
    private oldFormats: Array<Partial<DocumentObject>>,
    private newFormat: FormattingOptions
  ) {}

  execute(): void {
    const store = usePdfEditorStore.getState();
    const targets = this.objectIds.map((id) => store.objects[id]).filter(Boolean);
    const updated = editingEngine.applyFormatting(targets, this.newFormat);
    const updates = updated.map((u) => ({ id: u.id, changes: u }));
    store.batchUpdateObjects(updates);
  }

  undo(): void {
    const store = usePdfEditorStore.getState();
    const updates = this.objectIds.map((id, idx) => ({
      id,
      changes: this.oldFormats[idx] || {},
    }));
    store.batchUpdateObjects(updates);
  }
}
