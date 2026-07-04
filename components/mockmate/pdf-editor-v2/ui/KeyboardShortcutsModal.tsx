'use client';

import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * KeyboardShortcutsModal — Figma/Canva style shortcut guide overlay.
 */
export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { action: 'Undo last edit', keys: ['Ctrl', 'Z'] },
    { action: 'Redo undone edit', keys: ['Ctrl', 'Y'] },
    { action: 'Multi-select elements', keys: ['Shift', 'Click'] },
    { action: 'Select entire word', keys: ['Double Click'] },
    { action: 'Select entire bullet / paragraph', keys: ['Triple Click'] },
    { action: 'Jump word by word', keys: ['Ctrl', '← / →'] },
    { action: 'Delete selected element(s)', keys: ['Del / Backspace'] },
    { action: 'Trigger AI bullet rewrite', keys: ['Sparkles Icon'] },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Keyboard className="h-4 w-4 text-purple-400" />
            <span>Keyboard Shortcuts & Gestures</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {shortcuts.map((s, idx) => (
            <div
              key={`shortcut-${idx}`}
              className="flex items-center justify-between py-2 border-b border-neutral-800/60 last:border-0 text-xs"
            >
              <span className="text-neutral-300 font-medium">{s.action}</span>
              <div className="flex items-center gap-1.5 font-mono">
                {s.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="bg-neutral-800 border border-neutral-700 text-neutral-200 px-2 py-0.5 rounded shadow-xs text-[11px]"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950/80 border-t border-neutral-800 text-[11px] text-neutral-500 text-center">
          Press <kbd className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">F1</kbd> or <kbd className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">Esc</kbd> to close this guide anytime.
        </div>
      </div>
    </div>
  );
}
