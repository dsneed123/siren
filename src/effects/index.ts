import { EffectType, EffectParameter } from '@/core/types';

// Effect registry for modular effect system
export interface EffectDefinition {
  id: string;
  name: string;
  type: EffectType;
  category: string;
  icon: string;
  defaultDuration: number;
  parameters: Record<string, Omit<EffectParameter, 'value'> & { default: any }>;
  render: (
    ctx: CanvasRenderingContext2D,
    progress: number,
    params: Record<string, any>,
    frame: ImageData | null
  ) => void;
}

class EffectRegistry {
  private effects: Map<string, EffectDefinition> = new Map();

  register(effect: EffectDefinition): void {
    this.effects.set(effect.id, effect);
  }

  get(id: string): EffectDefinition | undefined {
    return this.effects.get(id);
  }

  getByType(type: EffectType): EffectDefinition[] {
    return Array.from(this.effects.values()).filter((e) => e.type === type);
  }

  getByCategory(category: string): EffectDefinition[] {
    return Array.from(this.effects.values()).filter((e) => e.category === category);
  }

  getAll(): EffectDefinition[] {
    return Array.from(this.effects.values());
  }
}

export const effectRegistry = new EffectRegistry();

// Register built-in transitions
const transitions: EffectDefinition[] = [
  {
    id: 'fade',
    name: 'Fade',
    type: 'transition',
    category: 'Basic',
    icon: '◐',
    defaultDuration: 500,
    parameters: {},
    render: (ctx, progress, _, frame) => {
      if (frame) {
        ctx.globalAlpha = progress;
        ctx.putImageData(frame, 0, 0);
        ctx.globalAlpha = 1;
      }
    },
  },
  {
    id: 'swipe-left',
    name: 'Swipe Left',
    type: 'transition',
    category: 'Swipe',
    icon: '←',
    defaultDuration: 400,
    parameters: {
      easing: { name: 'Easing', type: 'select', options: ['linear', 'ease-in', 'ease-out', 'ease-in-out'], default: 'ease-out' },
    },
    render: (ctx, progress, params, frame) => {
      if (frame) {
        const eased = applyEasing(progress, params.easing || 'ease-out');
        const x = ctx.canvas.width * (1 - eased);
        ctx.putImageData(frame, x, 0);
      }
    },
  },
  {
    id: 'swipe-right',
    name: 'Swipe Right',
    type: 'transition',
    category: 'Swipe',
    icon: '→',
    defaultDuration: 400,
    parameters: {
      easing: { name: 'Easing', type: 'select', options: ['linear', 'ease-in', 'ease-out', 'ease-in-out'], default: 'ease-out' },
    },
    render: (ctx, progress, params, frame) => {
      if (frame) {
        const eased = applyEasing(progress, params.easing || 'ease-out');
        const x = -ctx.canvas.width * (1 - eased);
        ctx.putImageData(frame, x, 0);
      }
    },
  },
  {
    id: 'swipe-up',
    name: 'Swipe Up',
    type: 'transition',
    category: 'Swipe',
    icon: '↑',
    defaultDuration: 400,
    parameters: {
      easing: { name: 'Easing', type: 'select', options: ['linear', 'ease-in', 'ease-out', 'ease-in-out'], default: 'ease-out' },
    },
    render: (ctx, progress, params, frame) => {
      if (frame) {
        const eased = applyEasing(progress, params.easing || 'ease-out');
        const y = ctx.canvas.height * (1 - eased);
        ctx.putImageData(frame, 0, y);
      }
    },
  },
  {
    id: 'swipe-down',
    name: 'Swipe Down',
    type: 'transition',
    category: 'Swipe',
    icon: '↓',
    defaultDuration: 400,
    parameters: {
      easing: { name: 'Easing', type: 'select', options: ['linear', 'ease-in', 'ease-out', 'ease-in-out'], default: 'ease-out' },
    },
    render: (ctx, progress, params, frame) => {
      if (frame) {
        const eased = applyEasing(progress, params.easing || 'ease-out');
        const y = -ctx.canvas.height * (1 - eased);
        ctx.putImageData(frame, 0, y);
      }
    },
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    type: 'transition',
    category: 'Zoom',
    icon: '⊕',
    defaultDuration: 500,
    parameters: {},
    render: (ctx, progress, _, frame) => {
      if (frame) {
        const scale = progress;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);
        ctx.globalAlpha = progress;
        ctx.putImageData(frame, 0, 0);
        ctx.restore();
      }
    },
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    type: 'transition',
    category: 'Zoom',
    icon: '⊖',
    defaultDuration: 500,
    parameters: {},
    render: (ctx, progress, _, frame) => {
      if (frame) {
        const scale = 2 - progress;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);
        ctx.globalAlpha = progress;
        ctx.putImageData(frame, 0, 0);
        ctx.restore();
      }
    },
  },
  {
    id: 'spin',
    name: 'Spin',
    type: 'transition',
    category: 'Creative',
    icon: '↻',
    defaultDuration: 600,
    parameters: {
      rotations: { name: 'Rotations', type: 'number', min: 0.5, max: 3, step: 0.5, default: 1 },
    },
    render: (ctx, progress, params, frame) => {
      if (frame) {
        const rotations = params.rotations || 1;
        const angle = progress * Math.PI * 2 * rotations;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(angle);
        ctx.scale(progress, progress);
        ctx.translate(-w / 2, -h / 2);
        ctx.globalAlpha = progress;
        ctx.putImageData(frame, 0, 0);
        ctx.restore();
      }
    },
  },
  {
    id: 'blur',
    name: 'Blur',
    type: 'transition',
    category: 'Creative',
    icon: '◎',
    defaultDuration: 500,
    parameters: {
      maxBlur: { name: 'Max Blur', type: 'number', min: 5, max: 50, default: 20 },
    },
    render: (ctx, progress, params, frame) => {
      if (frame) {
        const blur = (1 - progress) * (params.maxBlur || 20);
        ctx.filter = `blur(${blur}px)`;
        ctx.globalAlpha = progress;
        ctx.putImageData(frame, 0, 0);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
    },
  },
  {
    id: 'glitch',
    name: 'Glitch',
    type: 'transition',
    category: 'Creative',
    icon: '⚡',
    defaultDuration: 400,
    parameters: {
      intensity: { name: 'Intensity', type: 'number', min: 1, max: 10, default: 5 },
    },
    render: (ctx, progress, params, frame) => {
      if (frame) {
        const intensity = params.intensity || 5;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // Apply glitch slices
        const slices = Math.floor(intensity * 2);
        const sliceHeight = h / slices;

        for (let i = 0; i < slices; i++) {
          const offset = (Math.random() - 0.5) * intensity * 10 * (1 - progress);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, i * sliceHeight, w, sliceHeight);
          ctx.clip();
          ctx.translate(offset, 0);
          ctx.putImageData(frame, 0, 0);
          ctx.restore();
        }
        ctx.globalAlpha = progress;
      }
    },
  },
];

// Register built-in filters
const filters: EffectDefinition[] = [
  {
    id: 'brightness',
    name: 'Brightness',
    type: 'filter',
    category: 'Color',
    icon: '☀',
    defaultDuration: 0,
    parameters: {
      value: { name: 'Brightness', type: 'number', min: 0, max: 200, default: 100 },
    },
    render: (ctx, _, params) => {
      ctx.filter = `brightness(${params.value || 100}%)`;
    },
  },
  {
    id: 'contrast',
    name: 'Contrast',
    type: 'filter',
    category: 'Color',
    icon: '◑',
    defaultDuration: 0,
    parameters: {
      value: { name: 'Contrast', type: 'number', min: 0, max: 200, default: 100 },
    },
    render: (ctx, _, params) => {
      ctx.filter = `contrast(${params.value || 100}%)`;
    },
  },
  {
    id: 'saturation',
    name: 'Saturation',
    type: 'filter',
    category: 'Color',
    icon: '◉',
    defaultDuration: 0,
    parameters: {
      value: { name: 'Saturation', type: 'number', min: 0, max: 200, default: 100 },
    },
    render: (ctx, _, params) => {
      ctx.filter = `saturate(${params.value || 100}%)`;
    },
  },
  {
    id: 'grayscale',
    name: 'Grayscale',
    type: 'filter',
    category: 'Color',
    icon: '▤',
    defaultDuration: 0,
    parameters: {
      value: { name: 'Amount', type: 'number', min: 0, max: 100, default: 100 },
    },
    render: (ctx, _, params) => {
      ctx.filter = `grayscale(${params.value || 100}%)`;
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    type: 'filter',
    category: 'Color',
    icon: '▧',
    defaultDuration: 0,
    parameters: {
      value: { name: 'Amount', type: 'number', min: 0, max: 100, default: 100 },
    },
    render: (ctx, _, params) => {
      ctx.filter = `sepia(${params.value || 100}%)`;
    },
  },
  {
    id: 'invert',
    name: 'Invert',
    type: 'filter',
    category: 'Color',
    icon: '▣',
    defaultDuration: 0,
    parameters: {
      value: { name: 'Amount', type: 'number', min: 0, max: 100, default: 100 },
    },
    render: (ctx, _, params) => {
      ctx.filter = `invert(${params.value || 100}%)`;
    },
  },
  {
    id: 'blur-filter',
    name: 'Blur',
    type: 'filter',
    category: 'Blur',
    icon: '○',
    defaultDuration: 0,
    parameters: {
      value: { name: 'Blur', type: 'number', min: 0, max: 20, default: 5 },
    },
    render: (ctx, _, params) => {
      ctx.filter = `blur(${params.value || 5}px)`;
    },
  },
  {
    id: 'vignette',
    name: 'Vignette',
    type: 'filter',
    category: 'Creative',
    icon: '◍',
    defaultDuration: 0,
    parameters: {
      intensity: { name: 'Intensity', type: 'number', min: 0, max: 100, default: 50 },
    },
    render: (ctx, _, params, frame) => {
      if (frame) {
        ctx.putImageData(frame, 0, 0);
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${(params.intensity || 50) / 100})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }
    },
  },
];

// Register built-in animations
const animations: EffectDefinition[] = [
  {
    id: 'fade-in',
    name: 'Fade In',
    type: 'animation',
    category: 'Fade',
    icon: '◐',
    defaultDuration: 500,
    parameters: {},
    render: (ctx, progress) => {
      ctx.globalAlpha = progress;
    },
  },
  {
    id: 'fade-out',
    name: 'Fade Out',
    type: 'animation',
    category: 'Fade',
    icon: '◑',
    defaultDuration: 500,
    parameters: {},
    render: (ctx, progress) => {
      ctx.globalAlpha = 1 - progress;
    },
  },
  {
    id: 'slide-in-left',
    name: 'Slide In Left',
    type: 'animation',
    category: 'Slide',
    icon: '←',
    defaultDuration: 400,
    parameters: {},
    render: (ctx, progress) => {
      const x = -ctx.canvas.width * (1 - progress);
      ctx.translate(x, 0);
    },
  },
  {
    id: 'slide-in-right',
    name: 'Slide In Right',
    type: 'animation',
    category: 'Slide',
    icon: '→',
    defaultDuration: 400,
    parameters: {},
    render: (ctx, progress) => {
      const x = ctx.canvas.width * (1 - progress);
      ctx.translate(x, 0);
    },
  },
  {
    id: 'scale-up',
    name: 'Scale Up',
    type: 'animation',
    category: 'Scale',
    icon: '⊕',
    defaultDuration: 400,
    parameters: {
      startScale: { name: 'Start Scale', type: 'number', min: 0, max: 1, step: 0.1, default: 0 },
    },
    render: (ctx, progress, params) => {
      const startScale = params.startScale || 0;
      const scale = startScale + (1 - startScale) * progress;
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
    },
  },
  {
    id: 'bounce',
    name: 'Bounce',
    type: 'animation',
    category: 'Creative',
    icon: '⚫',
    defaultDuration: 600,
    parameters: {
      bounces: { name: 'Bounces', type: 'number', min: 1, max: 5, default: 2 },
    },
    render: (ctx, progress, params) => {
      const bounces = params.bounces || 2;
      const scale = 1 + Math.abs(Math.sin(progress * Math.PI * bounces)) * 0.2 * (1 - progress);
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
    },
  },
  {
    id: 'shake',
    name: 'Shake',
    type: 'animation',
    category: 'Creative',
    icon: '〰',
    defaultDuration: 400,
    parameters: {
      intensity: { name: 'Intensity', type: 'number', min: 1, max: 20, default: 10 },
    },
    render: (ctx, progress, params) => {
      const intensity = params.intensity || 10;
      const shake = Math.sin(progress * Math.PI * 8) * intensity * (1 - progress);
      ctx.translate(shake, 0);
    },
  },
];

// Easing functions
function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t;
  }
}

// Register all effects
[...transitions, ...filters, ...animations].forEach((effect) => {
  effectRegistry.register(effect);
});

export { applyEasing };
