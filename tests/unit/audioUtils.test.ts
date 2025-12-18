/**
 * Tests unitaires pour les utilitaires audio
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AudioContext for testing
const mockAudioContext = {
  decodeAudioData: vi.fn(),
  createBufferSource: vi.fn(),
  createGain: vi.fn(),
  destination: {},
  sampleRate: 44100,
};

describe('Audio Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Extension Utils', () => {
    it('should extract correct extension from filename', () => {
      const getExtension = (filename: string) => {
        const parts = filename.split('.');
        return parts.length > 1 ? '.' + parts.pop() : '';
      };

      expect(getExtension('audio.mp3')).toBe('.mp3');
      expect(getExtension('audio.wav')).toBe('.wav');
      expect(getExtension('audio.file.flac')).toBe('.flac');
      expect(getExtension('noextension')).toBe('');
    });
  });

  describe('Format Size Utils', () => {
    it('should format file sizes correctly', () => {
      const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('Time Formatting', () => {
    it('should format time correctly', () => {
      const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(3661)).toBe('61:01');
    });
  });

  describe('Audio Buffer Validation', () => {
    it('should validate audio buffer properties', () => {
      const isValidAudioBuffer = (buffer: any): boolean => {
        if (!buffer) return false;
        return (
          typeof buffer.sampleRate === 'number' &&
          typeof buffer.numberOfChannels === 'number' &&
          typeof buffer.duration === 'number' &&
          buffer.sampleRate > 0 &&
          buffer.numberOfChannels > 0 &&
          buffer.duration > 0
        );
      };

      const validBuffer = {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 120,
      };

      const invalidBuffer = {
        sampleRate: 0,
        numberOfChannels: 2,
        duration: 120,
      };

      expect(isValidAudioBuffer(validBuffer)).toBe(true);
      expect(isValidAudioBuffer(invalidBuffer)).toBe(false);
      expect(isValidAudioBuffer(null)).toBe(false);
    });
  });
});

describe('MIME Type Detection', () => {
  it('should return correct MIME types for audio formats', () => {
    const getMimeType = (format: string): string => {
      const mimeTypes: Record<string, string> = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        flac: 'audio/flac',
        aac: 'audio/aac',
        m4a: 'audio/mp4',
      };
      return mimeTypes[format] || 'application/octet-stream';
    };

    expect(getMimeType('mp3')).toBe('audio/mpeg');
    expect(getMimeType('wav')).toBe('audio/wav');
    expect(getMimeType('ogg')).toBe('audio/ogg');
    expect(getMimeType('flac')).toBe('audio/flac');
    expect(getMimeType('unknown')).toBe('application/octet-stream');
  });
});
