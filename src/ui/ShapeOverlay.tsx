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

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const ShapeOverlay: React.FC<ShapeOverlayProps> = ({
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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPositions, setInitialPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [initialState, setInitialState] = useState({
    position: clip.transform.position,
    size: clip.size,
  });

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

  // Mouse handlers for dragging
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

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();

    setIsResizing(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialState({
      position: animTransform.position,
      size: animSize,
    });
  }, [animTransform.position, animSize, onSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const deltaX = (e.clientX - dragStart.x) / scale;
    const deltaY = (e.clientY - dragStart.y) / scale;

    if (isDragging) {
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

      // Calculate new size and position based on resize handle
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

      // Enforce minimum size
      newSize.width = Math.max(20, newSize.width);
      newSize.height = Math.max(20, newSize.height);

      // Constrain to container
      newPosition.x = Math.max(0, Math.min(containerSize.width - newSize.width, newPosition.x));
      newPosition.y = Math.max(0, Math.min(containerSize.height - newSize.height, newPosition.y));

      updateClip(clip.id, {
        transform: { ...clip.transform, position: newPosition },
        size: newSize,
      });
    }
  }, [isDragging, isResizing, dragStart, initialState, initialPositions, scale, clip, containerSize, currentTime, updateClip, addKeyframe, getLinkedClips]);

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

      case 'line-dashed':
        return (
          <line
            x1={clip.style.strokeWidth}
            y1={size.height / 2}
            x2={size.width - clip.style.strokeWidth}
            y2={size.height / 2}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth || 4}
            strokeDasharray="10,5"
          />
        );

      case 'arrow-left':
        const arrowLeftHead = clip.style.arrowHeadSize || 20;
        return (
          <g>
            <line
              x1={arrowLeftHead * scale}
              y1={size.height / 2}
              x2={size.width - clip.style.strokeWidth}
              y2={size.height / 2}
              stroke={clip.style.fill}
              strokeWidth={clip.style.strokeWidth || 4}
            />
            <polygon
              points={`${arrowLeftHead * scale},${size.height / 2 - arrowLeftHead * scale / 2} 0,${size.height / 2} ${arrowLeftHead * scale},${size.height / 2 + arrowLeftHead * scale / 2}`}
              fill={clip.style.fill}
            />
          </g>
        );

      case 'arrow-up':
        const arrowUpHead = clip.style.arrowHeadSize || 20;
        return (
          <g>
            <line
              x1={size.width / 2}
              y1={arrowUpHead * scale}
              x2={size.width / 2}
              y2={size.height - clip.style.strokeWidth}
              stroke={clip.style.fill}
              strokeWidth={clip.style.strokeWidth || 4}
            />
            <polygon
              points={`${size.width / 2 - arrowUpHead * scale / 2},${arrowUpHead * scale} ${size.width / 2},0 ${size.width / 2 + arrowUpHead * scale / 2},${arrowUpHead * scale}`}
              fill={clip.style.fill}
            />
          </g>
        );

      case 'arrow-down':
        const arrowDownHead = clip.style.arrowHeadSize || 20;
        return (
          <g>
            <line
              x1={size.width / 2}
              y1={clip.style.strokeWidth}
              x2={size.width / 2}
              y2={size.height - arrowDownHead * scale}
              stroke={clip.style.fill}
              strokeWidth={clip.style.strokeWidth || 4}
            />
            <polygon
              points={`${size.width / 2 - arrowDownHead * scale / 2},${size.height - arrowDownHead * scale} ${size.width / 2},${size.height} ${size.width / 2 + arrowDownHead * scale / 2},${size.height - arrowDownHead * scale}`}
              fill={clip.style.fill}
            />
          </g>
        );

      case 'arrow-double':
        const arrowDoubleHead = clip.style.arrowHeadSize || 20;
        return (
          <g>
            <line
              x1={arrowDoubleHead * scale}
              y1={size.height / 2}
              x2={size.width - arrowDoubleHead * scale}
              y2={size.height / 2}
              stroke={clip.style.fill}
              strokeWidth={clip.style.strokeWidth || 4}
            />
            <polygon
              points={`${arrowDoubleHead * scale},${size.height / 2 - arrowDoubleHead * scale / 2} 0,${size.height / 2} ${arrowDoubleHead * scale},${size.height / 2 + arrowDoubleHead * scale / 2}`}
              fill={clip.style.fill}
            />
            <polygon
              points={`${size.width - arrowDoubleHead * scale},${size.height / 2 - arrowDoubleHead * scale / 2} ${size.width},${size.height / 2} ${size.width - arrowDoubleHead * scale},${size.height / 2 + arrowDoubleHead * scale / 2}`}
              fill={clip.style.fill}
            />
          </g>
        );

      case 'arrow-curved':
        const curvedArrowHead = clip.style.arrowHeadSize || 20;
        return (
          <g>
            <path
              d={`M ${clip.style.strokeWidth} ${size.height * 0.7} Q ${size.width / 2} ${size.height * 0.2} ${size.width - curvedArrowHead * scale} ${size.height * 0.5}`}
              fill="none"
              stroke={clip.style.fill}
              strokeWidth={clip.style.strokeWidth || 4}
            />
            <polygon
              points={`${size.width - curvedArrowHead * scale},${size.height * 0.5 - curvedArrowHead * scale / 2} ${size.width},${size.height * 0.5} ${size.width - curvedArrowHead * scale},${size.height * 0.5 + curvedArrowHead * scale / 2}`}
              fill={clip.style.fill}
            />
          </g>
        );

      case 'diamond':
        const diamondPoints = `${size.width / 2},${clip.style.strokeWidth} ${size.width - clip.style.strokeWidth},${size.height / 2} ${size.width / 2},${size.height - clip.style.strokeWidth} ${clip.style.strokeWidth},${size.height / 2}`;
        return (
          <polygon
            points={diamondPoints}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
            strokeDasharray={strokeDash}
          />
        );

      case 'polygon':
        const polyPoints = clip.style.points || 6;
        const polyR = Math.min(size.width, size.height) / 2 - clip.style.strokeWidth;
        const polyCx = size.width / 2;
        const polyCy = size.height / 2;
        let polyPath = '';
        for (let i = 0; i < polyPoints; i++) {
          const angle = (2 * Math.PI / polyPoints) * i - Math.PI / 2;
          const x = polyCx + polyR * Math.cos(angle);
          const y = polyCy + polyR * Math.sin(angle);
          polyPath += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
        }
        polyPath += 'Z';
        return (
          <path
            d={polyPath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'plus':
        const plusBarW = size.width * 0.3;
        const plusBarH = size.height * 0.3;
        const plusX1 = size.width / 2 - plusBarW / 2;
        const plusX2 = size.width / 2 + plusBarW / 2;
        const plusY1 = size.height / 2 - plusBarH / 2;
        const plusY2 = size.height / 2 + plusBarH / 2;
        return (
          <path
            d={`M ${plusX1} 0
                L ${plusX2} 0
                L ${plusX2} ${plusY1}
                L ${size.width} ${plusY1}
                L ${size.width} ${plusY2}
                L ${plusX2} ${plusY2}
                L ${plusX2} ${size.height}
                L ${plusX1} ${size.height}
                L ${plusX1} ${plusY2}
                L 0 ${plusY2}
                L 0 ${plusY1}
                L ${plusX1} ${plusY1}
                Z`}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'minus':
        return (
          <rect
            x={size.width * 0.1}
            y={size.height * 0.4}
            width={size.width * 0.8}
            height={size.height * 0.2}
            rx={clip.style.cornerRadius * scale}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'flame':
        const flamePath = `M ${size.width * 0.5} ${size.height * 0.05}
          C ${size.width * 0.3} ${size.height * 0.3} ${size.width * 0.15} ${size.height * 0.5} ${size.width * 0.2} ${size.height * 0.7}
          C ${size.width * 0.25} ${size.height * 0.85} ${size.width * 0.35} ${size.height * 0.95} ${size.width * 0.5} ${size.height * 0.95}
          C ${size.width * 0.65} ${size.height * 0.95} ${size.width * 0.75} ${size.height * 0.85} ${size.width * 0.8} ${size.height * 0.7}
          C ${size.width * 0.85} ${size.height * 0.5} ${size.width * 0.7} ${size.height * 0.3} ${size.width * 0.5} ${size.height * 0.05} Z`;
        return (
          <path
            d={flamePath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'droplet':
        const dropPath = `M ${size.width * 0.5} ${size.height * 0.1}
          C ${size.width * 0.2} ${size.height * 0.4} ${size.width * 0.15} ${size.height * 0.65} ${size.width * 0.5} ${size.height * 0.9}
          C ${size.width * 0.85} ${size.height * 0.65} ${size.width * 0.8} ${size.height * 0.4} ${size.width * 0.5} ${size.height * 0.1} Z`;
        return (
          <path
            d={dropPath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'cloud':
        return (
          <g>
            <ellipse cx={size.width * 0.3} cy={size.height * 0.6} rx={size.width * 0.2} ry={size.height * 0.25} fill={fill} fillOpacity={clip.style.fillOpacity} stroke={clip.style.stroke} strokeWidth={clip.style.strokeWidth} />
            <ellipse cx={size.width * 0.5} cy={size.height * 0.45} rx={size.width * 0.25} ry={size.height * 0.3} fill={fill} fillOpacity={clip.style.fillOpacity} stroke={clip.style.stroke} strokeWidth={clip.style.strokeWidth} />
            <ellipse cx={size.width * 0.7} cy={size.height * 0.55} rx={size.width * 0.2} ry={size.height * 0.25} fill={fill} fillOpacity={clip.style.fillOpacity} stroke={clip.style.stroke} strokeWidth={clip.style.strokeWidth} />
            <rect x={size.width * 0.15} y={size.height * 0.5} width={size.width * 0.7} height={size.height * 0.2} fill={fill} fillOpacity={clip.style.fillOpacity} />
          </g>
        );

      case 'sun':
        const sunR = Math.min(size.width, size.height) * 0.25;
        const sunRays = 8;
        const rayLength = Math.min(size.width, size.height) * 0.15;
        return (
          <g>
            <circle cx={size.width / 2} cy={size.height / 2} r={sunR} fill={fill} fillOpacity={clip.style.fillOpacity} stroke={clip.style.stroke} strokeWidth={clip.style.strokeWidth} />
            {Array.from({ length: sunRays }).map((_, i) => {
              const angle = (2 * Math.PI / sunRays) * i;
              const x1 = size.width / 2 + (sunR + 5) * Math.cos(angle);
              const y1 = size.height / 2 + (sunR + 5) * Math.sin(angle);
              const x2 = size.width / 2 + (sunR + rayLength) * Math.cos(angle);
              const y2 = size.height / 2 + (sunR + rayLength) * Math.sin(angle);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={clip.style.fill} strokeWidth={clip.style.strokeWidth || 3} strokeLinecap="round" />;
            })}
          </g>
        );

      case 'moon':
        const moonR = Math.min(size.width, size.height) * 0.4;
        return (
          <path
            d={`M ${size.width / 2 + moonR * 0.3} ${size.height / 2 - moonR}
              A ${moonR} ${moonR} 0 1 1 ${size.width / 2 + moonR * 0.3} ${size.height / 2 + moonR}
              A ${moonR * 0.75} ${moonR * 0.75} 0 1 0 ${size.width / 2 + moonR * 0.3} ${size.height / 2 - moonR}`}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'burst':
        const burstPoints = clip.style.points || 12;
        const burstOuterR = Math.min(size.width, size.height) / 2 - clip.style.strokeWidth;
        const burstInnerR = burstOuterR * 0.6;
        const burstCx = size.width / 2;
        const burstCy = size.height / 2;
        let burstPath = '';
        for (let i = 0; i < burstPoints * 2; i++) {
          const r = i % 2 === 0 ? burstOuterR : burstInnerR;
          const angle = (Math.PI / burstPoints) * i - Math.PI / 2;
          const x = burstCx + r * Math.cos(angle);
          const y = burstCy + r * Math.sin(angle);
          burstPath += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
        }
        burstPath += 'Z';
        return (
          <path
            d={burstPath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'badge':
        const badgeR = Math.min(size.width, size.height) * 0.4;
        return (
          <g>
            <circle cx={size.width / 2} cy={size.height / 2} r={badgeR} fill={fill} fillOpacity={clip.style.fillOpacity} stroke={clip.style.stroke} strokeWidth={clip.style.strokeWidth} />
            <circle cx={size.width / 2} cy={size.height / 2} r={badgeR * 0.75} fill="none" stroke={clip.style.stroke} strokeWidth={clip.style.strokeWidth / 2} />
          </g>
        );

      case 'ribbon':
        const ribbonPath = `M ${size.width * 0.1} ${size.height * 0.3}
          L ${size.width * 0.2} ${size.height * 0.5}
          L ${size.width * 0.1} ${size.height * 0.7}
          L ${size.width * 0.3} ${size.height * 0.7}
          L ${size.width * 0.5} ${size.height * 0.5}
          L ${size.width * 0.7} ${size.height * 0.7}
          L ${size.width * 0.9} ${size.height * 0.7}
          L ${size.width * 0.8} ${size.height * 0.5}
          L ${size.width * 0.9} ${size.height * 0.3}
          L ${size.width * 0.7} ${size.height * 0.3}
          L ${size.width * 0.5} ${size.height * 0.5}
          L ${size.width * 0.3} ${size.height * 0.3}
          Z`;
        return (
          <path
            d={ribbonPath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'sparkle':
        const sparkleW = size.width / 2;
        const sparkleH = size.height / 2;
        const sparklePath = `M ${sparkleW} 0
          Q ${sparkleW * 0.9} ${sparkleH * 0.9} 0 ${sparkleH}
          Q ${sparkleW * 0.9} ${sparkleH * 1.1} ${sparkleW} ${size.height}
          Q ${sparkleW * 1.1} ${sparkleH * 1.1} ${size.width} ${sparkleH}
          Q ${sparkleW * 1.1} ${sparkleH * 0.9} ${sparkleW} 0 Z`;
        return (
          <path
            d={sparklePath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'thought-bubble':
        return (
          <g>
            <ellipse cx={size.width * 0.5} cy={size.height * 0.4} rx={size.width * 0.4} ry={size.height * 0.3} fill={fill} fillOpacity={clip.style.fillOpacity} stroke={clip.style.stroke} strokeWidth={clip.style.strokeWidth} />
            <circle cx={size.width * 0.25} cy={size.height * 0.75} r={size.width * 0.08} fill={fill} fillOpacity={clip.style.fillOpacity} stroke={clip.style.stroke} strokeWidth={clip.style.strokeWidth} />
            <circle cx={size.width * 0.15} cy={size.height * 0.88} r={size.width * 0.05} fill={fill} fillOpacity={clip.style.fillOpacity} stroke={clip.style.stroke} strokeWidth={clip.style.strokeWidth} />
          </g>
        );

      case 'callout':
        const calloutPath = `M ${size.width * 0.05} ${size.height * 0.1}
          H ${size.width * 0.95}
          V ${size.height * 0.6}
          H ${size.width * 0.35}
          L ${size.width * 0.15} ${size.height * 0.9}
          L ${size.width * 0.25} ${size.height * 0.6}
          H ${size.width * 0.05}
          Z`;
        return (
          <path
            d={calloutPath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
          />
        );

      case 'banner':
        const bannerPath = `M 0 ${size.height * 0.2}
          L ${size.width * 0.1} ${size.height * 0.5}
          L 0 ${size.height * 0.8}
          H ${size.width}
          L ${size.width * 0.9} ${size.height * 0.5}
          L ${size.width} ${size.height * 0.2}
          Z`;
        return (
          <path
            d={bannerPath}
            fill={fill}
            fillOpacity={clip.style.fillOpacity}
            stroke={clip.style.stroke}
            strokeWidth={clip.style.strokeWidth}
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

  const resizeHandles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

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
        {/* Text inside shape */}
        {clip.style.text && (
          <text
            x={clip.style.text.align === 'left' ? '10%' : clip.style.text.align === 'right' ? '90%' : '50%'}
            y="50%"
            dominantBaseline="middle"
            textAnchor={clip.style.text.align === 'left' ? 'start' : clip.style.text.align === 'right' ? 'end' : 'middle'}
            fill={clip.style.text.color}
            fontFamily={clip.style.text.fontFamily}
            fontSize={clip.style.text.fontSize * scale}
            fontWeight={clip.style.text.fontWeight}
            style={{ pointerEvents: 'none' }}
          >
            {clip.style.text.content}
          </text>
        )}
      </svg>

      {/* Resize handles when selected */}
      {isSelected && (
        <>
          {resizeHandles.map((handle) => (
            <div
              key={handle}
              className="absolute w-3 h-3 bg-white border-2 border-siren-accent rounded-sm hover:bg-siren-accent hover:border-white transition-colors"
              style={getHandlePosition(handle)}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}
        </>
      )}
    </div>
  );
};

const getHandlePosition = (handle: string): React.CSSProperties => {
  const positions: Record<string, React.CSSProperties> = {
    nw: { top: -6, left: -6, cursor: 'nw-resize' },
    n: { top: -6, left: '50%', marginLeft: -6, cursor: 'n-resize' },
    ne: { top: -6, right: -6, cursor: 'ne-resize' },
    e: { top: '50%', right: -6, marginTop: -6, cursor: 'e-resize' },
    se: { bottom: -6, right: -6, cursor: 'se-resize' },
    s: { bottom: -6, left: '50%', marginLeft: -6, cursor: 's-resize' },
    sw: { bottom: -6, left: -6, cursor: 'sw-resize' },
    w: { top: '50%', left: -6, marginTop: -6, cursor: 'w-resize' },
  };
  return positions[handle];
};

export default ShapeOverlay;
