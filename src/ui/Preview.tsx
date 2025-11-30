import React, { useRef, useEffect, useState } from 'react';
import { useSirenStore } from '@/core/store';
import { TextOverlay } from '@/text';
import { TextClip, VideoClip, ImageClip, ShapeClip, Clip } from '@/core/types';
import { getAnimatedTransform } from '@/core/keyframes';
import { ShapeOverlay } from './ShapeOverlay';
import { ImageOverlay } from './ImageOverlay';

export const Preview: React.FC = () => {
  const { project, editor, selectClips } = useSirenStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [tick, setTick] = useState(0); // Force re-render

  const { settings } = project;
  const aspectRatio = settings.width / settings.height;
  const scale = containerSize.width / settings.width || 1;


  // Calculate preview dimensions - use ResizeObserver to handle container size changes
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth - 32;
        const containerHeight = container.clientHeight - 32;

        let previewWidth = containerWidth;
        let previewHeight = previewWidth / aspectRatio;

        if (previewHeight > containerHeight) {
          previewHeight = containerHeight;
          previewWidth = previewHeight * aspectRatio;
        }

        setContainerSize({ width: previewWidth, height: previewHeight });
      }
    };

    updateSize();

    // Use ResizeObserver to detect container size changes (e.g., when timeline is resized)
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      resizeObserver.disconnect();
    };
  }, [aspectRatio]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const state = useSirenStore.getState();

      if (state.editor.isPlaying) {
        const now = performance.now();
        const deltaTime = now - lastTimeRef.current;
        lastTimeRef.current = now;

        const newTime = state.editor.currentTime + deltaTime;

        if (newTime >= state.project.duration && state.project.duration > 0) {
          state.setCurrentTime(0);
          state.setPlaying(false);
        } else {
          state.setCurrentTime(newTime);
        }
      } else {
        lastTimeRef.current = performance.now();
      }

      // Force re-render every frame
      setTick(t => t + 1);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Sync video playback - runs every frame via tick
  useEffect(() => {
    const state = useSirenStore.getState();
    const time = state.editor.currentTime;
    const isPlaying = state.editor.isPlaying;

    project.clips
      .filter((c): c is VideoClip => c.type === 'video')
      .forEach((clip) => {
        const video = videoRefs.current.get(clip.id);
        if (!video) return;

        const track = project.tracks.find(t => t.id === clip.trackId);
        const isActive = track?.visible &&
          time >= clip.timeRange.start &&
          time < clip.timeRange.end;

        if (isActive) {
          // Convert ms to seconds for video.currentTime, apply speed
          const clipTimeMs = time - clip.timeRange.start;
          const clipTimeSec = (clipTimeMs / 1000) * clip.speed;

          // Only seek if significantly out of sync (more than 100ms = 0.1s)
          const timeDiff = Math.abs(video.currentTime - clipTimeSec);
          if (timeDiff > 0.1) {
            video.currentTime = Math.max(0, clipTimeSec);
          }

          video.playbackRate = clip.speed;

          if (isPlaying && video.paused) {
            video.play().catch(() => {});
          } else if (!isPlaying && !video.paused) {
            video.pause();
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
        }
      });
  }, [tick, project.clips, project.tracks]);

  // Check if clip is active at current time
  const isClipActive = (clip: Clip): boolean => {
    const time = useSirenStore.getState().editor.currentTime;
    const track = project.tracks.find((t) => t.id === clip.trackId);
    return Boolean(
      track?.visible &&
      time >= clip.timeRange.start &&
      time < clip.timeRange.end
    );
  };

  const getAsset = (assetId: string) => project.assets.find((a) => a.id === assetId);

  const videoClips = project.clips.filter((c): c is VideoClip => c.type === 'video');
  const imageClips = project.clips.filter((c): c is ImageClip => c.type === 'image');
  const textClips = project.clips.filter((c): c is TextClip => c.type === 'text');
  const shapeClips = project.clips.filter((c): c is ShapeClip => c.type === 'shape');

  // Combine overlay clips and sort by track order (higher order = behind, lower order = in front)
  const overlayClips = [...imageClips, ...textClips, ...shapeClips]
    .filter(isClipActive)
    .sort((a, b) => {
      const trackA = project.tracks.find(t => t.id === a.trackId);
      const trackB = project.tracks.find(t => t.id === b.trackId);
      // Higher track order renders first (behind), lower track order renders last (in front)
      return (trackB?.order ?? 0) - (trackA?.order ?? 0);
    });

  const hasActiveClips = project.clips.some(isClipActive);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center bg-siren-bg p-4 min-h-0 overflow-hidden"
      onClick={() => selectClips([])}
    >
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
        style={{
          width: containerSize.width || 300,
          height: containerSize.height || 533,
          backgroundColor: settings.backgroundColor,
        }}
      >
        {/* Video clips */}
        {videoClips.map((clip) => {
          const asset = getAsset(clip.assetId);
          if (!asset) return null;

          const time = useSirenStore.getState().editor.currentTime;
          const active = isClipActive(clip);
          const clipTime = Math.max(0, time - clip.timeRange.start);
          const animTransform = getAnimatedTransform(clipTime, clip.keyframeTracks, clip.transform);

          return (
            <video
              key={clip.id}
              ref={(el) => {
                if (el) {
                  videoRefs.current.set(clip.id, el);
                } else {
                  videoRefs.current.delete(clip.id);
                }
              }}
              src={asset.src}
              className="absolute"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                left: animTransform.position.x * scale,
                top: animTransform.position.y * scale,
                opacity: active ? animTransform.opacity : 0,
                pointerEvents: active ? 'auto' : 'none',
                transform: `scale(${animTransform.scale}) rotate(${animTransform.rotation}deg)`,
                transformOrigin: 'top left',
              }}
              muted={clip.muted}
              playsInline
              preload="metadata"
            />
          );
        })}

        {/* Overlay clips (images, text, shapes) - sorted by track order */}
        {overlayClips.map((clip) => {
          const currentTime = useSirenStore.getState().editor.currentTime;

          if (clip.type === 'image') {
            const asset = getAsset((clip as ImageClip).assetId);
            if (!asset) return null;
            return (
              <ImageOverlay
                key={clip.id}
                clip={clip as ImageClip}
                asset={asset}
                containerSize={{ width: settings.width, height: settings.height }}
                scale={scale}
                isSelected={editor.selectedClipIds.includes(clip.id)}
                onSelect={() => selectClips([clip.id])}
                currentTime={currentTime}
              />
            );
          }

          if (clip.type === 'text') {
            return (
              <TextOverlay
                key={clip.id}
                clip={clip as TextClip}
                containerSize={{ width: settings.width, height: settings.height }}
                scale={scale}
                isSelected={editor.selectedClipIds.includes(clip.id)}
                onSelect={() => selectClips([clip.id])}
                currentTime={currentTime}
              />
            );
          }

          if (clip.type === 'shape') {
            return (
              <ShapeOverlay
                key={clip.id}
                clip={clip as ShapeClip}
                containerSize={{ width: settings.width, height: settings.height }}
                scale={scale}
                isSelected={editor.selectedClipIds.includes(clip.id)}
                onSelect={() => selectClips([clip.id])}
                currentTime={currentTime}
              />
            );
          }

          return null;
        })}

        {/* Safe zone guides */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-0 left-0 right-0 h-[15%] border-b border-dashed border-white" />
          <div className="absolute bottom-0 left-0 right-0 h-[20%] border-t border-dashed border-white" />
          <div className="absolute top-0 bottom-0 right-0 w-[15%] border-l border-dashed border-white" />
        </div>

        {/* No content placeholder */}
        {!hasActiveClips && (
          <div className="absolute inset-0 flex items-center justify-center text-siren-text-muted">
            <div className="text-center">
              <div className="text-4xl mb-2">🎬</div>
              <p className="text-sm">Import media and add to timeline</p>
              <p className="text-xs mt-2 text-siren-text-muted">
                Move playhead to where clip starts
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Preview;
