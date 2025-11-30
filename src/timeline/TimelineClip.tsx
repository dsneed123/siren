import React, { useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clip, VideoClip, AudioClip, TextClip, ShapeClip, Keyframe } from '@/core/types';
import { useSirenStore } from '@/core/store';

interface TimelineClipProps {
  clip: Clip;
  pixelsPerMs: number;
  trackHeight: number;
}

type DragMode = 'move' | 'resize-left' | 'resize-right' | null;

const SNAP_THRESHOLD_PX = 8; // Pixels within which to snap

export const TimelineClip: React.FC<TimelineClipProps> = ({
  clip,
  pixelsPerMs,
  trackHeight,
}) => {
  const { selectClips, editor, moveClip, trimClip, project } = useSirenStore();
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startTime: 0, endTime: 0, trackId: clip.trackId });
  const clipRef = useRef<HTMLDivElement>(null);
  const [snapIndicator, setSnapIndicator] = useState<number | null>(null);

  const isSelected = editor.selectedClipIds.includes(clip.id);
  const width = (clip.timeRange.end - clip.timeRange.start) * pixelsPerMs;
  const left = clip.timeRange.start * pixelsPerMs;
  const isLinked = Boolean(clip.linkGroupId);

  // Get all unique keyframe times for this clip
  const keyframeTimes = useMemo(() => {
    if (!clip.keyframeTracks || clip.keyframeTracks.length === 0) return [];
    const times = new Set<number>();
    clip.keyframeTracks.forEach(track => {
      track.keyframes.forEach((kf: Keyframe) => {
        times.add(kf.time);
      });
    });
    return Array.from(times).sort((a, b) => a - b);
  }, [clip.keyframeTracks]);

  const hasKeyframes = keyframeTimes.length > 0;

  // Get all snap points (playhead + other clip edges)
  const getSnapPoints = useCallback((): number[] => {
    const points: number[] = [];

    // Playhead position
    points.push(editor.currentTime);

    // Other clips' start and end times
    project.clips.forEach((c) => {
      if (c.id !== clip.id) {
        points.push(c.timeRange.start);
        points.push(c.timeRange.end);
      }
    });

    // Timeline start
    points.push(0);

    return points;
  }, [editor.currentTime, project.clips, clip.id]);

  // Snap a time value to nearest snap point if within threshold
  const snapToPoint = useCallback((time: number, _edge: 'start' | 'end'): { time: number; snapped: boolean; snapPoint: number | null } => {
    const snapPoints = getSnapPoints();
    const thresholdMs = SNAP_THRESHOLD_PX / pixelsPerMs;

    let nearestPoint: number | null = null;
    let nearestDistance = Infinity;

    for (const point of snapPoints) {
      const distance = Math.abs(time - point);
      if (distance < thresholdMs && distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = point;
      }
    }

    if (nearestPoint !== null) {
      return { time: nearestPoint, snapped: true, snapPoint: nearestPoint };
    }

    return { time, snapped: false, snapPoint: null };
  }, [getSnapPoints, pixelsPerMs]);

  const getClipColor = () => {
    switch (clip.type) {
      case 'video':
        return 'bg-violet-600';
      case 'audio':
        return 'bg-emerald-600';
      case 'text':
        return 'bg-amber-500';
      case 'image':
        return 'bg-blue-600';
      case 'shape':
        return 'bg-pink-500';
      default:
        return 'bg-gray-600';
    }
  };

  const getClipLabel = () => {
    switch (clip.type) {
      case 'text':
        return (clip as TextClip).content.slice(0, 20) || 'Text';
      case 'shape':
        return (clip as ShapeClip).shapeType.charAt(0).toUpperCase() + (clip as ShapeClip).shapeType.slice(1);
      default:
        return clip.type.charAt(0).toUpperCase() + clip.type.slice(1);
    }
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: DragMode) => {
      e.stopPropagation();
      setDragMode(mode);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        startTime: clip.timeRange.start,
        endTime: clip.timeRange.end,
        trackId: clip.trackId,
      });
      selectClips([clip.id]);
    },
    [clip, selectClips]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragMode) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const deltaTime = deltaX / pixelsPerMs;

      if (dragMode === 'move') {
        // Use stored initial startTime, not current clip position
        let newStart = Math.max(0, dragStart.startTime + deltaTime);
        const clipDuration = dragStart.endTime - dragStart.startTime;
        let newEnd = newStart + clipDuration;

        // Snap start edge
        const startSnap = snapToPoint(newStart, 'start');
        // Snap end edge
        const endSnap = snapToPoint(newEnd, 'end');

        // Use whichever snap is closer
        if (startSnap.snapped && (!endSnap.snapped || Math.abs(startSnap.time - newStart) < Math.abs(endSnap.time - newEnd))) {
          newStart = startSnap.time;
          setSnapIndicator(startSnap.snapPoint);
        } else if (endSnap.snapped) {
          newStart = endSnap.time - clipDuration;
          setSnapIndicator(endSnap.snapPoint);
        } else {
          setSnapIndicator(null);
        }

        // Calculate which track the cursor is over based on vertical movement
        const trackDelta = Math.round(deltaY / trackHeight);
        const sortedTracks = [...project.tracks].sort((a, b) => a.order - b.order);
        const currentTrackIndex = sortedTracks.findIndex(t => t.id === dragStart.trackId);
        const newTrackIndex = Math.max(0, Math.min(sortedTracks.length - 1, currentTrackIndex + trackDelta));
        const newTrack = sortedTracks[newTrackIndex];

        moveClip(clip.id, newTrack?.id || clip.trackId, newStart);
      } else if (dragMode === 'resize-left') {
        // Use stored initial times for resize
        let newStart = Math.max(0, Math.min(dragStart.endTime - 100, dragStart.startTime + deltaTime));
        const snap = snapToPoint(newStart, 'start');
        if (snap.snapped) {
          newStart = Math.min(dragStart.endTime - 100, snap.time);
          setSnapIndicator(snap.snapPoint);
        } else {
          setSnapIndicator(null);
        }
        trimClip(clip.id, { start: newStart, end: dragStart.endTime });
      } else if (dragMode === 'resize-right') {
        let newEnd = Math.max(dragStart.startTime + 100, dragStart.endTime + deltaTime);
        const snap = snapToPoint(newEnd, 'end');
        if (snap.snapped) {
          newEnd = Math.max(dragStart.startTime + 100, snap.time);
          setSnapIndicator(snap.snapPoint);
        } else {
          setSnapIndicator(null);
        }
        trimClip(clip.id, { start: dragStart.startTime, end: newEnd });
      }
    },
    [dragMode, dragStart, clip.id, pixelsPerMs, trackHeight, moveClip, trimClip, project.tracks, snapToPoint]
  );

  const handleMouseUp = useCallback(() => {
    setDragMode(null);
    setSnapIndicator(null);
  }, []);

  React.useEffect(() => {
    if (dragMode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragMode, handleMouseMove, handleMouseUp]);

  return (
    <motion.div
      ref={clipRef}
      className={`absolute top-1 bottom-1 rounded-md cursor-pointer select-none overflow-hidden ${getClipColor()} ${
        isSelected ? 'ring-2 ring-white ring-opacity-80' : ''
      } ${snapIndicator !== null ? 'ring-2 ring-cyan-400 ring-opacity-100' : ''}`}
      style={{
        left: `${left}px`,
        width: `${Math.max(width, 20)}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          // Multi-select with shift+click, ctrl+click, or cmd+click
          const newSelection = editor.selectedClipIds.includes(clip.id)
            ? editor.selectedClipIds.filter(id => id !== clip.id)
            : [...editor.selectedClipIds, clip.id];
          selectClips(newSelection);
        } else {
          selectClips([clip.id]);
        }
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/20 hover:bg-black/40 transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
      />

      {/* Clip content */}
      <div className="px-3 py-1 h-full flex items-center">
        <span className="text-xs text-white font-medium truncate">
          {getClipLabel()}
        </span>
      </div>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/20 hover:bg-black/40 transition-colors"
        onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
      />

      {/* Waveform visualization for audio/video */}
      {(clip.type === 'audio' || clip.type === 'video') && (
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <WaveformPreview clip={clip as VideoClip | AudioClip} width={width} />
        </div>
      )}

      {/* Keyframe indicators */}
      {hasKeyframes && (
        <div className="absolute bottom-0 left-0 right-0 h-3 pointer-events-none flex items-center">
          {keyframeTimes.map((time, idx) => {
            const position = time * pixelsPerMs;
            return (
              <div
                key={idx}
                className="absolute w-2 h-2 bg-yellow-400 border border-yellow-600 transform rotate-45"
                style={{ left: `${position}px`, marginLeft: '-4px' }}
                title={`Keyframe at ${(time / 1000).toFixed(2)}s`}
              />
            );
          })}
        </div>
      )}

      {/* Keyframe badge */}
      {hasKeyframes && (
        <div className="absolute top-0.5 right-6 text-[9px] text-yellow-300 font-medium">
          ◆{keyframeTimes.length}
        </div>
      )}

      {/* Link indicator */}
      {isLinked && (
        <div className="absolute top-0.5 left-3 text-[9px] text-cyan-400 font-medium" title="Linked - moves with other linked clips">
          🔗
        </div>
      )}
    </motion.div>
  );
};

const WaveformPreview: React.FC<{ clip: VideoClip | AudioClip; width: number }> = ({ clip, width }) => {
  // Generate stable "random" heights based on clip id
  const bars = Math.floor(width / 4);
  const heights = React.useMemo(() => {
    const result: number[] = [];
    let seed = clip.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = 0; i < Math.max(bars, 1); i++) {
      seed = (seed * 9301 + 49297) % 233280;
      result.push((seed / 233280) * 60 + 30);
    }
    return result;
  }, [clip.id, bars]);

  return (
    <div className="flex items-end h-full gap-px">
      {heights.map((height, i) => (
        <div
          key={i}
          className="flex-1 bg-white/50"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
};

export default TimelineClip;
