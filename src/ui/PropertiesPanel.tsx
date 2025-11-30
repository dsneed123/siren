import React, { useState } from 'react';
import { useSirenStore } from '@/core/store';
import { Clip, VideoClip, AudioClip, TextClip, ShapeClip, ImageClip, AnimatableProperty, Transform } from '@/core/types';
import { TextEditor } from '@/text';
import { getAnimatedValue } from '@/core/keyframes';

export const PropertiesPanel: React.FC = () => {
  const { project, editor } = useSirenStore();

  const selectedClips = project.clips.filter((c) =>
    editor.selectedClipIds.includes(c.id)
  );

  if (selectedClips.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-siren-text mb-3">Properties</h3>
        <div className="text-center text-siren-text-muted py-8">
          <p className="text-sm">No clip selected</p>
          <p className="text-xs mt-1">Select a clip to edit properties</p>
        </div>
      </div>
    );
  }

  if (selectedClips.length > 1) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-siren-text mb-3">Properties</h3>
        <div className="text-center text-siren-text-muted py-4">
          <p className="text-sm">{selectedClips.length} clips selected</p>
        </div>
        <MultiClipProperties clips={selectedClips} />
      </div>
    );
  }

  const clip = selectedClips[0];

  return (
    <div className="h-full overflow-y-auto">
      {clip.type === 'text' ? (
        <TextEditor clip={clip as TextClip} />
      ) : clip.type === 'video' ? (
        <VideoClipProperties clip={clip as VideoClip} />
      ) : clip.type === 'audio' ? (
        <AudioClipProperties clip={clip as AudioClip} />
      ) : clip.type === 'shape' ? (
        <ShapeClipProperties clip={clip as ShapeClip} />
      ) : clip.type === 'image' ? (
        <ImageClipProperties clip={clip as ImageClip} />
      ) : (
        <GeneralClipProperties clip={clip} />
      )}
    </div>
  );
};

const VideoClipProperties: React.FC<{ clip: VideoClip }> = ({ clip }) => {
  const { updateClip, project } = useSirenStore();
  const asset = project.assets.find((a) => a.id === clip.assetId);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-siren-text">Video Properties</h3>

      {asset && (
        <div className="text-xs text-siren-text-muted">
          <p>Source: {asset.name}</p>
        </div>
      )}

      {/* Speed */}
      <div>
        <label className="block text-xs text-siren-text-muted mb-1">Speed</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1"
            value={clip.speed}
            onChange={(e) => updateClip(clip.id, { speed: parseFloat(e.target.value) })}
            min={0.25}
            max={4}
            step={0.25}
          />
          <span className="text-xs text-siren-text w-12 text-right">{clip.speed}x</span>
        </div>
      </div>

      {/* Volume */}
      <div>
        <label className="block text-xs text-siren-text-muted mb-1">Volume</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1"
            value={clip.volume * 100}
            onChange={(e) => updateClip(clip.id, { volume: parseInt(e.target.value) / 100 })}
            min={0}
            max={100}
          />
          <span className="text-xs text-siren-text w-12 text-right">{Math.round(clip.volume * 100)}%</span>
        </div>
      </div>

      {/* Mute */}
      <div>
        <label className="flex items-center gap-2 text-xs text-siren-text-muted">
          <input
            type="checkbox"
            checked={clip.muted}
            onChange={(e) => updateClip(clip.id, { muted: e.target.checked })}
          />
          Mute audio
        </label>
      </div>

      {/* Transform */}
      <TransformProperties clip={clip} />
    </div>
  );
};

const AudioClipProperties: React.FC<{ clip: AudioClip }> = ({ clip }) => {
  const { updateClip, project } = useSirenStore();
  const asset = project.assets.find((a) => a.id === clip.assetId);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-siren-text">Audio Properties</h3>

      {asset && (
        <div className="text-xs text-siren-text-muted">
          <p>Source: {asset.name}</p>
        </div>
      )}

      {/* Volume */}
      <div>
        <label className="block text-xs text-siren-text-muted mb-1">Volume</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1"
            value={clip.volume * 100}
            onChange={(e) => updateClip(clip.id, { volume: parseInt(e.target.value) / 100 })}
            min={0}
            max={100}
          />
          <span className="text-xs text-siren-text w-12 text-right">{Math.round(clip.volume * 100)}%</span>
        </div>
      </div>

      {/* Fade In */}
      <div>
        <label className="block text-xs text-siren-text-muted mb-1">Fade In (ms)</label>
        <input
          type="number"
          className="w-full px-3 py-2 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
          value={clip.fadeIn}
          onChange={(e) => updateClip(clip.id, { fadeIn: parseInt(e.target.value) || 0 })}
          min={0}
          max={5000}
          step={100}
        />
      </div>

      {/* Fade Out */}
      <div>
        <label className="block text-xs text-siren-text-muted mb-1">Fade Out (ms)</label>
        <input
          type="number"
          className="w-full px-3 py-2 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
          value={clip.fadeOut}
          onChange={(e) => updateClip(clip.id, { fadeOut: parseInt(e.target.value) || 0 })}
          min={0}
          max={5000}
          step={100}
        />
      </div>
    </div>
  );
};

const GeneralClipProperties: React.FC<{ clip: Clip }> = ({ clip }) => {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-siren-text">
        {clip.type.charAt(0).toUpperCase() + clip.type.slice(1)} Properties
      </h3>
      <TransformProperties clip={clip} />
    </div>
  );
};

const TransformProperties: React.FC<{ clip: Clip }> = ({ clip }) => {
  const { updateClip, addKeyframe, removeKeyframeAt, clearKeyframes, setCurrentTime, editor } = useSirenStore();
  const clipTime = Math.max(0, editor.currentTime - clip.timeRange.start);

  // Get animated values at current time
  const animX = getAnimatedValue('position.x', clipTime, clip.keyframeTracks, clip.transform.position.x);
  const animY = getAnimatedValue('position.y', clipTime, clip.keyframeTracks, clip.transform.position.y);
  const animScale = getAnimatedValue('scale', clipTime, clip.keyframeTracks, clip.transform.scale);
  const animRotation = getAnimatedValue('rotation', clipTime, clip.keyframeTracks, clip.transform.rotation);
  const animOpacity = getAnimatedValue('opacity', clipTime, clip.keyframeTracks, clip.transform.opacity);

  // Get all unique keyframe times sorted
  const allKeyframeTimes = React.useMemo(() => {
    if (!clip.keyframeTracks) return [];
    const times = new Set<number>();
    clip.keyframeTracks.forEach(track => {
      track.keyframes.forEach(kf => times.add(kf.time));
    });
    return Array.from(times).sort((a, b) => a - b);
  }, [clip.keyframeTracks]);

  const hasAnyKeyframes = allKeyframeTimes.length > 0;

  // Find current keyframe index
  const currentKeyframeIndex = allKeyframeTimes.findIndex(t => Math.abs(t - clipTime) < 50);
  const hasKeyframeAtCurrentTime = currentKeyframeIndex !== -1;

  // Navigation functions
  const goToPrevKeyframe = () => {
    const prevTimes = allKeyframeTimes.filter(t => t < clipTime - 50);
    if (prevTimes.length > 0) {
      const prevTime = prevTimes[prevTimes.length - 1];
      setCurrentTime(clip.timeRange.start + prevTime);
    }
  };

  const goToNextKeyframe = () => {
    const nextTimes = allKeyframeTimes.filter(t => t > clipTime + 50);
    if (nextTimes.length > 0) {
      const nextTime = nextTimes[0];
      setCurrentTime(clip.timeRange.start + nextTime);
    }
  };

  // Add keyframe for all transform properties at current time
  const addAllKeyframes = () => {
    addKeyframe(clip.id, 'position.x', clipTime, animX);
    addKeyframe(clip.id, 'position.y', clipTime, animY);
    addKeyframe(clip.id, 'scale', clipTime, animScale);
    addKeyframe(clip.id, 'rotation', clipTime, animRotation);
    addKeyframe(clip.id, 'opacity', clipTime, animOpacity);
  };

  // Helper to update property and auto-add keyframe if keyframes exist
  const updateWithKeyframe = (property: AnimatableProperty, value: number, transformUpdate: Partial<Transform>) => {
    if (hasAnyKeyframes) {
      addKeyframe(clip.id, property, clipTime, value);
    }
    updateClip(clip.id, {
      transform: { ...clip.transform, ...transformUpdate },
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-siren-text-muted">Transform</h4>

      {/* Keyframe Controls - Main UI */}
      <div className="bg-siren-bg rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-siren-text">Keyframes</span>
          <span className="text-[10px] text-siren-text-muted">
            {allKeyframeTimes.length} total
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Prev keyframe */}
          <button
            onClick={goToPrevKeyframe}
            disabled={!hasAnyKeyframes || allKeyframeTimes.filter(t => t < clipTime - 50).length === 0}
            className="p-1.5 rounded bg-siren-surface hover:bg-siren-border disabled:opacity-30 disabled:cursor-not-allowed text-siren-text text-xs"
            title="Previous keyframe"
          >
            ◀
          </button>

          {/* Add/show keyframe */}
          <button
            onClick={addAllKeyframes}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
              hasKeyframeAtCurrentTime
                ? 'bg-yellow-500 text-black'
                : 'bg-siren-surface hover:bg-yellow-500/30 hover:text-yellow-500 text-siren-text'
            }`}
            title={hasKeyframeAtCurrentTime ? 'At keyframe' : 'Add keyframe here'}
          >
            {hasKeyframeAtCurrentTime ? `◆ Keyframe ${currentKeyframeIndex + 1}` : '◇ Add Keyframe'}
          </button>

          {/* Next keyframe */}
          <button
            onClick={goToNextKeyframe}
            disabled={!hasAnyKeyframes || allKeyframeTimes.filter(t => t > clipTime + 50).length === 0}
            className="p-1.5 rounded bg-siren-surface hover:bg-siren-border disabled:opacity-30 disabled:cursor-not-allowed text-siren-text text-xs"
            title="Next keyframe"
          >
            ▶
          </button>
        </div>

        {/* Keyframe timeline mini-view */}
        {hasAnyKeyframes && (
          <div className="relative h-4 bg-siren-surface rounded overflow-hidden">
            <div className="absolute inset-0 flex items-center">
              {allKeyframeTimes.map((time, idx) => {
                const clipDuration = clip.timeRange.end - clip.timeRange.start;
                const position = (time / clipDuration) * 100;
                const isCurrentKf = Math.abs(time - clipTime) < 50;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentTime(clip.timeRange.start + time)}
                    className={`absolute w-2 h-2 transform -translate-x-1/2 rotate-45 transition-colors ${
                      isCurrentKf ? 'bg-yellow-400 scale-125' : 'bg-yellow-600 hover:bg-yellow-400'
                    }`}
                    style={{ left: `${position}%` }}
                    title={`Go to ${(time / 1000).toFixed(2)}s`}
                  />
                );
              })}
              {/* Current time indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                style={{ left: `${(clipTime / (clip.timeRange.end - clip.timeRange.start)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {hasAnyKeyframes && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-green-400">Auto-add ON</span>
            <button
              onClick={() => clearKeyframes(clip.id)}
              className="text-red-400 hover:text-red-300"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Keyframe List - click to jump, X to delete */}
        {hasAnyKeyframes && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            <div className="text-[10px] text-siren-text-muted">Click to jump, ✕ to delete:</div>
            {allKeyframeTimes.map((time, idx) => {
              const isCurrentKf = Math.abs(time - clipTime) < 50;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                    isCurrentKf ? 'bg-yellow-500/20 text-yellow-400' : 'bg-siren-surface text-siren-text'
                  }`}
                >
                  <button
                    onClick={() => setCurrentTime(clip.timeRange.start + time)}
                    className="flex-1 text-left hover:text-yellow-400 transition-colors"
                  >
                    ◆ {(time / 1000).toFixed(2)}s
                  </button>
                  <button
                    onClick={() => {
                      // Delete all keyframes at this time
                      removeKeyframeAt(clip.id, 'position.x', time);
                      removeKeyframeAt(clip.id, 'position.y', time);
                      removeKeyframeAt(clip.id, 'scale', time);
                      removeKeyframeAt(clip.id, 'rotation', time);
                      removeKeyframeAt(clip.id, 'opacity', time);
                    }}
                    className="ml-2 text-red-400 hover:text-red-300 text-xs px-1"
                    title="Delete this keyframe"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-siren-text-muted mb-1 block">X</label>
          <input
            type="number"
            className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
            value={Math.round(animX)}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              updateWithKeyframe('position.x', val, {
                position: { ...clip.transform.position, x: val },
              });
            }}
          />
        </div>
        <div>
          <label className="text-xs text-siren-text-muted mb-1 block">Y</label>
          <input
            type="number"
            className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
            value={Math.round(animY)}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              updateWithKeyframe('position.y', val, {
                position: { ...clip.transform.position, y: val },
              });
            }}
          />
        </div>
      </div>

      {/* Scale */}
      <div>
        <label className="text-xs text-siren-text-muted mb-1 block">Scale</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1"
            value={animScale * 100}
            onChange={(e) => {
              const val = parseInt(e.target.value) / 100;
              updateWithKeyframe('scale', val, { scale: val });
            }}
            min={10}
            max={300}
          />
          <span className="text-xs text-siren-text w-12 text-right">
            {Math.round(animScale * 100)}%
          </span>
        </div>
      </div>

      {/* Rotation */}
      <div>
        <label className="text-xs text-siren-text-muted mb-1 block">Rotation</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1"
            value={animRotation}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              updateWithKeyframe('rotation', val, { rotation: val });
            }}
            min={-180}
            max={180}
          />
          <span className="text-xs text-siren-text w-12 text-right">{Math.round(animRotation)}°</span>
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className="text-xs text-siren-text-muted mb-1 block">Opacity</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            className="flex-1"
            value={animOpacity * 100}
            onChange={(e) => {
              const val = parseInt(e.target.value) / 100;
              updateWithKeyframe('opacity', val, { opacity: val });
            }}
            min={0}
            max={100}
          />
          <span className="text-xs text-siren-text w-12 text-right">
            {Math.round(animOpacity * 100)}%
          </span>
        </div>
      </div>

    </div>
  );
};

const ShapeClipProperties: React.FC<{ clip: ShapeClip }> = ({ clip }) => {
  const { updateClip } = useSirenStore();
  const [showGradient, setShowGradient] = useState(!!clip.style.gradient);
  const [showShadow, setShowShadow] = useState(!!clip.style.shadow);
  const [showGlow, setShowGlow] = useState(!!clip.style.glow);
  const [showText, setShowText] = useState(!!clip.style.text);

  const updateStyle = (updates: Partial<ShapeClip['style']>) => {
    updateClip(clip.id, {
      style: { ...clip.style, ...updates },
    });
  };

  const shapeNames: Record<string, string> = {
    rectangle: 'Rectangle',
    circle: 'Circle/Ellipse',
    triangle: 'Triangle',
    star: 'Star',
    heart: 'Heart',
    arrow: 'Arrow',
    line: 'Line',
    checkmark: 'Checkmark',
    cross: 'Cross',
    lightning: 'Lightning',
    'speech-bubble': 'Speech Bubble',
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-siren-text">
        {shapeNames[clip.shapeType] || 'Shape'} Properties
      </h3>

      {/* Size */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-siren-text-muted">Size</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-siren-text-muted">Width</label>
            <input
              type="number"
              className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
              value={Math.round(clip.size.width)}
              onChange={(e) => updateClip(clip.id, { size: { ...clip.size, width: parseInt(e.target.value) || 50 } })}
              min={10}
            />
          </div>
          <div>
            <label className="text-[10px] text-siren-text-muted">Height</label>
            <input
              type="number"
              className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
              value={Math.round(clip.size.height)}
              onChange={(e) => updateClip(clip.id, { size: { ...clip.size, height: parseInt(e.target.value) || 50 } })}
              min={10}
            />
          </div>
        </div>
      </div>

      {/* Fill Color */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-siren-text-muted">Fill</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={clip.style.fill}
            onChange={(e) => updateStyle({ fill: e.target.value })}
            className="w-10 h-8 rounded border border-siren-border cursor-pointer"
          />
          <input
            type="text"
            value={clip.style.fill}
            onChange={(e) => updateStyle({ fill: e.target.value })}
            className="flex-1 px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-siren-text-muted">Opacity</label>
          <input
            type="range"
            value={clip.style.fillOpacity * 100}
            onChange={(e) => updateStyle({ fillOpacity: parseInt(e.target.value) / 100 })}
            min={0}
            max={100}
            className="flex-1"
          />
          <span className="text-xs text-siren-text w-10 text-right">{Math.round(clip.style.fillOpacity * 100)}%</span>
        </div>
      </div>

      {/* Stroke */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-siren-text-muted">Stroke</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={clip.style.stroke}
            onChange={(e) => updateStyle({ stroke: e.target.value })}
            className="w-10 h-8 rounded border border-siren-border cursor-pointer"
          />
          <input
            type="number"
            value={clip.style.strokeWidth}
            onChange={(e) => updateStyle({ strokeWidth: parseInt(e.target.value) || 0 })}
            className="w-16 px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
            min={0}
            max={20}
          />
          <select
            value={clip.style.strokeStyle}
            onChange={(e) => updateStyle({ strokeStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}
            className="flex-1 px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>
      </div>

      {/* Corner Radius (for rectangles) */}
      {clip.shapeType === 'rectangle' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-siren-text-muted">Corner Radius</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={clip.style.cornerRadius}
              onChange={(e) => updateStyle({ cornerRadius: parseInt(e.target.value) })}
              min={0}
              max={50}
              className="flex-1"
            />
            <span className="text-xs text-siren-text w-10 text-right">{clip.style.cornerRadius}px</span>
          </div>
        </div>
      )}

      {/* Star/Polygon points */}
      {clip.shapeType === 'star' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-siren-text-muted">Star Points</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={clip.style.points || 5}
              onChange={(e) => updateStyle({ points: parseInt(e.target.value) })}
              min={3}
              max={12}
              className="flex-1"
            />
            <span className="text-xs text-siren-text w-10 text-right">{clip.style.points || 5}</span>
          </div>
          <label className="text-xs font-medium text-siren-text-muted">Inner Radius</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={(clip.style.innerRadius || 0.4) * 100}
              onChange={(e) => updateStyle({ innerRadius: parseInt(e.target.value) / 100 })}
              min={10}
              max={90}
              className="flex-1"
            />
            <span className="text-xs text-siren-text w-10 text-right">{Math.round((clip.style.innerRadius || 0.4) * 100)}%</span>
          </div>
        </div>
      )}

      {/* Arrow head size */}
      {clip.shapeType === 'arrow' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-siren-text-muted">Arrow Head Size</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={clip.style.arrowHeadSize || 20}
              onChange={(e) => updateStyle({ arrowHeadSize: parseInt(e.target.value) })}
              min={10}
              max={50}
              className="flex-1"
            />
            <span className="text-xs text-siren-text w-10 text-right">{clip.style.arrowHeadSize || 20}px</span>
          </div>
        </div>
      )}

      {/* Gradient */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-siren-text-muted">Gradient Fill</label>
          <button
            onClick={() => {
              if (showGradient) {
                updateStyle({ gradient: undefined });
              } else {
                updateStyle({
                  gradient: { type: 'linear', colors: [clip.style.fill, '#ffffff'], angle: 0 }
                });
              }
              setShowGradient(!showGradient);
            }}
            className={`px-2 py-0.5 rounded text-xs ${showGradient ? 'bg-siren-accent text-white' : 'bg-siren-bg text-siren-text-muted'}`}
          >
            {showGradient ? 'ON' : 'OFF'}
          </button>
        </div>
        {showGradient && clip.style.gradient && (
          <div className="space-y-2 pl-2 border-l-2 border-siren-accent/30">
            <select
              value={clip.style.gradient.type}
              onChange={(e) => updateStyle({ gradient: { ...clip.style.gradient!, type: e.target.value as 'linear' | 'radial' } })}
              className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-siren-text-muted">Start</label>
                <input
                  type="color"
                  value={clip.style.gradient.colors[0]}
                  onChange={(e) => updateStyle({ gradient: { ...clip.style.gradient!, colors: [e.target.value, clip.style.gradient!.colors[1]] } })}
                  className="w-full h-8 rounded border border-siren-border cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-siren-text-muted">End</label>
                <input
                  type="color"
                  value={clip.style.gradient.colors[1]}
                  onChange={(e) => updateStyle({ gradient: { ...clip.style.gradient!, colors: [clip.style.gradient!.colors[0], e.target.value] } })}
                  className="w-full h-8 rounded border border-siren-border cursor-pointer"
                />
              </div>
            </div>
            {clip.style.gradient.type === 'linear' && (
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-siren-text-muted">Angle</label>
                <input
                  type="range"
                  value={clip.style.gradient.angle}
                  onChange={(e) => updateStyle({ gradient: { ...clip.style.gradient!, angle: parseInt(e.target.value) } })}
                  min={0}
                  max={360}
                  className="flex-1"
                />
                <span className="text-xs text-siren-text w-10 text-right">{clip.style.gradient.angle}°</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shadow */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-siren-text-muted">Shadow</label>
          <button
            onClick={() => {
              if (showShadow) {
                updateStyle({ shadow: undefined });
              } else {
                updateStyle({ shadow: { offsetX: 4, offsetY: 4, blur: 8, color: '#00000080' } });
              }
              setShowShadow(!showShadow);
            }}
            className={`px-2 py-0.5 rounded text-xs ${showShadow ? 'bg-siren-accent text-white' : 'bg-siren-bg text-siren-text-muted'}`}
          >
            {showShadow ? 'ON' : 'OFF'}
          </button>
        </div>
        {showShadow && clip.style.shadow && (
          <div className="space-y-2 pl-2 border-l-2 border-siren-accent/30">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={clip.style.shadow.color.slice(0, 7)}
                onChange={(e) => updateStyle({ shadow: { ...clip.style.shadow!, color: e.target.value + '80' } })}
                className="w-10 h-8 rounded border border-siren-border cursor-pointer"
              />
              <div className="flex-1 grid grid-cols-3 gap-1">
                <div>
                  <label className="text-[10px] text-siren-text-muted">X</label>
                  <input
                    type="number"
                    value={clip.style.shadow.offsetX}
                    onChange={(e) => updateStyle({ shadow: { ...clip.style.shadow!, offsetX: parseInt(e.target.value) || 0 } })}
                    className="w-full px-1 py-0.5 bg-siren-bg border border-siren-border rounded text-xs text-siren-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-siren-text-muted">Y</label>
                  <input
                    type="number"
                    value={clip.style.shadow.offsetY}
                    onChange={(e) => updateStyle({ shadow: { ...clip.style.shadow!, offsetY: parseInt(e.target.value) || 0 } })}
                    className="w-full px-1 py-0.5 bg-siren-bg border border-siren-border rounded text-xs text-siren-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-siren-text-muted">Blur</label>
                  <input
                    type="number"
                    value={clip.style.shadow.blur}
                    onChange={(e) => updateStyle({ shadow: { ...clip.style.shadow!, blur: parseInt(e.target.value) || 0 } })}
                    className="w-full px-1 py-0.5 bg-siren-bg border border-siren-border rounded text-xs text-siren-text"
                    min={0}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Glow */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-siren-text-muted">Glow</label>
          <button
            onClick={() => {
              if (showGlow) {
                updateStyle({ glow: undefined });
              } else {
                updateStyle({ glow: { color: clip.style.fill, blur: 10 } });
              }
              setShowGlow(!showGlow);
            }}
            className={`px-2 py-0.5 rounded text-xs ${showGlow ? 'bg-siren-accent text-white' : 'bg-siren-bg text-siren-text-muted'}`}
          >
            {showGlow ? 'ON' : 'OFF'}
          </button>
        </div>
        {showGlow && clip.style.glow && (
          <div className="flex items-center gap-2 pl-2 border-l-2 border-siren-accent/30">
            <input
              type="color"
              value={clip.style.glow.color}
              onChange={(e) => updateStyle({ glow: { ...clip.style.glow!, color: e.target.value } })}
              className="w-10 h-8 rounded border border-siren-border cursor-pointer"
            />
            <div className="flex-1">
              <label className="text-[10px] text-siren-text-muted">Blur</label>
              <input
                type="range"
                value={clip.style.glow.blur}
                onChange={(e) => updateStyle({ glow: { ...clip.style.glow!, blur: parseInt(e.target.value) } })}
                min={0}
                max={50}
                className="w-full"
              />
            </div>
            <span className="text-xs text-siren-text w-10 text-right">{clip.style.glow.blur}px</span>
          </div>
        )}
      </div>

      {/* Text Inside Shape */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-siren-text-muted">Text Label</label>
          <button
            onClick={() => {
              if (showText) {
                updateStyle({ text: undefined });
              } else {
                updateStyle({
                  text: {
                    content: 'Text',
                    fontFamily: 'Arial',
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#ffffff',
                    align: 'center',
                  }
                });
              }
              setShowText(!showText);
            }}
            className={`px-2 py-0.5 rounded text-xs ${showText ? 'bg-siren-accent text-white' : 'bg-siren-bg text-siren-text-muted'}`}
          >
            {showText ? 'ON' : 'OFF'}
          </button>
        </div>
        {showText && clip.style.text && (
          <div className="space-y-2 pl-2 border-l-2 border-siren-accent/30">
            {/* Text Content */}
            <div>
              <label className="text-[10px] text-siren-text-muted">Content</label>
              <input
                type="text"
                value={clip.style.text.content}
                onChange={(e) => updateStyle({ text: { ...clip.style.text!, content: e.target.value } })}
                className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
                placeholder="Enter text..."
              />
            </div>

            {/* Font Family */}
            <div>
              <label className="text-[10px] text-siren-text-muted">Font</label>
              <select
                value={clip.style.text.fontFamily}
                onChange={(e) => updateStyle({ text: { ...clip.style.text!, fontFamily: e.target.value } })}
                className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Verdana">Verdana</option>
                <option value="Impact">Impact</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
                <option value="Courier New">Courier New</option>
              </select>
            </div>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-siren-text-muted">Size</label>
                <input
                  type="number"
                  value={clip.style.text.fontSize}
                  onChange={(e) => updateStyle({ text: { ...clip.style.text!, fontSize: parseInt(e.target.value) || 16 } })}
                  className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
                  min={8}
                  max={200}
                />
              </div>
              <div>
                <label className="text-[10px] text-siren-text-muted">Weight</label>
                <select
                  value={clip.style.text.fontWeight}
                  onChange={(e) => updateStyle({ text: { ...clip.style.text!, fontWeight: parseInt(e.target.value) } })}
                  className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
                >
                  <option value="400">Normal</option>
                  <option value="500">Medium</option>
                  <option value="600">Semi-Bold</option>
                  <option value="700">Bold</option>
                  <option value="800">Extra Bold</option>
                  <option value="900">Black</option>
                </select>
              </div>
            </div>

            {/* Text Color & Align */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-siren-text-muted">Color</label>
                <div className="flex gap-1">
                  <input
                    type="color"
                    value={clip.style.text.color}
                    onChange={(e) => updateStyle({ text: { ...clip.style.text!, color: e.target.value } })}
                    className="w-10 h-8 rounded border border-siren-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={clip.style.text.color}
                    onChange={(e) => updateStyle({ text: { ...clip.style.text!, color: e.target.value } })}
                    className="flex-1 px-2 py-1 bg-siren-bg border border-siren-border rounded text-xs text-siren-text"
                  />
                </div>
              </div>
            </div>

            {/* Text Alignment */}
            <div>
              <label className="text-[10px] text-siren-text-muted">Align</label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => updateStyle({ text: { ...clip.style.text!, align } })}
                    className={`flex-1 py-1 rounded text-xs ${
                      clip.style.text!.align === align
                        ? 'bg-siren-accent text-white'
                        : 'bg-siren-bg text-siren-text-muted hover:bg-siren-border'
                    }`}
                  >
                    {align === 'left' ? '◀' : align === 'center' ? '●' : '▶'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick color presets */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-siren-text-muted">Quick Colors</label>
        <div className="flex flex-wrap gap-1">
          {['#ff0000', '#ff6600', '#ffcc00', '#00ff00', '#00ccff', '#0066ff', '#9900ff', '#ff00ff', '#ffffff', '#000000'].map(color => (
            <button
              key={color}
              onClick={() => updateStyle({ fill: color })}
              className="w-6 h-6 rounded border border-siren-border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Transform */}
      <TransformProperties clip={clip} />
    </div>
  );
};

const ImageClipProperties: React.FC<{ clip: ImageClip }> = ({ clip }) => {
  const { project } = useSirenStore();
  const asset = project.assets.find((a) => a.id === clip.assetId);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-siren-text">Image Properties</h3>

      {asset && (
        <div className="space-y-2">
          <div className="text-xs text-siren-text-muted">
            <p>Source: {asset.name}</p>
            {asset.dimensions && (
              <p>Size: {asset.dimensions.width} × {asset.dimensions.height}</p>
            )}
          </div>
          {asset.thumbnail && (
            <img src={asset.thumbnail || asset.src} alt="" className="w-full rounded border border-siren-border" />
          )}
        </div>
      )}

      {/* Transform */}
      <TransformProperties clip={clip} />
    </div>
  );
};

const MultiClipProperties: React.FC<{ clips: Clip[] }> = ({ clips }) => {
  const { updateClip } = useSirenStore();

  const handleOpacityChange = (value: number) => {
    clips.forEach((clip) => {
      updateClip(clip.id, {
        transform: { ...clip.transform, opacity: value / 100 },
      });
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-siren-text-muted">Batch Edit</h4>

      {/* Opacity */}
      <div>
        <label className="block text-xs text-siren-text-muted mb-1">Opacity (all)</label>
        <input
          type="range"
          className="w-full"
          defaultValue={100}
          onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
          min={0}
          max={100}
        />
      </div>
    </div>
  );
};

export default PropertiesPanel;
