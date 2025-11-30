import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import {
  Project,
  Track,
  Clip,
  Effect,
  MediaAsset,
  EditorState,
  TIKTOK_PRESET,
  Transform,
  TimeRange,
  AnimatableProperty,
  EasingType,
} from './types';
import { setKeyframe, removeKeyframe } from './keyframes';

interface SirenStore {
  // Project state
  project: Project;
  editor: EditorState;

  // History for undo/redo
  history: Project[];
  historyIndex: number;

  // Project actions
  createProject: (name: string) => void;
  updateProject: (updates: Partial<Project>) => void;

  // Save/Load actions
  saveProject: () => Promise<void>;
  loadProject: (file: File) => Promise<void>;
  autoSave: () => void;
  loadAutoSave: () => boolean;

  // Asset actions
  addAsset: (asset: Omit<MediaAsset, 'id'>) => string;
  removeAsset: (id: string) => void;

  // Track actions
  addTrack: (track: Omit<Track, 'id' | 'order'>) => string;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  removeTrack: (id: string) => void;
  reorderTracks: (trackIds: string[]) => void;

  // Clip actions
  addClip: (clip: Omit<Clip, 'id'>) => string;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  moveClip: (id: string, trackId: string, startTime: number) => void;
  trimClip: (id: string, timeRange: TimeRange) => void;
  splitClip: (id: string, time: number) => void;

  // Effect actions
  addEffect: (effect: Omit<Effect, 'id'>) => string;
  updateEffect: (id: string, updates: Partial<Effect>) => void;
  removeEffect: (id: string) => void;

  // Keyframe actions
  addKeyframe: (clipId: string, property: AnimatableProperty, time: number, value: number, easing?: EasingType) => void;
  removeKeyframeAt: (clipId: string, property: AnimatableProperty, time: number) => void;
  clearKeyframes: (clipId: string, property?: AnimatableProperty) => void;

  // Link actions - link clips to move together
  linkClips: (clipIds: string[]) => void;
  unlinkClips: (clipIds: string[]) => void;
  getLinkedClips: (clipId: string) => Clip[];

  // Editor actions
  setCurrentTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  selectClips: (clipIds: string[]) => void;
  selectTrack: (trackId: string | null) => void;
  toggleSnap: () => void;

  // History actions
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // Utility
  getClipsByTrack: (trackId: string) => Clip[];
  getClipAtTime: (time: number, trackId: string) => Clip | undefined;
  calculateDuration: () => number;
}

const createDefaultProject = (name: string): Project => ({
  id: uuid(),
  name,
  settings: TIKTOK_PRESET,
  assets: [],
  tracks: [
    { id: uuid(), name: 'Video 1', type: 'video', locked: false, visible: true, muted: false, order: 0 },
    { id: uuid(), name: 'Audio 1', type: 'audio', locked: false, visible: true, muted: false, order: 1 },
    { id: uuid(), name: 'Text', type: 'text', locked: false, visible: true, muted: false, order: 2 },
  ],
  clips: [],
  effects: [],
  duration: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const defaultTransform: Transform = {
  position: { x: 0, y: 0 },
  scale: 1,
  rotation: 0,
  opacity: 1,
};

export const useSirenStore = create<SirenStore>((set, get) => ({
  project: createDefaultProject('Untitled'),
  editor: {
    currentTime: 0,
    isPlaying: false,
    zoom: 1,
    selectedClipIds: [],
    selectedTrackId: null,
    snapToGrid: true,
    showWaveforms: true,
  },
  history: [],
  historyIndex: -1,

  createProject: (name) => {
    set({
      project: createDefaultProject(name),
      history: [],
      historyIndex: -1,
    });
  },

  updateProject: (updates) => {
    set((state) => ({
      project: { ...state.project, ...updates, updatedAt: Date.now() },
    }));
  },

  // Save project to file with embedded media
  saveProject: async () => {
    const state = get();
    const project = state.project;

    // Convert blob URLs to base64 for persistence
    const assetsWithData = await Promise.all(
      project.assets.map(async (asset) => {
        try {
          const response = await fetch(asset.src);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          return { ...asset, src: base64 };
        } catch (e) {
          console.warn('Failed to serialize asset:', asset.name, e);
          return asset;
        }
      })
    );

    const projectData = {
      ...project,
      assets: assetsWithData,
      savedAt: Date.now(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'project'}.siren`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Load project from file
  loadProject: async (file: File) => {
    try {
      const text = await file.text();
      const projectData = JSON.parse(text);

      // Convert base64 back to blob URLs
      const assetsWithUrls = await Promise.all(
        projectData.assets.map(async (asset: MediaAsset) => {
          if (asset.src.startsWith('data:')) {
            try {
              const response = await fetch(asset.src);
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              return { ...asset, src: url };
            } catch (e) {
              console.warn('Failed to restore asset:', asset.name, e);
              return asset;
            }
          }
          return asset;
        })
      );

      const restoredProject: Project = {
        ...projectData,
        assets: assetsWithUrls,
        updatedAt: Date.now(),
      };

      set({
        project: restoredProject,
        history: [],
        historyIndex: -1,
        editor: {
          currentTime: 0,
          isPlaying: false,
          zoom: 1,
          selectedClipIds: [],
          selectedTrackId: null,
          snapToGrid: true,
          showWaveforms: true,
        },
      });
    } catch (e) {
      console.error('Failed to load project:', e);
      throw new Error('Invalid project file');
    }
  },

  // Auto-save to localStorage (saves project metadata, not media)
  autoSave: () => {
    const state = get();
    const projectMeta = {
      ...state.project,
      // Don't save blob URLs in localStorage - they won't persist
      assets: state.project.assets.map((a) => ({
        ...a,
        src: '', // Clear src, will need to re-import media
        thumbnail: '',
      })),
    };
    try {
      localStorage.setItem('siren_autosave', JSON.stringify(projectMeta));
      localStorage.setItem('siren_autosave_time', Date.now().toString());
    } catch (e) {
      console.warn('Auto-save failed:', e);
    }
  },

  // Load from auto-save (returns true if found)
  loadAutoSave: () => {
    try {
      const saved = localStorage.getItem('siren_autosave');
      if (!saved) return false;

      const projectMeta = JSON.parse(saved);
      set({
        project: {
          ...projectMeta,
          updatedAt: Date.now(),
        },
        history: [],
        historyIndex: -1,
      });
      return true;
    } catch (e) {
      console.warn('Failed to load auto-save:', e);
      return false;
    }
  },

  addAsset: (asset) => {
    const id = uuid();
    set((state) => ({
      project: {
        ...state.project,
        assets: [...state.project.assets, { ...asset, id }],
        updatedAt: Date.now(),
      },
    }));
    return id;
  },

  removeAsset: (id) => {
    set((state) => ({
      project: {
        ...state.project,
        assets: state.project.assets.filter((a) => a.id !== id),
        updatedAt: Date.now(),
      },
    }));
  },

  addTrack: (track) => {
    const id = uuid();
    set((state) => {
      const order = state.project.tracks.length;
      return {
        project: {
          ...state.project,
          tracks: [...state.project.tracks, { ...track, id, order }],
          updatedAt: Date.now(),
        },
      };
    });
    return id;
  },

  updateTrack: (id, updates) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
        updatedAt: Date.now(),
      },
    }));
  },

  removeTrack: (id) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.filter((t) => t.id !== id),
        clips: state.project.clips.filter((c) => c.trackId !== id),
        updatedAt: Date.now(),
      },
    }));
  },

  reorderTracks: (trackIds) => {
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks
          .map((t) => ({
            ...t,
            order: trackIds.indexOf(t.id),
          }))
          .sort((a, b) => a.order - b.order),
        updatedAt: Date.now(),
      },
    }));
  },

  addClip: (clip) => {
    const id = uuid();
    get().saveToHistory();
    set((state) => ({
      project: {
        ...state.project,
        clips: [...state.project.clips, { ...clip, id, transform: clip.transform || defaultTransform } as Clip],
        duration: get().calculateDuration(),
        updatedAt: Date.now(),
      },
    }));
    return id;
  },

  updateClip: (id, updates) => {
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ) as Clip[],
        updatedAt: Date.now(),
      },
    }));
  },

  removeClip: (id) => {
    get().saveToHistory();
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.filter((c) => c.id !== id),
        effects: state.project.effects.filter((e) => e.clipId !== id),
        duration: get().calculateDuration(),
        updatedAt: Date.now(),
      },
    }));
  },

  moveClip: (id, trackId, startTime) => {
    get().saveToHistory();
    set((state) => {
      const clip = state.project.clips.find((c) => c.id === id);
      if (!clip) return state;

      const duration = clip.timeRange.end - clip.timeRange.start;
      const timeDelta = startTime - clip.timeRange.start;

      // Get all linked clips (including the dragged one)
      const linkedClipIds = clip.linkGroupId
        ? state.project.clips
            .filter((c) => c.linkGroupId === clip.linkGroupId)
            .map((c) => c.id)
        : [id];

      return {
        project: {
          ...state.project,
          clips: state.project.clips.map((c) => {
            if (c.id === id) {
              // The dragged clip - update track and time
              return {
                ...c,
                trackId,
                timeRange: { start: startTime, end: startTime + duration },
              };
            } else if (linkedClipIds.includes(c.id)) {
              // Linked clips - move by same delta (don't change track)
              const linkedDuration = c.timeRange.end - c.timeRange.start;
              const newStart = Math.max(0, c.timeRange.start + timeDelta);
              return {
                ...c,
                timeRange: { start: newStart, end: newStart + linkedDuration },
              };
            }
            return c;
          }) as Clip[],
          updatedAt: Date.now(),
        },
      };
    });
  },

  trimClip: (id, timeRange) => {
    get().saveToHistory();
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === id ? { ...c, timeRange } : c
        ) as Clip[],
        duration: get().calculateDuration(),
        updatedAt: Date.now(),
      },
    }));
  },

  splitClip: (id, time) => {
    get().saveToHistory();
    set((state) => {
      const clip = state.project.clips.find((c) => c.id === id);
      if (!clip || time <= clip.timeRange.start || time >= clip.timeRange.end) {
        return state;
      }

      // Calculate the split point relative to clip start
      const splitPointInClip = time - clip.timeRange.start;

      const firstClip = {
        ...clip,
        timeRange: { start: clip.timeRange.start, end: time },
      };

      const secondClip = {
        ...clip,
        id: uuid(),
        timeRange: { start: time, end: clip.timeRange.end },
      };

      // For video clips, update the sourceTimeRange so the second clip
      // starts at the correct position in the source video
      if (clip.type === 'video') {
        const videoClip = clip as any;
        const sourceStart = videoClip.sourceTimeRange?.start || 0;
        const speed = videoClip.speed || 1;

        // Calculate how far into the source video we are at the split point
        const sourceOffset = splitPointInClip * speed;

        (firstClip as any).sourceTimeRange = {
          start: sourceStart,
          end: sourceStart + sourceOffset,
        };

        (secondClip as any).sourceTimeRange = {
          start: sourceStart + sourceOffset,
          end: videoClip.sourceTimeRange?.end || (sourceStart + sourceOffset + (clip.timeRange.end - time) * speed),
        };
      }

      return {
        project: {
          ...state.project,
          clips: [
            ...state.project.clips.filter((c) => c.id !== id),
            firstClip,
            secondClip,
          ] as Clip[],
          updatedAt: Date.now(),
        },
      };
    });
  },

  addEffect: (effect) => {
    const id = uuid();
    get().saveToHistory();
    set((state) => ({
      project: {
        ...state.project,
        effects: [...state.project.effects, { ...effect, id }],
        updatedAt: Date.now(),
      },
    }));
    return id;
  },

  updateEffect: (id, updates) => {
    set((state) => ({
      project: {
        ...state.project,
        effects: state.project.effects.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
        updatedAt: Date.now(),
      },
    }));
  },

  removeEffect: (id) => {
    get().saveToHistory();
    set((state) => ({
      project: {
        ...state.project,
        effects: state.project.effects.filter((e) => e.id !== id),
        updatedAt: Date.now(),
      },
    }));
  },

  addKeyframe: (clipId, property, time, value, easing = 'ease-in-out') => {
    get().saveToHistory();
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((clip) => {
          if (clip.id !== clipId) return clip;
          const tracks = clip.keyframeTracks || [];
          return {
            ...clip,
            keyframeTracks: setKeyframe(tracks, property, time, value, easing),
          };
        }) as Clip[],
        updatedAt: Date.now(),
      },
    }));
  },

  removeKeyframeAt: (clipId, property, time) => {
    get().saveToHistory();
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((clip) => {
          if (clip.id !== clipId || !clip.keyframeTracks) return clip;
          return {
            ...clip,
            keyframeTracks: removeKeyframe(clip.keyframeTracks, property, time),
          };
        }) as Clip[],
        updatedAt: Date.now(),
      },
    }));
  },

  clearKeyframes: (clipId, property) => {
    get().saveToHistory();
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((clip) => {
          if (clip.id !== clipId || !clip.keyframeTracks) return clip;
          if (property) {
            return {
              ...clip,
              keyframeTracks: clip.keyframeTracks.filter((t) => t.property !== property),
            };
          }
          return { ...clip, keyframeTracks: [] };
        }) as Clip[],
        updatedAt: Date.now(),
      },
    }));
  },

  // Link clips together - they move as a group
  linkClips: (clipIds) => {
    if (clipIds.length < 2) return;
    get().saveToHistory();
    const groupId = uuid();
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((clip) =>
          clipIds.includes(clip.id) ? { ...clip, linkGroupId: groupId } : clip
        ) as Clip[],
        updatedAt: Date.now(),
      },
    }));
  },

  // Unlink clips
  unlinkClips: (clipIds) => {
    get().saveToHistory();
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((clip) =>
          clipIds.includes(clip.id) ? { ...clip, linkGroupId: undefined } : clip
        ) as Clip[],
        updatedAt: Date.now(),
      },
    }));
  },

  // Get all clips linked to a given clip
  getLinkedClips: (clipId) => {
    const clip = get().project.clips.find((c) => c.id === clipId);
    if (!clip?.linkGroupId) return [clip].filter(Boolean) as Clip[];
    return get().project.clips.filter((c) => c.linkGroupId === clip.linkGroupId);
  },

  setCurrentTime: (time) => {
    set((state) => ({
      editor: { ...state.editor, currentTime: Math.max(0, time) },
    }));
  },

  setPlaying: (playing) => {
    set((state) => ({
      editor: { ...state.editor, isPlaying: playing },
    }));
  },

  setZoom: (zoom) => {
    set((state) => ({
      editor: { ...state.editor, zoom: Math.max(0.1, Math.min(10, zoom)) },
    }));
  },

  selectClips: (clipIds) => {
    set((state) => ({
      editor: { ...state.editor, selectedClipIds: clipIds },
    }));
  },

  selectTrack: (trackId) => {
    set((state) => ({
      editor: { ...state.editor, selectedTrackId: trackId },
    }));
  },

  toggleSnap: () => {
    set((state) => ({
      editor: { ...state.editor, snapToGrid: !state.editor.snapToGrid },
    }));
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        project: history[historyIndex - 1],
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        project: history[historyIndex + 1],
        historyIndex: historyIndex + 1,
      });
    }
  },

  saveToHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(state.project)));
      // Keep max 50 history states
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  getClipsByTrack: (trackId) => {
    return get().project.clips.filter((c) => c.trackId === trackId);
  },

  getClipAtTime: (time, trackId) => {
    return get().project.clips.find(
      (c) =>
        c.trackId === trackId &&
        time >= c.timeRange.start &&
        time < c.timeRange.end
    );
  },

  calculateDuration: () => {
    const clips = get().project.clips;
    if (clips.length === 0) return 0;
    return Math.max(...clips.map((c) => c.timeRange.end));
  },
}));
