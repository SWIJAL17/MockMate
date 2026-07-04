/**
 * Commercial-Grade PDF Resume Editor — Typography Engine (Phase 3.5)
 * 
 * An autonomous typographic calculation engine that replaces browser default text rendering.
 * It ensures exact preservation of:
 * - Proportional glyph metrics & advance widths
 * - Character spacing (letterSpacing / Tc) and word spacing (Tw)
 * - Horizontal scaling ratio (Tz / scaleX)
 * - Baseline positioning & line height leading (delta Y)
 * - Closest matching metrics computation when embedded subset fonts cannot be edited directly
 */

import { GlyphMetric, DocumentObject } from '../types';

/** Standard relative advance width approximations (ratio of fontSize) for proportional fonts */
const PROPORTIONAL_ADVANCE_RATIOS: Record<string, number> = {
  'i': 0.28, 'l': 0.28, 'j': 0.32, 'f': 0.35, 't': 0.35, 'r': 0.40,
  'a': 0.55, 'b': 0.58, 'c': 0.52, 'd': 0.58, 'e': 0.55, 'g': 0.58,
  'h': 0.58, 'k': 0.55, 'm': 0.85, 'n': 0.58, 'o': 0.58, 'p': 0.58,
  'q': 0.58, 's': 0.50, 'u': 0.58, 'v': 0.55, 'w': 0.80, 'x': 0.55,
  'y': 0.55, 'z': 0.52,
  'I': 0.35, 'J': 0.45, 'E': 0.65, 'F': 0.60, 'L': 0.60, 'S': 0.65,
  'Z': 0.65, 'M': 0.90, 'W': 0.95, 'A': 0.70, 'B': 0.68, 'C': 0.70,
  'D': 0.72, 'G': 0.75, 'H': 0.75, 'K': 0.70, 'N': 0.75, 'O': 0.78,
  'P': 0.68, 'Q': 0.78, 'R': 0.72, 'T': 0.65, 'U': 0.75, 'V': 0.70,
  'X': 0.70, 'Y': 0.70,
  ' ': 0.28, '.': 0.28, ',': 0.28, ':': 0.30, ';': 0.30, '!': 0.30,
  '|': 0.25, "'": 0.25, '"': 0.40, '-': 0.35, '–': 0.55, '—': 0.80,
  '0': 0.58, '1': 0.58, '2': 0.58, '3': 0.58, '4': 0.58, '5': 0.58,
  '6': 0.58, '7': 0.58, '8': 0.58, '9': 0.58,
};

export interface TypographyEngineService {
  /**
   * Compute character-level glyph metrics using proportional font advance tables
   * scaled by font size, letter spacing, word spacing, and horizontal scaling.
   */
  computeGlyphMetrics(
    text: string,
    startX: number,
    fontSize: number,
    totalWidth?: number,
    letterSpacing?: number,
    wordSpacing?: number,
    horizontalScaling?: number
  ): GlyphMetric[];

  /**
   * Calculate exact total text width in PDF user space from a glyph advance array.
   */
  calculateTextWidth(glyphMetrics: GlyphMetric[]): number;

  /**
   * When an embedded subset font cannot be edited directly in the browser or pdf-lib,
   * compute the closest matching metrics (horizontal scaling ratio and letter spacing)
   * to align the fallback font width with the original vector bounding box.
   */
  matchClosestFontMetrics(
    targetText: string,
    originalWidth: number,
    browserRenderedWidth: number,
    currentFontSize: number
  ): { scaleX: number; horizontalScaling: number; letterSpacing: number };

  /**
   * Calculate line spacing leading ratio from vertical coordinate differences (delta Y)
   * between consecutive text baselines.
   */
  calculateLineSpacing(prevBaseline: number, currBaseline: number, fontSize: number): number;
}

export class TypographyEngineServiceImpl implements TypographyEngineService {
  computeGlyphMetrics(
    text: string,
    startX: number,
    fontSize: number,
    totalWidth?: number,
    letterSpacing = 0,
    wordSpacing = 0,
    horizontalScaling = 100
  ): GlyphMetric[] {
    const chars = text.split('');
    if (chars.length === 0) return [];

    const scaleRatio = (horizontalScaling || 100) / 100;
    const rawAdvances = chars.map((char) => {
      const baseRatio = PROPORTIONAL_ADVANCE_RATIOS[char] || 0.55;
      let adv = baseRatio * fontSize * scaleRatio + (letterSpacing || 0);
      if (char === ' ') {
        adv += wordSpacing || 0;
      }
      return adv;
    });

    const sumRawAdvances = rawAdvances.reduce((acc, val) => acc + val, 0);

    // If totalWidth is provided from original PDF vector bounds, normalize proportional advances to fit exactly
    const normalizationFactor = totalWidth && totalWidth > 0 && sumRawAdvances > 0 ? totalWidth / sumRawAdvances : 1.0;

    let currentX = startX;
    return chars.map((char, index) => {
      const adv = rawAdvances[index] * normalizationFactor;
      const metric: GlyphMetric = {
        char,
        x: Math.round(currentX * 100) / 100,
        width: Math.round(adv * 100) / 100,
        advance: Math.round(adv * 100) / 100,
      };
      currentX += adv;
      return metric;
    });
  }

  calculateTextWidth(glyphMetrics: GlyphMetric[]): number {
    if (!glyphMetrics || glyphMetrics.length === 0) return 0;
    const total = glyphMetrics.reduce((sum, g) => sum + (g.advance || g.width || 0), 0);
    return Math.round(total * 100) / 100;
  }

  matchClosestFontMetrics(
    targetText: string,
    originalWidth: number,
    browserRenderedWidth: number,
    currentFontSize: number
  ): { scaleX: number; horizontalScaling: number; letterSpacing: number } {
    if (!browserRenderedWidth || browserRenderedWidth <= 0 || !originalWidth || originalWidth <= 0) {
      return { scaleX: 1.0, horizontalScaling: 100, letterSpacing: 0 };
    }

    const rawScaleX = originalWidth / browserRenderedWidth;
    
    // If discrepancy is slight (< 5%), adjust letter spacing instead of horizontal distortion
    if (Math.abs(1.0 - rawScaleX) < 0.05 && targetText.length > 1) {
      const widthDiff = originalWidth - browserRenderedWidth;
      const calculatedLetterSpacing = widthDiff / (targetText.length - 1);
      return {
        scaleX: 1.0,
        horizontalScaling: 100,
        letterSpacing: Math.round(calculatedLetterSpacing * 1000) / 1000,
      };
    }

    // Otherwise, apply horizontal scaling ratio bounded between 0.5 (50%) and 2.0 (200%)
    const clampedScaleX = Math.max(0.5, Math.min(2.0, rawScaleX));
    return {
      scaleX: Math.round(clampedScaleX * 1000) / 1000,
      horizontalScaling: Math.round(clampedScaleX * 100),
      letterSpacing: 0,
    };
  }

  calculateLineSpacing(prevBaseline: number, currBaseline: number, fontSize: number): number {
    if (!fontSize || fontSize <= 0) return 1.2;
    const deltaY = Math.abs(prevBaseline - currBaseline);
    if (deltaY === 0) return 1.2;
    const ratio = deltaY / fontSize;
    // Standard line height ratio is between 1.0 and 2.5
    return Math.round(Math.max(1.0, Math.min(2.5, ratio)) * 100) / 100;
  }
}

export const typographyEngine = new TypographyEngineServiceImpl();
