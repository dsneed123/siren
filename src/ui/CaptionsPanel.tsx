import React, { useState, useRef, useCallback } from 'react';
import { useSirenStore } from '@/core/store';
import { VideoClip, AudioClip } from '@/core/types';

interface CaptionWord {
  id: string;
  text: string;
  startTime: number; // ms
  endTime: number; // ms
  confidence?: number;
}

interface CaptionLine {
  id: string;
  words: CaptionWord[];
  startTime: number;
  endTime: number;
}

type CaptionStyle = 'classic' | 'bold' | 'highlight' | 'karaoke' | 'bounce';

const CAPTION_STYLES: { id: CaptionStyle; name: string; preview: string }[] = [
  { id: 'classic', name: 'Classic', preview: 'Simple white text' },
  { id: 'bold', name: 'Bold', preview: 'Thick bold letters' },
  { id: 'highlight', name: 'Highlight', preview: 'Word-by-word highlight' },
  { id: 'karaoke', name: 'Karaoke', preview: 'Color fill animation' },
  { id: 'bounce', name: 'Bounce', preview: 'Bouncy word entrance' },
];

export const CaptionsPanel: React.FC = () => {
  const { project, editor, addClip, addTrack } = useSirenStore();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptLines, setTranscriptLines] = useState<CaptionLine[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<CaptionStyle>('highlight');
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [wordsPerLine, setWordsPerLine] = useState(4);
  const [fontSize, setFontSize] = useState(48);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaElementRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  // Get video/audio clips that can be transcribed
  const transcribableClips = project.clips.filter(
    (c): c is VideoClip | AudioClip => c.type === 'video' || c.type === 'audio'
  );

  // Use manually selected clip, or fall back to timeline selection
  const selectedClip = selectedClipId
    ? transcribableClips.find((c) => c.id === selectedClipId)
    : editor.selectedClipIds[0]
    ? transcribableClips.find((c) => c.id === editor.selectedClipIds[0])
    : null;

  // Get clip display name
  const getClipName = (clip: VideoClip | AudioClip) => {
    const asset = project.assets.find((a) => a.id === clip.assetId);
    const duration = ((clip.timeRange.end - clip.timeRange.start) / 1000).toFixed(1);
    return asset?.name || `${clip.type} clip (${duration}s)`;
  };

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Start transcription using Web Speech API
  const startTranscription = useCallback(async () => {
    if (!selectedClip) return;

    const asset = project.assets.find((a) => a.id === selectedClip.assetId);
    if (!asset) return;

    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Try Chrome.');
      return;
    }

    setIsTranscribing(true);
    setTranscriptLines([]);

    // Create media element to play audio
    const mediaEl = selectedClip.type === 'video'
      ? document.createElement('video')
      : document.createElement('audio');
    mediaEl.src = asset.src;
    mediaEl.muted = false;
    mediaElementRef.current = mediaEl;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    let currentWords: CaptionWord[] = [];
    let lastResultTime = 0;
    const clipStartTime = selectedClip.timeRange.start;

    recognition.onresult = (event: any) => {
      const currentTime = mediaEl.currentTime * 1000 + clipStartTime;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        const words = transcript.split(/\s+/);

        if (result.isFinal) {
          // Calculate timing for each word
          const wordDuration = (currentTime - lastResultTime) / words.length;
          const newWords: CaptionWord[] = words.map((word: string, idx: number) => ({
            id: generateId(),
            text: word,
            startTime: lastResultTime + (idx * wordDuration),
            endTime: lastResultTime + ((idx + 1) * wordDuration),
            confidence: result[0].confidence,
          }));

          currentWords = [...currentWords, ...newWords];
          lastResultTime = currentTime;

          // Group words into lines
          const lines: CaptionLine[] = [];
          for (let j = 0; j < currentWords.length; j += wordsPerLine) {
            const lineWords = currentWords.slice(j, j + wordsPerLine);
            if (lineWords.length > 0) {
              lines.push({
                id: generateId(),
                words: lineWords,
                startTime: lineWords[0].startTime,
                endTime: lineWords[lineWords.length - 1].endTime,
              });
            }
          }
          setTranscriptLines(lines);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsTranscribing(false);
      }
    };

    recognition.onend = () => {
      if (isTranscribing && mediaEl.currentTime < mediaEl.duration) {
        // Restart if media is still playing
        recognition.start();
      } else {
        setIsTranscribing(false);
      }
    };

    // Start playing media and recognition
    try {
      await mediaEl.play();
      recognition.start();

      // Stop when media ends
      mediaEl.onended = () => {
        recognition.stop();
        setIsTranscribing(false);
      };
    } catch (err) {
      console.error('Error starting transcription:', err);
      setIsTranscribing(false);
    }
  }, [selectedClip, project.assets, wordsPerLine, isTranscribing]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaElementRef.current) {
      mediaElementRef.current.pause();
    }
    setIsTranscribing(false);
  }, []);

  // Update word text
  const updateWordText = (lineId: string, wordId: string, newText: string) => {
    setTranscriptLines((lines) =>
      lines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              words: line.words.map((word) =>
                word.id === wordId ? { ...word, text: newText } : word
              ),
            }
          : line
      )
    );
    setEditingWordId(null);
  };

  // Delete word
  const deleteWord = (lineId: string, wordId: string) => {
    setTranscriptLines((lines) =>
      lines
        .map((line) =>
          line.id === lineId
            ? {
                ...line,
                words: line.words.filter((w) => w.id !== wordId),
              }
            : line
        )
        .filter((line) => line.words.length > 0)
    );
  };

  // Merge lines
  const mergeWithNext = (lineIndex: number) => {
    if (lineIndex >= transcriptLines.length - 1) return;
    setTranscriptLines((lines) => {
      const newLines = [...lines];
      const currentLine = newLines[lineIndex];
      const nextLine = newLines[lineIndex + 1];
      newLines[lineIndex] = {
        ...currentLine,
        words: [...currentLine.words, ...nextLine.words],
        endTime: nextLine.endTime,
      };
      newLines.splice(lineIndex + 1, 1);
      return newLines;
    });
  };

  // Split line at word
  const splitAtWord = (lineId: string, wordIndex: number) => {
    setTranscriptLines((lines) => {
      const lineIndex = lines.findIndex((l) => l.id === lineId);
      if (lineIndex === -1) return lines;

      const line = lines[lineIndex];
      if (wordIndex <= 0 || wordIndex >= line.words.length) return lines;

      const firstWords = line.words.slice(0, wordIndex);
      const secondWords = line.words.slice(wordIndex);

      const newLines = [...lines];
      newLines.splice(lineIndex, 1, {
        id: line.id,
        words: firstWords,
        startTime: firstWords[0].startTime,
        endTime: firstWords[firstWords.length - 1].endTime,
      }, {
        id: generateId(),
        words: secondWords,
        startTime: secondWords[0].startTime,
        endTime: secondWords[secondWords.length - 1].endTime,
      });

      return newLines;
    });
  };

  // Generate caption clips
  const generateCaptions = useCallback(() => {
    if (transcriptLines.length === 0) return;

    // Find or create a text track
    let textTrack = project.tracks.find((t) => t.type === 'text');
    if (!textTrack) {
      const trackId = addTrack({
        name: 'Captions',
        type: 'text',
        locked: false,
        visible: true,
        muted: false,
      });
      textTrack = { id: trackId, name: 'Captions', type: 'text', order: project.tracks.length, locked: false, visible: true, muted: false };
    }

    // Get style config
    const styleConfig = getCaptionStyleConfig(selectedStyle, fontSize);

    // Create text clips for each line
    transcriptLines.forEach((line) => {
      const fullText = line.words.map((w) => w.text).join(' ');

      addClip({
        type: 'text',
        trackId: textTrack!.id,
        content: fullText,
        timeRange: {
          start: line.startTime,
          end: line.endTime,
        },
        transform: {
          position: { x: 540, y: 1600 }, // Bottom center for 1080x1920
          scale: 1,
          rotation: 0,
          opacity: 1,
        },
        style: styleConfig.style,
        size: { width: 900, height: 200 },
        // Store word timing for karaoke effect
        metadata: {
          captionStyle: selectedStyle,
          words: line.words,
        },
      } as any);
    });

    alert(`Generated ${transcriptLines.length} caption clips!`);
  }, [transcriptLines, selectedStyle, fontSize, project.tracks, addTrack, addClip]);

  // Get style configuration
  const getCaptionStyleConfig = (style: CaptionStyle, size: number) => {
    const baseStyle = {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: size,
      fontWeight: 800,
      textAlign: 'center' as const,
      lineHeight: 1.2,
    };

    switch (style) {
      case 'classic':
        return {
          style: {
            ...baseStyle,
            color: '#FFFFFF',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          },
        };
      case 'bold':
        return {
          style: {
            ...baseStyle,
            fontWeight: 900,
            color: '#FFFFFF',
            textShadow: '0 0 10px rgba(0,0,0,0.9), 3px 3px 0 #000',
            letterSpacing: '-0.02em',
          },
        };
      case 'highlight':
        return {
          style: {
            ...baseStyle,
            color: '#FFFFFF',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '8px 16px',
            borderRadius: '8px',
          },
        };
      case 'karaoke':
        return {
          style: {
            ...baseStyle,
            color: '#FFFF00',
            textShadow: '0 0 20px rgba(255,255,0,0.5), 2px 2px 0 #000',
          },
        };
      case 'bounce':
        return {
          style: {
            ...baseStyle,
            color: '#FFFFFF',
            textShadow: '3px 3px 0 #FF0080, 6px 6px 0 rgba(0,0,0,0.3)',
          },
        };
      default:
        return { style: baseStyle };
    }
  };

  // Manual caption entry
  const [manualText, setManualText] = useState('');
  const addManualCaption = () => {
    if (!manualText.trim() || !selectedClip) return;

    const words = manualText.trim().split(/\s+/);
    const currentTime = editor.currentTime;
    const wordDuration = 300; // 300ms per word default

    const captionWords: CaptionWord[] = words.map((word, idx) => ({
      id: generateId(),
      text: word,
      startTime: currentTime + (idx * wordDuration),
      endTime: currentTime + ((idx + 1) * wordDuration),
    }));

    // Group into lines
    const newLines: CaptionLine[] = [];
    for (let i = 0; i < captionWords.length; i += wordsPerLine) {
      const lineWords = captionWords.slice(i, i + wordsPerLine);
      newLines.push({
        id: generateId(),
        words: lineWords,
        startTime: lineWords[0].startTime,
        endTime: lineWords[lineWords.length - 1].endTime,
      });
    }

    setTranscriptLines((prev) => [...prev, ...newLines]);
    setManualText('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-siren-border">
        <h3 className="text-sm font-semibold text-siren-text mb-1 flex items-center gap-2">
          <span>🎤 Auto Captions</span>
          <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">
            TikTok Style
          </span>
        </h3>
        <p className="text-[10px] text-siren-text-muted">
          Generate word-by-word animated captions
        </p>
      </div>

      {/* Clip selection */}
      <div className="px-3 mb-3">
        <label className="text-xs font-medium text-siren-text-muted block mb-2">Select Clip to Transcribe</label>
        {transcribableClips.length === 0 ? (
          <div className="p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <div>
                <p className="text-sm font-medium text-pink-400">No clips in timeline</p>
                <p className="text-xs text-siren-text-muted mt-0.5">
                  Add a video or audio clip to get started
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {transcribableClips.map((clip) => {
              const isSelected = selectedClip?.id === clip.id;
              return (
                <button
                  key={clip.id}
                  onClick={() => setSelectedClipId(clip.id)}
                  className={`w-full p-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/50'
                      : 'bg-siren-bg hover:bg-siren-border border border-transparent'
                  }`}
                >
                  <span className="text-base">{clip.type === 'video' ? '🎬' : '🎵'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isSelected ? 'text-pink-400' : 'text-siren-text'}`}>
                      {getClipName(clip)}
                    </p>
                    <p className="text-[10px] text-siren-text-muted">
                      {(clip.timeRange.start / 1000).toFixed(1)}s - {(clip.timeRange.end / 1000).toFixed(1)}s
                    </p>
                  </div>
                  {isSelected && <span className="text-green-400 text-sm">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Style selector */}
      <div className="px-3 mb-3">
        <label className="text-xs font-medium text-siren-text-muted block mb-2">Caption Style</label>
        <div className="grid grid-cols-5 gap-1">
          {CAPTION_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`p-2 rounded-lg text-center transition-all ${
                selectedStyle === style.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                  : 'bg-siren-bg text-siren-text-muted hover:bg-siren-border'
              }`}
              title={style.preview}
            >
              <span className="text-[10px] font-medium block">{style.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="px-3 mb-3 flex gap-3">
        <div className="flex-1">
          <label className="text-[10px] text-siren-text-muted block mb-1">Words/Line</label>
          <input
            type="number"
            value={wordsPerLine}
            onChange={(e) => setWordsPerLine(Math.max(1, Math.min(8, parseInt(e.target.value) || 4)))}
            className="w-full px-2 py-1.5 bg-siren-bg border border-siren-border rounded text-xs text-siren-text"
            min={1}
            max={8}
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-siren-text-muted block mb-1">Font Size</label>
          <input
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(Math.max(24, Math.min(96, parseInt(e.target.value) || 48)))}
            className="w-full px-2 py-1.5 bg-siren-bg border border-siren-border rounded text-xs text-siren-text"
            min={24}
            max={96}
          />
        </div>
      </div>

      {/* Transcribe button */}
      <div className="px-3 mb-3">
        {isTranscribing ? (
          <button
            onClick={stopTranscription}
            className="w-full py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Stop Transcribing
          </button>
        ) : (
          <button
            onClick={startTranscription}
            disabled={!selectedClip}
            className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              selectedClip
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600'
                : 'bg-siren-border text-siren-text-muted cursor-not-allowed'
            }`}
          >
            <span>🎙️</span>
            Auto Transcribe
          </button>
        )}
      </div>

      {/* Manual entry */}
      <div className="px-3 mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addManualCaption()}
            placeholder="Or type captions manually..."
            className="flex-1 px-3 py-2 bg-siren-bg border border-siren-border rounded-lg text-xs text-siren-text placeholder-siren-text-muted"
          />
          <button
            onClick={addManualCaption}
            disabled={!manualText.trim()}
            className="px-3 py-2 bg-siren-border text-siren-text text-xs rounded-lg hover:bg-siren-accent hover:text-white transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Transcript editor */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-siren-text">
            Transcript {transcriptLines.length > 0 && `(${transcriptLines.length} lines)`}
          </label>
          {transcriptLines.length > 0 && (
            <button
              onClick={() => setTranscriptLines([])}
              className="text-[10px] text-red-400 hover:text-red-300"
            >
              Clear all
            </button>
          )}
        </div>

        {transcriptLines.length === 0 ? (
          <div className="text-center py-8 bg-siren-bg/50 rounded-lg">
            <span className="text-3xl block mb-2">📝</span>
            <p className="text-xs text-siren-text-muted">No captions yet</p>
            <p className="text-[10px] text-siren-text-muted mt-1">
              Transcribe or type captions above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transcriptLines.map((line, lineIndex) => (
              <div
                key={line.id}
                className="p-2 bg-siren-bg rounded-lg group"
              >
                {/* Time badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-siren-text-muted font-mono">
                    {(line.startTime / 1000).toFixed(2)}s - {(line.endTime / 1000).toFixed(2)}s
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {lineIndex < transcriptLines.length - 1 && (
                      <button
                        onClick={() => mergeWithNext(lineIndex)}
                        className="text-[9px] text-siren-text-muted hover:text-siren-text px-1"
                        title="Merge with next line"
                      >
                        ⊕
                      </button>
                    )}
                  </div>
                </div>

                {/* Words */}
                <div className="flex flex-wrap gap-1">
                  {line.words.map((word, wordIndex) => (
                    <div key={word.id} className="relative group/word">
                      {editingWordId === word.id ? (
                        <input
                          type="text"
                          defaultValue={word.text}
                          autoFocus
                          className="px-1.5 py-0.5 bg-siren-surface border border-siren-accent rounded text-xs text-siren-text w-20"
                          onBlur={(e) => updateWordText(line.id, word.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateWordText(line.id, word.id, (e.target as HTMLInputElement).value);
                            } else if (e.key === 'Escape') {
                              setEditingWordId(null);
                            }
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => setEditingWordId(word.id)}
                          className="px-1.5 py-0.5 bg-siren-surface rounded text-xs text-siren-text cursor-pointer hover:bg-siren-border transition-colors inline-flex items-center gap-1"
                        >
                          {word.text}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteWord(line.id, word.id);
                            }}
                            className="opacity-0 group-hover/word:opacity-100 text-red-400 hover:text-red-300 text-[8px]"
                          >
                            ✕
                          </button>
                        </span>
                      )}
                      {/* Split indicator */}
                      {wordIndex > 0 && wordIndex < line.words.length && (
                        <button
                          onClick={() => splitAtWord(line.id, wordIndex)}
                          className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2 h-4 opacity-0 group-hover/word:opacity-100 text-[8px] text-siren-accent hover:text-white"
                          title="Split line here"
                        >
                          │
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate button */}
      {transcriptLines.length > 0 && (
        <div className="p-3 border-t border-siren-border">
          <button
            onClick={generateCaptions}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-bold rounded-lg hover:from-pink-600 hover:to-purple-600 transition-colors shadow-lg shadow-pink-500/25"
          >
            ✨ Generate {transcriptLines.length} Caption Clips
          </button>
        </div>
      )}
    </div>
  );
};

export default CaptionsPanel;
