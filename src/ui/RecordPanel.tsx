import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSirenStore } from '@/core/store';

type RecordMode = 'webcam' | 'screen' | 'both' | 'audio';

export const RecordPanel: React.FC = () => {
  const { addAsset, addClip, project, addTrack } = useSirenStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const [mode, setMode] = useState<RecordMode>('webcam');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Get video track for webcam/screen recordings
  const getVideoTrack = useCallback(async () => {
    const videoTrack = project.tracks.find((t) => t.type === 'video');
    return videoTrack?.id || project.tracks[0]?.id;
  }, [project.tracks]);

  // Get or create audio track
  const getAudioTrack = useCallback(async () => {
    let audioTrack = project.tracks.find((t) => t.type === 'audio');
    if (!audioTrack) {
      const trackId = addTrack({ name: 'Audio', type: 'audio', locked: false, visible: true, muted: false });
      return trackId;
    }
    return audioTrack.id;
  }, [project.tracks, addTrack]);

  // Draw audio waveform visualization
  const drawAudioVisualization = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Calculate average level for meter
      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      setAudioLevel(average / 255);

      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient from purple to cyan
        const hue = 260 + (i / bufferLength) * 60;
        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }, []);

  // Start preview
  const startPreview = async () => {
    try {
      let mediaStream: MediaStream;

      if (mode === 'audio') {
        // Audio-only recording
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        // Set up audio visualization
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Start visualization
        drawAudioVisualization();
      } else if (mode === 'webcam') {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1080, height: 1920, facingMode: 'user' },
          audio: true,
        });
      } else if (mode === 'screen') {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1080, height: 1920 },
          audio: true,
        });
      } else {
        // Both - Picture in Picture (for now just use screen)
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1080, height: 1920 },
          audio: true,
        });
      }

      if (mode !== 'audio' && videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setStream(mediaStream);
      setIsPreviewing(true);
    } catch (err) {
      console.error('Error accessing media:', err);
      alert('Could not access microphone/camera/screen. Please check permissions.');
    }
  };

  // Stop preview
  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Clean up audio resources
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setIsPreviewing(false);
  };

  // Start recording with countdown
  const startRecording = async () => {
    if (!stream) return;

    const isAudioOnly = mode === 'audio';

    // 3 second countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);

    chunksRef.current = [];

    // Use appropriate MIME type for audio vs video
    const mimeType = isAudioOnly ? 'audio/webm;codecs=opus' : 'video/webm;codecs=vp9';
    const options = { mimeType };
    const recorder = new MediaRecorder(stream, options);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    // Track when recording started
    recordingStartTimeRef.current = Date.now();
    const clipStartTime = useSirenStore.getState().editor.currentTime;

    recorder.onstop = async () => {
      const actualDuration = Date.now() - recordingStartTimeRef.current;
      const blobType = isAudioOnly ? 'audio/webm' : 'video/webm';
      const blob = new Blob(chunksRef.current, { type: blobType });
      const url = URL.createObjectURL(blob);

      if (isAudioOnly) {
        // Add as audio asset
        const assetId = addAsset({
          name: `Audio ${new Date().toLocaleTimeString()}`,
          type: 'audio',
          src: url,
          duration: actualDuration,
        });

        // Add audio clip to timeline
        const trackId = await getAudioTrack();
        if (trackId) {
          addClip({
            type: 'audio',
            assetId,
            trackId,
            timeRange: { start: clipStartTime, end: clipStartTime + actualDuration },
            sourceTimeRange: { start: 0, end: actualDuration },
            speed: 1,
            volume: 1,
            muted: false,
          } as any);
        }
      } else {
        // Add as video asset
        const assetId = addAsset({
          name: `Recording ${new Date().toLocaleTimeString()}`,
          type: 'video',
          src: url,
          duration: actualDuration,
        });

        // Add video clip to timeline
        const trackId = await getVideoTrack();
        if (trackId) {
          addClip({
            type: 'video',
            assetId,
            trackId,
            timeRange: { start: clipStartTime, end: clipStartTime + actualDuration },
            sourceTimeRange: { start: 0, end: actualDuration },
            speed: 1,
            volume: 1,
            muted: false,
            transform: { position: { x: 0, y: 0 }, scale: 1, rotation: 0, opacity: 1 },
          } as any);
        }
      }

      setRecordingTime(0);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100); // Collect data every 100ms
    setIsRecording(true);

    // Start timer for display
    const startTime = Date.now();
    const interval = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Store interval for cleanup
    (recorder as any)._interval = interval;
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const interval = (mediaRecorderRef.current as any)._interval;
      if (interval) clearInterval(interval);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-siren-text">Record</h3>

      {/* Mode selector */}
      <div className="flex gap-1 p-1 bg-siren-bg rounded">
        {(['webcam', 'screen', 'both', 'audio'] as RecordMode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              if (!isRecording) {
                setMode(m);
                if (isPreviewing) stopPreview();
              }
            }}
            className={`flex-1 py-1.5 text-xs rounded transition-colors ${
              mode === m
                ? 'bg-siren-accent text-white'
                : 'text-siren-text-muted hover:text-siren-text'
            }`}
          >
            {m === 'webcam' ? '📷' : m === 'screen' ? '🖥️' : m === 'both' ? '📷🖥️' : '🎤'}
          </button>
        ))}
      </div>

      {/* Preview area */}
      <div className={`relative ${mode === 'audio' ? 'aspect-video' : 'aspect-[9/16]'} bg-black rounded-lg overflow-hidden`}>
        {/* Video preview (hidden for audio mode) */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${mode === 'audio' ? 'hidden' : ''}`}
          muted
          playsInline
        />

        {/* Audio visualization canvas */}
        {mode === 'audio' && (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={300}
            height={150}
          />
        )}

        {/* Audio level meter */}
        {mode === 'audio' && isPreviewing && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
            <p className="text-xs text-siren-text-muted mt-1 text-center">
              {isRecording ? 'Recording...' : 'Listening...'}
            </p>
          </div>
        )}

        {!isPreviewing && (
          <div className="absolute inset-0 flex items-center justify-center text-siren-text-muted">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {mode === 'webcam' ? '📷' : mode === 'screen' ? '🖥️' : mode === 'both' ? '📷🖥️' : '🎤'}
              </div>
              <p className="text-xs">Click preview to start</p>
            </div>
          </div>
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <span className="text-6xl font-bold text-white animate-pulse">{countdown}</span>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-600 px-2 py-1 rounded">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs text-white font-mono">{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!isPreviewing ? (
          <button
            onClick={startPreview}
            className="flex-1 py-2 bg-siren-accent text-white text-sm rounded hover:bg-siren-accent-hover transition-colors"
          >
            Start Preview
          </button>
        ) : isRecording ? (
          <button
            onClick={stopRecording}
            className="flex-1 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            Stop Recording
          </button>
        ) : (
          <>
            <button
              onClick={startRecording}
              className="flex-1 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <span className="w-2 h-2 bg-white rounded-full" />
              Record
            </button>
            <button
              onClick={stopPreview}
              className="px-4 py-2 bg-siren-surface border border-siren-border text-siren-text text-sm rounded hover:bg-siren-border transition-colors"
            >
              Stop
            </button>
          </>
        )}
      </div>

      {/* Quick tips */}
      <div className="text-xs text-siren-text-muted space-y-1">
        <p>• 📷 Webcam: Front-facing camera</p>
        <p>• 🖥️ Screen: Record your display</p>
        <p>• 📷🖥️ Both: Picture-in-picture</p>
        <p>• 🎤 Audio: Microphone only (voiceover)</p>
      </div>
    </div>
  );
};

export default RecordPanel;
