'use client';

import React, { useRef, useEffect, useState } from 'react';
import { DocumentObject } from '@/lib/pdf-editor-v2/types';
import { coordinateEngine } from '@/lib/pdf-editor-v2/layout';

export interface TextLayerProps {
  objects: DocumentObject[];
  pageHeight: number;
  zoom: number;
  onSelectObject: (id: string, multi: boolean) => void;
  onHoverObject: (id: string | null) => void;
  onDoubleClickObject?: (id: string) => void;
}

/**
 * Layer 2: TextLayer — Renders interactive document spans.
 * Applies horizontal width compensation (scaleX) to eliminate font drifting.
 */
export default function TextLayer({
  objects,
  pageHeight,
  zoom,
  onSelectObject,
  onHoverObject,
  onDoubleClickObject,
}: TextLayerProps) {
  const spanRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [scaleXMap, setScaleXMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const newScales: Record<string, number> = {};
    objects.forEach((obj) => {
      const el = spanRefs.current[obj.id];
      if (el) {
        const browserWidth = el.scrollWidth || el.offsetWidth || 1;
        const pdfTargetWidth = (obj.boundingBox[2] - obj.boundingBox[0]) * zoom;
        newScales[obj.id] = coordinateEngine.calculateTextScaleX(
          obj.boundingBox[2] - obj.boundingBox[0],
          browserWidth,
          zoom
        );
      }
    });
    setScaleXMap(newScales);
  }, [objects, zoom]);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none">
      {objects.map((obj) => {
        const screenRect = coordinateEngine.pdfToScreenRect(obj.boundingBox, pageHeight, zoom);
        const scaleX = scaleXMap[obj.id] || 1.0;
        const isModified = obj.modificationState !== 'unmodified';

        return (
          <span
            key={obj.id}
            ref={(el) => {
              spanRefs.current[obj.id] = el;
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectObject(obj.id, e.shiftKey || e.ctrlKey || e.metaKey);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (onDoubleClickObject) onDoubleClickObject(obj.id);
            }}
            onMouseEnter={() => onHoverObject(obj.id)}
            onMouseLeave={() => onHoverObject(null)}
            className={`absolute pointer-events-auto cursor-text whitespace-pre origin-top-left transition-colors duration-75 px-0.5 rounded-xs ${
              isModified
                ? 'bg-purple-500/10 text-purple-950 font-medium ring-1 ring-purple-400/50'
                : 'text-transparent hover:bg-purple-500/10 hover:ring-1 hover:ring-purple-400/30'
            }`}
            style={{
              left: `${screenRect.left}px`,
              top: `${screenRect.top}px`,
              width: `${screenRect.width}px`,
              height: `${screenRect.height}px`,
              fontFamily: obj.fontFamily || obj.font,
              fontSize: `${Math.round(obj.fontSize * zoom * 100) / 100}px`,
              fontWeight: obj.fontWeight,
              fontStyle: obj.fontStyle,
              lineHeight: obj.lineHeight || 1.2,
              letterSpacing: `${(obj.letterSpacing || 0) * zoom}px`,
              wordSpacing: `${(obj.wordSpacing || 0) * zoom}px`,
              textAlign: obj.alignment || 'left',
              color: isModified ? obj.fillColor : 'transparent',
              transform: `scaleX(${scaleX})`,
            }}
          >
            {obj.editedText || obj.text}
          </span>
        );
      })}
    </div>
  );
}
