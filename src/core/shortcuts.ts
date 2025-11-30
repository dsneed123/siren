// After Effects-style keyboard shortcuts
import { useSirenStore } from './store';

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category: 'playback' | 'editing' | 'timeline' | 'navigation' | 'tools';
}

// Frame step amount in ms (assuming 30fps = ~33ms per frame)
const FRAME_MS = 33;
const JUMP_MS = 1000; // 1 second jump

export const createShortcuts = (): Shortcut[] => {
  const store = useSirenStore.getState;

  return [
    // Playback controls
    {
      key: ' ',
      action: () => store().setPlaying(!store().editor.isPlaying),
      description: 'Play/Pause',
      category: 'playback',
    },
    {
      key: 'k',
      action: () => store().setPlaying(false),
      description: 'Stop',
      category: 'playback',
    },
    {
      key: 'j',
      action: () => {
        // Play backwards (or step back if already playing backwards)
        const { editor } = store();
        if (!editor.isPlaying) {
          store().setCurrentTime(Math.max(0, editor.currentTime - FRAME_MS));
        }
      },
      description: 'Step backward / Play reverse',
      category: 'playback',
    },
    {
      key: 'l',
      action: () => {
        // Play forward (or step forward if paused)
        const { editor } = store();
        if (!editor.isPlaying) {
          store().setCurrentTime(editor.currentTime + FRAME_MS);
        } else {
          // Could increase playback speed here
        }
      },
      description: 'Step forward / Play forward',
      category: 'playback',
    },
    {
      key: 'Home',
      action: () => store().setCurrentTime(0),
      description: 'Go to start',
      category: 'navigation',
    },
    {
      key: 'End',
      action: () => store().setCurrentTime(store().project.duration),
      description: 'Go to end',
      category: 'navigation',
    },
    {
      key: 'ArrowLeft',
      action: () => {
        const time = store().editor.currentTime;
        store().setCurrentTime(Math.max(0, time - FRAME_MS));
      },
      description: 'Previous frame',
      category: 'navigation',
    },
    {
      key: 'ArrowRight',
      action: () => {
        const time = store().editor.currentTime;
        store().setCurrentTime(time + FRAME_MS);
      },
      description: 'Next frame',
      category: 'navigation',
    },
    {
      key: 'ArrowLeft',
      shift: true,
      action: () => {
        const time = store().editor.currentTime;
        store().setCurrentTime(Math.max(0, time - JUMP_MS));
      },
      description: 'Jump back 1 second',
      category: 'navigation',
    },
    {
      key: 'ArrowRight',
      shift: true,
      action: () => {
        const time = store().editor.currentTime;
        store().setCurrentTime(time + JUMP_MS);
      },
      description: 'Jump forward 1 second',
      category: 'navigation',
    },

    // Editing
    {
      key: 'c',
      action: () => {
        const { editor, project, splitClip } = store();
        // Split selected clip at current time
        editor.selectedClipIds.forEach((clipId) => {
          const clip = project.clips.find((c) => c.id === clipId);
          if (clip && editor.currentTime > clip.timeRange.start && editor.currentTime < clip.timeRange.end) {
            splitClip(clipId, editor.currentTime);
          }
        });
      },
      description: 'Cut/Split clip at playhead',
      category: 'editing',
    },
    {
      key: 'Delete',
      action: () => {
        const { editor, removeClip } = store();
        editor.selectedClipIds.forEach((clipId) => removeClip(clipId));
        store().selectClips([]);
      },
      description: 'Delete selected clips',
      category: 'editing',
    },
    {
      key: 'Backspace',
      action: () => {
        const { editor, removeClip } = store();
        editor.selectedClipIds.forEach((clipId) => removeClip(clipId));
        store().selectClips([]);
      },
      description: 'Delete selected clips',
      category: 'editing',
    },
    {
      key: 'd',
      action: () => {
        // Duplicate selected clips
        const { editor, project, addClip } = store();
        editor.selectedClipIds.forEach((clipId) => {
          const clip = project.clips.find((c) => c.id === clipId);
          if (clip) {
            const duration = clip.timeRange.end - clip.timeRange.start;
            const newClip = {
              ...clip,
              timeRange: {
                start: clip.timeRange.end,
                end: clip.timeRange.end + duration,
              },
            };
            // Remove id so addClip generates new one
            const { id: _, ...clipWithoutId } = newClip;
            addClip(clipWithoutId as any);
          }
        });
      },
      description: 'Duplicate selected clips',
      category: 'editing',
    },

    // Selection
    {
      key: 'a',
      ctrl: true,
      action: () => {
        const clipIds = store().project.clips.map((c) => c.id);
        store().selectClips(clipIds);
      },
      description: 'Select all clips',
      category: 'editing',
    },
    {
      key: 'Escape',
      action: () => store().selectClips([]),
      description: 'Deselect all',
      category: 'editing',
    },

    // Undo/Redo
    {
      key: 'z',
      ctrl: true,
      action: () => store().undo(),
      description: 'Undo',
      category: 'editing',
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      action: () => store().redo(),
      description: 'Redo',
      category: 'editing',
    },
    {
      key: 'y',
      ctrl: true,
      action: () => store().redo(),
      description: 'Redo',
      category: 'editing',
    },

    // Timeline zoom
    {
      key: '=',
      action: () => store().setZoom(store().editor.zoom * 1.2),
      description: 'Zoom in timeline',
      category: 'timeline',
    },
    {
      key: '-',
      action: () => store().setZoom(store().editor.zoom / 1.2),
      description: 'Zoom out timeline',
      category: 'timeline',
    },
    {
      key: '0',
      action: () => store().setZoom(1),
      description: 'Reset zoom',
      category: 'timeline',
    },

    // Snap toggle
    {
      key: 's',
      action: () => store().toggleSnap(),
      description: 'Toggle snapping',
      category: 'timeline',
    },
  ];
};

// Hook to handle keyboard shortcuts
export const handleKeyboardShortcut = (e: KeyboardEvent): boolean => {
  // Don't trigger shortcuts when typing in inputs
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    (e.target as HTMLElement)?.isContentEditable
  ) {
    return false;
  }

  const shortcuts = createShortcuts();

  for (const shortcut of shortcuts) {
    const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
    const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
    const altMatch = shortcut.alt ? e.altKey : !e.altKey;

    if (e.key === shortcut.key && ctrlMatch && shiftMatch && altMatch) {
      e.preventDefault();
      shortcut.action();
      return true;
    }
  }

  return false;
};

// Get all shortcuts for help display
export const getShortcutsByCategory = () => {
  const shortcuts = createShortcuts();
  const categories: Record<string, Shortcut[]> = {};

  shortcuts.forEach((shortcut) => {
    if (!categories[shortcut.category]) {
      categories[shortcut.category] = [];
    }
    categories[shortcut.category].push(shortcut);
  });

  return categories;
};

// Format shortcut key for display
export const formatShortcut = (shortcut: Shortcut): string => {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  if (key === 'ArrowLeft') key = '←';
  if (key === 'ArrowRight') key = '→';
  if (key === 'ArrowUp') key = '↑';
  if (key === 'ArrowDown') key = '↓';

  parts.push(key.toUpperCase());
  return parts.join(' + ');
};
