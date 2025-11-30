// Keyframe animation engine
import { Keyframe, KeyframeTrack, AnimatableProperty, EasingType, Transform, Size } from './types';

// Easing functions
const easingFunctions: Record<EasingType, (t: number) => number> = {
  'linear': (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  'bezier': (t) => t, // Will be overridden with actual bezier calculation
};

// Cubic bezier calculation
export const cubicBezier = (
  t: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number
): number => {
  // Newton-Raphson iteration to find t for x
  let x = t;
  for (let i = 0; i < 8; i++) {
    const currentX = 3 * p1x * (1 - x) * (1 - x) * x +
      3 * p2x * (1 - x) * x * x +
      x * x * x;
    const dx = 3 * p1x * (1 - x) * (1 - x) -
      6 * p1x * (1 - x) * x +
      3 * p2x * (1 - x) * (1 - x) -
      6 * p2x * (1 - x) * x +
      3 * p2x * x * x -
      6 * p2x * (1 - x) * x +
      3 * x * x;
    if (Math.abs(currentX - t) < 0.0001) break;
    x -= (currentX - t) / dx;
  }

  // Calculate y for the found t
  return 3 * p1y * (1 - x) * (1 - x) * x +
    3 * p2y * (1 - x) * x * x +
    x * x * x;
};

// Interpolate between two keyframes
export const interpolateKeyframes = (
  time: number,
  keyframes: Keyframe[]
): number => {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  // Sort keyframes by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Before first keyframe
  if (time <= sorted[0].time) return sorted[0].value;

  // After last keyframe
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  // Find surrounding keyframes
  let prevKeyframe = sorted[0];
  let nextKeyframe = sorted[1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time < sorted[i + 1].time) {
      prevKeyframe = sorted[i];
      nextKeyframe = sorted[i + 1];
      break;
    }
  }

  // Calculate progress between keyframes (0-1)
  const duration = nextKeyframe.time - prevKeyframe.time;
  const progress = duration > 0 ? (time - prevKeyframe.time) / duration : 0;

  // Apply easing
  let easedProgress: number;
  if (prevKeyframe.easing === 'bezier' && prevKeyframe.bezierPoints) {
    const { x1, y1, x2, y2 } = prevKeyframe.bezierPoints;
    easedProgress = cubicBezier(progress, x1, y1, x2, y2);
  } else {
    easedProgress = easingFunctions[prevKeyframe.easing](progress);
  }

  // Linear interpolation with eased progress
  return prevKeyframe.value + (nextKeyframe.value - prevKeyframe.value) * easedProgress;
};

// Get value for an animatable property at a given time
export const getAnimatedValue = (
  property: AnimatableProperty,
  time: number,
  keyframeTracks: KeyframeTrack[] | undefined,
  defaultValue: number
): number => {
  if (!keyframeTracks) return defaultValue;

  const track = keyframeTracks.find((t) => t.property === property);
  if (!track || track.keyframes.length === 0) return defaultValue;

  return interpolateKeyframes(time, track.keyframes);
};

// Get animated transform at a given time (relative to clip start)
export const getAnimatedTransform = (
  clipTime: number,
  keyframeTracks: KeyframeTrack[] | undefined,
  baseTransform: Transform
): Transform => {
  if (!keyframeTracks || keyframeTracks.length === 0) {
    return baseTransform;
  }

  return {
    position: {
      x: getAnimatedValue('position.x', clipTime, keyframeTracks, baseTransform.position.x),
      y: getAnimatedValue('position.y', clipTime, keyframeTracks, baseTransform.position.y),
    },
    scale: getAnimatedValue('scale', clipTime, keyframeTracks, baseTransform.scale),
    rotation: getAnimatedValue('rotation', clipTime, keyframeTracks, baseTransform.rotation),
    opacity: getAnimatedValue('opacity', clipTime, keyframeTracks, baseTransform.opacity),
  };
};

// Get animated size at a given time
export const getAnimatedSize = (
  clipTime: number,
  keyframeTracks: KeyframeTrack[] | undefined,
  baseSize: Size
): Size => {
  if (!keyframeTracks || keyframeTracks.length === 0) {
    return baseSize;
  }

  return {
    width: getAnimatedValue('size.width', clipTime, keyframeTracks, baseSize.width),
    height: getAnimatedValue('size.height', clipTime, keyframeTracks, baseSize.height),
  };
};

// Add or update a keyframe
export const setKeyframe = (
  keyframeTracks: KeyframeTrack[],
  property: AnimatableProperty,
  time: number,
  value: number,
  easing: EasingType = 'ease-in-out'
): KeyframeTrack[] => {
  const existingTrackIndex = keyframeTracks.findIndex((t) => t.property === property);

  if (existingTrackIndex === -1) {
    // Create new track with the keyframe
    return [
      ...keyframeTracks,
      { property, keyframes: [{ time, value, easing }] }
    ];
  }

  // Clone the tracks array and the specific track we're modifying
  const newTracks = keyframeTracks.map((track, index) => {
    if (index !== existingTrackIndex) return track;

    // Clone the keyframes array
    const newKeyframes = [...track.keyframes];
    const existingKeyframeIndex = newKeyframes.findIndex((k) => Math.abs(k.time - time) < 10);

    if (existingKeyframeIndex >= 0) {
      // Update existing keyframe
      newKeyframes[existingKeyframeIndex] = { ...newKeyframes[existingKeyframeIndex], value, easing };
    } else {
      // Add new keyframe
      newKeyframes.push({ time, value, easing });
      newKeyframes.sort((a, b) => a.time - b.time);
    }

    return { ...track, keyframes: newKeyframes };
  });

  return newTracks;
};

// Remove a keyframe
export const removeKeyframe = (
  keyframeTracks: KeyframeTrack[],
  property: AnimatableProperty,
  time: number
): KeyframeTrack[] => {
  return keyframeTracks.map((track) => {
    if (track.property !== property) return track;
    return {
      ...track,
      keyframes: track.keyframes.filter((k) => Math.abs(k.time - time) >= 10),
    };
  }).filter((track) => track.keyframes.length > 0);
};

// Check if a property has keyframes
export const hasKeyframes = (
  keyframeTracks: KeyframeTrack[] | undefined,
  property: AnimatableProperty
): boolean => {
  if (!keyframeTracks) return false;
  const track = keyframeTracks.find((t) => t.property === property);
  return track ? track.keyframes.length > 0 : false;
};

// Get keyframe at or near a specific time
export const getKeyframeAtTime = (
  keyframeTracks: KeyframeTrack[] | undefined,
  property: AnimatableProperty,
  time: number,
  tolerance: number = 50
): Keyframe | undefined => {
  if (!keyframeTracks) return undefined;
  const track = keyframeTracks.find((t) => t.property === property);
  if (!track) return undefined;
  return track.keyframes.find((k) => Math.abs(k.time - time) <= tolerance);
};

// Common easing presets
export const EASING_PRESETS: { name: string; easing: EasingType; bezier?: { x1: number; y1: number; x2: number; y2: number } }[] = [
  { name: 'Linear', easing: 'linear' },
  { name: 'Ease In', easing: 'ease-in' },
  { name: 'Ease Out', easing: 'ease-out' },
  { name: 'Ease In Out', easing: 'ease-in-out' },
  { name: 'Bounce', easing: 'bezier', bezier: { x1: 0.68, y1: -0.55, x2: 0.265, y2: 1.55 } },
  { name: 'Elastic', easing: 'bezier', bezier: { x1: 0.68, y1: -0.6, x2: 0.32, y2: 1.6 } },
  { name: 'Smooth', easing: 'bezier', bezier: { x1: 0.4, y1: 0, x2: 0.2, y2: 1 } },
];
