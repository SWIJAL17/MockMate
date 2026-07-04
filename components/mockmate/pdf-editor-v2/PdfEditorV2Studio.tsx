'use client';

import React, { useState, useEffect } from 'react';
import { usePdfEditorStore } from '@/lib/pdf-editor-v2/store';
import { documentModelService } from '@/lib/pdf-editor-v2/parser';
import { exportEngine } from '@/lib/pdf-editor-v2/export';
import { aiIntegrationService } from '@/lib/pdf-editor-v2/ai';
import { zoomEngine } from '@/lib/pdf-editor-v2/zoom';
import { TopToolbar, LeftSidebar, RightPropertiesPanel, BottomStatusBar, KeyboardShortcutsModal } from './ui';
import PageContainer from './layers/PageContainer';
import { Loader2 } from 'lucide-react';

export interface PdfEditorV2StudioProps {
  initialPdfBytes?: Uint8Array | null;
  initialFileName?: string;
  onExportSuccess?: (exportedBytes: Uint8Array) => void;
  onOpenAuditModal?: (auditData: any) => void;
}

/**
 * PdfEditorV2Studio — Master commercial-grade studio integrating all 15 architectural phases.
 * Assembles TopToolbar, LeftSidebar, PageContainer (with 6 rendering layers),
 * RightPropertiesPanel, BottomStatusBar, and keyboard shortcut overlays.
 */
export default function PdfEditorV2Studio({
  initialPdfBytes = null,
  initialFileName = 'Resume.pdf',
  onExportSuccess,
  onOpenAuditModal,
}: PdfEditorV2StudioProps) {
  const store = usePdfEditorStore();
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(192);
  const [rightWidth, setRightWidth] = useState(240);
  const [dpr, setDpr] = useState(1);

  const handleLeftMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const raw = startWidth + (moveEvent.clientX - startX);
      const newWidth = raw < 80 ? 0 : Math.max(160, Math.min(480, raw));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRightMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const raw = startWidth - (moveEvent.clientX - startX);
      const newWidth = raw < 80 ? 0 : Math.max(200, Math.min(600, raw));
      setRightWidth(newWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDpr(window.devicePixelRatio || 1);
    }
  }, []);

  // Re-fit on window resize (when in a fit mode) and enable Ctrl/Cmd + scroll zoom
  useEffect(() => {
    const vp = document.getElementById('editor-v2-canvas-viewport');
    const onResize = () => {
      const { fitMode } = usePdfEditorStore.getState();
      if (fitMode === 'width' || fitMode === 'page') {
        zoomEngine.applyZoom(fitMode, vp || undefined);
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { zoom } = usePdfEditorStore.getState();
      const next = e.deltaY < 0 ? zoomEngine.getNextZoomIn(zoom) : zoomEngine.getNextZoomOut(zoom);
      zoomEngine.applyZoom(next, vp || undefined);
    };
    window.addEventListener('resize', onResize);
    vp?.addEventListener('wheel', onWheel, { passive: false });
    // Apply the fit mode immediately on mount (covers returning to an already-loaded doc)
    requestAnimationFrame(onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      vp?.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Load initial PDF bytes into Document Model store
  useEffect(() => {
    if (!initialPdfBytes) return;

    let isMounted = true;
    setIsLoadingPdf(true);
    store.loadPdf(initialPdfBytes, initialFileName);

    documentModelService
      .parsePdf(initialPdfBytes)
      .then(({ pages, objects }) => {
        if (!isMounted) return;
        store.setPages(pages);
        store.setObjects(objects);
        setIsLoadingPdf(false);
        // Fit the page to the viewport width on load so the resume is readable
        requestAnimationFrame(() => {
          const vp = document.getElementById('editor-v2-canvas-viewport');
          zoomEngine.applyZoom('width', vp || undefined);
        });
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[PdfEditorV2Studio] Failed to parse PDF document model:', err);
          setIsLoadingPdf(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialPdfBytes, initialFileName]);

  const handleExport = async () => {
    if (!store.originalPdfBytes) return;
    setIsExporting(true);
    try {
      const patchedBytes = await exportEngine.exportDiff(store.originalPdfBytes, store.objects, {
        title: store.fileName,
      });

      if (onExportSuccess) {
        onExportSuccess(patchedBytes);
      } else {
        // Trigger automatic browser download
        const blob = new Blob([patchedBytes as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Edited_${store.fileName || 'Resume.pdf'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[PdfEditorV2Studio] Export failed:', err);
      alert('Failed to export PDF. Please see console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenAudit = async () => {
    if (!store.originalPdfBytes) return;
    try {
      const blob = new Blob([store.originalPdfBytes as BlobPart], { type: 'application/pdf' });
      const auditData = await aiIntegrationService.auditResume(blob);
      if (onOpenAuditModal) {
        onOpenAuditModal(auditData);
      } else {
        console.log('[ATS Audit Results]:', auditData);
        alert(`ATS Compatibility Score: ${auditData.atsScore || 'N/A'}%\n\nSee console for detailed recommendations.`);
      }
    } catch (err: any) {
      alert(`Audit failed: ${err.message || 'Unknown error'}`);
    }
  };

  if (isLoadingPdf) {
    return (
      <div className="h-screen w-full bg-neutral-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
        <div className="text-sm font-semibold tracking-wide">Parsing Document Model & Glyph Metrics...</div>
        <p className="text-xs text-neutral-500">Extracting subpixel bounding boxes without converting to plain text</p>
      </div>
    );
  }

  const activePageInfo = store.pages[store.currentPage] || store.pages[0];
  const activePageObjectIds = Object.values(store.objects)
    .filter((o) => o.page === store.currentPage)
    .map((o) => o.id);

  return (
    <div className="h-screen w-full bg-neutral-950 flex flex-col overflow-hidden text-neutral-100 font-sans select-none">
      {/* Top Header Toolbar */}
      <TopToolbar
        onExport={handleExport}
        onOpenAudit={handleOpenAudit}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        isExporting={isExporting}
      />

      {/* Main Work area: Left Sidebar + Canvas Studio + Right Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation & Outline Tree */}
        <LeftSidebar
          width={leftWidth}
          onSelectObject={(id, multi) => {
            if (!id) store.clearSelection();
            else if (multi) store.selectObject(id, true);
            else store.selectObject(id);
          }}
        />

        {/* Left Resizer Handle */}
        <div
          className="w-1 cursor-col-resize hover:bg-purple-500/50 active:bg-purple-500 bg-neutral-800 border-r border-neutral-700/50 transition-colors select-none shrink-0"
          onMouseDown={handleLeftMouseDown}
          onDoubleClick={() => setLeftWidth(leftWidth === 0 ? 192 : 0)}
          title="Drag to resize — double-click to collapse"
        />

        {/* Center Viewport Canvas Container */}
        <main
          id="editor-v2-canvas-viewport"
          className="flex-1 overflow-auto bg-neutral-900/90 flex p-4 custom-scrollbar relative"
        >
          {store.originalPdfBytes ? (
            <div className="m-auto">
            <PageContainer
              pdfBytes={store.originalPdfBytes}
              pageIndex={store.currentPage}
              zoom={store.zoom}
              devicePixelRatio={dpr}
              objects={store.objects}
              pageObjectIds={activePageObjectIds}
              selectedIds={store.selection.selectedIds}
              hoveredId={store.selection.hoveredId}
              editingId={store.editingId}
              onSelectObject={(id, multi) => {
                if (!id) store.clearSelection();
                else if (multi) store.selectObject(id, true);
                else store.selectObject(id);
              }}
              onHoverObject={(id) => store.hoverObject(id)}
              onDoubleClickObject={(id) => store.setEditingId(id)}
              onTriggerAIRewrite={async (id) => {
                store.selectObject(id);
              }}
            />
            </div>
          ) : (
            <div className="text-center text-neutral-500 space-y-2">
              <div className="text-sm font-semibold text-neutral-400">No PDF Document Uploaded</div>
              <p className="text-xs max-w-sm">
                Pass valid PDF Uint8Array bytes to <code className="text-purple-400">initialPdfBytes</code> to launch the studio.
              </p>
            </div>
          )}
        </main>

        {/* Right Resizer Handle */}
        <div
          className="w-1 cursor-col-resize hover:bg-purple-500/50 active:bg-purple-500 bg-neutral-800 border-l border-neutral-700/50 transition-colors select-none shrink-0"
          onMouseDown={handleRightMouseDown}
          onDoubleClick={() => setRightWidth(rightWidth === 0 ? 240 : 0)}
          title="Drag to resize — double-click to collapse"
        />

        {/* Right Typography & Geometry Inspector */}
        <RightPropertiesPanel width={rightWidth} />
      </div>

      {/* Bottom Status Bar */}
      <BottomStatusBar />

      {/* Keyboard Shortcuts Overlay Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
