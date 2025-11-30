# 🎬 Siren - TikTok Video Editor

A modern, browser-based video editor built for creating TikTok-style vertical videos. No uploads, no servers - everything runs in your browser.

## ✨ Features

### 📹 Media Support
- **Video** - Import and edit video clips with full playback controls
- **Audio** - Background music, voiceovers, and sound effects
- **Images** - Draggable stickers and overlays
- **Text** - Rich text with fonts, colors, shadows, and animations

### 🎨 Effects Library
| Transitions | Filters | Animations |
|-------------|---------|------------|
| Fade | Brightness | Fade In/Out |
| Swipe (↑↓←→) | Contrast | Slide In |
| Zoom In/Out | Saturation | Scale Up |
| Spin | Grayscale | Bounce |
| Blur | Sepia | Shake |
| Glitch | Vignette | |

### ✨ Keyframe Animation
- Animate **position**, **scale**, **rotation**, and **opacity**
- Visual keyframe indicators on clips
- Add/remove individual keyframes
- Smooth interpolation

### 🔗 Clip Grouping
- Multi-select with `Ctrl+Click` or `Shift+Click`
- Group clips to move them together
- Visual link indicators

### 📐 Resizable Timeline
- Drag the handle to resize
- Snapping to playhead & clip edges
- Multi-track editing
- Drag clips between tracks

### 🎙️ Recording
| Mode | Description |
|------|-------------|
| 📷 Webcam | Front-facing camera |
| 🖥️ Screen | Display capture |
| 📷🖥️ Both | Picture-in-picture |
| 🎤 Audio | Mic with live waveform |

### 🖼️ Shapes & Emojis
- Rectangles, circles, stars, hearts, arrows
- Emoji picker with search
- Custom sticker uploads

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open **http://localhost:5173**

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `←` / `→` | Skip 1 second |
| `Home` / `End` | Go to start/end |
| `Delete` | Remove selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `?` | Show all shortcuts |

## 📁 Project Structure

```
src/
├── core/           # Store, types, keyframes, engine
├── ui/             # Preview, Controls, Panels
├── timeline/       # Timeline, Tracks, Clips
├── text/           # Text overlay & editor
├── effects/        # Effect definitions
└── export/         # Export modal
```

## 🎯 Usage

### Adding Media
1. **Media** tab → **Import Media** or drag & drop
2. Click media to add at playhead position

### Adding Text
1. **Shapes** tab → **Add Text** or presets
2. Edit in **Properties** panel

### Applying Effects
1. Select a clip on timeline
2. **Effects** tab → browse & click to add

### Keyframe Animation
1. Select clip → **Properties** → **Keyframes**
2. Move playhead → **+ Add Keyframe**
3. Adjust values → repeat for animation

### Grouping Clips
1. `Ctrl+Click` multiple clips
2. Click **🔗 Group** button
3. Drag one to move all

## 🛠️ Adding Custom Effects

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
    intensity: {
      name: 'Intensity',
      type: 'number',
      min: 0, max: 100,
      default: 50
    }
  },
  render: (ctx, progress, params, frame) => {
    // Effect logic here
  }
});
```

## 🧰 Tech Stack

- **React 18** + **TypeScript**
- **Zustand** - State management
- **FFmpeg.wasm** - Video processing
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## 📄 License

MIT - Use freely for personal or commercial projects.

---

Made with ❤️ for content creators
