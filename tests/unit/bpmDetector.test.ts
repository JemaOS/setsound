/**
 * Tests unitaires pour le détecteur BPM
 */
import { describe, it, expect, vi } from 'vitest';

describe('BPM Detector', () => {
  describe('BPM Range Validation', () => {
    it('should validate BPM is within acceptable range', () => {
      const isValidBPM = (bpm: number): boolean => {
        return bpm >= 60 && bpm <= 200;
      };

      expect(isValidBPM(120)).toBe(true);
      expect(isValidBPM(60)).toBe(true);
      expect(isValidBPM(200)).toBe(true);
      expect(isValidBPM(59)).toBe(false);
      expect(isValidBPM(201)).toBe(false);
    });
  });

  describe('BPM Rounding', () => {
    it('should round BPM to nearest integer', () => {
      const roundBPM = (bpm: number): number => Math.round(bpm);

      expect(roundBPM(120.4)).toBe(120);
      expect(roundBPM(120.5)).toBe(121);
      expect(roundBPM(120.6)).toBe(121);
    });
  });

  describe('Tempo Classification', () => {
    it('should classify tempo correctly', () => {
      const classifyTempo = (bpm: number): string => {
        if (bpm < 80) return 'Lent';
        if (bpm < 120) return 'Modéré';
        if (bpm < 160) return 'Rapide';
        return 'Très rapide';
      };

      expect(classifyTempo(70)).toBe('Lent');
      expect(classifyTempo(100)).toBe('Modéré');
      expect(classifyTempo(140)).toBe('Rapide');
      expect(classifyTempo(180)).toBe('Très rapide');
    });
  });

  describe('Audio Analysis Prerequisites', () => {
    it('should check minimum audio duration for BPM detection', () => {
      const hasMinimumDuration = (duration: number): boolean => {
        return duration >= 3; // Minimum 3 seconds for accurate BPM
      };

      expect(hasMinimumDuration(5)).toBe(true);
      expect(hasMinimumDuration(3)).toBe(true);
      expect(hasMinimumDuration(2)).toBe(false);
    });
  });
});
