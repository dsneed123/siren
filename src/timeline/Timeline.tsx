import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useSirenStore } from '@/core/store';
import { TimelineTrack } from './TimelineTrack';

const TRACK_HEIGHT = 60;
const RULER_HEIGHT = 30;

export const Timeline: React.FC = () => {
  const {
    project,
    editor,
    setCurrentTime,
    setZoom,
    selectClips,
    addTrack,
  } = useSirenStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const pixelsPerMs = editor.zoom * 0.1; // pixels per millisecond
  const duration = Math.max(project.duration, 30000); // Minimum 30 seconds visible
  const timelineWidth = duration * pixelsPerMs;

  // Time markers
  const markers: number[] = [];
  const markerInterval = getMarkerInterval(editor.zoom);
  for (let t = 0; t <= duration; t += markerInterval) {
    markers.push(t);
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = Math.floor((ms % 1000) / 10);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft - 192; // Subtract track header width
      const time = Math.max(0, x / pixelsPerMs);
      setCurrentTime(time);
      selectClips([]);
    },
    [pixelsPerMs, setCurrentTime, selectClips]
  );

  const handlePlayheadDrag = useCallback(
    (e: MouseEvent) => {
      if (!timelineRef.current || !isDraggingPlayhead) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft - 192;
      const time = Math.max(0, x / pixelsPerMs);
      setCurrentTime(time);
    },
    [isDraggingPlayhead, pixelsPerMs, setCurrentTime]
  );

  const handlePlayheadMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
  }, []);

  useEffect(() => {
    if (isDraggingPlayhead) {
      window.addEventListener('mousemove', handlePlayheadDrag);
      window.addEventListener('mouseup', handlePlayheadMouseUp);
      return () => {
        window.removeEventListener('mousemove', handlePlayheadDrag);
        window.removeEventListener('mouseup', handlePlayheadMouseUp);
      };
    }
  }, [isDraggingPlayhead, handlePlayheadDrag, handlePlayheadMouseUp]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(editor.zoom * delta);
      }
    },
    [editor.zoom, setZoom]
  );

  const playheadPosition = editor.currentTime * pixelsPerMs;

  return (
    <div className="flex flex-col h-full bg-siren-surface">
      {/* Timeline controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-siren-border bg-siren-bg">
        <div className="flex items-center gap-4">
          <span className="text-sm text-siren-text font-mono">
            {formatTime(editor.currentTime)}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 text-xs bg-siren-border rounded hover:bg-siren-accent transition-colors text-siren-text"
              onClick={() => setZoom(editor.zoom * 0.8)}
            >
              -
            </button>
            <span className="text-xs text-siren-text-muted w-12 text-center">
              {Math.round(editor.zoom * 100)}%
            </span>
            <button
              className="px-2 py-1 text-xs bg-siren-border rounded hover:bg-siren-accent transition-colors text-siren-text"
              onClick={() => setZoom(editor.zoom * 1.25)}
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 text-xs bg-siren-border rounded hover:bg-siren-accent transition-colors text-siren-text"
            onClick={() => addTrack({ name: `Video ${project.tracks.filter(t => t.type === 'video').length + 1}`, type: 'video', locked: false, visible: true, muted: false })}
          >
            + Video Track
          </button>
          <button
            className="px-3 py-1 text-xs bg-siren-border rounded hover:bg-siren-accent transition-colors text-siren-text"
            onClick={() => addTrack({ name: `Audio ${project.tracks.filter(t => t.type === 'audio').length + 1}`, type: 'audio', locked: false, visible: true, muted: false })}
          >
            + Audio Track
          </button>
          <button
            className="px-3 py-1 text-xs bg-siren-border rounded hover:bg-siren-accent transition-colors text-siren-text"
            onClick={() => addTrack({ name: `Text ${project.tracks.filter(t => t.type === 'text').length + 1}`, type: 'text', locked: false, visible: true, muted: false })}
          >
            + Text Track
          </button>
        </div>
      </div>

      {/* Timeline content */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-auto"
        onWheel={handleWheel}
      >
        {/* Ruler */}
        <div className="sticky top-0 z-20 flex bg-siren-bg border-b border-siren-border">
          <div className="w-48 flex-shrink-0 bg-siren-surface" />
          <div
            className="relative"
            style={{ width: `${timelineWidth}px`, height: `${RULER_HEIGHT}px` }}
            onClick={handleTimelineClick}
          >
            {markers.map((time) => (
              <div
                key={time}
                className="absolute top-0 h-full border-l border-siren-border"
                style={{ left: `${time * pixelsPerMs}px` }}
              >
                <span className="absolute top-1 left-1 text-xs text-siren-text-muted">
                  {formatTime(time)}
                </span>
              </div>
            ))}

            {/* Playhead (ruler part) */}
            <div
              className="absolute top-0 h-full w-0.5 bg-red-500 cursor-ew-resize z-30"
              style={{ left: `${playheadPosition}px` }}
              onMouseDown={() => setIsDraggingPlayhead(true)}
            >
              <div className="absolute -top-0 -left-2 w-4 h-4 bg-red-500 clip-triangle" />
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div className="relative">
          {project.tracks
            .sort((a, b) => a.order - b.order)
            .map((track) => (
              <TimelineTrack
                key={track.id}
                track={track}
                clips={project.clips.filter((c) => c.trackId === track.id)}
                pixelsPerMs={pixelsPerMs}
                height={TRACK_HEIGHT}
              />
            ))}

          {/* Playhead (tracks part) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
            style={{ left: `${playheadPosition + 192}px` }} // Add track header width
          />
        </div>
      </div>
    </div>
  );
};

function getMarkerInterval(zoom: number): number {
  if (zoom < 0.3) return 10000; // 10 seconds
  if (zoom < 0.7) return 5000; // 5 seconds
  if (zoom < 1.5) return 2000; // 2 seconds
  if (zoom < 3) return 1000; // 1 second
  return 500; // 0.5 seconds
}

export default Timeline;
