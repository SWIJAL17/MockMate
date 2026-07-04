'use client';

import React from 'react';
import { DocumentObject } from '@/lib/pdf-editor-v2/types';
import { coordinateEngine } from '@/lib/pdf-editor-v2/layout';
import { Sparkles, Edit3, Trash2, PlusCircle } from 'lucide-react';

export interface OverlayLayerProps {
  objects: Record<string, DocumentObject>;
  pageHeight: number;
  zoom: number;
  onTriggerAIRewrite?: (id: string) => void;
}

/**
 * Layer 5: OverlayLayer — Renders AI rewrite triggers, badges, and modification flags.
 */
export default function OverlayLayer({
  objects,
  pageHeight,
  zoom,
  onTriggerAIRewrite,
}: OverlayLayerProps) {
  return (
    <div className="absolute inset-0 z-40 pointer-events-none select-none">
      {Object.values(objects).map((obj) => {
        if (obj.modificationState === 'unmodified') return null;

        const rect = coordinateEngine.pdfToScreenRect(obj.boundingBox, pageHeight, zoom);
        
        return (
          <div
            key={`overlay-${obj.id}`}
            className="absolute flex items-center gap-1 pointer-events-auto z-50 animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: `${rect.left + rect.width - 4}px`,
              top: `${rect.top - 10}px`,
            }}
          >
            {/* Modification State Badge */}
            <div className="flex items-center gap-1 bg-neutral-900/90 text-white border border-white/20 rounded-full px-2 py-0.5 shadow-md backdrop-blur-md text-[10px] font-semibold tracking-wide">
              {obj.modificationState === 'modified' && <Edit3 className="h-2.5 w-2.5 text-purple-400" />}
              {obj.modificationState === 'inserted' && <PlusCircle className="h-2.5 w-2.5 text-emerald-400" />}
              {obj.modificationState === 'deleted' && <Trash2 className="h-2.5 w-2.5 text-red-400" />}
              <span className="capitalize">{obj.modificationState}</span>
            </div>

            {/* AI Rewrite Action Trigger */}
            {onTriggerAIRewrite && obj.modificationState !== 'deleted' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTriggerAIRewrite(obj.id);
                }}
                className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-all cursor-pointer"
                title="AI Rewrite Bullet Point"
              >
                <Sparkles className="h-3 w-3 animate-pulse" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
