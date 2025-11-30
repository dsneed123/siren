import React, { useCallback, useRef } from 'react';
import { useSirenStore } from '@/core/store';
import { videoEngine } from '@/core/engine';
import { MediaAsset, VideoClip, AudioClip, ImageClip, TextClip, TextStyle } from '@/core/types';
import MovieIcon from '@mui/icons-material/Movie';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Arial',
  fontSize: 48,
  fontWeight: 700,
  color: '#ffffff',
  textAlign: 'center',
  lineHeight: 1.2,
  letterSpacing: 0,
};

export const MediaPanel: React.FC = () => {
  const { project, addAsset, removeAsset, addClip, editor } = useSirenStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        try {
          const { url, duration, thumbnail } = await videoEngine.loadFile(file);

          let type: MediaAsset['type'] = 'video';
          if (file.type.startsWith('audio/')) {
            type = 'audio';
          } else if (file.type.startsWith('image/')) {
            type = 'image';
          }

          addAsset({
            name: file.name,
            type,
            src: url,
            duration: duration || 5000, // Default 5s for images
            thumbnail,
          });
        } catch (error) {
          console.error('Failed to load file:', error);
        }
      }

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addAsset]
  );

  const handleAddToTimeline = useCallback(
    (asset: MediaAsset) => {
      const videoTrack = project.tracks.find((t) => t.type === 'video');
      const audioTrack = project.tracks.find((t) => t.type === 'audio');

      if (!videoTrack || !audioTrack) return;

      const existingClips = project.clips.filter(
        (c) => c.trackId === (asset.type === 'audio' ? audioTrack.id : videoTrack.id)
      );
      const startTime = existingClips.length > 0
        ? Math.max(...existingClips.map((c) => c.timeRange.end))
        : 0;

      if (asset.type === 'video') {
        addClip({
          type: 'video',
          trackId: videoTrack.id,
          assetId: asset.id,
          timeRange: { start: startTime, end: startTime + asset.duration },
          sourceTimeRange: { start: 0, end: asset.duration },
          transform: { position: { x: 0, y: 0 }, scale: 1, rotation: 0, opacity: 1 },
          speed: 1,
          volume: 1,
          muted: false,
        } as Omit<VideoClip, 'id'>);
      } else if (asset.type === 'audio') {
        addClip({
          type: 'audio',
          trackId: audioTrack.id,
          assetId: asset.id,
          timeRange: { start: startTime, end: startTime + asset.duration },
          sourceTimeRange: { start: 0, end: asset.duration },
          transform: { position: { x: 0, y: 0 }, scale: 1, rotation: 0, opacity: 1 },
          volume: 1,
          fadeIn: 0,
          fadeOut: 0,
        } as Omit<AudioClip, 'id'>);
      } else if (asset.type === 'image') {
        addClip({
          type: 'image',
          trackId: videoTrack.id,
          assetId: asset.id,
          timeRange: { start: startTime, end: startTime + 5000 }, // 5 second default
          transform: { position: { x: 0, y: 0 }, scale: 1, rotation: 0, opacity: 1 },
        } as Omit<ImageClip, 'id'>);
      }
    },
    [project, addClip]
  );

  const handleAddText = useCallback(() => {
    const textTrack = project.tracks.find((t) => t.type === 'text');
    if (!textTrack) return;

    const existingClips = project.clips.filter((c) => c.trackId === textTrack.id);
    const startTime = existingClips.length > 0
      ? Math.max(...existingClips.map((c) => c.timeRange.end))
      : editor.currentTime;

    addClip({
      type: 'text',
      trackId: textTrack.id,
      content: 'Your Text Here',
      timeRange: { start: startTime, end: startTime + 3000 },
      transform: {
        position: { x: project.settings.width / 2 - 150, y: project.settings.height / 2 - 30 },
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
      style: DEFAULT_TEXT_STYLE,
      size: { width: 300, height: 60 },
    } as Omit<TextClip, 'id'>);
  }, [project, editor.currentTime, addClip]);

  const getAssetIcon = (type: MediaAsset['type']) => {
    switch (type) {
      case 'video':
        return <MovieIcon sx={{ fontSize: 32 }} />;
      case 'audio':
        return <MusicNoteIcon sx={{ fontSize: 32 }} />;
      case 'image':
        return <ImageIcon sx={{ fontSize: 32 }} />;
      default:
        return <InsertDriveFileIcon sx={{ fontSize: 32 }} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-siren-border">
        <h3 className="text-sm font-semibold text-siren-text mb-3">Media</h3>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="video/*,audio/*,image/*"
            multiple
            onChange={handleFileSelect}
          />
          <button
            className="flex-1 px-3 py-2 bg-siren-accent text-white rounded text-sm hover:bg-siren-accent-hover transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            + Import Media
          </button>
          <button
            className="px-3 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 transition-colors"
            onClick={handleAddText}
          >
            T+ Add Text
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {project.assets.length === 0 ? (
          <div className="text-center text-siren-text-muted py-8">
            <div className="mb-2"><FolderOpenIcon sx={{ fontSize: 40 }} /></div>
            <p className="text-sm">No media imported yet</p>
            <p className="text-xs mt-1">Import videos, audio, or images</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {project.assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative bg-siren-bg rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-siren-accent transition-all"
                onClick={() => handleAddToTimeline(asset)}
              >
                {/* Thumbnail or placeholder */}
                <div className="aspect-video bg-siren-border flex items-center justify-center">
                  {asset.thumbnail ? (
                    <img
                      src={asset.thumbnail}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-siren-text-muted">{getAssetIcon(asset.type)}</span>
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs text-siren-text truncate">{asset.name}</p>
                  <p className="text-xs text-siren-text-muted">
                    {formatDuration(asset.duration)}
                  </p>
                </div>

                {/* Delete button */}
                <button
                  className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAsset(asset.id);
                  }}
                >
                  ×
                </button>

                {/* Add overlay */}
                <div className="absolute inset-0 bg-siren-accent/0 group-hover:bg-siren-accent/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium">
                    + Add
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default MediaPanel;
