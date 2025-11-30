import React, { useCallback } from 'react';
import { useSirenStore } from '@/core/store';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import SkipNextIcon from '@mui/icons-material/SkipNext';

export const Controls: React.FC = () => {
  const {
    project,
    editor,
    setCurrentTime,
    setPlaying,
    undo,
    redo,
    history,
    historyIndex,
    removeClip,
    splitClip,
    linkClips,
    unlinkClips,
  } = useSirenStore();

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = Math.floor((ms % 1000) / 10);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs
      .toString()
      .padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback(() => {
    setPlaying(!editor.isPlaying);
  }, [editor.isPlaying, setPlaying]);

  const handleSkipBack = useCallback(() => {
    setCurrentTime(Math.max(0, editor.currentTime - 1000));
  }, [editor.currentTime, setCurrentTime]);

  const handleSkipForward = useCallback(() => {
    setCurrentTime(Math.min(project.duration, editor.currentTime + 1000));
  }, [editor.currentTime, project.duration, setCurrentTime]);

  const handleGoToStart = useCallback(() => {
    setCurrentTime(0);
  }, [setCurrentTime]);

  const handleGoToEnd = useCallback(() => {
    setCurrentTime(project.duration);
  }, [project.duration, setCurrentTime]);

  const handleDeleteSelected = useCallback(() => {
    editor.selectedClipIds.forEach((id) => removeClip(id));
  }, [editor.selectedClipIds, removeClip]);

  const handleSplitSelected = useCallback(() => {
    editor.selectedClipIds.forEach((id) => {
      const clip = project.clips.find((c) => c.id === id);
      if (clip && editor.currentTime > clip.timeRange.start && editor.currentTime < clip.timeRange.end) {
        splitClip(id, editor.currentTime);
      }
    });
  }, [editor.selectedClipIds, editor.currentTime, project.clips, splitClip]);

  // Check if selected clips are linked
  const selectedClips = project.clips.filter((c) => editor.selectedClipIds.includes(c.id));
  const areSelectedLinked = selectedClips.length >= 2 &&
    selectedClips.every((c) => c.linkGroupId && c.linkGroupId === selectedClips[0].linkGroupId);

  const handleLinkSelected = useCallback(() => {
    if (editor.selectedClipIds.length >= 2) {
      linkClips(editor.selectedClipIds);
    }
  }, [editor.selectedClipIds, linkClips]);

  const handleUnlinkSelected = useCallback(() => {
    unlinkClips(editor.selectedClipIds);
  }, [editor.selectedClipIds, unlinkClips]);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-siren-surface border-t border-siren-border">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded hover:bg-siren-border transition-colors text-siren-text disabled:opacity-50"
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon sx={{ fontSize: 18 }} />
        </button>
        <button
          className="p-2 rounded hover:bg-siren-border transition-colors text-siren-text disabled:opacity-50"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title="Redo (Ctrl+Shift+Z)"
        >
          <RedoIcon sx={{ fontSize: 18 }} />
        </button>

        <div className="w-px h-6 bg-siren-border mx-2" />

        <button
          className="p-2 rounded hover:bg-siren-border transition-colors text-siren-text disabled:opacity-50"
          onClick={handleSplitSelected}
          disabled={editor.selectedClipIds.length === 0}
          title="Split clip (Ctrl+S)"
        >
          <ContentCutIcon sx={{ fontSize: 18 }} />
        </button>
        <button
          className="p-2 rounded hover:bg-siren-border transition-colors text-siren-text disabled:opacity-50"
          onClick={handleDeleteSelected}
          disabled={editor.selectedClipIds.length === 0}
          title="Delete selected (Delete)"
        >
          <DeleteIcon sx={{ fontSize: 18 }} />
        </button>

        <div className="w-px h-6 bg-siren-border mx-2" />

        {/* Selection count */}
        {editor.selectedClipIds.length > 0 && (
          <span className="text-xs text-siren-text-muted px-2">
            {editor.selectedClipIds.length} selected
          </span>
        )}

        {/* Link/Unlink button */}
        {areSelectedLinked ? (
          <button
            className="px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-xs font-medium flex items-center gap-1"
            onClick={handleUnlinkSelected}
            title="Unlink selected clips"
          >
            <LinkOffIcon sx={{ fontSize: 14 }} /> Grouped
          </button>
        ) : (
          <button
            className={`px-3 py-1.5 rounded transition-colors text-xs font-medium flex items-center gap-1 ${
              editor.selectedClipIds.length >= 2
                ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                : 'bg-siren-border text-siren-text-muted cursor-not-allowed'
            }`}
            onClick={handleLinkSelected}
            disabled={editor.selectedClipIds.length < 2}
            title={editor.selectedClipIds.length < 2 ? "Select 2+ clips with Ctrl+Click or Shift+Click" : "Group selected clips together"}
          >
            <LinkIcon sx={{ fontSize: 14 }} /> Group
          </button>
        )}
      </div>

      {/* Center controls */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded hover:bg-siren-border transition-colors text-siren-text"
          onClick={handleGoToStart}
          title="Go to start (Home)"
        >
          <SkipPreviousIcon sx={{ fontSize: 20 }} />
        </button>
        <button
          className="p-2 rounded hover:bg-siren-border transition-colors text-siren-text"
          onClick={handleSkipBack}
          title="Skip back (←)"
        >
          <FastRewindIcon sx={{ fontSize: 20 }} />
        </button>
        <button
          className={`p-3 rounded-full ${
            editor.isPlaying ? 'bg-red-600' : 'bg-siren-accent'
          } text-white hover:opacity-90 transition-opacity`}
          onClick={handlePlayPause}
          title="Play/Pause (Space)"
        >
          {editor.isPlaying ? <PauseIcon sx={{ fontSize: 24 }} /> : <PlayArrowIcon sx={{ fontSize: 24 }} />}
        </button>
        <button
          className="p-2 rounded hover:bg-siren-border transition-colors text-siren-text"
          onClick={handleSkipForward}
          title="Skip forward (→)"
        >
          <FastForwardIcon sx={{ fontSize: 20 }} />
        </button>
        <button
          className="p-2 rounded hover:bg-siren-border transition-colors text-siren-text"
          onClick={handleGoToEnd}
          title="Go to end (End)"
        >
          <SkipNextIcon sx={{ fontSize: 20 }} />
        </button>
      </div>

      {/* Right controls - Time display */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-siren-text font-mono">
          <span>{formatTime(editor.currentTime)}</span>
          <span className="text-siren-text-muted"> / </span>
          <span className="text-siren-text-muted">{formatTime(project.duration)}</span>
        </div>

        <div className="text-xs text-siren-text-muted">
          {project.settings.width}x{project.settings.height} @ {project.settings.frameRate}fps
        </div>
      </div>
    </div>
  );
};

export default Controls;
