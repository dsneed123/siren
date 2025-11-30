import React from 'react';
import { TextClip, TextStyle, TEXT_3D_PRESETS, AnimatableProperty, Transform } from '@/core/types';
import { useSirenStore } from '@/core/store';
import { getAnimatedValue } from '@/core/keyframes';

interface TextEditorProps {
  clip: TextClip;
}

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Impact',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Comic Sans MS',
  'Trebuchet MS',
  'Courier New',
  'Lucida Console',
];

const FONT_WEIGHTS = [
  { label: 'Light', value: 300 },
  { label: 'Normal', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semi Bold', value: 600 },
  { label: 'Bold', value: 700 },
  { label: 'Extra Bold', value: 800 },
  { label: 'Black', value: 900 },
];

export const TextEditor: React.FC<TextEditorProps> = ({ clip }) => {
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
  const currentKeyframeIndex = allKeyframeTimes.findIndex(t => Math.abs(t - clipTime) < 50);
  const hasKeyframeAtCurrentTime = currentKeyframeIndex !== -1;

  // Navigation functions
  const goToPrevKeyframe = () => {
    const prevTimes = allKeyframeTimes.filter(t => t < clipTime - 50);
    if (prevTimes.length > 0) {
      setCurrentTime(clip.timeRange.start + prevTimes[prevTimes.length - 1]);
    }
  };

  const goToNextKeyframe = () => {
    const nextTimes = allKeyframeTimes.filter(t => t > clipTime + 50);
    if (nextTimes.length > 0) {
      setCurrentTime(clip.timeRange.start + nextTimes[0]);
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

  const updateStyle = (updates: Partial<TextStyle>) => {
    updateClip(clip.id, {
      style: { ...clip.style, ...updates },
    });
  };

  const applyPreset = (preset: typeof TEXT_3D_PRESETS[0]) => {
    updateClip(clip.id, {
      style: { ...clip.style, ...preset.style },
    });
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-siren-text mb-3">Text Properties</h3>

      {/* Keyframe Controls */}
      <div className="bg-siren-bg rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-siren-text font-medium">🎬 Keyframes</span>
          <span className="text-[10px] text-siren-text-muted">
            {allKeyframeTimes.length} total
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevKeyframe}
            disabled={!hasAnyKeyframes || allKeyframeTimes.filter(t => t < clipTime - 50).length === 0}
            className="p-1.5 rounded bg-siren-surface hover:bg-siren-border disabled:opacity-30 disabled:cursor-not-allowed text-siren-text text-xs"
            title="Previous keyframe"
          >
            ◀
          </button>

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

      {/* 3D Presets */}
      <div>
        <label className="block text-xs text-siren-text-muted mb-2">3D Style Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {TEXT_3D_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="p-2 bg-siren-bg rounded text-left hover:bg-siren-border transition-colors border border-siren-border"
              onClick={() => applyPreset(preset)}
            >
              <span className="text-xs text-siren-text font-medium">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        <label className="block text-xs text-siren-text-muted mb-1">Content</label>
        <textarea
          className="w-full px-3 py-2 bg-siren-bg border border-siren-border rounded text-sm text-siren-text resize-none"
          value={clip.content}
          onChange={(e) => updateClip(clip.id, { content: e.target.value })}
          rows={3}
        />
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-xs text-siren-text-muted mb-1">Font Family</label>
        <select
          className="w-full px-3 py-2 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
          value={clip.style.fontFamily}
          onChange={(e) => updateStyle({ fontFamily: e.target.value })}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size & Weight */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-siren-text-muted mb-1">Font Size</label>
          <input
            type="number"
            className="w-full px-3 py-2 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
            value={clip.style.fontSize}
            onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) || 24 })}
            min={8}
            max={200}
          />
        </div>
        <div>
          <label className="block text-xs text-siren-text-muted mb-1">Weight</label>
          <select
            className="w-full px-3 py-2 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
            value={clip.style.fontWeight}
            onChange={(e) => updateStyle({ fontWeight: parseInt(e.target.value) })}
          >
            {FONT_WEIGHTS.map((weight) => (
              <option key={weight.value} value={weight.value}>
                {weight.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-siren-text-muted mb-1">Text Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              className="w-10 h-10 rounded cursor-pointer"
              value={clip.style.color}
              onChange={(e) => updateStyle({ color: e.target.value })}
            />
            <input
              type="text"
              className="flex-1 px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
              value={clip.style.color}
              onChange={(e) => updateStyle({ color: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-siren-text-muted mb-1">Background</label>
          <div className="flex gap-2">
            <input
              type="color"
              className="w-10 h-10 rounded cursor-pointer"
              value={clip.style.backgroundColor || '#000000'}
              onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
            />
            <input
              type="text"
              className="flex-1 px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
              value={clip.style.backgroundColor || 'none'}
              onChange={(e) =>
                updateStyle({ backgroundColor: e.target.value === 'none' ? undefined : e.target.value })
              }
              placeholder="none"
            />
          </div>
        </div>
      </div>

      {/* 3D Effect Controls */}
      <div>
        <label className="flex items-center gap-2 text-xs text-siren-text-muted mb-2">
          <input
            type="checkbox"
            checked={!!clip.style.effect3d && clip.style.effect3d.type !== 'none'}
            onChange={(e) =>
              updateStyle({
                effect3d: e.target.checked
                  ? { type: '3d-extrude', depth: 5, color: '#000000', perspective: 800, rotateX: 0, rotateY: 0, rotateZ: 0 }
                  : undefined,
              })
            }
          />
          3D Effect
        </label>
        {clip.style.effect3d && clip.style.effect3d.type !== 'none' && (
          <div className="space-y-2 p-2 bg-siren-bg/50 rounded">
            <div>
              <label className="block text-xs text-siren-text-muted mb-1">Effect Type</label>
              <select
                className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
                value={clip.style.effect3d.type}
                onChange={(e) =>
                  updateStyle({
                    effect3d: { ...clip.style.effect3d!, type: e.target.value as any },
                  })
                }
              >
                <option value="3d-extrude">3D Extrude</option>
                <option value="3d-pop">3D Pop</option>
                <option value="3d-float">3D Float</option>
                <option value="3d-rotate">3D Rotate</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-siren-text-muted mb-1">Depth</label>
                <input
                  type="range"
                  className="w-full"
                  value={clip.style.effect3d.depth}
                  onChange={(e) =>
                    updateStyle({
                      effect3d: { ...clip.style.effect3d!, depth: parseInt(e.target.value) },
                    })
                  }
                  min={1}
                  max={20}
                />
              </div>
              <div>
                <label className="block text-xs text-siren-text-muted mb-1">3D Color</label>
                <input
                  type="color"
                  className="w-full h-6 rounded cursor-pointer"
                  value={clip.style.effect3d.color}
                  onChange={(e) =>
                    updateStyle({
                      effect3d: { ...clip.style.effect3d!, color: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-siren-text-muted mb-1">Rotate X</label>
                <input
                  type="range"
                  className="w-full"
                  value={clip.style.effect3d.rotateX}
                  onChange={(e) =>
                    updateStyle({
                      effect3d: { ...clip.style.effect3d!, rotateX: parseInt(e.target.value) },
                    })
                  }
                  min={-45}
                  max={45}
                />
              </div>
              <div>
                <label className="block text-xs text-siren-text-muted mb-1">Rotate Y</label>
                <input
                  type="range"
                  className="w-full"
                  value={clip.style.effect3d.rotateY}
                  onChange={(e) =>
                    updateStyle({
                      effect3d: { ...clip.style.effect3d!, rotateY: parseInt(e.target.value) },
                    })
                  }
                  min={-45}
                  max={45}
                />
              </div>
              <div>
                <label className="block text-xs text-siren-text-muted mb-1">Rotate Z</label>
                <input
                  type="range"
                  className="w-full"
                  value={clip.style.effect3d.rotateZ}
                  onChange={(e) =>
                    updateStyle({
                      effect3d: { ...clip.style.effect3d!, rotateZ: parseInt(e.target.value) },
                    })
                  }
                  min={-45}
                  max={45}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Glow Effect */}
      <div>
        <label className="flex items-center gap-2 text-xs text-siren-text-muted mb-2">
          <input
            type="checkbox"
            checked={!!clip.style.glow}
            onChange={(e) =>
              updateStyle({
                glow: e.target.checked ? { color: '#FFFFFF', blur: 20, spread: 5 } : undefined,
              })
            }
          />
          Glow Effect
        </label>
        {clip.style.glow && (
          <div className="grid grid-cols-3 gap-2 p-2 bg-siren-bg/50 rounded">
            <div>
              <label className="block text-xs text-siren-text-muted mb-1">Color</label>
              <input
                type="color"
                className="w-full h-6 rounded cursor-pointer"
                value={clip.style.glow.color}
                onChange={(e) =>
                  updateStyle({
                    glow: { ...clip.style.glow!, color: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-siren-text-muted mb-1">Blur</label>
              <input
                type="range"
                className="w-full"
                value={clip.style.glow.blur}
                onChange={(e) =>
                  updateStyle({
                    glow: { ...clip.style.glow!, blur: parseInt(e.target.value) },
                  })
                }
                min={0}
                max={50}
              />
            </div>
            <div>
              <label className="block text-xs text-siren-text-muted mb-1">Spread</label>
              <input
                type="range"
                className="w-full"
                value={clip.style.glow.spread}
                onChange={(e) =>
                  updateStyle({
                    glow: { ...clip.style.glow!, spread: parseInt(e.target.value) },
                  })
                }
                min={0}
                max={20}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stroke */}
      <div>
        <label className="flex items-center gap-2 text-xs text-siren-text-muted mb-2">
          <input
            type="checkbox"
            checked={!!clip.style.stroke}
            onChange={(e) =>
              updateStyle({
                stroke: e.target.checked ? { width: 2, color: '#000000' } : undefined,
              })
            }
          />
          Text Stroke
        </label>
        {clip.style.stroke && (
          <div className="grid grid-cols-2 gap-2 p-2 bg-siren-bg/50 rounded">
            <div>
              <label className="block text-xs text-siren-text-muted mb-1">Width</label>
              <input
                type="number"
                className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
                value={clip.style.stroke.width}
                onChange={(e) =>
                  updateStyle({
                    stroke: { ...clip.style.stroke!, width: parseInt(e.target.value) || 1 },
                  })
                }
                min={0}
                max={20}
              />
            </div>
            <div>
              <label className="block text-xs text-siren-text-muted mb-1">Color</label>
              <input
                type="color"
                className="w-full h-8 rounded cursor-pointer"
                value={clip.style.stroke.color}
                onChange={(e) =>
                  updateStyle({
                    stroke: { ...clip.style.stroke!, color: e.target.value },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Text Shadow */}
      <div>
        <label className="flex items-center gap-2 text-xs text-siren-text-muted mb-2">
          <input
            type="checkbox"
            checked={!!clip.style.textShadow}
            onChange={(e) =>
              updateStyle({
                textShadow: e.target.checked
                  ? { offsetX: 2, offsetY: 2, blur: 4, color: '#000000' }
                  : undefined,
              })
            }
          />
          Text Shadow
        </label>
        {clip.style.textShadow && (
          <div className="grid grid-cols-4 gap-2 p-2 bg-siren-bg/50 rounded">
            <div>
              <label className="block text-xs text-siren-text-muted mb-1">X</label>
              <input
                type="number"
                className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
                value={clip.style.textShadow.offsetX}
                onChange={(e) =>
                  updateStyle({
                    textShadow: { ...clip.style.textShadow!, offsetX: parseInt(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-siren-text-muted mb-1">Y</label>
              <input
                type="number"
                className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
                value={clip.style.textShadow.offsetY}
                onChange={(e) =>
                  updateStyle({
                    textShadow: { ...clip.style.textShadow!, offsetY: parseInt(e.target.value) || 0 },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-siren-text-muted mb-1">Blur</label>
              <input
                type="number"
                className="w-full px-2 py-1 bg-siren-bg border border-siren-border rounded text-sm text-siren-text"
                value={clip.style.textShadow.blur}
                onChange={(e) =>
                  updateStyle({
                    textShadow: { ...clip.style.textShadow!, blur: parseInt(e.target.value) || 0 },
                  })
                }
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-siren-text-muted mb-1">Color</label>
              <input
                type="color"
                className="w-full h-8 rounded cursor-pointer"
                value={clip.style.textShadow.color}
                onChange={(e) =>
                  updateStyle({
                    textShadow: { ...clip.style.textShadow!, color: e.target.value },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Transform with Keyframe Support */}
      <div className="space-y-3">
        <h4 className="text-xs text-siren-text-muted">Transform (Animated)</h4>

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
    </div>
  );
};

export default TextEditor;
