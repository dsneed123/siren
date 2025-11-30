// Core types for Siren video editor

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Transform {
  position: Position;
  scale: number;
  rotation: number;
  opacity: number;
}

// Keyframe animation system
export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';

export interface Keyframe<T = number> {
  time: number; // Time relative to clip start in ms
  value: T;
  easing: EasingType;
  // Bezier control points for custom easing (0-1 range)
  bezierPoints?: { x1: number; y1: number; x2: number; y2: number };
}

// Animatable properties
export type AnimatableProperty =
  | 'position.x'
  | 'position.y'
  | 'scale'
  | 'rotation'
  | 'opacity'
  | 'size.width'
  | 'size.height';

export interface KeyframeTrack {
  property: AnimatableProperty;
  keyframes: Keyframe[];
}

export interface AnimatedClip {
  keyframeTracks: KeyframeTrack[];
}

export interface TimeRange {
  start: number; // in milliseconds
  end: number;
}

export type MediaType = 'video' | 'audio' | 'image';

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  src: string;
  duration: number; // in milliseconds
  thumbnail?: string;
  dimensions?: Size;
}

export interface ClipBase {
  id: string;
  trackId: string;
  timeRange: TimeRange;
  transform: Transform;
  keyframeTracks?: KeyframeTrack[]; // Optional keyframe animation
  linkGroupId?: string; // Clips with same linkGroupId move together
}

export interface VideoClip extends ClipBase {
  type: 'video';
  assetId: string;
  sourceTimeRange: TimeRange; // which part of the source video to use
  speed: number;
  volume: number;
  muted: boolean;
}

export interface AudioClip extends ClipBase {
  type: 'audio';
  assetId: string;
  sourceTimeRange: TimeRange;
  volume: number;
  fadeIn: number;
  fadeOut: number;
}

export interface ImageClip extends ClipBase {
  type: 'image';
  assetId: string;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  backgroundColor?: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  textShadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  stroke?: {
    width: number;
    color: string;
  };
  // 3D properties
  effect3d?: {
    type: '3d-extrude' | '3d-pop' | '3d-rotate' | '3d-float' | 'none';
    depth: number;
    color: string;
    perspective: number;
    rotateX: number;
    rotateY: number;
    rotateZ: number;
  };
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    angle: number;
  };
  glow?: {
    color: string;
    blur: number;
    spread: number;
  };
}

export type Text3DPreset = {
  name: string;
  style: Partial<TextStyle>;
};

export const TEXT_3D_PRESETS: Text3DPreset[] = [
  {
    name: 'MrBeast Pop',
    style: {
      fontFamily: 'Impact',
      fontWeight: 900,
      color: '#FFFF00',
      stroke: { width: 4, color: '#000000' },
      effect3d: {
        type: '3d-extrude',
        depth: 8,
        color: '#FF0000',
        perspective: 800,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
      },
      glow: { color: '#FFFF00', blur: 20, spread: 5 },
    },
  },
  {
    name: 'Neon Glow',
    style: {
      fontFamily: 'Arial',
      fontWeight: 700,
      color: '#00FFFF',
      glow: { color: '#00FFFF', blur: 30, spread: 10 },
      textShadow: { offsetX: 0, offsetY: 0, blur: 20, color: '#00FFFF' },
    },
  },
  {
    name: '3D Gold',
    style: {
      fontFamily: 'Georgia',
      fontWeight: 700,
      gradient: { type: 'linear', colors: ['#FFD700', '#FFA500', '#FFD700'], angle: 180 },
      stroke: { width: 2, color: '#8B4513' },
      effect3d: {
        type: '3d-extrude',
        depth: 6,
        color: '#8B4513',
        perspective: 600,
        rotateX: 10,
        rotateY: 0,
        rotateZ: 0,
      },
    },
  },
  {
    name: 'Comic Boom',
    style: {
      fontFamily: 'Impact',
      fontWeight: 900,
      color: '#FF0000',
      stroke: { width: 6, color: '#FFFFFF' },
      effect3d: {
        type: '3d-pop',
        depth: 10,
        color: '#000000',
        perspective: 500,
        rotateX: -5,
        rotateY: 5,
        rotateZ: -3,
      },
    },
  },
  {
    name: 'Floating 3D',
    style: {
      fontFamily: 'Helvetica',
      fontWeight: 700,
      color: '#FFFFFF',
      effect3d: {
        type: '3d-float',
        depth: 4,
        color: '#333333',
        perspective: 1000,
        rotateX: 15,
        rotateY: -10,
        rotateZ: 0,
      },
      textShadow: { offsetX: 10, offsetY: 10, blur: 20, color: 'rgba(0,0,0,0.5)' },
    },
  },
  {
    name: 'Fire Text',
    style: {
      fontFamily: 'Impact',
      fontWeight: 900,
      gradient: { type: 'linear', colors: ['#FF0000', '#FF6600', '#FFFF00'], angle: 0 },
      glow: { color: '#FF3300', blur: 25, spread: 8 },
      stroke: { width: 2, color: '#000000' },
    },
  },
];

export interface TextClip extends ClipBase {
  type: 'text';
  content: string;
  style: TextStyle;
  size: Size;
}

// Shape types
export type ShapeType =
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'arrow'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-double'
  | 'arrow-curved'
  | 'line'
  | 'line-dashed'
  | 'star'
  | 'polygon'
  | 'diamond'
  | 'speech-bubble'
  | 'thought-bubble'
  | 'callout'
  | 'banner'
  | 'checkmark'
  | 'cross'
  | 'plus'
  | 'minus'
  | 'heart'
  | 'lightning'
  | 'flame'
  | 'droplet'
  | 'cloud'
  | 'sun'
  | 'moon'
  | 'burst'
  | 'badge'
  | 'ribbon'
  | 'sparkle';

export interface ShapeStyle {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  cornerRadius: number;
  // Gradient fill
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    angle: number;
  };
  // Shadow
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  };
  // Glow effect
  glow?: {
    color: string;
    blur: number;
  };
  // Arrow specific
  arrowHeadSize?: number;
  arrowHeadType?: 'triangle' | 'circle' | 'diamond';
  // Star/polygon specific
  points?: number;
  innerRadius?: number;
  // Text inside shape
  text?: {
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    align: 'left' | 'center' | 'right';
  };
}

export interface ShapeClip extends ClipBase {
  type: 'shape';
  shapeType: ShapeType;
  style: ShapeStyle;
  size: Size;
  // For lines and arrows
  startPoint?: Position;
  endPoint?: Position;
  // For curved arrows
  controlPoints?: Position[];
}

export type Clip = VideoClip | AudioClip | ImageClip | TextClip | ShapeClip;

export type TrackType = 'video' | 'audio' | 'text' | 'overlay';

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  locked: boolean;
  visible: boolean;
  muted: boolean;
  order: number;
}

// Effect system types
export type EffectType =
  | 'transition'
  | 'filter'
  | 'animation'
  | 'swipe';

export interface EffectParameter {
  name: string;
  type: 'number' | 'string' | 'color' | 'boolean' | 'select';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface Effect {
  id: string;
  type: EffectType;
  name: string;
  clipId: string;
  timeRange: TimeRange;
  parameters: Record<string, EffectParameter>;
}

// Transition types
export type TransitionType =
  | 'fade'
  | 'dissolve'
  | 'swipe-left'
  | 'swipe-right'
  | 'swipe-up'
  | 'swipe-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'spin'
  | 'blur'
  | 'glitch';

export interface Transition extends Effect {
  type: 'transition';
  transitionType: TransitionType;
  fromClipId: string;
  toClipId: string;
}

// Project types
export interface ProjectSettings {
  width: number;
  height: number;
  frameRate: number;
  backgroundColor: string;
}

export interface Project {
  id: string;
  name: string;
  settings: ProjectSettings;
  assets: MediaAsset[];
  tracks: Track[];
  clips: Clip[];
  effects: Effect[];
  duration: number;
  createdAt: number;
  updatedAt: number;
}

// TikTok preset
export const TIKTOK_PRESET: ProjectSettings = {
  width: 1080,
  height: 1920,
  frameRate: 30,
  backgroundColor: '#000000',
};

// Editor state types
export interface EditorState {
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  snapToGrid: boolean;
  showWaveforms: boolean;
}

export interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
}
