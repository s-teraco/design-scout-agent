import { z } from 'zod';

export const DesignSourceSchema = z.enum([
  'dribbble',
  'behance',
  'awwwards',
  'appstore',
  'playstore',
  'cssawards',
  'siteinspire',
  'mobbin',
]);

export type DesignSource = z.infer<typeof DesignSourceSchema>;

export const DesignCategorySchema = z.enum([
  'web',
  'mobile-ios',
  'mobile-android',
  'dashboard',
  'landing-page',
  'e-commerce',
  'saas',
  'portfolio',
  'social',
  'fintech',
  'healthcare',
  'education',
]);

export type DesignCategory = z.infer<typeof DesignCategorySchema>;

export const DesignStyleSchema = z.enum([
  'minimalist',
  'brutalist',
  'glassmorphism',
  'neumorphism',
  'bento',
  'dark-mode',
  'gradient',
  '3d',
  'illustration',
  'typography-focused',
  'organic',
  'geometric',
]);

export type DesignStyle = z.infer<typeof DesignStyleSchema>;

export interface DesignItem {
  id: string;
  title: string;
  description: string;
  source: DesignSource;
  sourceUrl: string;
  imageUrls: string[];
  thumbnailUrl?: string;
  designer?: string;
  designerUrl?: string;
  category: DesignCategory;
  styles: DesignStyle[];
  colors: string[];
  tags: string[];
  likes?: number;
  views?: number;
  collectedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface DesignTrend {
  name: string;
  description: string;
  examples: DesignItem[];
  popularity: number; // 0-100
  emerging: boolean;
  relatedStyles: DesignStyle[];
  keyCharacteristics: string[];
}

export interface DesignProposal {
  id: string;
  title: string;
  targetCategory: DesignCategory;
  targetPlatform: 'web' | 'ios' | 'android' | 'cross-platform';
  moodboard: MoodboardItem[];
  trends: DesignTrend[];
  colorPalette: ColorPalette;
  typographyRecommendations: TypographyRecommendation[];
  layoutSuggestions: LayoutSuggestion[];
  codeSnippets: CodeSnippet[];
  references: DesignItem[];
  createdAt: Date;
}

export interface MoodboardItem {
  imageUrl: string;
  title: string;
  source: DesignSource;
  relevance: string;
  aspectsToAdopt: string[];
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
  additionalColors: string[];
}

export interface TypographyRecommendation {
  role: 'heading' | 'subheading' | 'body' | 'caption' | 'button';
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
  googleFontsUrl?: string;
}

export interface LayoutSuggestion {
  name: string;
  description: string;
  gridSystem: string;
  breakpoints: Record<string, string>;
  spacing: Record<string, string>;
  componentArrangement: string;
}

export interface CodeSnippet {
  name: string;
  description: string;
  language: 'css' | 'tailwind' | 'scss' | 'styled-components';
  code: string;
  usage: string;
}

export interface CollectorConfig {
  sources: DesignSource[];
  categories?: DesignCategory[];
  styles?: DesignStyle[];
  limit?: number;
  searchQuery?: string;
  sortBy?: 'popular' | 'recent' | 'trending';
}

export interface AnalysisResult {
  dominantStyles: DesignStyle[];
  colorAnalysis: {
    dominantColors: string[];
    colorHarmony: string;
    contrastRatio: number;
  };
  layoutPatterns: string[];
  typographyPatterns: string[];
  interactionPatterns: string[];
  accessibilityScore: number;
  modernityScore: number;
  uniquenessScore: number;
}
