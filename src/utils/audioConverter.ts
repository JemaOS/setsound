// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { 
  Input, 
  BlobSource, 
  Output, 
  BufferTarget, 
  WavOutputFormat, 
  Conversion,
  ALL_FORMATS
} from 'mediabunny';

// Formats that browsers typically cannot decode natively and need conversion
// These will be converted to WAV before processing
const UNSUPPORTED_FORMATS = [
  // Windows Media Audio
  'audio/x-ms-wma',
  'audio/wma',
  'audio/x-wma',
  // RealAudio
  'audio/x-realaudio',
  'audio/x-pn-realaudio',
  'audio/vnd.rn-realaudio',
  // Monkey's Audio (APE)
  'audio/x-ape',
  'audio/ape',
  // WavPack
  'audio/x-wavpack',
  'audio/wavpack',
  // Musepack
  'audio/x-musepack',
  'audio/musepack',
  // AC3/DTS (Dolby/DTS surround)
  'audio/ac3',
  'audio/x-ac3',
  'audio/x-dts',
  'audio/dts',
  // ALAC (Apple Lossless) - some browsers don't support
  'audio/x-alac',
  'audio/alac',
  // AMR (Adaptive Multi-Rate)
  'audio/amr',
  'audio/amr-wb',
  // TTA (True Audio)
  'audio/x-tta',
  // Shorten
  'audio/x-shorten',
];

const UNSUPPORTED_EXTENSIONS = [
  // Windows Media
  '.wma',
  '.wmv',
  '.asf',
  // RealAudio
  '.ra',
  '.rm',
  '.ram',
  // Lossless formats with limited browser support
  '.ape',
  '.wv',
  '.tta',
  '.shn',
  // Surround sound formats
  '.ac3',
  '.dts',
  // Other formats
  '.mpc',
  '.mpp',
  '.mp+',
  // Some ALAC files
  '.alac',
];

export interface ConversionProgress {
  progress: number; // 0-100
  message: string;
}

export type ProgressCallback = (progress: ConversionProgress) => void;

/**
 * Check if a file format needs conversion before decoding
 */
export function needsConversion(file: File): boolean {
  // Check by MIME type
  if (UNSUPPORTED_FORMATS.includes(file.type.toLowerCase())) {
    return true;
  }
  
  // Check by file extension
  const fileName = file.name.toLowerCase();
  for (const ext of UNSUPPORTED_EXTENSIONS) {
    if (fileName.endsWith(ext)) {
      return true;
    }
  }
  
  return false;
}

// Deprecated functions kept for compatibility but doing nothing or redirecting
export async function getFFmpeg(_onProgress?: ProgressCallback): Promise<any> {
  return Promise.resolve({});
}

/**
 * Convert an unsupported audio file to WAV format using MediaBunny
 */
export async function convertToWav(
  file: File, 
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({ progress: 0, message: 'Preparing conversion...' });
  
  try {
    onProgress?.({ progress: 10, message: 'Loading audio file...' });
    
    const input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS
    });

    const target = new BufferTarget();
    const output = new Output({
      target: target,
      format: new WavOutputFormat()
    });

    onProgress?.({ progress: 20, message: 'Initializing converter...' });

    const conversion = await Conversion.init({
      input,
      output,
      audio: {
        // Force re-encoding to ensure compatibility
        forceTranscode: true,
        codec: 'pcm-s16',
        sampleRate: 44100,
        numberOfChannels: 2
      }
    });

    if (onProgress) {
      conversion.onProgress = (p) => {
        onProgress({ 
          progress: Math.round(p * 100), 
          message: 'Converting audio...' 
        });
      };
    }

    onProgress?.({ progress: 30, message: 'Converting...' });
    
    await conversion.execute();
    
    onProgress?.({ progress: 100, message: 'Conversion complete!' });
    
    if (!target.buffer) {
      throw new Error("Conversion failed: No output buffer");
    }

    return new Blob([target.buffer], { type: 'audio/wav' });
    
  } catch (error) {
    throw new Error(`Audio conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file extension from filename
 */

export function isFFmpegLoaded(): boolean {
  return true;
}

/**
 * Preload FFmpeg (can be called early to improve UX)
 */
export async function preloadFFmpeg(onProgress?: ProgressCallback): Promise<void> {
  await getFFmpeg(onProgress);
}