import React from 'react';
import { Track, Clip } from '@/core/types';
import { useSirenStore } from '@/core/store';
import { TimelineClip } from './TimelineClip';
import MovieIcon from '@mui/icons-material/Movie';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

interface TimelineTrackProps {
  track: Track;
  clips: Clip[];
  pixelsPerMs: number;
  height: number;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  track,
  clips,
  pixelsPerMs,
  height,
}) => {
  const { updateTrack, selectTrack, editor } = useSirenStore();
  const isSelected = editor.selectedTrackId === track.id;

  const getTrackIcon = () => {
    switch (track.type) {
      case 'video':
        return <MovieIcon sx={{ fontSize: 18 }} />;
      case 'audio':
        return <MusicNoteIcon sx={{ fontSize: 18 }} />;
      case 'text':
        return <span className="text-sm font-bold">T</span>;
      case 'overlay':
        return <span className="text-sm">◻</span>;
      default:
        return <span className="text-sm">◯</span>;
    }
  };

  return (
    <div
      className={`flex border-b border-siren-border ${
        isSelected ? 'bg-siren-accent/10' : ''
      }`}
      style={{ height: `${height}px` }}
    >
      {/* Track header */}
      <div
        className="w-48 flex-shrink-0 flex items-center gap-2 px-3 bg-siren-surface border-r border-siren-border cursor-pointer hover:bg-siren-border/50 transition-colors"
        onClick={() => selectTrack(track.id)}
      >
        <span className="text-lg">{getTrackIcon()}</span>
        <span className="text-sm text-siren-text truncate flex-1">{track.name}</span>

        {/* Track controls */}
        <div className="flex gap-1">
          <button
            className={`w-6 h-6 rounded flex items-center justify-center ${
              track.visible ? 'bg-siren-accent text-white' : 'bg-siren-border text-siren-text-muted'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              updateTrack(track.id, { visible: !track.visible });
            }}
            title={track.visible ? 'Hide track' : 'Show track'}
          >
            {track.visible ? <VisibilityIcon sx={{ fontSize: 14 }} /> : <VisibilityOffIcon sx={{ fontSize: 14 }} />}
          </button>
          <button
            className={`w-6 h-6 rounded flex items-center justify-center ${
              track.muted ? 'bg-red-600 text-white' : 'bg-siren-border text-siren-text-muted'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              updateTrack(track.id, { muted: !track.muted });
            }}
            title={track.muted ? 'Unmute track' : 'Mute track'}
          >
            {track.muted ? <VolumeOffIcon sx={{ fontSize: 14 }} /> : <VolumeUpIcon sx={{ fontSize: 14 }} />}
          </button>
          <button
            className={`w-6 h-6 rounded flex items-center justify-center ${
              track.locked ? 'bg-amber-600 text-white' : 'bg-siren-border text-siren-text-muted'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              updateTrack(track.id, { locked: !track.locked });
            }}
            title={track.locked ? 'Unlock track' : 'Lock track'}
          >
            {track.locked ? <LockIcon sx={{ fontSize: 14 }} /> : <LockOpenIcon sx={{ fontSize: 14 }} />}
          </button>
        </div>
      </div>

      {/* Track content area */}
      <div className="flex-1 relative bg-siren-bg/50">
        {clips.map((clip) => (
          <TimelineClip
            key={clip.id}
            clip={clip}
            pixelsPerMs={pixelsPerMs}
            trackHeight={height}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineTrack;
