// Access FFmpeg from global window object (loaded via script tag)
const getFFmpeg = () => (window as any).FFmpeg;

export class FFmpegConverter {
  private ffmpeg: any = null;
  private loaded = false;

  async load(onLog?: (msg: string) => void) {
    if (this.loaded && this.ffmpeg) return;

    const { createFFmpeg } = getFFmpeg();

    // Use version 0.11.x which is single-threaded and doesn't require COOP/COEP
    // Use CDN for reliable loading - local file paths cause "file://" protocol issues
    this.ffmpeg = createFFmpeg({
      log: true,
      corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    });
    
    if (onLog) {
        this.ffmpeg.setLogger(({ message }: { message: string }) => {
            console.log('FFmpeg:', message);
            onLog(message);
        });
    }
    
    try {
        console.log('Loading FFmpeg (Single Threaded)...');
        await this.ffmpeg.load();
        this.loaded = true;
        console.log('FFmpeg loaded successfully');
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        throw error;
    }
  }

  async convert(file: File, outputFormat: string, onProgress?: (progress: number) => void, onLog?: (msg: string) => void): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      await this.load(onLog);
    }
    const ffmpeg = this.ffmpeg!;

    // Setup progress handler
    if (onProgress) {
        ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
            onProgress(Math.round(ratio * 100));
        });
    }

    const inputExt = getExtension(file.name);
    const inputName = `input${inputExt}`;
    const outputName = `output.${outputFormat}`;    
    const { fetchFile } = getFFmpeg();
    try {
        ffmpeg.FS('writeFile', inputName, await fetchFile(file));

        const args = ['-i', inputName];
        
        // Configure codecs based on format
        if (outputFormat === 'flac') {
            args.push('-c:a', 'flac');
            args.push('-compression_level', '5');
        } else if (outputFormat === 'ogg') {
            args.push('-c:a', 'libvorbis');
            args.push('-q:a', '4');
        }

        args.push(outputName);

        console.log('Starting FFmpeg conversion with args:', args);
        await ffmpeg.run(...args);

        const data = ffmpeg.FS('readFile', outputName);
        
        // Cleanup
        ffmpeg.FS('unlink', inputName);
        ffmpeg.FS('unlink', outputName);

        // Determine mime type
        const mimeType = outputFormat === 'flac' ? 'audio/flac' : 'audio/ogg';
        return new Blob([data.buffer as any], { type: mimeType });
    } catch (error) {
        console.error('FFmpeg conversion error:', error);
        throw error;
    }
  }
}

function getExtension(filename: string) {
    const parts = filename.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
}

export const ffmpegConverter = new FFmpegConverter();
