import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ShapeClip, Size } from '@/core/types';
import { useSirenStore } from '@/core/store';
import { getAnimatedTransform, getAnimatedSize } from '@/core/keyframes';

interface ShapeOverlayProps {
  clip: ShapeClip;
  containerSize: Size;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  currentTime: number;
}

export const ShapeOverlay: React.FC<ShapeOverlayProps> = ({
  clip,
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
  const animSize = getAnimatedSize(clipTime, clip.keyframeTracks, clip.size);

  const position = {
    x: animTransform.position.x * scale,
    y: animTransform.position.y * scale,
  };
  const size = {
    width: animSize.width * scale,
    height: animSize.height * scale,
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

  // Build shadow
  const buildShadow = () => {
    const shadows: string[] = [];
    if (clip.style.shadow) {
      const { offsetX, offsetY, blur, color } = clip.style.shadow;
      shadows.push(`${offsetX}px ${offsetY}px ${blur}px ${color}`);
    }
    if (clip.style.glow) {
      const { color, blur } = clip.style.glow;
      shadows.push(`0 0 ${blur}px ${color}`);
    }
    return shadows.length > 0 ? shadows.join(', ') : undefined;
  };

  // Render shape SVG
  const renderShape = () => {
    const fill = clip.style.gradient ? 'url(#gradient)' : clip.style.fill;
    const strokeDash = clip.style.strokeStyle === 'dashed' ? '10,5' :
                       clip.style.strokeStyle === 'dotted' ? '2,2' : undefined;

    switch (clip.shapeType) {
      case 'rectangle':
        return (
          <rect
            x={clip.style.strokeWidth / 2}
            y={clip.style.strokeWidth / 2}
            width={size.width - clip.style.strokeWidth}
            height={size.height - clip.style.strokeWidth}
            rx={clip.style.cornerRadius * scale}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );

      case 'circle':
        return (
          <ellipse
            cx={size.width / 2}
            cy={size.height / 2}
            rx={(size.width - clip.style.strokeWidth) / 2}
            ry={(size.height - clip.style.strokeWidth) / 2}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );

      case 'triangle':
        const triPoints = `${size.width / 2},${clip.style.strokeWidth} ${size.width - clip.style.strokeWidth},${size.height - clip.style.strokeWidth} ${clip.style.strokeWidth},${size.height - clip.style.strokeWidth}`;
        return (
          <polygon
            points={triPoints}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );

      case 'arrow':
        const arrowHead = clip.style.arrowHeadSize || 20;
        return (
          <g>
            <line
              x1={clip.style.strokeWidth}
              y1={size.height / 2}
              x2={size.width - arrowHead * scale}
              y2={size.height / 2}
              stroke={clip.style.fill}
              strokeWidth={clip.style.strokeWidth || 4}
            />
            <polygon
              points={`${size.width - arrowHead * scale},${size.height / 2 - arrowHead * scale / 2} ${size.width},${size.height / 2} ${size.width - arrowHead * scale},${size.height / 2 + arrowHead * scale / 2}`}
              fill={clip.style.fill}
            />
          </g>
        );

      case 'star':
        const starPoints = clip.style.points || 5;
        const outerR = Math.min(size.width, size.height) / 2 - clip.style.strokeWidth;
        const innerR = outerR * (clip.style.innerRadius || 0.4);
        const cx = size.width / 2;
        const cy = size.height / 2;
        let starPath = '';
        for (let i = 0; i < starPoints * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / starPoints) * i - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          starPath += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
        }
        starPath += 'Z';
        return (
          <path
            d={starPath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'heart':
        const heartPath = `M ${size.width / 2} ${size.height * 0.85}
          C ${size.width * 0.1} ${size.height * 0.5} ${size.width * 0.1} ${size.height * 0.2} ${size.width / 2} ${size.height * 0.35}
          C ${size.width * 0.9} ${size.height * 0.2} ${size.width * 0.9} ${size.height * 0.5} ${size.width / 2} ${size.height * 0.85} Z`;
        return (
          <path
            d={heartPath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'checkmark':
        return (
          <path
            d={`M ${size.width * 0.2} ${size.height * 0.5} L ${size.width * 0.4} ${size.height * 0.7} L ${size.width * 0.8} ${size.height * 0.3}`}
            fill="none"
            stroke={clip.style.fill}
            strokeWidth={clip.style.strokeWidth || 8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case 'cross':
        return (
          <g stroke={clip.style.fill} strokeWidth={clip.style.strokeWidth || 8} strokeLinecap="round">
            <line x1={size.width * 0.2} y1={size.height * 0.2} x2={size.width * 0.8} y2={size.height * 0.8} />
            <line x1={size.width * 0.8} y1={size.height * 0.2} x2={size.width * 0.2} y2={size.height * 0.8} />
          </g>
        );

      case 'lightning':
        const lightPath = `M ${size.width * 0.6} ${size.height * 0.1}
          L ${size.width * 0.3} ${size.height * 0.45}
          L ${size.width * 0.5} ${size.height * 0.45}
          L ${size.width * 0.4} ${size.height * 0.9}
          L ${size.width * 0.7} ${size.height * 0.55}
          L ${size.width * 0.5} ${size.height * 0.55} Z`;
        return (
          <path
            d={lightPath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'line':
        return (
          <line
            x1={clip.style.strokeWidth}
            y1={size.height / 2}
            x2={size.width - clip.style.strokeWidth}
            y2={size.height / 2}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth || 4}
            strokeDasharray={strokeDash}
          />
        );

      case 'speech-bubble':
        const bubblePath = `M ${size.width * 0.1} ${size.height * 0.1}
          H ${size.width * 0.9}
          Q ${size.width * 0.95} ${size.height * 0.1} ${size.width * 0.95} ${size.height * 0.15}
          V ${size.height * 0.6}
          Q ${size.width * 0.95} ${size.height * 0.65} ${size.width * 0.9} ${size.height * 0.65}
          H ${size.width * 0.3}
          L ${size.width * 0.1} ${size.height * 0.9}
          L ${size.width * 0.2} ${size.height * 0.65}
          H ${size.width * 0.1}
          Q ${size.width * 0.05} ${size.height * 0.65} ${size.width * 0.05} ${size.height * 0.6}
          V ${size.height * 0.15}
          Q ${size.width * 0.05} ${size.height * 0.1} ${size.width * 0.1} ${size.height * 0.1} Z`;
        return (
          <path
            d={bubblePath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      default:
        return (
          <rect
            width={size.width}
            height={size.height}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
          />
        );
    }
  };

  const containerStyle: React.CSSProperties = {
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    opacity: animTransform.opacity,
    transform: `rotate(${animTransform.rotation}deg) scale(${animTransform.scale})`,
    filter: buildShadow() ? `drop-shadow(${buildShadow()})` : undefined,
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
      <svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`}>
        {clip.style.gradient && (
          <defs>
            <linearGradient id="gradient" gradientTransform={`rotate(${clip.style.gradient.angle})`}>
              {clip.style.gradient.colors.map((color, i) => (
                <stop
                  key={i}
                  offset={`${(i / (clip.style.gradient!.colors.length - 1)) * 100}%`}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          </defs>
        )}
        {renderShape()}
      </svg>

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

export default ShapeOverlay;
