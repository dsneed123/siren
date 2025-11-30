import React, { useState } from 'react';
import { useSirenStore } from '@/core/store';
import { effectRegistry, EffectDefinition } from '@/effects';
import { EffectType } from '@/core/types';

export const EffectsPanel: React.FC = () => {
  const { project, editor, addEffect } = useSirenStore();
  const [activeTab, setActiveTab] = useState<EffectType>('transition');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: { type: EffectType; label: string; icon: string; description: string }[] = [
    { type: 'transition', label: 'Transitions', icon: '↔️', description: 'Smooth clip transitions' },
    { type: 'filter', label: 'Filters', icon: '🎨', description: 'Color & visual filters' },
    { type: 'animation', label: 'Animations', icon: '✨', description: 'Motion & entrance effects' },
  ];

  const effects = effectRegistry.getByType(activeTab);
  const filteredEffects = searchQuery
    ? effects.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : effects;
  const categories = [...new Set(filteredEffects.map((e) => e.category))];

  const selectedClip = editor.selectedClipIds[0]
    ? project.clips.find((c) => c.id === editor.selectedClipIds[0])
    : null;

  const handleAddEffect = (effectDef: EffectDefinition) => {
    const selectedClipId = editor.selectedClipIds[0];
    if (!selectedClipId) return;

    const clip = project.clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    // Create default parameters
    const parameters: Record<string, any> = {};
    Object.entries(effectDef.parameters).forEach(([key, param]) => {
      parameters[key] = {
        name: param.name,
        type: param.type,
        value: param.default,
        ...(param.min !== undefined && { min: param.min }),
        ...(param.max !== undefined && { max: param.max }),
        ...(param.step !== undefined && { step: param.step }),
        ...(param.options && { options: param.options }),
      };
    });

    addEffect({
      type: effectDef.type,
      name: effectDef.name,
      clipId: selectedClipId,
      timeRange: {
        start: clip.timeRange.start,
        end: Math.min(clip.timeRange.start + effectDef.defaultDuration, clip.timeRange.end),
      },
      parameters,
    });
  };

  const getEffectPreviewClass = (effect: EffectDefinition) => {
    // Return different animation classes based on effect type
    switch (effect.id) {
      case 'fade':
      case 'fade-in':
        return 'group-hover:opacity-50';
      case 'zoom-in':
      case 'scale-up':
        return 'group-hover:scale-110';
      case 'zoom-out':
        return 'group-hover:scale-90';
      case 'spin':
        return 'group-hover:rotate-180';
      case 'shake':
        return 'group-hover:animate-pulse';
      case 'swipe-left':
      case 'slide-in-left':
        return 'group-hover:-translate-x-1';
      case 'swipe-right':
      case 'slide-in-right':
        return 'group-hover:translate-x-1';
      case 'swipe-up':
        return 'group-hover:-translate-y-1';
      case 'swipe-down':
        return 'group-hover:translate-y-1';
      case 'bounce':
        return 'group-hover:animate-bounce';
      default:
        return 'group-hover:scale-105';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Basic': 'from-blue-500 to-blue-600',
      'Swipe': 'from-purple-500 to-purple-600',
      'Zoom': 'from-green-500 to-green-600',
      'Creative': 'from-pink-500 to-pink-600',
      'Color': 'from-orange-500 to-orange-600',
      'Blur': 'from-cyan-500 to-cyan-600',
      'Fade': 'from-violet-500 to-violet-600',
      'Slide': 'from-indigo-500 to-indigo-600',
      'Scale': 'from-teal-500 to-teal-600',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-siren-border">
        <h3 className="text-sm font-semibold text-siren-text mb-3 flex items-center gap-2">
          <span>Effects</span>
          <span className="text-xs bg-siren-accent/20 text-siren-accent px-2 py-0.5 rounded-full">
            {effects.length}
          </span>
        </h3>

        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          {tabs.map((tab) => (
            <button
              key={tab.type}
              className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.type
                  ? 'bg-gradient-to-r from-siren-accent to-purple-600 text-white shadow-lg shadow-siren-accent/25'
                  : 'bg-siren-bg text-siren-text-muted hover:bg-siren-border hover:text-siren-text'
              }`}
              onClick={() => setActiveTab(tab.type)}
              title={tab.description}
            >
              <span className="text-base block mb-0.5">{tab.icon}</span>
              <span className="block">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search effects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-8 bg-siren-bg border border-siren-border rounded-lg text-xs text-siren-text placeholder-siren-text-muted focus:outline-none focus:border-siren-accent"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-siren-text-muted">
            🔍
          </span>
        </div>
      </div>

      {/* Clip selection prompt */}
      {!selectedClip && (
        <div className="mx-3 mt-3 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👆</span>
            <div>
              <p className="text-sm font-medium text-amber-400">Select a clip first</p>
              <p className="text-xs text-siren-text-muted mt-0.5">
                Click on a clip in the timeline to add effects
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected clip info */}
      {selectedClip && (
        <div className="mx-3 mt-3 p-3 bg-siren-accent/10 border border-siren-accent/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {selectedClip.type === 'video' ? '🎬' :
               selectedClip.type === 'audio' ? '🎵' :
               selectedClip.type === 'text' ? '📝' :
               selectedClip.type === 'image' ? '🖼️' : '📦'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-siren-text truncate">
                {selectedClip.type.charAt(0).toUpperCase() + selectedClip.type.slice(1)} Clip
              </p>
              <p className="text-[10px] text-siren-text-muted">
                Ready to add effects
              </p>
            </div>
            <span className="text-xs text-green-400">✓</span>
          </div>
        </div>
      )}

      {/* Effects grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {categories.length === 0 && searchQuery && (
          <div className="text-center py-8 text-siren-text-muted">
            <span className="text-3xl block mb-2">🔍</span>
            <p className="text-sm">No effects found for "{searchQuery}"</p>
          </div>
        )}

        {categories.map((category) => (
          <div key={category} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getCategoryColor(category)}`} />
              <h4 className="text-xs font-semibold text-siren-text uppercase tracking-wider">
                {category}
              </h4>
              <span className="text-[10px] text-siren-text-muted">
                ({filteredEffects.filter((e) => e.category === category).length})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredEffects
                .filter((e) => e.category === category)
                .map((effect) => (
                  <button
                    key={effect.id}
                    className={`group relative p-3 rounded-xl text-left transition-all duration-200 ${
                      selectedClip
                        ? 'bg-gradient-to-br from-siren-bg to-siren-surface hover:from-siren-border hover:to-siren-surface hover:shadow-lg hover:shadow-siren-accent/10 hover:-translate-y-0.5 cursor-pointer'
                        : 'bg-siren-bg/50 opacity-50 cursor-not-allowed'
                    } border border-transparent hover:border-siren-accent/30`}
                    onClick={() => selectedClip && handleAddEffect(effect)}
                    disabled={!selectedClip}
                    title={selectedClip ? `Add ${effect.name}` : 'Select a clip first'}
                  >
                    {/* Effect icon with preview animation */}
                    <div className={`text-2xl mb-1.5 transition-all duration-300 ${getEffectPreviewClass(effect)}`}>
                      {effect.icon}
                    </div>

                    {/* Effect name */}
                    <span className="text-xs font-medium text-siren-text block truncate">
                      {effect.name}
                    </span>

                    {/* Duration badge for non-filter effects */}
                    {effect.defaultDuration > 0 && (
                      <span className="text-[9px] text-siren-text-muted mt-1 block">
                        {effect.defaultDuration}ms
                      </span>
                    )}

                    {/* Add indicator on hover */}
                    {selectedClip && (
                      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs bg-siren-accent text-white px-1.5 py-0.5 rounded-full">+</span>
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Applied effects */}
      {selectedClip && (
        <div className="border-t border-siren-border">
          <AppliedEffectsList clipId={selectedClip.id} />
        </div>
      )}
    </div>
  );
};

const AppliedEffectsList: React.FC<{ clipId: string }> = ({ clipId }) => {
  const { project, removeEffect } = useSirenStore();
  const clipEffects = project.effects.filter((e) => e.clipId === clipId);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-siren-text flex items-center gap-2">
          <span>Applied Effects</span>
          {clipEffects.length > 0 && (
            <span className="bg-siren-accent/20 text-siren-accent text-[10px] px-1.5 py-0.5 rounded-full">
              {clipEffects.length}
            </span>
          )}
        </h4>
      </div>

      {clipEffects.length === 0 ? (
        <div className="text-center py-4 bg-siren-bg/50 rounded-lg">
          <span className="text-2xl block mb-1">🎭</span>
          <p className="text-xs text-siren-text-muted">No effects yet</p>
          <p className="text-[10px] text-siren-text-muted mt-0.5">Click an effect above to add it</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {clipEffects.map((effect) => {
            const effectDef = effectRegistry.get(effect.name.toLowerCase().replace(/\s+/g, '-'));
            return (
              <div
                key={effect.id}
                className="flex items-center gap-2 p-2 bg-siren-bg rounded-lg group hover:bg-siren-border/50 transition-colors"
              >
                <span className="text-lg">{effectDef?.icon || '✨'}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-siren-text block truncate">{effect.name}</span>
                  <span className="text-[10px] text-siren-text-muted">
                    {effect.type}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    onClick={() => removeEffect(effect.id)}
                    title="Remove effect"
                  >
                    <span className="text-xs">✕</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;
