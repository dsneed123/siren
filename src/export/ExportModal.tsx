import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSirenStore } from '@/core/store';
import { videoEngine } from '@/core/engine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportQuality = 'low' | 'medium' | 'high' | 'max';
type ExportFormat = 'mp4' | 'webm' | 'gif';

interface ExportSettings {
  quality: ExportQuality;
  format: ExportFormat;
  includeAudio: boolean;
}

const QUALITY_PRESETS: Record<ExportQuality, { label: string; bitrate: string; desc: string }> = {
  low: { label: 'Low', bitrate: '2 Mbps', desc: 'Smaller file, faster export' },
  medium: { label: 'Medium', bitrate: '5 Mbps', desc: 'Balanced quality and size' },
  high: { label: 'High', bitrate: '10 Mbps', desc: 'Great for TikTok' },
  max: { label: 'Maximum', bitrate: '20 Mbps', desc: 'Best quality, larger file' },
};

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { project } = useSirenStore();
  const [settings, setSettings] = useState<ExportSettings>({
    quality: 'high',
    format: 'mp4',
    includeAudio: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setProgress(0);
    setError(null);

    try {
      const blob = await videoEngine.export(project, (p) => {
        setProgress(p);
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'siren-export'}.${settings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setTimeout(() => {
        onClose();
        setIsExporting(false);
        setProgress(0);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
    }
  }, [project, settings, onClose]);

  const estimatedFileSize = () => {
    const durationSec = project.duration / 1000;
    const bitrateMap: Record<ExportQuality, number> = {
      low: 2,
      medium: 5,
      high: 10,
      max: 20,
    };
    const sizeMB = (durationSec * bitrateMap[settings.quality]) / 8;
    return sizeMB < 1 ? `${Math.round(sizeMB * 1024)} KB` : `${sizeMB.toFixed(1)} MB`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-siren-surface rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-siren-border">
              <h2 className="text-lg font-semibold text-siren-text">Export Video</h2>
              <button
                className="text-siren-text-muted hover:text-siren-text"
                onClick={onClose}
                disabled={isExporting}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Project info */}
              <div className="p-3 bg-siren-bg rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-siren-text-muted">Resolution</span>
                  <span className="text-siren-text">
                    {project.settings.width}x{project.settings.height}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-siren-text-muted">Duration</span>
                  <span className="text-siren-text">
                    {formatDuration(project.duration)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-siren-text-muted">Frame Rate</span>
                  <span className="text-siren-text">{project.settings.frameRate} fps</span>
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-sm text-siren-text-muted mb-2">Quality</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(QUALITY_PRESETS) as ExportQuality[]).map((q) => (
                    <button
                      key={q}
                      className={`p-3 rounded-lg text-left transition-colors ${
                        settings.quality === q
                          ? 'bg-siren-accent text-white'
                          : 'bg-siren-bg text-siren-text hover:bg-siren-border'
                      }`}
                      onClick={() => setSettings({ ...settings, quality: q })}
                      disabled={isExporting}
                    >
                      <div className="font-medium text-sm">{QUALITY_PRESETS[q].label}</div>
                      <div className="text-xs opacity-70">{QUALITY_PRESETS[q].desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm text-siren-text-muted mb-2">Format</label>
                <div className="flex gap-2">
                  {(['mp4', 'webm', 'gif'] as ExportFormat[]).map((f) => (
                    <button
                      key={f}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        settings.format === f
                          ? 'bg-siren-accent text-white'
                          : 'bg-siren-bg text-siren-text hover:bg-siren-border'
                      }`}
                      onClick={() => setSettings({ ...settings, format: f })}
                      disabled={isExporting}
                    >
                      .{f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Include Audio */}
              <div>
                <label className="flex items-center gap-2 text-sm text-siren-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeAudio}
                    onChange={(e) => setSettings({ ...settings, includeAudio: e.target.checked })}
                    disabled={isExporting || settings.format === 'gif'}
                    className="rounded"
                  />
                  Include audio
                </label>
              </div>

              {/* Estimated size */}
              <div className="p-3 bg-siren-bg rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-siren-text-muted">Estimated Size</span>
                  <span className="text-siren-text font-medium">{estimatedFileSize()}</span>
                </div>
              </div>

              {/* Progress */}
              {isExporting && (
                <div className="space-y-2">
                  <div className="h-2 bg-siren-bg rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-siren-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-siren-text-muted">
                    Exporting... {Math.round(progress)}%
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-600/20 text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-siren-border">
              <button
                className="flex-1 py-2 rounded-lg bg-siren-border text-siren-text hover:bg-siren-bg transition-colors"
                onClick={onClose}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2 rounded-lg bg-siren-accent text-white hover:bg-siren-accent-hover transition-colors disabled:opacity-50"
                onClick={handleExport}
                disabled={isExporting || project.clips.length === 0}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default ExportModal;
