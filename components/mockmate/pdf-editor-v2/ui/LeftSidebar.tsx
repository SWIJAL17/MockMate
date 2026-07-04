'use client';

import React, { useState } from 'react';
import { usePdfEditorStore } from '@/lib/pdf-editor-v2/store';
import { Layers, FileText, ChevronRight, Hash, Type } from 'lucide-react';

export interface LeftSidebarProps {
  onSelectObject: (id: string | null, multi?: boolean) => void;
  width?: number;
}

/**
 * LeftSidebar — Page navigation thumbnails and interactive document outline tree.
 */
export default function LeftSidebar({ onSelectObject, width }: LeftSidebarProps) {
  const { pages, currentPage, setCurrentPage, objects, selection } = usePdfEditorStore();
  const selectedIds = selection.selectedIds;
  const [activeTab, setActiveTab] = useState<'pages' | 'outline'>('pages');

  const currentPageObjects = Object.values(objects).filter((obj) => obj.page === currentPage);

  return (
    <aside
      style={{ width: width ? `${width}px` : undefined }}
      className="bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 text-neutral-300 select-none z-40"
    >
      {/* Sidebar Tabs */}
      <div className="flex border-b border-neutral-800 p-1 bg-neutral-950/50">
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'pages'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Pages ({pages.length})
        </button>
        <button
          onClick={() => setActiveTab('outline')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'outline'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Outline ({currentPageObjects.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {activeTab === 'pages' ? (
          <div className="space-y-3">
            {pages.map((p, idx) => (
              <div
                key={`thumb-${idx}`}
                onClick={() => setCurrentPage(idx)}
                className={`group relative border-2 rounded-lg p-2 cursor-pointer transition-all ${
                  currentPage === idx
                    ? 'border-purple-500 bg-purple-500/10 shadow-md'
                    : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/40'
                }`}
              >
                <div className="aspect-[8.5/11] w-full bg-white/5 rounded border border-neutral-800 flex items-center justify-center text-neutral-600 text-xs font-mono">
                  Page {idx + 1} Preview
                </div>
                <div className="flex items-center justify-between mt-2 text-xs font-medium">
                  <span className="text-neutral-300">Page {idx + 1}</span>
                  <span className="text-[10px] text-neutral-500">{Math.round(p.pdfWidth)}×{Math.round(p.pdfHeight)}pt</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-1 mb-2">
              Page {currentPage + 1} Elements
            </div>
            {currentPageObjects.length === 0 ? (
              <div className="text-xs text-neutral-500 text-center py-6">No text blocks found on this page.</div>
            ) : (
              currentPageObjects.map((obj) => {
                const isSelected = selectedIds.has(obj.id);
                return (
                  <div
                    key={obj.id}
                    onClick={(e) => onSelectObject(obj.id, e.shiftKey || e.ctrlKey)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 font-medium'
                        : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Type className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    <span className="truncate flex-1">{obj.text || 'Empty block'}</span>
                    {obj.modificationState !== 'unmodified' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" title={obj.modificationState} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
