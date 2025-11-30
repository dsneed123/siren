import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TextClip, Size } from '@/core/types';
import { useSirenStore } from '@/core/store';
import { getAnimatedTransform } from '@/core/keyframes';

interface TextOverlayProps {
  clip: TextClip;
  containerSize: Size;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  currentTime: number;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const TextOverlay: React.FC<TextOverlayProps> = ({
  clip,
  containerSize,
  scale,
  isSelected,
  onSelect,
  currentTime,
}) => {
  const { updateClip, addKeyframe, getLinkedClips } = useSirenStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeHandle | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, moved: false });
  const [initialPositions, setInitialPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [initialState, setInitialState] = useState({
    position: clip.transform.position,
    size: clip.size || { width: 200, height: 100 },
  });

  // Get animated values at current time
  const clipTime = Math.max(0, currentTime - clip.timeRange.start);
  const animTransform = getAnimatedTransform(clipTime, clip.keyframeTracks, clip.transform);

  const position = {
    x: animTransform.position.x * scale,
    y: animTransform.position.y * scale,
  };
  // Default size if not specified (for backwards compat with emojis/older clips)
  const clipSize = clip.size || { width: 200, height: 100 };
  const size = {
    width: clipSize.width * animTransform.scale * scale,
    height: clipSize.height * animTransform.scale * scale,
  };

  // Handle click - only select, don't start dragging yet
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isEditing) {
        onSelect();
      }
    },
    [isEditing, onSelect]
  );

  // Start potential drag on mousedown
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return;
      e.stopPropagation();

      setDragStart({ x: e.clientX, y: e.clientY, moved: false });
      setInitialState({
        position: animTransform.position,
        size: clip.size || { width: 200, height: 100 },
      });

      // Store initial positions of this clip AND all linked clips
      const linkedClips = getLinkedClips(clip.id);
      const positions = new Map<string, { x: number; y: number }>();
      linkedClips.forEach(c => {
        const cTime = Math.max(0, currentTime - c.timeRange.start);
        const cTransform = getAnimatedTransform(cTime, c.keyframeTracks, c.transform);
        positions.set(c.id, { x: cTransform.position.x, y: cTransform.position.y });
      });
      setInitialPositions(positions);

      // Set a flag that we're ready to drag, but don't actually drag yet
      setIsDragging(true);
    },
    [clip, isEditing, animTransform.position, currentTime, getLinkedClips]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect();

      setIsResizing(handle);
      setDragStart({ x: e.clientX, y: e.clientY, moved: false });
      setInitialState({
        position: clip.transform.position,
        size: clip.size || { width: 200, height: 100 },
      });
    },
    [clip, onSelect]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const deltaX = (e.clientX - dragStart.x) / scale;
      const deltaY = (e.clientY - dragStart.y) / scale;

      // Only start actual dragging if we've moved more than 3px
      const hasMoved = Math.abs(e.clientX - dragStart.x) > 3 || Math.abs(e.clientY - dragStart.y) > 3;

      if (isDragging && hasMoved) {
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
      } else if (isResizing) {
        let newPosition = { ...initialState.position };
        let newSize = { ...initialState.size };

        switch (isResizing) {
          case 'nw':
            newPosition.x = initialState.position.x + deltaX;
            newPosition.y = initialState.position.y + deltaY;
            newSize.width = initialState.size.width - deltaX;
            newSize.height = initialState.size.height - deltaY;
            break;
          case 'n':
            newPosition.y = initialState.position.y + deltaY;
            newSize.height = initialState.size.height - deltaY;
            break;
          case 'ne':
            newPosition.y = initialState.position.y + deltaY;
            newSize.width = initialState.size.width + deltaX;
            newSize.height = initialState.size.height - deltaY;
            break;
          case 'e':
            newSize.width = initialState.size.width + deltaX;
            break;
          case 'se':
            newSize.width = initialState.size.width + deltaX;
            newSize.height = initialState.size.height + deltaY;
            break;
          case 's':
            newSize.height = initialState.size.height + deltaY;
            break;
          case 'sw':
            newPosition.x = initialState.position.x + deltaX;
            newSize.width = initialState.size.width - deltaX;
            newSize.height = initialState.size.height + deltaY;
            break;
          case 'w':
            newPosition.x = initialState.position.x + deltaX;
            newSize.width = initialState.size.width - deltaX;
            break;
        }

        newSize.width = Math.max(50, newSize.width);
        newSize.height = Math.max(30, newSize.height);
        newPosition.x = Math.max(0, Math.min(containerSize.width - newSize.width, newPosition.x));
        newPosition.y = Math.max(0, Math.min(containerSize.height - newSize.height, newPosition.y));

        updateClip(clip.id, {
          transform: { ...clip.transform, position: newPosition },
          size: newSize,
        });
      }
    },
    [isDragging, isResizing, dragStart, initialState, initialPositions, scale, clip, containerSize, currentTime, updateClip, addKeyframe, getLinkedClips]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Double click to edit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateClip(clip.id, { content: e.target.value });
    },
    [clip.id, updateClip]
  );

  const handleTextBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
    e.stopPropagation();
  }, []);

  // Build 3D text shadow for extrusion effect
  const build3DShadow = () => {
    if (!clip.style.effect3d || clip.style.effect3d.type === 'none') return '';

    const { depth, color } = clip.style.effect3d;
    const shadows: string[] = [];

    // Create layered shadows for 3D effect
    for (let i = 1; i <= depth; i++) {
      shadows.push(`${i}px ${i}px 0 ${color}`);
    }

    return shadows.join(', ');
  };

  // Build combined text shadow
  const buildTextShadow = () => {
    const shadows: string[] = [];

    // Add 3D extrusion
    const effect3d = build3DShadow();
    if (effect3d) shadows.push(effect3d);

    // Add regular text shadow
    if (clip.style.textShadow) {
      const { offsetX, offsetY, blur, color } = clip.style.textShadow;
      shadows.push(`${offsetX}px ${offsetY}px ${blur}px ${color}`);
    }

    // Add glow
    if (clip.style.glow) {
      const { color, blur } = clip.style.glow;
      shadows.push(`0 0 ${blur}px ${color}`);
      shadows.push(`0 0 ${blur * 2}px ${color}`);
    }

    return shadows.length > 0 ? shadows.join(', ') : undefined;
  };

  // Build gradient background for text
  const buildGradient = () => {
    if (!clip.style.gradient) return undefined;
    const { type, colors, angle } = clip.style.gradient;

    if (type === 'linear') {
      return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
    } else {
      return `radial-gradient(circle, ${colors.join(', ')})`;
    }
  };

  const textStyle: React.CSSProperties = {
    fontFamily: clip.style.fontFamily,
    fontSize: clip.style.fontSize * scale,
    fontWeight: clip.style.fontWeight,
    color: clip.style.gradient ? 'transparent' : clip.style.color,
    backgroundColor: clip.style.backgroundColor || 'transparent',
    textAlign: clip.style.textAlign,
    lineHeight: clip.style.lineHeight,
    letterSpacing: clip.style.letterSpacing,
    textShadow: buildTextShadow(),
    WebkitTextStroke: clip.style.stroke
      ? `${clip.style.stroke.width}px ${clip.style.stroke.color}`
      : undefined,
    // Gradient text
    background: buildGradient(),
    WebkitBackgroundClip: clip.style.gradient ? 'text' : undefined,
    backgroundClip: clip.style.gradient ? 'text' : undefined,
  };

  // 3D transform styles - use animated values
  const containerStyle: React.CSSProperties = {
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    opacity: animTransform.opacity,
    perspective: clip.style.effect3d?.perspective || 800,
  };

  const innerStyle: React.CSSProperties = {
    transform: `
      rotate(${animTransform.rotation}deg)
      ${clip.style.effect3d ? `rotateX(${clip.style.effect3d.rotateX}deg)` : ''}
      ${clip.style.effect3d ? `rotateY(${clip.style.effect3d.rotateY}deg)` : ''}
      ${clip.style.effect3d ? `rotateZ(${clip.style.effect3d.rotateZ}deg)` : ''}
    `,
    transformStyle: 'preserve-3d',
    // Add glow box shadow
    filter: clip.style.glow ? `drop-shadow(0 0 ${clip.style.glow.blur}px ${clip.style.glow.color})` : undefined,
  };

  const resizeHandles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  return (
    <motion.div
      ref={overlayRef}
      className={`absolute ${isEditing ? 'cursor-text' : 'cursor-move'} ${isSelected ? 'ring-2 ring-siren-accent' : ''}`}
      style={containerStyle}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="w-full h-full" style={innerStyle}>
        {isEditing ? (
          <textarea
            className="w-full h-full bg-transparent border-none outline-none resize-none p-1"
            style={textStyle}
            value={clip.content}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center overflow-visible p-1"
            style={textStyle}
          >
            {clip.content || 'Double-click to edit'}
          </div>
        )}
      </div>

      {/* Resize handles - only show when selected and not editing */}
      {isSelected && !isEditing && (
        <>
          {resizeHandles.map((handle) => (
            <ResizeHandleComponent
              key={handle}
              handle={handle}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}
        </>
      )}
    </motion.div>
  );
};

interface ResizeHandleComponentProps {
  handle: ResizeHandle;
  onMouseDown: (e: React.MouseEvent) => void;
}

const ResizeHandleComponent: React.FC<ResizeHandleComponentProps> = ({
  handle,
  onMouseDown,
}) => {
  const positions: Record<ResizeHandle, React.CSSProperties> = {
    nw: { top: -4, left: -4, cursor: 'nw-resize' },
    n: { top: -4, left: '50%', marginLeft: -4, cursor: 'n-resize' },
    ne: { top: -4, right: -4, cursor: 'ne-resize' },
    e: { top: '50%', right: -4, marginTop: -4, cursor: 'e-resize' },
    se: { bottom: -4, right: -4, cursor: 'se-resize' },
    s: { bottom: -4, left: '50%', marginLeft: -4, cursor: 's-resize' },
    sw: { bottom: -4, left: -4, cursor: 'sw-resize' },
    w: { top: '50%', left: -4, marginTop: -4, cursor: 'w-resize' },
  };

  return (
    <div
      className="absolute w-2 h-2 bg-white border border-siren-accent rounded-sm"
      style={positions[handle]}
      onMouseDown={onMouseDown}
    />
  );
};

export default TextOverlay;
