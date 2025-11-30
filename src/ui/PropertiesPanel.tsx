import React from 'react';
import { useSirenStore } from '@/core/store';
import { Clip, VideoClip, AudioClip, TextClip, AnimatableProperty, Transform } from '@/core/types';
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
