import sharp from 'sharp';
import type { ColorPalette } from '../types/index.js';

export interface ExtractedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  frequency: number;
  name?: string;
}

export interface ColorExtractionResult {
  dominantColors: ExtractedColor[];
  palette: ColorPalette;
  colorHarmony: 'complementary' | 'analogous' | 'triadic' | 'monochromatic' | 'custom';
  brightness: 'light' | 'dark' | 'mixed';
  saturation: 'vibrant' | 'muted' | 'mixed';
}

export class ColorExtractor {
  private colorBucketSize: number;

  constructor(colorBucketSize: number = 16) {
    this.colorBucketSize = colorBucketSize;
  }

  /**
   * Extract colors from an image URL
   */
  async extractFromUrl(imageUrl: string): Promise<ColorExtractionResult> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      return this.extractFromBuffer(buffer);
    } catch (error) {
      console.error(`Error extracting colors from URL: ${imageUrl}`, error);
      return this.getDefaultResult();
    }
  }

  /**
   * Extract colors from an image buffer
   */
  async extractFromBuffer(buffer: Buffer): Promise<ColorExtractionResult> {
    try {
      // Resize image for faster processing
      const { data, info } = await sharp(buffer)
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const colors = this.quantizeColors(data, info.channels);
      const dominantColors = this.getDominantColors(colors, 10);
      const palette = this.generatePalette(dominantColors);
      const colorHarmony = this.detectColorHarmony(dominantColors);
      const brightness = this.detectBrightness(dominantColors);
      const saturation = this.detectSaturation(dominantColors);

      return {
        dominantColors,
        palette,
        colorHarmony,
        brightness,
        saturation,
      };
    } catch (error) {
      console.error('Error extracting colors from buffer:', error);
      return this.getDefaultResult();
    }
  }

  /**
   * Extract colors from a local file
   */
  async extractFromFile(filePath: string): Promise<ColorExtractionResult> {
    try {
      const { data, info } = await sharp(filePath)
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const colors = this.quantizeColors(data, info.channels);
      const dominantColors = this.getDominantColors(colors, 10);
      const palette = this.generatePalette(dominantColors);
      const colorHarmony = this.detectColorHarmony(dominantColors);
      const brightness = this.detectBrightness(dominantColors);
      const saturation = this.detectSaturation(dominantColors);

      return {
        dominantColors,
        palette,
        colorHarmony,
        brightness,
        saturation,
      };
    } catch (error) {
      console.error('Error extracting colors from file:', error);
      return this.getDefaultResult();
    }
  }

  /**
   * Extract colors from multiple images and aggregate
   */
  async extractFromMultiple(sources: Array<string | Buffer>): Promise<ColorExtractionResult> {
    const allColors: ExtractedColor[] = [];

    for (const source of sources) {
      try {
        let result: ColorExtractionResult;
        if (typeof source === 'string') {
          if (source.startsWith('http')) {
            result = await this.extractFromUrl(source);
          } else {
            result = await this.extractFromFile(source);
          }
        } else {
          result = await this.extractFromBuffer(source);
        }
        allColors.push(...result.dominantColors);
      } catch (error) {
        console.error('Error processing source:', error);
      }
    }

    // Aggregate and re-rank colors
    const aggregated = this.aggregateColors(allColors);
    const dominantColors = aggregated.slice(0, 10);
    const palette = this.generatePalette(dominantColors);
    const colorHarmony = this.detectColorHarmony(dominantColors);
    const brightness = this.detectBrightness(dominantColors);
    const saturation = this.detectSaturation(dominantColors);

    return {
      dominantColors,
      palette,
      colorHarmony,
      brightness,
      saturation,
    };
  }

  /**
   * Quantize colors using color bucketing
   */
  private quantizeColors(data: Buffer, channels: number): Map<string, number> {
    const colorMap = new Map<string, number>();
    const bucketSize = this.colorBucketSize;

    for (let i = 0; i < data.length; i += channels) {
      const r = Math.floor(data[i] / bucketSize) * bucketSize;
      const g = Math.floor(data[i + 1] / bucketSize) * bucketSize;
      const b = Math.floor(data[i + 2] / bucketSize) * bucketSize;

      // Skip very dark or very light colors
      const brightness = (r + g + b) / 3;
      if (brightness < 10 || brightness > 245) continue;

      const key = `${r},${g},${b}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    return colorMap;
  }

  /**
   * Get dominant colors from quantized color map
   */
  private getDominantColors(colorMap: Map<string, number>, count: number): ExtractedColor[] {
    const totalPixels = Array.from(colorMap.values()).reduce((a, b) => a + b, 0);

    const colors = Array.from(colorMap.entries())
      .map(([key, frequency]) => {
        const [r, g, b] = key.split(',').map(Number);
        const hex = this.rgbToHex(r, g, b);
        const hsl = this.rgbToHsl(r, g, b);

        return {
          hex,
          rgb: { r, g, b },
          hsl,
          frequency: frequency / totalPixels,
          name: this.getColorName(hsl),
        };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, count);

    // Ensure color diversity
    return this.ensureDiversity(colors, count);
  }

  /**
   * Ensure extracted colors are diverse
   */
  private ensureDiversity(colors: ExtractedColor[], count: number): ExtractedColor[] {
    if (colors.length <= 1) return colors;

    const diverse: ExtractedColor[] = [colors[0]];
    const minHueDiff = 30;

    for (let i = 1; i < colors.length && diverse.length < count; i++) {
      const color = colors[i];
      const isDiverse = diverse.every(existing => {
        const hueDiff = Math.abs(color.hsl.h - existing.hsl.h);
        const adjustedDiff = Math.min(hueDiff, 360 - hueDiff);
        return adjustedDiff > minHueDiff || Math.abs(color.hsl.l - existing.hsl.l) > 20;
      });

      if (isDiverse) {
        diverse.push(color);
      }
    }

    // Fill remaining slots if needed
    for (const color of colors) {
      if (diverse.length >= count) break;
      if (!diverse.includes(color)) {
        diverse.push(color);
      }
    }

    return diverse;
  }

  /**
   * Aggregate colors from multiple sources
   */
  private aggregateColors(colors: ExtractedColor[]): ExtractedColor[] {
    const colorMap = new Map<string, { color: ExtractedColor; totalFreq: number; count: number }>();

    for (const color of colors) {
      // Find similar colors (within 20 hue degrees)
      let found = false;
      for (const [key, existing] of colorMap.entries()) {
        const hueDiff = Math.abs(color.hsl.h - existing.color.hsl.h);
        const adjustedDiff = Math.min(hueDiff, 360 - hueDiff);
        if (adjustedDiff < 20 && Math.abs(color.hsl.s - existing.color.hsl.s) < 20) {
          existing.totalFreq += color.frequency;
          existing.count += 1;
          found = true;
          break;
        }
      }

      if (!found) {
        colorMap.set(color.hex, { color, totalFreq: color.frequency, count: 1 });
      }
    }

    return Array.from(colorMap.values())
      .map(({ color, totalFreq, count }) => ({
        ...color,
        frequency: totalFreq / count,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Generate a full color palette from dominant colors
   */
  private generatePalette(colors: ExtractedColor[]): ColorPalette {
    if (colors.length === 0) {
      return this.getDefaultPalette();
    }

    // Sort by saturation and lightness to pick appropriate roles
    const sorted = [...colors].sort((a, b) => b.hsl.s - a.hsl.s);
    const primary = sorted[0] || colors[0];
    const secondary = this.findSecondary(colors, primary);
    const accent = this.findAccent(colors, primary, secondary);

    // Determine if design is light or dark
    const avgLightness = colors.reduce((sum, c) => sum + c.hsl.l, 0) / colors.length;
    const isDark = avgLightness < 50;

    return {
      primary: primary.hex,
      secondary: secondary.hex,
      accent: accent.hex,
      background: isDark ? '#0F172A' : '#FFFFFF',
      surface: isDark ? '#1E293B' : '#F8FAFC',
      text: isDark ? '#F1F5F9' : '#0F172A',
      textSecondary: isDark ? '#94A3B8' : '#64748B',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      additionalColors: colors.slice(3, 8).map(c => c.hex),
    };
  }

  private findSecondary(colors: ExtractedColor[], primary: ExtractedColor): ExtractedColor {
    // Look for complementary or analogous color
    for (const color of colors) {
      if (color === primary) continue;
      const hueDiff = Math.abs(color.hsl.h - primary.hsl.h);
      const adjustedDiff = Math.min(hueDiff, 360 - hueDiff);

      // Prefer analogous (30-60 degrees) or complementary (150-210 degrees)
      if ((adjustedDiff >= 30 && adjustedDiff <= 60) || (adjustedDiff >= 150 && adjustedDiff <= 210)) {
        return color;
      }
    }
    return colors[1] || primary;
  }

  private findAccent(colors: ExtractedColor[], primary: ExtractedColor, secondary: ExtractedColor): ExtractedColor {
    // Look for a vibrant, distinct color
    for (const color of colors) {
      if (color === primary || color === secondary) continue;
      if (color.hsl.s > 50) {
        return color;
      }
    }
    return colors[2] || secondary;
  }

  /**
   * Detect color harmony type
   */
  private detectColorHarmony(colors: ExtractedColor[]): ColorExtractionResult['colorHarmony'] {
    if (colors.length < 2) return 'monochromatic';

    const hues = colors.slice(0, 5).map(c => c.hsl.h);
    const hueDiffs: number[] = [];

    for (let i = 1; i < hues.length; i++) {
      const diff = Math.abs(hues[i] - hues[0]);
      hueDiffs.push(Math.min(diff, 360 - diff));
    }

    const avgDiff = hueDiffs.reduce((a, b) => a + b, 0) / hueDiffs.length;

    if (avgDiff < 30) return 'monochromatic';
    if (avgDiff >= 150 && avgDiff <= 210) return 'complementary';
    if (avgDiff >= 30 && avgDiff <= 60) return 'analogous';
    if (hueDiffs.some(d => d >= 110 && d <= 130)) return 'triadic';

    return 'custom';
  }

  /**
   * Detect overall brightness
   */
  private detectBrightness(colors: ExtractedColor[]): ColorExtractionResult['brightness'] {
    const avgLightness = colors.reduce((sum, c) => sum + c.hsl.l, 0) / colors.length;

    if (avgLightness < 35) return 'dark';
    if (avgLightness > 65) return 'light';
    return 'mixed';
  }

  /**
   * Detect overall saturation
   */
  private detectSaturation(colors: ExtractedColor[]): ColorExtractionResult['saturation'] {
    const avgSaturation = colors.reduce((sum, c) => sum + c.hsl.s, 0) / colors.length;

    if (avgSaturation > 60) return 'vibrant';
    if (avgSaturation < 30) return 'muted';
    return 'mixed';
  }

  /**
   * Convert RGB to HEX
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  /**
   * Convert RGB to HSL
   */
  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
          break;
        case g:
          h = ((b - r) / d + 2) * 60;
          break;
        case b:
          h = ((r - g) / d + 4) * 60;
          break;
      }
    }

    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  /**
   * Get a simple color name based on HSL
   */
  private getColorName(hsl: { h: number; s: number; l: number }): string {
    if (hsl.s < 10) {
      if (hsl.l < 20) return 'black';
      if (hsl.l > 80) return 'white';
      return 'gray';
    }

    const hue = hsl.h;
    if (hue < 15 || hue >= 345) return 'red';
    if (hue < 45) return 'orange';
    if (hue < 75) return 'yellow';
    if (hue < 150) return 'green';
    if (hue < 210) return 'cyan';
    if (hue < 270) return 'blue';
    if (hue < 315) return 'purple';
    return 'pink';
  }

  /**
   * Default result when extraction fails
   */
  private getDefaultResult(): ColorExtractionResult {
    return {
      dominantColors: [],
      palette: this.getDefaultPalette(),
      colorHarmony: 'custom',
      brightness: 'mixed',
      saturation: 'mixed',
    };
  }

  /**
   * Default palette
   */
  private getDefaultPalette(): ColorPalette {
    return {
      primary: '#6366F1',
      secondary: '#8B5CF6',
      accent: '#14B8A6',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      text: '#0F172A',
      textSecondary: '#64748B',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      additionalColors: [],
    };
  }
}
