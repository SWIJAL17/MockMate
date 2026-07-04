'use client';

import React, { useState } from 'react';
import { usePdfEditorStore } from '@/lib/pdf-editor-v2/store';
import { historyEngine, FormatObjectCommand } from '@/lib/pdf-editor-v2/history';
import { aiIntegrationService } from '@/lib/pdf-editor-v2/ai';
import { 
  Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Sparkles, Sliders, Palette, LayoutGrid, Loader2 
} from 'lucide-react';

export interface RightPropertiesPanelProps {
  width?: number;
}

/**
 * RightPropertiesPanel — Canva/Figma style inspector for typography formatting,
 * exact bounding box coordinates, and AI bullet point rewriting.
 */
export default function RightPropertiesPanel({ width }: RightPropertiesPanelProps = {}) {
  const { objects, selection } = usePdfEditorStore();
  const selectedIds = selection.selectedIds;
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [tone, setTone] = useState<'professional' | 'executive' | 'technical' | 'concise'>('professional');

  const selectedArray = Array.from(selectedIds).map((id) => objects[id]).filter(Boolean);
  const firstObj = selectedArray[0];

  if (!firstObj) {
    return (
      <aside
        style={{ width: width ? `${width}px` : undefined }}
        className="bg-neutral-900 border-l border-neutral-800 p-4 flex flex-col shrink-0 text-neutral-400 select-none z-40"
      >
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
          <Sliders className="h-10 w-10 text-neutral-600 stroke-1" />
          <div className="text-sm font-semibold text-neutral-300">No Element Selected</div>
          <p className="text-xs text-neutral-500 max-w-[200px]">
            Click on any text block or bullet point on the resume canvas to edit typography, layout geometry, or trigger AI rewrites.
          </p>
        </div>
      </aside>
    );
  }

  const handleFormatChange = (field: string, val: any) => {
    const oldFormats = selectedArray.map((o) => ({ [field]: (o as any)[field] }));
    const command = new FormatObjectCommand(
      selectedArray.map((o) => o.id),
      oldFormats,
      { [field]: val }
    );
    historyEngine.execute(command);
  };

  const handleTriggerAIRewrite = async () => {
    setIsAiLoading(true);
    const keywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    try {
      await aiIntegrationService.rewriteBullet(firstObj.id, {
        targetKeywords: keywords,
        tone,
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <aside
      style={{ width: width ? `${width}px` : undefined }}
      className="bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 text-neutral-200 select-none z-40 overflow-y-auto custom-scrollbar"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-purple-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-white">
            {selectedArray.length > 1 ? `Multi-Select (${selectedArray.length})` : 'Typography Inspector'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
          {firstObj.id.slice(0, 12)}...
        </span>
      </div>

      <div className="p-4 space-y-6">
        {/* SECTION 1: Font Family & Style */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Font Family
          </label>
          <select
            value={firstObj.font}
            onChange={(e) => handleFormatChange('font', e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="Helvetica, Arial, sans-serif">Helvetica / Arial (Standard Sans)</option>
            <option value="Times New Roman, serif">Times New Roman (Standard Serif)</option>
            <option value="Courier New, monospace">Courier New (Standard Mono)</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Garamond, serif">Garamond</option>
            <option value="Calibri, sans-serif">Calibri</option>
          </select>
        </div>

        {/* SECTION 2: Size & Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 block">Size (pt)</label>
            <input
              type="number"
              step="0.5"
              value={firstObj.fontSize}
              onChange={(e) => handleFormatChange('fontSize', parseFloat(e.target.value) || 12)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 block">Weight</label>
            <select
              value={firstObj.fontWeight}
              onChange={(e) => handleFormatChange('fontWeight', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="normal">Normal (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">SemiBold (600)</option>
              <option value="bold">Bold (700)</option>
            </select>
          </div>
        </div>

        {/* SECTION 3: Alignment & Color */}
        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 block">Alignment</label>
            <div className="flex bg-neutral-950 border border-neutral-700 rounded-lg p-1 gap-1">
              {[
                { align: 'left', icon: AlignLeft },
                { align: 'center', icon: AlignCenter },
                { align: 'right', icon: AlignRight },
                { align: 'justify', icon: AlignJustify },
              ].map(({ align, icon: Icon }) => (
                <button
                  key={align}
                  onClick={() => handleFormatChange('alignment', align)}
                  className={`flex-1 p-1 rounded flex items-center justify-center transition-colors ${
                    firstObj.alignment === align ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 block">Color</label>
            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-700 rounded-lg p-1.5">
              <input
                type="color"
                value={firstObj.fillColor || '#000000'}
                onChange={(e) => handleFormatChange('fillColor', e.target.value)}
                className="h-6 w-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs font-mono uppercase text-neutral-300">{firstObj.fillColor || '#000000'}</span>
            </div>
          </div>
        </div>

        {/* SECTION 4: Bounding Box Geometry */}
        <div className="border-t border-neutral-800 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-3.5 w-3.5 text-neutral-500" />
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Geometry (PDF Space)
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-neutral-300">
            <div>X: {Math.round(firstObj.boundingBox[0])}pt</div>
            <div>Y: {Math.round(firstObj.boundingBox[1])}pt</div>
            <div>W: {Math.round(firstObj.boundingBox[2] - firstObj.boundingBox[0])}pt</div>
            <div>H: {Math.round(firstObj.boundingBox[3] - firstObj.boundingBox[1])}pt</div>
          </div>
        </div>

        {/* SECTION 5: AI Bullet Rewrite Studio */}
        <div className="border-t border-neutral-800 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
            <label className="text-xs font-bold text-white uppercase tracking-wider">
              AI STAR Bullet Rewrite
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-neutral-400 block">Target ATS Keywords (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Docker, Microservices, AWS"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-neutral-400 block">Executive Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as any)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="professional">Professional (STAR Method)</option>
              <option value="executive">Executive / Leadership</option>
              <option value="technical">Principal Technical Architect</option>
              <option value="concise">Concise & High-Impact</option>
            </select>
          </div>

          <button
            onClick={handleTriggerAIRewrite}
            disabled={isAiLoading || !firstObj.text}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
          >
            {isAiLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Rewriting Bullet...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Rewrite with Gemini
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
