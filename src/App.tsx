import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Preview, Controls, MediaPanel, EffectsPanel, PropertiesPanel, RecordPanel, ShapesPanel } from './ui';
import { Timeline } from './timeline';
import { ExportModal } from './export';
import { useSirenStore } from './core/store';
import { videoEngine } from './core/engine';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { getShortcutsByCategory, formatShortcut } from './core/shortcuts';

type LeftPanelTab = 'media' | 'effects' | 'record' | 'shapes';

const MIN_TIMELINE_HEIGHT = 150;
const MAX_TIMELINE_HEIGHT = 600;
const DEFAULT_TIMELINE_HEIGHT = 256;

export const App: React.FC = () => {
  const { project } = useSirenStore();
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('media');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(DEFAULT_TIMELINE_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  // Handle timeline resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = timelineHeight;
  }, [timelineHeight]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = resizeStartY.current - e.clientY;
      const newHeight = Math.min(MAX_TIMELINE_HEIGHT, Math.max(MIN_TIMELINE_HEIGHT, resizeStartHeight.current + deltaY));
      setTimelineHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Toggle shortcut help with ?
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.altKey) {
        if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Initialize FFmpeg on mount
  useEffect(() => {
    const init = async () => {
      try {
        await videoEngine.load();
      } catch (error) {
        console.error('Failed to load video engine:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen bg-siren-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎬</div>
          <h1 className="text-xl font-bold text-siren-text mb-2">Siren</h1>
          <p className="text-sm text-siren-text-muted">Loading video engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-siren-bg overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-siren-surface border-b border-siren-border">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-siren-accent">🎬 Siren</h1>
          <span className="text-xs text-siren-text-muted">Video Editor</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            className="px-3 py-1.5 bg-siren-bg border border-siren-border rounded text-sm text-siren-text w-48"
            value={project.name}
            onChange={() => {
              // Update project name would go here
            }}
            placeholder="Project name"
          />
          <button
            className="px-4 py-1.5 bg-siren-accent text-white rounded text-sm font-medium hover:bg-siren-accent-hover transition-colors"
            onClick={() => setIsExportModalOpen(true)}
          >
            Export
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-64 flex-shrink-0 bg-siren-surface border-r border-siren-border flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-siren-border">
            {(['media', 'shapes', 'effects', 'record'] as LeftPanelTab[]).map((tab) => (
              <button
                key={tab}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  leftPanelTab === tab
                    ? 'text-siren-accent border-b-2 border-siren-accent'
                    : 'text-siren-text-muted hover:text-siren-text'
                }`}
                onClick={() => setLeftPanelTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden overflow-y-auto">
            {leftPanelTab === 'media' && <MediaPanel />}
            {leftPanelTab === 'shapes' && <ShapesPanel />}
            {leftPanelTab === 'effects' && <EffectsPanel />}
            {leftPanelTab === 'record' && <RecordPanel />}
          </div>
        </aside>

        {/* Center - Preview */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <Preview />
          <Controls />
        </main>

        {/* Right sidebar - Properties */}
        <aside className="w-72 flex-shrink-0 bg-siren-surface border-l border-siren-border overflow-y-auto">
          <PropertiesPanel />
        </aside>
      </div>

      {/* Timeline with resize handle */}
      <div className="flex-shrink-0 flex flex-col" style={{ height: timelineHeight }}>
        {/* Resize handle */}
        <div
          className={`h-1.5 cursor-ns-resize flex items-center justify-center group hover:bg-siren-accent/30 transition-colors ${
            isResizing ? 'bg-siren-accent/50' : 'bg-siren-border'
          }`}
          onMouseDown={handleResizeStart}
        >
          <div className={`w-12 h-1 rounded-full transition-colors ${
            isResizing ? 'bg-siren-accent' : 'bg-siren-text-muted group-hover:bg-siren-accent'
          }`} />
        </div>
        {/* Timeline content */}
        <div className="flex-1 min-h-0">
          <Timeline />
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-siren-surface rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-siren-border">
              <h2 className="text-lg font-bold text-siren-text">Keyboard Shortcuts</h2>
              <button
                className="text-siren-text-muted hover:text-siren-text"
                onClick={() => setShowShortcuts(false)}
              >
                ESC
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {Object.entries(getShortcutsByCategory()).map(([category, shortcuts]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-semibold text-siren-accent uppercase tracking-wide mb-2">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {shortcuts.map((shortcut, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1 px-2 rounded bg-siren-bg"
                      >
                        <span className="text-sm text-siren-text-muted">{shortcut.description}</span>
                        <kbd className="px-2 py-0.5 bg-siren-surface border border-siren-border rounded text-xs font-mono text-siren-text">
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-siren-border text-center">
              <span className="text-xs text-siren-text-muted">Press ? to toggle this help</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
