# Siren - Video Editor for TikTok

A fast, modular video editor optimized for TikTok content creation.

## Features

- **Timeline editing** - Multi-track timeline with video, audio, and text layers
- **Drag & resize** - Draggable and resizable clips on the timeline
- **Text overlays** - Fully customizable text with fonts, colors, shadows, strokes
- **Effects system** - Modular effects including:
  - Transitions: Fade, swipe (all directions), zoom, spin, blur, glitch
  - Filters: Brightness, contrast, saturation, grayscale, sepia, vignette
  - Animations: Fade in/out, slide, scale, bounce, shake
- **TikTok optimized** - 1080x1920 (9:16) preset with safe zone guides
- **Export** - Multiple quality presets and formats (MP4, WebM, GIF)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── core/           # Core types, store, and video engine
├── timeline/       # Timeline components (tracks, clips)
├── effects/        # Modular effects system
├── text/           # Text overlay system
├── ui/             # UI components (preview, controls, panels)
└── export/         # Export functionality
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| ← / → | Skip back/forward 1 second |
| Home / End | Go to start/end |
| Delete | Delete selected clip |
| Ctrl+S | Split selected clip |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |

## Adding Custom Effects

The effects system is modular. To add a new effect:

```typescript
import { effectRegistry } from '@/effects';

effectRegistry.register({
  id: 'my-effect',
  name: 'My Effect',
  type: 'filter',
  category: 'Custom',
  icon: '✨',
  defaultDuration: 500,
  parameters: {
    intensity: { name: 'Intensity', type: 'number', min: 0, max: 100, default: 50 }
  },
  render: (ctx, progress, params, frame) => {
    // Your effect rendering logic
  }
});
```

## Tech Stack

- React 18
- TypeScript
- Zustand (state management)
- FFmpeg.wasm (video processing)
- Framer Motion (animations)
- Tailwind CSS (styling)
- Vite (build tool)
