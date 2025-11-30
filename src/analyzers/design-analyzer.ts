import type {
  DesignItem,
  DesignTrend,
  AnalysisResult,
  DesignStyle,
  ColorPalette,
} from '../types/index.js';
import { ColorExtractor, type ColorExtractionResult } from './color-extractor.js';

export class DesignAnalyzer {
  private colorExtractor: ColorExtractor;

  constructor() {
    this.colorExtractor = new ColorExtractor();
  }

  async analyzeDesigns(items: DesignItem[]): Promise<AnalysisResult> {
    const styleFrequency = this.calculateStyleFrequency(items);
    const dominantStyles = this.getDominantStyles(styleFrequency);
    const allColors = items.flatMap(item => item.colors);
    const colorAnalysis = this.analyzeColors(allColors);
    const layoutPatterns = this.identifyLayoutPatterns(items);
    const typographyPatterns = this.identifyTypographyPatterns(items);
    const interactionPatterns = this.identifyInteractionPatterns(items);

    return {
      dominantStyles,
      colorAnalysis,
      layoutPatterns,
      typographyPatterns,
      interactionPatterns,
      accessibilityScore: this.calculateAccessibilityScore(colorAnalysis),
      modernityScore: this.calculateModernityScore(dominantStyles),
      uniquenessScore: this.calculateUniquenessScore(items),
    };
  }

  async identifyTrends(items: DesignItem[]): Promise<DesignTrend[]> {
    const styleGroups = this.groupByStyle(items);
    const trends: DesignTrend[] = [];

    for (const [style, styleItems] of Object.entries(styleGroups)) {
      if (styleItems.length >= 3) {
        trends.push({
          name: this.formatTrendName(style as DesignStyle),
          description: this.getTrendDescription(style as DesignStyle),
          examples: styleItems.slice(0, 5),
          popularity: this.calculateTrendPopularity(styleItems, items.length),
          emerging: this.isEmergingTrend(styleItems),
          relatedStyles: this.getRelatedStyles(style as DesignStyle),
          keyCharacteristics: this.getTrendCharacteristics(style as DesignStyle),
        });
      }
    }

    return trends.sort((a, b) => b.popularity - a.popularity);
  }

  generateColorPalette(items: DesignItem[]): ColorPalette {
    const allColors = items.flatMap(item => item.colors);
    const colorFrequency = this.calculateColorFrequency(allColors);
    const sortedColors = Object.entries(colorFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([color]) => color);

    // Generate a harmonious palette based on collected colors
    const dominantColor = sortedColors[0] || '#3B82F6';
    const secondaryColor = sortedColors[1] || this.generateComplementary(dominantColor);
    const accentColor = sortedColors[2] || this.generateAccent(dominantColor);

    return {
      primary: dominantColor,
      secondary: secondaryColor,
      accent: accentColor,
      background: this.generateBackground(dominantColor),
      surface: this.generateSurface(dominantColor),
      text: this.generateTextColor(dominantColor),
      textSecondary: this.generateSecondaryTextColor(dominantColor),
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      additionalColors: sortedColors.slice(3, 8),
    };
  }

  /**
   * Extract colors from design item images
   */
  async extractColorsFromImages(items: DesignItem[]): Promise<ColorExtractionResult> {
    const imageUrls = items
      .flatMap(item => item.imageUrls)
      .filter(url => url && url.startsWith('http'))
      .slice(0, 10); // Limit to first 10 images

    if (imageUrls.length === 0) {
      return this.colorExtractor.extractFromMultiple([]);
    }

    return this.colorExtractor.extractFromMultiple(imageUrls);
  }

  /**
   * Generate color palette from images
   */
  async generateColorPaletteFromImages(items: DesignItem[]): Promise<ColorPalette> {
    const result = await this.extractColorsFromImages(items);
    return result.palette;
  }

  /**
   * Enhanced analysis with image color extraction
   */
  async analyzeDesignsWithImages(items: DesignItem[]): Promise<AnalysisResult & { imageColorAnalysis?: ColorExtractionResult }> {
    const baseAnalysis = await this.analyzeDesigns(items);

    // Try to extract colors from images
    try {
      const imageColorAnalysis = await this.extractColorsFromImages(items);

      // Enhance color analysis with image-extracted colors
      if (imageColorAnalysis.dominantColors.length > 0) {
        baseAnalysis.colorAnalysis.dominantColors = [
          ...imageColorAnalysis.dominantColors.map(c => c.hex),
          ...baseAnalysis.colorAnalysis.dominantColors,
        ].slice(0, 10);

        baseAnalysis.colorAnalysis.colorHarmony = imageColorAnalysis.colorHarmony;
      }

      return {
        ...baseAnalysis,
        imageColorAnalysis,
      };
    } catch (error) {
      console.error('Error extracting colors from images:', error);
      return baseAnalysis;
    }
  }

  private calculateStyleFrequency(items: DesignItem[]): Record<DesignStyle, number> {
    const frequency: Partial<Record<DesignStyle, number>> = {};

    for (const item of items) {
      for (const style of item.styles) {
        frequency[style] = (frequency[style] || 0) + 1;
      }
    }

    return frequency as Record<DesignStyle, number>;
  }

  private getDominantStyles(frequency: Record<DesignStyle, number>): DesignStyle[] {
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([style]) => style as DesignStyle);
  }

  private analyzeColors(colors: string[]): AnalysisResult['colorAnalysis'] {
    const frequency = this.calculateColorFrequency(colors);
    const dominantColors = Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([color]) => color);

    return {
      dominantColors,
      colorHarmony: this.determineColorHarmony(dominantColors),
      contrastRatio: this.calculateAverageContrast(dominantColors),
    };
  }

  private calculateColorFrequency(colors: string[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    for (const color of colors) {
      const normalized = color.toLowerCase();
      frequency[normalized] = (frequency[normalized] || 0) + 1;
    }
    return frequency;
  }

  private determineColorHarmony(colors: string[]): string {
    if (colors.length < 2) return 'monochromatic';

    // Simplified harmony detection
    const hues = colors.map(c => this.hexToHsl(c).h);
    const hueDiffs = [];

    for (let i = 1; i < hues.length; i++) {
      hueDiffs.push(Math.abs(hues[i] - hues[0]));
    }

    const avgDiff = hueDiffs.reduce((a, b) => a + b, 0) / hueDiffs.length;

    if (avgDiff < 30) return 'analogous';
    if (avgDiff > 150 && avgDiff < 210) return 'complementary';
    if (avgDiff > 110 && avgDiff < 130) return 'triadic';

    return 'custom';
  }

  private calculateAverageContrast(colors: string[]): number {
    if (colors.length < 2) return 1;

    // Simplified contrast calculation
    const luminances = colors.map(c => this.getRelativeLuminance(c));
    const maxL = Math.max(...luminances);
    const minL = Math.min(...luminances);

    return (maxL + 0.05) / (minL + 0.05);
  }

  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const rgb = this.hexToRgb(hex);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

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

    return { h, s: s * 100, l: l * 100 };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0 };

    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  private getRelativeLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private generateComplementary(hex: string): string {
    const hsl = this.hexToHsl(hex);
    hsl.h = (hsl.h + 180) % 360;
    return this.hslToHex(hsl.h, hsl.s, hsl.l);
  }

  private generateAccent(hex: string): string {
    const hsl = this.hexToHsl(hex);
    hsl.h = (hsl.h + 30) % 360;
    hsl.s = Math.min(100, hsl.s + 20);
    return this.hslToHex(hsl.h, hsl.s, hsl.l);
  }

  private generateBackground(hex: string): string {
    const hsl = this.hexToHsl(hex);
    hsl.s = Math.max(0, hsl.s - 80);
    hsl.l = 98;
    return this.hslToHex(hsl.h, hsl.s, hsl.l);
  }

  private generateSurface(hex: string): string {
    const hsl = this.hexToHsl(hex);
    hsl.s = Math.max(0, hsl.s - 70);
    hsl.l = 95;
    return this.hslToHex(hsl.h, hsl.s, hsl.l);
  }

  private generateTextColor(hex: string): string {
    const luminance = this.getRelativeLuminance(hex);
    return luminance > 0.5 ? '#111827' : '#F9FAFB';
  }

  private generateSecondaryTextColor(hex: string): string {
    const luminance = this.getRelativeLuminance(hex);
    return luminance > 0.5 ? '#6B7280' : '#9CA3AF';
  }

  private hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };

    return `#${f(0)}${f(8)}${f(4)}`;
  }

  private identifyLayoutPatterns(items: DesignItem[]): string[] {
    const patterns: string[] = [];
    const tags = items.flatMap(i => i.tags.map(t => t.toLowerCase()));

    if (tags.some(t => t.includes('grid') || t.includes('bento'))) {
      patterns.push('Bento Grid Layout');
    }
    if (tags.some(t => t.includes('card'))) {
      patterns.push('Card-based Layout');
    }
    if (tags.some(t => t.includes('hero') || t.includes('landing'))) {
      patterns.push('Hero Section with CTA');
    }
    if (tags.some(t => t.includes('sidebar'))) {
      patterns.push('Sidebar Navigation');
    }
    if (tags.some(t => t.includes('split') || t.includes('two-column'))) {
      patterns.push('Split Screen Layout');
    }

    return patterns.length ? patterns : ['Flexible Grid System', 'Component-based Layout'];
  }

  private identifyTypographyPatterns(items: DesignItem[]): string[] {
    return [
      'Large display headings (48-72px)',
      'Variable font weights for hierarchy',
      'Generous line-height (1.5-1.75)',
      'Sans-serif for UI, serif for editorial',
    ];
  }

  private identifyInteractionPatterns(items: DesignItem[]): string[] {
    return [
      'Micro-interactions on hover',
      'Smooth page transitions',
      'Skeleton loading states',
      'Haptic feedback (mobile)',
      'Scroll-triggered animations',
    ];
  }

  private calculateAccessibilityScore(colorAnalysis: AnalysisResult['colorAnalysis']): number {
    // Score based on contrast ratio (WCAG recommends 4.5:1 for normal text)
    const contrast = colorAnalysis.contrastRatio;
    if (contrast >= 7) return 100;
    if (contrast >= 4.5) return 80;
    if (contrast >= 3) return 60;
    return 40;
  }

  private calculateModernityScore(styles: DesignStyle[]): number {
    const modernStyles: DesignStyle[] = ['glassmorphism', 'bento', 'dark-mode', '3d', 'gradient'];
    const modernCount = styles.filter(s => modernStyles.includes(s)).length;
    return Math.min(100, (modernCount / styles.length) * 100 + 50);
  }

  private calculateUniquenessScore(items: DesignItem[]): number {
    const uniqueStyles = new Set(items.flatMap(i => i.styles));
    const uniqueTags = new Set(items.flatMap(i => i.tags));
    return Math.min(100, (uniqueStyles.size * 10) + (uniqueTags.size * 2));
  }

  private groupByStyle(items: DesignItem[]): Record<string, DesignItem[]> {
    const groups: Record<string, DesignItem[]> = {};

    for (const item of items) {
      for (const style of item.styles) {
        if (!groups[style]) {
          groups[style] = [];
        }
        groups[style].push(item);
      }
    }

    return groups;
  }

  private formatTrendName(style: DesignStyle): string {
    const names: Record<DesignStyle, string> = {
      'minimalist': 'Minimalist Design',
      'brutalist': 'Neo-Brutalism',
      'glassmorphism': 'Glassmorphism',
      'neumorphism': 'Neumorphism',
      'bento': 'Bento Grid',
      'dark-mode': 'Dark Mode',
      'gradient': 'Gradient Design',
      '3d': '3D & Immersive',
      'illustration': 'Custom Illustrations',
      'typography-focused': 'Typography-First',
      'organic': 'Organic Shapes',
      'geometric': 'Geometric Patterns',
    };
    return names[style] || style;
  }

  private getTrendDescription(style: DesignStyle): string {
    const descriptions: Record<DesignStyle, string> = {
      'minimalist': 'Clean, uncluttered design focusing on essential elements with ample white space.',
      'brutalist': 'Raw, bold aesthetics with unconventional layouts and stark contrasts.',
      'glassmorphism': 'Frosted glass effects with transparency, blur, and vivid backgrounds.',
      'neumorphism': 'Soft, extruded plastic look with subtle shadows creating 3D depth.',
      'bento': 'Grid-based layouts inspired by Japanese bento boxes with varied card sizes.',
      'dark-mode': 'Dark backgrounds with careful contrast for reduced eye strain.',
      'gradient': 'Smooth color transitions creating depth and visual interest.',
      '3d': 'Three-dimensional elements and immersive visual experiences.',
      'illustration': 'Custom hand-drawn or vector illustrations adding personality.',
      'typography-focused': 'Typography as the primary design element with expressive fonts.',
      'organic': 'Flowing, natural shapes and curved forms.',
      'geometric': 'Precise geometric shapes and mathematical patterns.',
    };
    return descriptions[style] || 'A trending design style.';
  }

  private calculateTrendPopularity(styleItems: DesignItem[], totalItems: number): number {
    const percentage = (styleItems.length / totalItems) * 100;
    const avgLikes = styleItems.reduce((sum, item) => sum + (item.likes || 0), 0) / styleItems.length;

    // Combine frequency and engagement
    return Math.min(100, percentage * 2 + (avgLikes > 1000 ? 20 : avgLikes > 100 ? 10 : 0));
  }

  private isEmergingTrend(items: DesignItem[]): boolean {
    // Check if most items are recent (within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentItems = items.filter(item => item.collectedAt > thirtyDaysAgo);
    return recentItems.length / items.length > 0.6;
  }

  private getRelatedStyles(style: DesignStyle): DesignStyle[] {
    const relations: Record<DesignStyle, DesignStyle[]> = {
      'minimalist': ['typography-focused', 'geometric'],
      'brutalist': ['typography-focused', 'geometric'],
      'glassmorphism': ['gradient', 'dark-mode'],
      'neumorphism': ['minimalist', 'organic'],
      'bento': ['minimalist', 'geometric'],
      'dark-mode': ['glassmorphism', 'gradient'],
      'gradient': ['3d', 'glassmorphism'],
      '3d': ['gradient', 'illustration'],
      'illustration': ['organic', 'gradient'],
      'typography-focused': ['minimalist', 'brutalist'],
      'organic': ['illustration', 'gradient'],
      'geometric': ['minimalist', 'bento'],
    };
    return relations[style] || [];
  }

  private getTrendCharacteristics(style: DesignStyle): string[] {
    const characteristics: Record<DesignStyle, string[]> = {
      'minimalist': ['White space', 'Limited color palette', 'Simple typography', 'Essential elements only'],
      'brutalist': ['Bold typography', 'High contrast', 'Unconventional layouts', 'Raw aesthetics'],
      'glassmorphism': ['Background blur', 'Transparency', 'Vivid colors', 'Floating elements'],
      'neumorphism': ['Soft shadows', 'Subtle gradients', 'Extruded appearance', 'Light backgrounds'],
      'bento': ['Grid-based', 'Varied card sizes', 'Content organization', 'Visual hierarchy'],
      'dark-mode': ['Dark backgrounds', 'Accent colors', 'Reduced brightness', 'High contrast text'],
      'gradient': ['Color transitions', 'Depth creation', 'Modern feel', 'Eye-catching elements'],
      '3d': ['Depth perception', 'Interactive elements', 'Realistic shadows', 'Immersive experience'],
      'illustration': ['Custom artwork', 'Brand personality', 'Storytelling', 'Unique identity'],
      'typography-focused': ['Large headlines', 'Expressive fonts', 'Text as design', 'Minimal imagery'],
      'organic': ['Curved shapes', 'Natural forms', 'Flowing lines', 'Soft edges'],
      'geometric': ['Sharp edges', 'Mathematical patterns', 'Precise shapes', 'Structured layouts'],
    };
    return characteristics[style] || [];
  }
}
