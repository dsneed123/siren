import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Project, VideoClip, AudioClip, ImageClip, TextClip, ShapeClip, Transform } from './types';
import { getAnimatedTransform, getAnimatedSize } from './keyframes';

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

    const { settings, clips, assets, tracks } = project;
    const { width, height, frameRate } = settings;

    // Calculate actual duration from clips (longest clip end time)
    const duration = clips.length > 0
      ? Math.max(...clips.map(c => c.timeRange.end))
      : 0;

    if (duration === 0) {
      throw new Error('No clips to export');
    }

    const totalFrames = Math.ceil((duration / 1000) * frameRate);

    // Create offscreen canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Preload all media assets
    const mediaCache = new Map<string, HTMLVideoElement | HTMLImageElement>();

    for (const asset of assets) {
      if (asset.type === 'video') {
        const video = document.createElement('video');
        video.src = asset.src;
        video.muted = true;
        video.preload = 'auto';
        await new Promise<void>((resolve) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => resolve();
          video.load();
        });
        mediaCache.set(asset.id, video);
      } else if (asset.type === 'image') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = asset.src;
        });
        mediaCache.set(asset.id, img);
      }
    }

    // Render each frame
    const frameData: Uint8Array[] = [];

    for (let frame = 0; frame < totalFrames; frame++) {
      const currentTime = (frame / frameRate) * 1000; // Convert to ms

      // Clear canvas with background
      ctx.fillStyle = settings.backgroundColor || '#000000';
      ctx.fillRect(0, 0, width, height);

      // Get active clips sorted by track order (higher order = behind)
      const activeClips = clips
        .filter(clip => {
          const track = tracks.find(t => t.id === clip.trackId);
          return track?.visible !== false &&
            currentTime >= clip.timeRange.start &&
            currentTime < clip.timeRange.end;
        })
        .sort((a, b) => {
          const trackA = tracks.find(t => t.id === a.trackId);
          const trackB = tracks.find(t => t.id === b.trackId);
          return (trackB?.order ?? 0) - (trackA?.order ?? 0);
        });

      // Render each active clip
      for (const clip of activeClips) {
        const clipTime = currentTime - clip.timeRange.start;

        switch (clip.type) {
          case 'video':
            await this.renderVideoClip(ctx, clip as VideoClip, clipTime, mediaCache, assets);
            break;
          case 'image':
            await this.renderImageClip(ctx, clip as ImageClip, clipTime, mediaCache, assets);
            break;
          case 'text':
            this.renderTextClip(ctx, clip as TextClip, clipTime);
            break;
          case 'shape':
            this.renderShapeClip(ctx, clip as ShapeClip, clipTime);
            break;
        }
      }

      // Convert canvas to PNG
      const pngBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });
      const pngData = new Uint8Array(await pngBlob.arrayBuffer());
      frameData.push(pngData);

      // Report progress (frame rendering is ~70% of work)
      if (onProgress) {
        onProgress((frame / totalFrames) * 70);
      }
    }

    // Write frames to FFmpeg
    for (let i = 0; i < frameData.length; i++) {
      const paddedNum = i.toString().padStart(6, '0');
      await this.ffmpeg.writeFile(`frame_${paddedNum}.png`, frameData[i]);
    }

    // Extract and write audio from video/audio clips
    const audioInputs: string[] = [];
    let audioIndex = 0;

    for (const clip of clips) {
      if (clip.type === 'video' || clip.type === 'audio') {
        const mediaClip = clip as VideoClip | AudioClip;
        if (clip.type === 'video' && (mediaClip as VideoClip).muted) continue;

        const asset = assets.find(a => a.id === mediaClip.assetId);
        if (!asset) continue;

        try {
          const response = await fetch(asset.src);
          const data = new Uint8Array(await response.arrayBuffer());
          const audioFile = `audio_${audioIndex}.mp4`;
          await this.ffmpeg.writeFile(audioFile, data);
          audioInputs.push(audioFile);
          audioIndex++;
        } catch (e) {
          console.warn('Failed to load audio:', e);
        }
      }
    }

    // Build FFmpeg command
    const outputName = 'output.mp4';
    const command: string[] = [
      '-framerate', frameRate.toString(),
      '-i', 'frame_%06d.png',
    ];

    // Add audio inputs
    for (const audioFile of audioInputs) {
      command.push('-i', audioFile);
    }

    // Filter complex for audio mixing (if we have audio)
    if (audioInputs.length > 0) {
      const audioFilters = audioInputs.map((_, i) => `[${i + 1}:a]`).join('');
      command.push(
        '-filter_complex',
        `${audioFilters}amix=inputs=${audioInputs.length}:duration=longest[aout]`,
        '-map', '0:v',
        '-map', '[aout]'
      );
    } else {
      command.push('-map', '0:v');
    }

    // Output settings
    command.push(
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      '-y',
      outputName
    );

    // Set up progress tracking for encoding
    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress }) => {
        // Encoding is the remaining 30% of work
        onProgress(70 + progress * 30);
      });
    }

    try {
      await this.ffmpeg.exec(command);
      const data = await this.ffmpeg.readFile(outputName);

      // Cleanup
      for (let i = 0; i < frameData.length; i++) {
        const paddedNum = i.toString().padStart(6, '0');
        try {
          await this.ffmpeg.deleteFile(`frame_${paddedNum}.png`);
        } catch {}
      }
      for (const audioFile of audioInputs) {
        try {
          await this.ffmpeg.deleteFile(audioFile);
        } catch {}
      }
      try {
        await this.ffmpeg.deleteFile(outputName);
      } catch {}

      return new Blob([data as BlobPart], { type: 'video/mp4' });
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  private async renderVideoClip(
    ctx: CanvasRenderingContext2D,
    clip: VideoClip,
    clipTime: number,
    mediaCache: Map<string, HTMLVideoElement | HTMLImageElement>,
    assets: Project['assets']
  ): Promise<void> {
    const asset = assets.find(a => a.id === clip.assetId);
    if (!asset) return;

    const video = mediaCache.get(asset.id) as HTMLVideoElement;
    if (!video) return;

    // Seek to the correct time in the video (accounting for sourceTimeRange)
    const sourceStartSec = (clip.sourceTimeRange?.start || 0) / 1000;
    const videoTime = sourceStartSec + (clipTime / 1000) * clip.speed;
    if (Math.abs(video.currentTime - videoTime) > 0.05) {
      video.currentTime = videoTime;
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        // Timeout in case seek fails
        setTimeout(resolve, 100);
      });
    }

    // Get animated transform
    const transform = getAnimatedTransform(clipTime, clip.keyframeTracks, clip.transform);

    this.applyTransformAndDraw(ctx, video, transform, ctx.canvas.width, ctx.canvas.height);
  }

  private async renderImageClip(
    ctx: CanvasRenderingContext2D,
    clip: ImageClip,
    clipTime: number,
    mediaCache: Map<string, HTMLVideoElement | HTMLImageElement>,
    assets: Project['assets']
  ): Promise<void> {
    const asset = assets.find(a => a.id === clip.assetId);
    if (!asset) return;

    const img = mediaCache.get(asset.id) as HTMLImageElement;
    if (!img || !img.complete) return;

    // Get animated transform
    const transform = getAnimatedTransform(clipTime, clip.keyframeTracks, clip.transform);

    // Get size from asset dimensions (scaled down like in ImageOverlay)
    const imgDims = asset.dimensions || { width: img.width || 200, height: img.height || 200 };
    const size = {
      width: imgDims.width * transform.scale * 0.3,
      height: imgDims.height * transform.scale * 0.3,
    };

    ctx.save();
    ctx.globalAlpha = transform.opacity;
    ctx.translate(transform.position.x + size.width / 2, transform.position.y + size.height / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.drawImage(img, -size.width / 2, -size.height / 2, size.width, size.height);
    ctx.restore();
  }

  private renderTextClip(
    ctx: CanvasRenderingContext2D,
    clip: TextClip,
    clipTime: number
  ): void {
    const transform = getAnimatedTransform(clipTime, clip.keyframeTracks, clip.transform);
    const size = clip.size || { width: 200, height: 100 };

    ctx.save();
    ctx.globalAlpha = transform.opacity;
    ctx.translate(transform.position.x + size.width / 2, transform.position.y + size.height / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scale, transform.scale);

    // Set up text styles
    const style = clip.style;
    ctx.font = `${style.fontWeight || 400} ${style.fontSize}px ${style.fontFamily || 'Arial'}`;
    ctx.textAlign = (style.textAlign as CanvasTextAlign) || 'center';
    ctx.textBaseline = 'middle';

    // Text color
    ctx.fillStyle = style.color || '#ffffff';

    // Text shadow
    if (style.textShadow) {
      ctx.shadowColor = style.textShadow.color;
      ctx.shadowBlur = style.textShadow.blur;
      ctx.shadowOffsetX = style.textShadow.offsetX;
      ctx.shadowOffsetY = style.textShadow.offsetY;
    }

    // Glow effect
    if (style.glow) {
      ctx.shadowColor = style.glow.color;
      ctx.shadowBlur = style.glow.blur;
    }

    // Background
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      const textMetrics = ctx.measureText(clip.content);
      const padding = 10;
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(
        -textMetrics.width / 2 - padding,
        -style.fontSize / 2 - padding / 2,
        textMetrics.width + padding * 2,
        style.fontSize + padding
      );
      ctx.fillStyle = style.color || '#ffffff';

      // Re-apply shadow after background
      if (style.textShadow) {
        ctx.shadowColor = style.textShadow.color;
        ctx.shadowBlur = style.textShadow.blur;
        ctx.shadowOffsetX = style.textShadow.offsetX;
        ctx.shadowOffsetY = style.textShadow.offsetY;
      }
    }

    // Text stroke
    if (style.stroke && style.stroke.width > 0) {
      ctx.strokeStyle = style.stroke.color;
      ctx.lineWidth = style.stroke.width * 2;
      ctx.lineJoin = 'round';
      ctx.strokeText(clip.content, 0, 0);
    }

    // Draw text
    ctx.fillText(clip.content, 0, 0);

    ctx.restore();
  }

  private renderShapeClip(
    ctx: CanvasRenderingContext2D,
    clip: ShapeClip,
    clipTime: number
  ): void {
    const transform = getAnimatedTransform(clipTime, clip.keyframeTracks, clip.transform);
    const size = getAnimatedSize(clipTime, clip.keyframeTracks, clip.size);

    ctx.save();
    ctx.globalAlpha = transform.opacity;
    ctx.translate(transform.position.x + size.width / 2, transform.position.y + size.height / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scale, transform.scale);

    const style = clip.style;
    const w = size.width;
    const h = size.height;

    // Set fill
    ctx.fillStyle = style.fill || '#ffffff';
    ctx.globalAlpha = transform.opacity * (style.fillOpacity ?? 1);

    // Set stroke
    if (style.stroke) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.strokeWidth || 2;
    }

    // Shadow/glow
    if (style.shadow) {
      ctx.shadowColor = style.shadow.color;
      ctx.shadowBlur = style.shadow.blur;
      ctx.shadowOffsetX = style.shadow.offsetX;
      ctx.shadowOffsetY = style.shadow.offsetY;
    }

    // Draw shape
    ctx.beginPath();

    switch (clip.shapeType) {
      case 'rectangle':
        const r = style.cornerRadius || 0;
        if (r > 0) {
          ctx.roundRect(-w/2, -h/2, w, h, r);
        } else {
          ctx.rect(-w/2, -h/2, w, h);
        }
        break;

      case 'circle':
        ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2);
        break;

      case 'triangle':
        ctx.moveTo(0, -h/2);
        ctx.lineTo(w/2, h/2);
        ctx.lineTo(-w/2, h/2);
        ctx.closePath();
        break;

      case 'star':
        const points = style.points || 5;
        const outerR = Math.min(w, h) / 2;
        const innerR = outerR * (style.innerRadius || 0.4);
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / points) * i - Math.PI / 2;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;

      case 'heart':
        ctx.moveTo(0, h * 0.35);
        ctx.bezierCurveTo(-w * 0.4, -h * 0.3, -w * 0.4, h * 0.1, 0, h * 0.35);
        ctx.bezierCurveTo(w * 0.4, h * 0.1, w * 0.4, -h * 0.3, 0, h * 0.35);
        break;

      case 'arrow':
        const arrowHead = style.arrowHeadSize || 20;
        ctx.moveTo(-w/2, 0);
        ctx.lineTo(w/2 - arrowHead, 0);
        ctx.moveTo(w/2 - arrowHead, -arrowHead/2);
        ctx.lineTo(w/2, 0);
        ctx.lineTo(w/2 - arrowHead, arrowHead/2);
        break;

      case 'arrow-left':
        const arrowLeftHead = style.arrowHeadSize || 20;
        ctx.moveTo(w/2, 0);
        ctx.lineTo(-w/2 + arrowLeftHead, 0);
        ctx.moveTo(-w/2 + arrowLeftHead, -arrowLeftHead/2);
        ctx.lineTo(-w/2, 0);
        ctx.lineTo(-w/2 + arrowLeftHead, arrowLeftHead/2);
        break;

      case 'arrow-up':
        const arrowUpHead = style.arrowHeadSize || 20;
        ctx.moveTo(0, h/2);
        ctx.lineTo(0, -h/2 + arrowUpHead);
        ctx.moveTo(-arrowUpHead/2, -h/2 + arrowUpHead);
        ctx.lineTo(0, -h/2);
        ctx.lineTo(arrowUpHead/2, -h/2 + arrowUpHead);
        break;

      case 'arrow-down':
        const arrowDownHead = style.arrowHeadSize || 20;
        ctx.moveTo(0, -h/2);
        ctx.lineTo(0, h/2 - arrowDownHead);
        ctx.moveTo(-arrowDownHead/2, h/2 - arrowDownHead);
        ctx.lineTo(0, h/2);
        ctx.lineTo(arrowDownHead/2, h/2 - arrowDownHead);
        break;

      case 'arrow-double':
        const arrowDoubleHead = style.arrowHeadSize || 20;
        ctx.moveTo(-w/2 + arrowDoubleHead, 0);
        ctx.lineTo(w/2 - arrowDoubleHead, 0);
        // Left head
        ctx.moveTo(-w/2 + arrowDoubleHead, -arrowDoubleHead/2);
        ctx.lineTo(-w/2, 0);
        ctx.lineTo(-w/2 + arrowDoubleHead, arrowDoubleHead/2);
        // Right head
        ctx.moveTo(w/2 - arrowDoubleHead, -arrowDoubleHead/2);
        ctx.lineTo(w/2, 0);
        ctx.lineTo(w/2 - arrowDoubleHead, arrowDoubleHead/2);
        break;

      case 'arrow-curved':
        const curvedHead = style.arrowHeadSize || 20;
        ctx.moveTo(-w/2, h * 0.2);
        ctx.quadraticCurveTo(0, -h * 0.3, w/2 - curvedHead, 0);
        ctx.moveTo(w/2 - curvedHead, -curvedHead/2);
        ctx.lineTo(w/2, 0);
        ctx.lineTo(w/2 - curvedHead, curvedHead/2);
        break;

      case 'line':
      case 'line-dashed':
        ctx.moveTo(-w/2, 0);
        ctx.lineTo(w/2, 0);
        if (clip.shapeType === 'line-dashed') {
          ctx.setLineDash([10, 5]);
        }
        break;

      case 'diamond':
        ctx.moveTo(0, -h/2);
        ctx.lineTo(w/2, 0);
        ctx.lineTo(0, h/2);
        ctx.lineTo(-w/2, 0);
        ctx.closePath();
        break;

      case 'polygon':
        const polyPoints = style.points || 6;
        const polyR = Math.min(w, h) / 2;
        for (let i = 0; i < polyPoints; i++) {
          const angle = (2 * Math.PI / polyPoints) * i - Math.PI / 2;
          const x = polyR * Math.cos(angle);
          const y = polyR * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;

      case 'plus':
        const plusBarW = w * 0.3;
        const plusBarH = h * 0.3;
        ctx.moveTo(-plusBarW/2, -h/2);
        ctx.lineTo(plusBarW/2, -h/2);
        ctx.lineTo(plusBarW/2, -plusBarH/2);
        ctx.lineTo(w/2, -plusBarH/2);
        ctx.lineTo(w/2, plusBarH/2);
        ctx.lineTo(plusBarW/2, plusBarH/2);
        ctx.lineTo(plusBarW/2, h/2);
        ctx.lineTo(-plusBarW/2, h/2);
        ctx.lineTo(-plusBarW/2, plusBarH/2);
        ctx.lineTo(-w/2, plusBarH/2);
        ctx.lineTo(-w/2, -plusBarH/2);
        ctx.lineTo(-plusBarW/2, -plusBarH/2);
        ctx.closePath();
        break;

      case 'minus':
        ctx.rect(-w * 0.4, -h * 0.1, w * 0.8, h * 0.2);
        break;

      case 'checkmark':
        ctx.moveTo(-w * 0.3, 0);
        ctx.lineTo(-w * 0.1, h * 0.2);
        ctx.lineTo(w * 0.3, -h * 0.2);
        break;

      case 'cross':
        ctx.moveTo(-w * 0.3, -h * 0.3);
        ctx.lineTo(w * 0.3, h * 0.3);
        ctx.moveTo(w * 0.3, -h * 0.3);
        ctx.lineTo(-w * 0.3, h * 0.3);
        break;

      case 'lightning':
        ctx.moveTo(w * 0.1, -h * 0.4);
        ctx.lineTo(-w * 0.2, -h * 0.05);
        ctx.lineTo(0, -h * 0.05);
        ctx.lineTo(-w * 0.1, h * 0.4);
        ctx.lineTo(w * 0.2, h * 0.05);
        ctx.lineTo(0, h * 0.05);
        ctx.closePath();
        break;

      case 'flame':
        ctx.moveTo(0, -h * 0.45);
        ctx.bezierCurveTo(-w * 0.2, -h * 0.2, -w * 0.35, 0, -w * 0.3, h * 0.2);
        ctx.bezierCurveTo(-w * 0.25, h * 0.35, -w * 0.15, h * 0.45, 0, h * 0.45);
        ctx.bezierCurveTo(w * 0.15, h * 0.45, w * 0.25, h * 0.35, w * 0.3, h * 0.2);
        ctx.bezierCurveTo(w * 0.35, 0, w * 0.2, -h * 0.2, 0, -h * 0.45);
        ctx.closePath();
        break;

      case 'droplet':
        ctx.moveTo(0, -h * 0.4);
        ctx.bezierCurveTo(-w * 0.3, -h * 0.1, -w * 0.35, h * 0.15, 0, h * 0.4);
        ctx.bezierCurveTo(w * 0.35, h * 0.15, w * 0.3, -h * 0.1, 0, -h * 0.4);
        ctx.closePath();
        break;

      case 'cloud':
        ctx.ellipse(-w * 0.2, h * 0.1, w * 0.2, h * 0.25, 0, 0, Math.PI * 2);
        ctx.ellipse(0, -h * 0.05, w * 0.25, h * 0.3, 0, 0, Math.PI * 2);
        ctx.ellipse(w * 0.2, h * 0.05, w * 0.2, h * 0.25, 0, 0, Math.PI * 2);
        break;

      case 'sun':
        const sunR = Math.min(w, h) * 0.25;
        const sunRays = 8;
        const rayLen = Math.min(w, h) * 0.15;
        ctx.arc(0, 0, sunR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        for (let i = 0; i < sunRays; i++) {
          const angle = (2 * Math.PI / sunRays) * i;
          ctx.moveTo((sunR + 5) * Math.cos(angle), (sunR + 5) * Math.sin(angle));
          ctx.lineTo((sunR + rayLen) * Math.cos(angle), (sunR + rayLen) * Math.sin(angle));
        }
        break;

      case 'moon':
        const moonR = Math.min(w, h) * 0.4;
        ctx.arc(moonR * 0.3, 0, moonR, Math.PI * -0.5, Math.PI * 0.5);
        ctx.arc(moonR * 0.1, 0, moonR * 0.75, Math.PI * 0.5, Math.PI * -0.5, true);
        ctx.closePath();
        break;

      case 'burst':
        const burstPoints = style.points || 12;
        const burstOuterR = Math.min(w, h) / 2;
        const burstInnerR = burstOuterR * 0.6;
        for (let i = 0; i < burstPoints * 2; i++) {
          const radius = i % 2 === 0 ? burstOuterR : burstInnerR;
          const angle = (Math.PI / burstPoints) * i - Math.PI / 2;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;

      case 'badge':
        const badgeR = Math.min(w, h) * 0.4;
        ctx.arc(0, 0, badgeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, badgeR * 0.75, 0, Math.PI * 2);
        ctx.strokeStyle = style.stroke || '#ffffff';
        break;

      case 'ribbon':
        ctx.moveTo(-w * 0.4, -h * 0.2);
        ctx.lineTo(-w * 0.3, 0);
        ctx.lineTo(-w * 0.4, h * 0.2);
        ctx.lineTo(-w * 0.2, h * 0.2);
        ctx.lineTo(0, 0);
        ctx.lineTo(w * 0.2, h * 0.2);
        ctx.lineTo(w * 0.4, h * 0.2);
        ctx.lineTo(w * 0.3, 0);
        ctx.lineTo(w * 0.4, -h * 0.2);
        ctx.lineTo(w * 0.2, -h * 0.2);
        ctx.lineTo(0, 0);
        ctx.lineTo(-w * 0.2, -h * 0.2);
        ctx.closePath();
        break;

      case 'sparkle':
        ctx.moveTo(0, -h/2);
        ctx.quadraticCurveTo(-w * 0.05, -h * 0.05, -w/2, 0);
        ctx.quadraticCurveTo(-w * 0.05, h * 0.05, 0, h/2);
        ctx.quadraticCurveTo(w * 0.05, h * 0.05, w/2, 0);
        ctx.quadraticCurveTo(w * 0.05, -h * 0.05, 0, -h/2);
        ctx.closePath();
        break;

      case 'speech-bubble':
        ctx.moveTo(-w * 0.4, -h * 0.4);
        ctx.lineTo(w * 0.4, -h * 0.4);
        ctx.quadraticCurveTo(w * 0.45, -h * 0.4, w * 0.45, -h * 0.35);
        ctx.lineTo(w * 0.45, h * 0.1);
        ctx.quadraticCurveTo(w * 0.45, h * 0.15, w * 0.4, h * 0.15);
        ctx.lineTo(-w * 0.2, h * 0.15);
        ctx.lineTo(-w * 0.4, h * 0.4);
        ctx.lineTo(-w * 0.3, h * 0.15);
        ctx.lineTo(-w * 0.4, h * 0.15);
        ctx.quadraticCurveTo(-w * 0.45, h * 0.15, -w * 0.45, h * 0.1);
        ctx.lineTo(-w * 0.45, -h * 0.35);
        ctx.quadraticCurveTo(-w * 0.45, -h * 0.4, -w * 0.4, -h * 0.4);
        ctx.closePath();
        break;

      case 'thought-bubble':
        ctx.ellipse(0, -h * 0.1, w * 0.4, h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-w * 0.25, h * 0.25, w * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-w * 0.35, h * 0.38, w * 0.05, 0, Math.PI * 2);
        break;

      case 'callout':
        ctx.moveTo(-w * 0.45, -h * 0.4);
        ctx.lineTo(w * 0.45, -h * 0.4);
        ctx.lineTo(w * 0.45, h * 0.1);
        ctx.lineTo(-w * 0.15, h * 0.1);
        ctx.lineTo(-w * 0.35, h * 0.4);
        ctx.lineTo(-w * 0.25, h * 0.1);
        ctx.lineTo(-w * 0.45, h * 0.1);
        ctx.closePath();
        break;

      case 'banner':
        ctx.moveTo(-w/2, -h * 0.3);
        ctx.lineTo(-w * 0.4, 0);
        ctx.lineTo(-w/2, h * 0.3);
        ctx.lineTo(w/2, h * 0.3);
        ctx.lineTo(w * 0.4, 0);
        ctx.lineTo(w/2, -h * 0.3);
        ctx.closePath();
        break;

      default:
        ctx.rect(-w/2, -h/2, w, h);
    }

    ctx.fill();
    if (style.stroke && style.strokeWidth) {
      ctx.stroke();
    }

    // Draw text inside shape
    if (style.text && style.text.content) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.font = `${style.text.fontWeight} ${style.text.fontSize}px ${style.text.fontFamily}`;
      ctx.fillStyle = style.text.color;
      ctx.textAlign = style.text.align as CanvasTextAlign;
      ctx.textBaseline = 'middle';

      const textX = style.text.align === 'left' ? -w * 0.4 :
                    style.text.align === 'right' ? w * 0.4 : 0;
      ctx.fillText(style.text.content, textX, 0);
    }

    ctx.restore();
  }

  private applyTransformAndDraw(
    ctx: CanvasRenderingContext2D,
    source: HTMLVideoElement | HTMLImageElement,
    transform: Transform,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    ctx.save();
    ctx.globalAlpha = transform.opacity;

    // For full-screen video, center it
    const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

    // Scale to fit canvas while maintaining aspect ratio
    const scale = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
    const scaledWidth = sourceWidth * scale;
    const scaledHeight = sourceHeight * scale;

    const x = transform.position.x || (canvasWidth - scaledWidth) / 2;
    const y = transform.position.y || (canvasHeight - scaledHeight) / 2;

    ctx.translate(x + scaledWidth / 2, y + scaledHeight / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scale, transform.scale);

    ctx.drawImage(source, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
    ctx.restore();
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
