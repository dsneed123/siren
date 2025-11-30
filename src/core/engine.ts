import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Project, Clip, Effect, VideoClip, AudioClip, ImageClip } from './types';

export class VideoEngine {
  private ffmpeg: FFmpeg;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/esm';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      this.loaded = true;
    })();

    return this.loadPromise;
  }

  async loadFile(file: File): Promise<{ url: string; duration: number; thumbnail?: string }> {
    await this.load();

    const data = await fetchFile(file);
    const inputName = `input_${Date.now()}.${file.name.split('.').pop()}`;

    await this.ffmpeg.writeFile(inputName, data);

    // Get duration using ffprobe-like functionality
    let duration = 0;
    let thumbnail: string | undefined;

    if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      // Create a video element to get duration
      const url = URL.createObjectURL(file);
      duration = await this.getMediaDuration(url);

      if (file.type.startsWith('video/')) {
        thumbnail = await this.generateThumbnail(inputName);
      }
    }

    return {
      url: URL.createObjectURL(file),
      duration: duration * 1000, // Convert to ms
      thumbnail,
    };
  }

  private async getMediaDuration(url: string): Promise<number> {
    return new Promise((resolve) => {
      const media = document.createElement('video');
      media.src = url;
      media.onloadedmetadata = () => {
        resolve(media.duration);
      };
      media.onerror = () => resolve(0);
    });
  }

  private async generateThumbnail(inputName: string): Promise<string> {
    try {
      const outputName = `thumb_${Date.now()}.jpg`;
      await this.ffmpeg.exec([
        '-i', inputName,
        '-ss', '00:00:01',
        '-vframes', '1',
        '-vf', 'scale=160:-1',
        outputName,
      ]);

      const data = await this.ffmpeg.readFile(outputName);
      const blob = new Blob([data as BlobPart], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch {
      return '';
    }
  }

  async extractFrame(inputUrl: string, time: number): Promise<string> {
    await this.load();

    const response = await fetch(inputUrl);
    const data = new Uint8Array(await response.arrayBuffer());
    const inputName = `frame_input_${Date.now()}.mp4`;
    const outputName = `frame_${Date.now()}.jpg`;

    await this.ffmpeg.writeFile(inputName, data);

    await this.ffmpeg.exec([
      '-i', inputName,
      '-ss', (time / 1000).toString(),
      '-vframes', '1',
      outputName,
    ]);

    const frameData = await this.ffmpeg.readFile(outputName);
    const blob = new Blob([frameData as BlobPart], { type: 'image/jpeg' });

    // Cleanup
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);

    return URL.createObjectURL(blob);
  }

  async generateWaveform(audioUrl: string, samples: number = 100): Promise<number[]> {
    // Simplified waveform generation using Web Audio API
    const audioContext = new AudioContext();
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const rawData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData: number[] = [];

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j]);
      }
      filteredData.push(sum / blockSize);
    }

    // Normalize
    const max = Math.max(...filteredData);
    return filteredData.map((d) => d / max);
  }

  async export(
    project: Project,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    await this.load();

    const { settings, clips, assets, effects } = project;
    const { width, height, frameRate } = settings;

    // Build FFmpeg filter complex for compositing
    const inputs: string[] = [];

    // Sort clips by track order and time
    const sortedClips = [...clips].sort((a, b) => {
      if (a.trackId !== b.trackId) {
        return a.trackId.localeCompare(b.trackId);
      }
      return a.timeRange.start - b.timeRange.start;
    });

    // Write all input files
    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];

      if (clip.type === 'video' || clip.type === 'audio' || clip.type === 'image') {
        const assetClip = clip as VideoClip | AudioClip | ImageClip;
        const asset = assets.find((a) => a.id === assetClip.assetId);
        if (asset) {
          const response = await fetch(asset.src);
          const data = new Uint8Array(await response.arrayBuffer());
          const ext = asset.type === 'image' ? 'png' : 'mp4';
          await this.ffmpeg.writeFile(`input_${i}.${ext}`, data);
          inputs.push(`-i input_${i}.${ext}`);
        }
      }
    }

    // Set progress handler
    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.min(progress * 100, 100));
      });
    }

    // Generate output
    const outputName = 'output.mp4';

    // Build command
    const command = [
      ...inputs.flatMap((i) => i.split(' ')),
      '-filter_complex', this.buildFilterComplex(sortedClips, effects, settings),
      '-map', '[outv]',
      '-map', '[outa]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-r', frameRate.toString(),
      '-s', `${width}x${height}`,
      '-y',
      outputName,
    ];

    try {
      await this.ffmpeg.exec(command);
      const data = await this.ffmpeg.readFile(outputName);
      return new Blob([data as BlobPart], { type: 'video/mp4' });
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  private buildFilterComplex(
    clips: Clip[],
    _effects: Effect[],
    settings: { width: number; height: number }
  ): string {
    // Simplified filter complex - in production would be more sophisticated
    const videoClips = clips.filter((c) => c.type === 'video');
    const audioClips = clips.filter((c) => c.type === 'audio' || c.type === 'video');

    if (videoClips.length === 0) {
      return `color=c=black:s=${settings.width}x${settings.height}[outv];anullsrc[outa]`;
    }

    // Basic concat filter
    const videoFilters = videoClips
      .map((_, i) => `[${i}:v]setpts=PTS-STARTPTS,scale=${settings.width}:${settings.height}:force_original_aspect_ratio=decrease,pad=${settings.width}:${settings.height}:(ow-iw)/2:(oh-ih)/2[v${i}]`)
      .join(';');

    const concatVideo = videoClips.map((_, i) => `[v${i}]`).join('') +
      `concat=n=${videoClips.length}:v=1:a=0[outv]`;

    const audioFilter = audioClips.length > 0
      ? audioClips.map((_, i) => `[${i}:a]`).join('') +
        `amix=inputs=${audioClips.length}[outa]`
      : 'anullsrc[outa]';

    return `${videoFilters};${concatVideo};${audioFilter}`;
  }

  destroy(): void {
    if (this.loaded) {
      this.ffmpeg.terminate();
      this.loaded = false;
    }
  }
}

// Singleton instance
export const videoEngine = new VideoEngine();
