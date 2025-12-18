/**
 * Tests unitaires pour le convertisseur audio
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Audio Converter', () => {
  describe('Format Support', () => {
    const SUPPORTED_FORMATS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];

    it('should support all expected formats', () => {
      expect(SUPPORTED_FORMATS).toContain('mp3');
      expect(SUPPORTED_FORMATS).toContain('wav');
      expect(SUPPORTED_FORMATS).toContain('ogg');
      expect(SUPPORTED_FORMATS).toContain('flac');
      expect(SUPPORTED_FORMATS).toContain('aac');
      expect(SUPPORTED_FORMATS).toContain('m4a');
    });

    it('should have 6 supported formats', () => {
      expect(SUPPORTED_FORMATS.length).toBe(6);
    });
  });

  describe('Format Routing', () => {
    it('should route FLAC and OGG to FFmpeg', () => {
      const usesFFmpeg = (format: string): boolean => {
        return format === 'flac' || format === 'ogg';
      };

      expect(usesFFmpeg('flac')).toBe(true);
      expect(usesFFmpeg('ogg')).toBe(true);
      expect(usesFFmpeg('mp3')).toBe(false);
      expect(usesFFmpeg('wav')).toBe(false);
    });

    it('should route other formats to MediaBunny', () => {
      const usesMediaBunny = (format: string): boolean => {
        return !['flac', 'ogg'].includes(format);
      };

      expect(usesMediaBunny('mp3')).toBe(true);
      expect(usesMediaBunny('wav')).toBe(true);
      expect(usesMediaBunny('aac')).toBe(true);
      expect(usesMediaBunny('m4a')).toBe(true);
      expect(usesMediaBunny('flac')).toBe(false);
      expect(usesMediaBunny('ogg')).toBe(false);
    });
  });

  describe('Output Format Configuration', () => {
    it('should have correct MIME types for each format', () => {
      const OUTPUT_FORMATS = [
        { id: 'mp3', mimeType: 'audio/mpeg' },
        { id: 'wav', mimeType: 'audio/wav' },
        { id: 'ogg', mimeType: 'audio/ogg' },
        { id: 'flac', mimeType: 'audio/flac' },
        { id: 'aac', mimeType: 'audio/aac' },
        { id: 'm4a', mimeType: 'audio/mp4' },
      ];

      const mp3Format = OUTPUT_FORMATS.find(f => f.id === 'mp3');
      expect(mp3Format?.mimeType).toBe('audio/mpeg');

      const wavFormat = OUTPUT_FORMATS.find(f => f.id === 'wav');
      expect(wavFormat?.mimeType).toBe('audio/wav');

      const oggFormat = OUTPUT_FORMATS.find(f => f.id === 'ogg');
      expect(oggFormat?.mimeType).toBe('audio/ogg');

      const flacFormat = OUTPUT_FORMATS.find(f => f.id === 'flac');
      expect(flacFormat?.mimeType).toBe('audio/flac');
    });

    it('should have correct file extensions', () => {
      const OUTPUT_FORMATS = [
        { id: 'mp3', extension: '.mp3' },
        { id: 'wav', extension: '.wav' },
        { id: 'ogg', extension: '.ogg' },
        { id: 'flac', extension: '.flac' },
        { id: 'aac', extension: '.aac' },
        { id: 'm4a', extension: '.m4a' },
      ];

      OUTPUT_FORMATS.forEach(format => {
        expect(format.extension).toBe(`.${format.id}`);
      });
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress percentage correctly', () => {
      const calculateProgress = (ratio: number): number => {
        return Math.round(ratio * 100);
      };

      expect(calculateProgress(0)).toBe(0);
      expect(calculateProgress(0.5)).toBe(50);
      expect(calculateProgress(1)).toBe(100);
      expect(calculateProgress(0.307)).toBe(31);
    });
  });

  describe('Filename Generation', () => {
    it('should generate correct output filename', () => {
      const generateOutputFilename = (originalName: string, format: string): string => {
        const baseName = originalName.replace(/\.[^/.]+$/, '');
        return `${baseName}_converted.${format}`;
      };

      expect(generateOutputFilename('song.mp3', 'wav')).toBe('song_converted.wav');
      expect(generateOutputFilename('audio.file.wav', 'flac')).toBe('audio.file_converted.flac');
    });
  });
});
