import type { DesignItem, CollectorConfig, DesignCategory, DesignStyle, DesignSource } from '../types/index.js';
import { BaseCollector } from './base-collector.js';

/**
 * A collector that uses web search APIs instead of direct scraping.
 * This is designed to work with Claude Code's WebSearch tool.
 */
export class WebSearchCollector extends BaseCollector {
  constructor() {
    super('dribbble', 'https://dribbble.com');
  }

  /**
   * Generate search queries for design collection
   */
  generateSearchQueries(config: CollectorConfig): string[] {
    const queries: string[] = [];
    const categories = config.categories || ['web'];
    const styles = config.styles || [];

    for (const category of categories) {
      const categoryName = this.categoryToSearchTerm(category);

      // Base query
      queries.push(`${categoryName} UI design inspiration 2024`);

      // Source-specific queries
      for (const source of config.sources) {
        queries.push(`site:${this.getSourceDomain(source)} ${categoryName} design`);
      }

      // Style-specific queries
      for (const style of styles) {
        queries.push(`${categoryName} ${style} design trend`);
      }
    }

    // Search query if provided
    if (config.searchQuery) {
      queries.unshift(`${config.searchQuery} UI design`);
      queries.unshift(`${config.searchQuery} app design inspiration`);
    }

    return queries.slice(0, 5); // Limit to top 5 queries
  }

  private categoryToSearchTerm(category: DesignCategory): string {
    const mapping: Record<DesignCategory, string> = {
      'web': 'web app',
      'mobile-ios': 'iOS mobile app',
      'mobile-android': 'Android mobile app',
      'dashboard': 'dashboard admin panel',
      'landing-page': 'landing page',
      'e-commerce': 'e-commerce online store',
      'saas': 'SaaS platform',
      'portfolio': 'portfolio website',
      'social': 'social media app',
      'fintech': 'fintech banking app',
      'healthcare': 'healthcare medical app',
      'education': 'education learning app',
    };
    return mapping[category] || category;
  }

  private getSourceDomain(source: DesignSource): string {
    const domains: Record<DesignSource, string> = {
      'dribbble': 'dribbble.com',
      'behance': 'behance.net',
      'awwwards': 'awwwards.com',
      'appstore': 'apps.apple.com',
      'playstore': 'play.google.com',
      'cssawards': 'cssawards.net',
      'siteinspire': 'siteinspire.com',
      'mobbin': 'mobbin.com',
    };
    return domains[source];
  }

  /**
   * Parse design items from search results
   * This method is designed to be used with data from Claude's WebSearch
   */
  parseSearchResults(results: SearchResult[], config: CollectorConfig): DesignItem[] {
    return results.map((result, index) => ({
      id: this.generateId(),
      title: result.title,
      description: result.description || '',
      source: this.detectSource(result.url),
      sourceUrl: result.url,
      imageUrls: result.imageUrl ? [result.imageUrl] : [],
      thumbnailUrl: result.imageUrl,
      category: config.categories?.[0] || 'web',
      styles: this.inferStylesFromText(result.title + ' ' + (result.description || '')),
      colors: [],
      tags: this.extractTags(result.title, result.description),
      collectedAt: new Date(),
      metadata: {
        searchRank: index + 1,
      },
    }));
  }

  private detectSource(url: string): DesignSource {
    if (url.includes('dribbble.com')) return 'dribbble';
    if (url.includes('behance.net')) return 'behance';
    if (url.includes('awwwards.com')) return 'awwwards';
    if (url.includes('mobbin.com')) return 'mobbin';
    if (url.includes('apps.apple.com')) return 'appstore';
    if (url.includes('play.google.com')) return 'playstore';
    if (url.includes('cssawards')) return 'cssawards';
    if (url.includes('siteinspire')) return 'siteinspire';
    return 'dribbble'; // Default
  }

  private inferStylesFromText(text: string): DesignStyle[] {
    const styles: DesignStyle[] = [];
    const lowerText = text.toLowerCase();

    const styleKeywords: Record<DesignStyle, string[]> = {
      'minimalist': ['minimal', 'minimalist', 'clean', 'simple', 'whitespace'],
      'brutalist': ['brutalist', 'brutal', 'raw', 'bold'],
      'glassmorphism': ['glass', 'glassmorphism', 'blur', 'frosted', 'transparent'],
      'neumorphism': ['neumorphism', 'neumorphic', 'soft ui'],
      'bento': ['bento', 'grid layout', 'card grid'],
      'dark-mode': ['dark', 'dark mode', 'night', 'black'],
      'gradient': ['gradient', 'colorful', 'vibrant'],
      '3d': ['3d', 'three-dimensional', 'webgl', 'immersive'],
      'illustration': ['illustration', 'illustrated', 'hand-drawn', 'custom graphics'],
      'typography-focused': ['typography', 'type-driven', 'editorial'],
      'organic': ['organic', 'natural', 'flowing', 'curves'],
      'geometric': ['geometric', 'shapes', 'angular', 'pattern'],
    };

    for (const [style, keywords] of Object.entries(styleKeywords)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        styles.push(style as DesignStyle);
      }
    }

    return styles.length ? styles : ['minimalist'];
  }

  private extractTags(title: string, description?: string): string[] {
    const text = `${title} ${description || ''}`.toLowerCase();
    const tags: string[] = [];

    // Common design-related keywords
    const keywords = [
      'ui', 'ux', 'mobile', 'web', 'app', 'dashboard', 'landing',
      'responsive', 'animation', 'interaction', 'prototype',
      'saas', 'fintech', 'ecommerce', 'social', 'healthcare'
    ];

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    }

    return tags.slice(0, 5);
  }

  // Required by base class but not used directly
  async collect(_config: CollectorConfig): Promise<DesignItem[]> {
    console.log('WebSearchCollector: Use generateSearchQueries() with Claude\'s WebSearch tool');
    return [];
  }

  async search(_query: string, _config?: Partial<CollectorConfig>): Promise<DesignItem[]> {
    console.log('WebSearchCollector: Use generateSearchQueries() with Claude\'s WebSearch tool');
    return [];
  }
}

export interface SearchResult {
  title: string;
  url: string;
  description?: string;
  imageUrl?: string;
}

/**
 * Helper function to create sample/demo design items for testing
 */
export function createSampleDesignItems(category: DesignCategory): DesignItem[] {
  const samples: DesignItem[] = [
    {
      id: 'sample-1',
      title: 'Modern Dashboard Design',
      description: 'Clean admin dashboard with data visualization',
      source: 'dribbble',
      sourceUrl: 'https://dribbble.com/shots/dashboard-design',
      imageUrls: ['https://example.com/dashboard.png'],
      category: 'dashboard',
      styles: ['minimalist', 'dark-mode'],
      colors: ['#6366F1', '#1F2937', '#F9FAFB'],
      tags: ['dashboard', 'admin', 'analytics'],
      likes: 1500,
      collectedAt: new Date(),
    },
    {
      id: 'sample-2',
      title: 'Fintech Mobile App UI',
      description: 'Banking app with glassmorphism effects',
      source: 'mobbin',
      sourceUrl: 'https://mobbin.com/apps/fintech',
      imageUrls: ['https://example.com/fintech.png'],
      category: 'mobile-ios',
      styles: ['glassmorphism', 'gradient'],
      colors: ['#3B82F6', '#8B5CF6', '#FFFFFF'],
      tags: ['fintech', 'mobile', 'banking'],
      likes: 2300,
      collectedAt: new Date(),
    },
    {
      id: 'sample-3',
      title: 'Landing Page Hero Section',
      description: 'SaaS landing page with bold typography',
      source: 'awwwards',
      sourceUrl: 'https://awwwards.com/sites/saas-landing',
      imageUrls: ['https://example.com/landing.png'],
      category: 'landing-page',
      styles: ['typography-focused', 'minimalist'],
      colors: ['#111827', '#F59E0B', '#F9FAFB'],
      tags: ['landing', 'saas', 'hero'],
      likes: 890,
      collectedAt: new Date(),
    },
    {
      id: 'sample-4',
      title: 'E-commerce Product Grid',
      description: 'Bento-style product showcase',
      source: 'behance',
      sourceUrl: 'https://behance.net/gallery/ecommerce',
      imageUrls: ['https://example.com/ecommerce.png'],
      category: 'e-commerce',
      styles: ['bento', 'minimalist'],
      colors: ['#10B981', '#374151', '#FFFFFF'],
      tags: ['ecommerce', 'product', 'grid'],
      likes: 1200,
      collectedAt: new Date(),
    },
    {
      id: 'sample-5',
      title: 'Health App Onboarding',
      description: 'Wellness app with organic shapes',
      source: 'mobbin',
      sourceUrl: 'https://mobbin.com/apps/health',
      imageUrls: ['https://example.com/health.png'],
      category: 'healthcare',
      styles: ['organic', 'illustration'],
      colors: ['#14B8A6', '#FCD34D', '#F0FDF4'],
      tags: ['health', 'onboarding', 'wellness'],
      likes: 780,
      collectedAt: new Date(),
    },
  ];

  // Filter by category if specified
  if (category !== 'web') {
    return samples.filter(s =>
      s.category === category ||
      s.tags.some(t => t.includes(category.split('-')[0]))
    );
  }

  return samples;
}
