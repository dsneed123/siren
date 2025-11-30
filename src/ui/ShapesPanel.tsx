import React, { useState, useRef } from 'react';
import { useSirenStore } from '@/core/store';
import { ShapeType, ShapeStyle } from '@/core/types';

interface ShapePreset {
  type: ShapeType;
  name: string;
  icon: string;
  defaultStyle: Partial<ShapeStyle>;
}

const SHAPE_PRESETS: ShapePreset[] = [
  // Basic shapes
  { type: 'rectangle', name: 'Rectangle', icon: '◻️', defaultStyle: { fill: '#FF5733', cornerRadius: 0 } },
  { type: 'rectangle', name: 'Rounded', icon: '▢', defaultStyle: { fill: '#3498DB', cornerRadius: 20 } },
  { type: 'circle', name: 'Circle', icon: '⭕', defaultStyle: { fill: '#3498DB' } },
  { type: 'triangle', name: 'Triangle', icon: '△', defaultStyle: { fill: '#2ECC71' } },
  { type: 'star', name: '5-Star', icon: '⭐', defaultStyle: { fill: '#F1C40F', points: 5 } },
  { type: 'star', name: '6-Star', icon: '✡', defaultStyle: { fill: '#9B59B6', points: 6 } },
  { type: 'star', name: '8-Star', icon: '✴️', defaultStyle: { fill: '#E74C3C', points: 8 } },
  { type: 'heart', name: 'Heart', icon: '❤️', defaultStyle: { fill: '#E74C3C' } },
  { type: 'polygon', name: 'Pentagon', icon: '⬠', defaultStyle: { fill: '#1ABC9C', points: 5 } },
  { type: 'polygon', name: 'Hexagon', icon: '⬡', defaultStyle: { fill: '#3498DB', points: 6 } },
  { type: 'polygon', name: 'Octagon', icon: '⯃', defaultStyle: { fill: '#E74C3C', points: 8 } },
  { type: 'diamond', name: 'Diamond', icon: '◇', defaultStyle: { fill: '#9B59B6' } },
  // Arrows & Lines
  { type: 'arrow', name: 'Arrow R', icon: '→', defaultStyle: { fill: '#E74C3C', arrowHeadSize: 20 } },
  { type: 'arrow-left', name: 'Arrow L', icon: '←', defaultStyle: { fill: '#E74C3C', arrowHeadSize: 20 } },
  { type: 'arrow-up', name: 'Arrow U', icon: '↑', defaultStyle: { fill: '#E74C3C', arrowHeadSize: 20 } },
  { type: 'arrow-down', name: 'Arrow D', icon: '↓', defaultStyle: { fill: '#E74C3C', arrowHeadSize: 20 } },
  { type: 'arrow-double', name: 'Double', icon: '↔', defaultStyle: { fill: '#9B59B6', arrowHeadSize: 20 } },
  { type: 'arrow-curved', name: 'Curved', icon: '↪', defaultStyle: { fill: '#9B59B6', arrowHeadSize: 20 } },
  { type: 'line', name: 'Line', icon: '─', defaultStyle: { stroke: '#FFFFFF', strokeWidth: 4 } },
  { type: 'line-dashed', name: 'Dashed', icon: '┄', defaultStyle: { stroke: '#FFFFFF', strokeWidth: 4, strokeStyle: 'dashed' } },
  // Speech & Callouts
  { type: 'speech-bubble', name: 'Speech', icon: '💬', defaultStyle: { fill: '#FFFFFF', stroke: '#000000', strokeWidth: 2 } },
  { type: 'thought-bubble', name: 'Thought', icon: '💭', defaultStyle: { fill: '#FFFFFF', stroke: '#000000', strokeWidth: 2 } },
  { type: 'callout', name: 'Callout', icon: '📍', defaultStyle: { fill: '#E74C3C' } },
  { type: 'banner', name: 'Banner', icon: '🏷️', defaultStyle: { fill: '#F1C40F' } },
  // Icons & Symbols
  { type: 'checkmark', name: 'Check', icon: '✓', defaultStyle: { fill: '#2ECC71', strokeWidth: 8 } },
  { type: 'cross', name: 'Cross', icon: '✕', defaultStyle: { fill: '#E74C3C', strokeWidth: 8 } },
  { type: 'plus', name: 'Plus', icon: '+', defaultStyle: { fill: '#2ECC71', strokeWidth: 8 } },
  { type: 'minus', name: 'Minus', icon: '−', defaultStyle: { fill: '#E74C3C', strokeWidth: 8 } },
  { type: 'lightning', name: 'Lightning', icon: '⚡', defaultStyle: { fill: '#F1C40F' } },
  { type: 'flame', name: 'Flame', icon: '🔥', defaultStyle: { fill: '#E74C3C' } },
  { type: 'droplet', name: 'Droplet', icon: '💧', defaultStyle: { fill: '#3498DB' } },
  { type: 'cloud', name: 'Cloud', icon: '☁️', defaultStyle: { fill: '#BDC3C7' } },
  { type: 'sun', name: 'Sun', icon: '☀️', defaultStyle: { fill: '#F1C40F' } },
  { type: 'moon', name: 'Moon', icon: '🌙', defaultStyle: { fill: '#F1C40F' } },
  // Decorative
  { type: 'burst', name: 'Burst', icon: '💥', defaultStyle: { fill: '#F1C40F', points: 12 } },
  { type: 'badge', name: 'Badge', icon: '🏅', defaultStyle: { fill: '#F1C40F' } },
  { type: 'ribbon', name: 'Ribbon', icon: '🎀', defaultStyle: { fill: '#E74C3C' } },
  { type: 'sparkle', name: 'Sparkle', icon: '✨', defaultStyle: { fill: '#F1C40F' } },
];

// Popular emojis for TikTok videos
const EMOJI_CATEGORIES = {
  'Reactions': ['🔥', '💯', '😂', '🤣', '😍', '🥺', '😭', '💀', '👀', '🫣', '🤯', '😱'],
  'Positive': ['❤️', '💕', '✨', '🌟', '⭐', '💫', '🎉', '🎊', '👏', '🙌', '💪', '👍'],
  'Fun': ['😎', '🤪', '😜', '🤑', '🥳', '🤩', '😈', '👻', '💅', '🦋', '🌈', '🍑'],
  'Social': ['📱', '💻', '🎮', '🎧', '📸', '🎬', '🎤', '🎵', '🎶', '📺', '💡', '🔔'],
  'Actions': ['👆', '👇', '👈', '👉', '🤝', '✌️', '🤟', '🫶', '💅', '🙏', '👊', '✊'],
  'Symbols': ['⬆️', '⬇️', '➡️', '⬅️', '🔴', '🟢', '🔵', '⚪', '💥', '💢', '❌', '✅'],
};

const STYLE_PRESETS = [
  { name: 'Solid', style: { fillOpacity: 1, strokeWidth: 0 } },
  { name: 'Outlined', style: { fillOpacity: 0, strokeWidth: 4 } },
  { name: 'Glow', style: { fillOpacity: 1, glow: { color: '#FFFFFF', blur: 20 } } },
  { name: 'Shadow', style: { fillOpacity: 1, shadow: { offsetX: 4, offsetY: 4, blur: 10, color: 'rgba(0,0,0,0.5)' } } },
  { name: 'Gradient', style: { gradient: { type: 'linear' as const, colors: ['#FF6B6B', '#4ECDC4'], angle: 45 } } },
  { name: 'Neon', style: { fillOpacity: 0, strokeWidth: 3, glow: { color: '#00FFFF', blur: 30 } } },
];

const COLOR_PRESETS = [
  '#FF5733', '#FF6B6B', '#E74C3C', '#C0392B', // Reds
  '#FF9F43', '#F39C12', '#F1C40F', '#FFC312', // Oranges/Yellows
  '#2ECC71', '#27AE60', '#1ABC9C', '#16A085', // Greens
  '#3498DB', '#2980B9', '#00CEC9', '#0984E3', // Blues
  '#9B59B6', '#8E44AD', '#6C5CE7', '#A29BFE', // Purples
  '#FFFFFF', '#BDC3C7', '#95A5A6', '#000000', // Grays
];

type TabType = 'shapes' | 'emojis' | 'stickers';

export const ShapesPanel: React.FC = () => {
  const { addClip, addAsset, addTrack, project, editor } = useSirenStore();
  const [activeTab, setActiveTab] = useState<TabType>('shapes');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedColor, setSelectedColor] = useState('#FF5733');
  const [selectedStrokeColor, setSelectedStrokeColor] = useState('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [fillOpacity, setFillOpacity] = useState(1);
  const [emojiSize, setEmojiSize] = useState(80);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>('Reactions');

  // Helper to get the appropriate track for adding clips
  // Priority: 1) Selected track (if compatible), 2) First compatible track, 3) Create new track
  const getOrCreateTrack = (compatibleTypes: string[]) => {
    // Check if selected track is compatible
    if (editor.selectedTrackId) {
      const selectedTrack = project.tracks.find(t => t.id === editor.selectedTrackId);
      if (selectedTrack && compatibleTypes.includes(selectedTrack.type)) {
        return selectedTrack;
      }
    }
    // Find first compatible track
    const existingTrack = project.tracks.find(t => compatibleTypes.includes(t.type));
    if (existingTrack) return existingTrack;

    // Create new track if needed (for text/overlay types)
    if (compatibleTypes.includes('text')) {
      const trackCount = project.tracks.filter(t => t.type === 'text').length;
      const newTrackId = addTrack({ name: `Text ${trackCount + 1}`, type: 'text', locked: false, visible: true, muted: false });
      return project.tracks.find(t => t.id === newTrackId) || project.tracks[0];
    }
    return project.tracks[0];
  };

  const handleAddShape = (preset: ShapePreset) => {
    const track = getOrCreateTrack(['overlay', 'text', 'video']);
    if (!track) return;

    const defaultStyle: ShapeStyle = {
      fill: selectedColor,
      fillOpacity,
      stroke: selectedStrokeColor,
      strokeWidth,
      strokeStyle: 'solid',
      cornerRadius: 0,
      ...preset.defaultStyle,
    };

    addClip({
      type: 'shape',
      shapeType: preset.type,
      trackId: track.id,
      timeRange: { start: editor.currentTime, end: editor.currentTime + 3000 },
      transform: { position: { x: 440, y: 860 }, scale: 1, rotation: 0, opacity: 1 },
      size: { width: 200, height: 200 },
      style: defaultStyle,
    } as any);
  };

  const handleAddEmoji = (emoji: string) => {
    const track = getOrCreateTrack(['text', 'overlay']);
    if (!track) return;

    addClip({
      type: 'text',
      trackId: track.id,
      content: emoji,
      timeRange: { start: editor.currentTime, end: editor.currentTime + 3000 },
      transform: { position: { x: 440, y: 860 }, scale: 1, rotation: 0, opacity: 1 },
      size: { width: emojiSize + 40, height: emojiSize + 40 },
      style: {
        fontFamily: 'system-ui',
        fontSize: emojiSize,
        fontWeight: 400,
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 1.2,
      },
    } as any);
  };

  // Handle custom sticker/image upload
  const handleStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      const url = URL.createObjectURL(file);

      // Get image dimensions
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => { img.onload = resolve; });

      // Add as asset
      const assetId = addAsset({
        name: file.name,
        type: 'image',
        src: url,
        duration: 0,
        dimensions: { width: img.width, height: img.height },
      });

      // Add as image clip (sticker) - scale to fit nicely
      const track = getOrCreateTrack(['video', 'overlay', 'text']);
      if (!track) continue;

      // Scale to max 300px while keeping aspect ratio
      const maxSize = 300;
      const aspectRatio = img.width / img.height;
      let width = Math.min(img.width, maxSize);
      let height = width / aspectRatio;
      if (height > maxSize) {
        height = maxSize;
        width = height * aspectRatio;
      }

      addClip({
        type: 'image',
        assetId,
        trackId: track.id,
        timeRange: { start: editor.currentTime, end: editor.currentTime + 3000 },
        transform: { position: { x: 390, y: 810 }, scale: 1, rotation: 0, opacity: 1 },
      } as any);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Hidden file input for sticker upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/webp,image/gif,image/svg+xml"
        multiple
        onChange={handleStickerUpload}
        className="hidden"
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-siren-bg rounded-lg">
        <button
          onClick={() => setActiveTab('shapes')}
          className={`flex-1 py-1.5 text-xs rounded transition-colors ${
            activeTab === 'shapes' ? 'bg-siren-accent text-white' : 'text-siren-text-muted hover:text-siren-text'
          }`}
        >
          Shapes
        </button>
        <button
          onClick={() => setActiveTab('emojis')}
          className={`flex-1 py-1.5 text-xs rounded transition-colors ${
            activeTab === 'emojis' ? 'bg-siren-accent text-white' : 'text-siren-text-muted hover:text-siren-text'
          }`}
        >
          Emojis
        </button>
        <button
          onClick={() => setActiveTab('stickers')}
          className={`flex-1 py-1.5 text-xs rounded transition-colors ${
            activeTab === 'stickers' ? 'bg-siren-accent text-white' : 'text-siren-text-muted hover:text-siren-text'
          }`}
        >
          Stickers
        </button>
      </div>

      {activeTab === 'shapes' ? (
        <>
          {/* Shape grid */}
          <div className="grid grid-cols-4 gap-2">
            {SHAPE_PRESETS.map((preset, idx) => (
              <button
                key={`${preset.type}-${idx}`}
                onClick={() => handleAddShape(preset)}
                className="aspect-square flex flex-col items-center justify-center gap-1 p-2 bg-siren-bg rounded-lg hover:bg-siren-border transition-colors group"
                title={preset.name}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{preset.icon}</span>
                <span className="text-[10px] text-siren-text-muted">{preset.name}</span>
              </button>
            ))}
          </div>

      {/* Style presets */}
      <div>
        <h4 className="text-xs font-medium text-siren-text-muted mb-2">Style Presets</h4>
        <div className="grid grid-cols-3 gap-2">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                if (preset.style.fillOpacity !== undefined) setFillOpacity(preset.style.fillOpacity);
                if (preset.style.strokeWidth !== undefined) setStrokeWidth(preset.style.strokeWidth);
              }}
              className="py-1.5 px-2 text-xs bg-siren-bg rounded hover:bg-siren-border transition-colors text-siren-text"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Fill color */}
      <div>
        <h4 className="text-xs font-medium text-siren-text-muted mb-2">Fill Color</h4>
        <div className="grid grid-cols-6 gap-1">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-md border-2 transition-all ${
                selectedColor === color ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <input
            type="text"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="flex-1 px-2 py-1 bg-siren-bg border border-siren-border rounded text-xs text-siren-text"
          />
        </div>
      </div>

      {/* Fill opacity */}
      <div>
        <h4 className="text-xs font-medium text-siren-text-muted mb-2">Fill Opacity</h4>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={fillOpacity * 100}
            onChange={(e) => setFillOpacity(parseInt(e.target.value) / 100)}
            className="flex-1"
          />
          <span className="text-xs text-siren-text w-10 text-right">{Math.round(fillOpacity * 100)}%</span>
        </div>
      </div>

      {/* Stroke */}
      <div>
        <h4 className="text-xs font-medium text-siren-text-muted mb-2">Stroke</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selectedStrokeColor}
              onChange={(e) => setSelectedStrokeColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <input
              type="range"
              min={0}
              max={20}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-siren-text w-10 text-right">{strokeWidth}px</span>
          </div>
        </div>
      </div>

          {/* Quick tips */}
          <div className="text-xs text-siren-text-muted space-y-1 pt-2 border-t border-siren-border">
            <p>• Click shape to add to timeline</p>
            <p>• Drag to move in preview</p>
            <p>• Use keyframes for animation</p>
          </div>
        </>
      ) : activeTab === 'emojis' ? (
        <>
          {/* Emoji Categories */}
          <div className="flex flex-wrap gap-1">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedEmojiCategory(category)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedEmojiCategory === category
                    ? 'bg-siren-accent text-white'
                    : 'bg-siren-bg text-siren-text-muted hover:text-siren-text'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid grid-cols-6 gap-2">
            {EMOJI_CATEGORIES[selectedEmojiCategory as keyof typeof EMOJI_CATEGORIES]?.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => handleAddEmoji(emoji)}
                className="aspect-square flex items-center justify-center text-3xl bg-siren-bg rounded-lg hover:bg-siren-border hover:scale-110 transition-all"
                title={`Add ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Emoji size */}
          <div>
            <h4 className="text-xs font-medium text-siren-text-muted mb-2">Emoji Size</h4>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={40}
                max={200}
                value={emojiSize}
                onChange={(e) => setEmojiSize(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-siren-text w-12 text-right">{emojiSize}px</span>
            </div>
          </div>

          {/* More emojis */}
          <div>
            <h4 className="text-xs font-medium text-siren-text-muted mb-2">More Emojis</h4>
            <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
              {['😀', '😃', '😄', '😁', '😆', '🥹', '😅', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
                '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳',
                '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤',
                '🤬', '😡', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈'].map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddEmoji(emoji)}
                  className="text-xl p-1 hover:bg-siren-border rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Quick tips */}
          <div className="text-xs text-siren-text-muted space-y-1 pt-2 border-t border-siren-border">
            <p>• Click emoji to add to timeline</p>
            <p>• Adjust size before adding</p>
            <p>• Animate with keyframes</p>
          </div>
        </>
      ) : (
        <>
          {/* Stickers Tab */}
          <div className="space-y-4">
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-siren-border rounded-lg hover:border-siren-accent hover:bg-siren-accent/10 transition-colors group"
            >
              <div className="text-center">
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📁</div>
                <p className="text-sm text-siren-text font-medium">Upload Stickers</p>
                <p className="text-xs text-siren-text-muted mt-1">PNG, WebP, GIF, SVG</p>
                <p className="text-xs text-siren-text-muted">Transparent backgrounds supported</p>
              </div>
            </button>

            {/* Uploaded stickers (from assets) */}
            {project.assets.filter(a => a.type === 'image').length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-siren-text-muted mb-2">Your Stickers</h4>
                <div className="grid grid-cols-3 gap-2">
                  {project.assets
                    .filter(a => a.type === 'image')
                    .map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => {
                          const track = getOrCreateTrack(['video', 'overlay', 'text']);
                          if (!track) return;
                          addClip({
                            type: 'image',
                            assetId: asset.id,
                            trackId: track.id,
                            timeRange: { start: editor.currentTime, end: editor.currentTime + 3000 },
                            transform: { position: { x: 390, y: 810 }, scale: 1, rotation: 0, opacity: 1 },
                          } as any);
                        }}
                        className="aspect-square bg-siren-bg rounded-lg overflow-hidden hover:ring-2 hover:ring-siren-accent transition-all group"
                        title={asset.name}
                      >
                        <img
                          src={asset.src}
                          alt={asset.name}
                          className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform"
                        />
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="text-xs text-siren-text-muted space-y-1 pt-2 border-t border-siren-border">
              <p>• Upload PNG/WebP with transparent backgrounds</p>
              <p>• Click uploaded sticker to add to video</p>
              <p>• Drag to reposition, use keyframes to animate</p>
              <p>• Link with shapes for group animations</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShapesPanel;
