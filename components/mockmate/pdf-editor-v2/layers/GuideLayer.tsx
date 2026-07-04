'use client';

import React from 'react';

export interface GuideLine {
  type: 'vertical' | 'horizontal';
  position: number; // Viewport CSS pixel coordinate
}

export interface GuideLayerProps {
  guides: GuideLine[];
  showGrid?: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Layer 6: GuideLayer — Renders alignment snap lines and optional design grid.
 */
export default function GuideLayer({
  guides = [],
  showGrid = false,
  viewportWidth,
  viewportHeight,
}: GuideLayerProps) {
  return (
    <div
      className="absolute inset-0 z-50 pointer-events-none select-none overflow-hidden"
      style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px` }}
    >
      {/* Optional Design Grid */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />
      )}

      {/* Dynamic Alignment Guide Lines */}
      {guides.map((guide, idx) => {
        if (guide.type === 'vertical') {
          return (
            <div
              key={`guide-v-${idx}`}
              className="absolute top-0 bottom-0 w-[1px] bg-cyan-400/80 shadow-xs animate-in fade-in duration-75"
              style={{ left: `${guide.position}px` }}
            />
          );
        } else {
          return (
            <div
              key={`guide-h-${idx}`}
              className="absolute left-0 right-0 h-[1px] bg-cyan-400/80 shadow-xs animate-in fade-in duration-75"
              style={{ top: `${guide.position}px` }}
            />
          );
        }
      })}
    </div>
  );
}
