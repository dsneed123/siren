import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ImageClip, Size, MediaAsset } from '@/core/types';
import { useSirenStore } from '@/core/store';
import { getAnimatedTransform } from '@/core/keyframes';

interface ImageOverlayProps {
  clip: ImageClip;
  asset: MediaAsset;
  containerSize: Size;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  currentTime: number;
}

export const ImageOverlay: React.FC<ImageOverlayProps> = ({
  clip,
  asset,
  scale,
  isSelected,
  onSelect,
  currentTime,
}) => {
  const { updateClip, addKeyframe, getLinkedClips } = useSirenStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPositions, setInitialPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Get animated values
  const clipTime = Math.max(0, currentTime - clip.timeRange.start);
  const animTransform = getAnimatedTransform(clipTime, clip.keyframeTracks, clip.transform);

  const position = {
    x: animTransform.position.x * scale,
    y: animTransform.position.y * scale,
  };

  // Use asset dimensions or default
  const imgSize = asset.dimensions || { width: 200, height: 200 };
  const size = {
    width: imgSize.width * animTransform.scale * scale * 0.3, // Scale down for stickers
    height: imgSize.height * animTransform.scale * scale * 0.3,
  };

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });

    // Store initial positions of this clip AND all linked clips
    const linkedClips = getLinkedClips(clip.id);
    const positions = new Map<string, { x: number; y: number }>();
    linkedClips.forEach(c => {
      const cTime = Math.max(0, currentTime - c.timeRange.start);
      const cTransform = getAnimatedTransform(cTime, c.keyframeTracks, c.transform);
      positions.set(c.id, { x: cTransform.position.x, y: cTransform.position.y });
    });
    setInitialPositions(positions);
  }, [clip.id, currentTime, onSelect, getLinkedClips]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = (e.clientX - dragStart.x) / scale;
    const deltaY = (e.clientY - dragStart.y) / scale;

    // Move all linked clips together
    const linkedClips = getLinkedClips(clip.id);
    linkedClips.forEach(linkedClip => {
      const initPos = initialPositions.get(linkedClip.id);
      if (!initPos) return;

      const newX = Math.max(0, initPos.x + deltaX);
      const newY = Math.max(0, initPos.y + deltaY);
      const linkedClipTime = Math.max(0, currentTime - linkedClip.timeRange.start);

      // Check if linked clip has keyframes
      const linkedHasKF = linkedClip.keyframeTracks?.some(
        t => t.property === 'position.x' || t.property === 'position.y'
      );

      if (linkedHasKF) {
        addKeyframe(linkedClip.id, 'position.x', linkedClipTime, newX);
        addKeyframe(linkedClip.id, 'position.y', linkedClipTime, newY);
      } else {
        updateClip(linkedClip.id, {
          transform: { ...linkedClip.transform, position: { x: newX, y: newY } },
        });
      }
    });
  }, [isDragging, dragStart, initialPositions, scale, clip.id, currentTime, updateClip, addKeyframe, getLinkedClips]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const containerStyle: React.CSSProperties = {
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    opacity: animTransform.opacity,
    transform: `rotate(${animTransform.rotation}deg)`,
  };

  return (
    <div
      ref={overlayRef}
      className={`absolute cursor-move ${isSelected ? 'ring-2 ring-siren-accent' : ''}`}
      style={containerStyle}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <img
        src={asset.src}
        alt=""
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Resize handles when selected */}
      {isSelected && (
        <>
          {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => (
            <div
              key={handle}
              className="absolute w-2 h-2 bg-white border border-siren-accent rounded-sm"
              style={getHandlePosition(handle)}
            />
          ))}
        </>
      )}
    </div>
  );
};

const getHandlePosition = (handle: string): React.CSSProperties => {
  const positions: Record<string, React.CSSProperties> = {
    nw: { top: -4, left: -4, cursor: 'nw-resize' },
    n: { top: -4, left: '50%', marginLeft: -4, cursor: 'n-resize' },
    ne: { top: -4, right: -4, cursor: 'ne-resize' },
    e: { top: '50%', right: -4, marginTop: -4, cursor: 'e-resize' },
    se: { bottom: -4, right: -4, cursor: 'se-resize' },
    s: { bottom: -4, left: '50%', marginLeft: -4, cursor: 's-resize' },
    sw: { bottom: -4, left: -4, cursor: 'sw-resize' },
    w: { top: '50%', left: -4, marginTop: -4, cursor: 'w-resize' },
  };
  return positions[handle];
};

export default ImageOverlay;
