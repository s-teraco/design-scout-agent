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
   * Generate optimized search queries for design collection
   */
  generateSearchQueries(config: CollectorConfig): SearchQuery[] {
    const queries: SearchQuery[] = [];
    const categories = config.categories || ['web'];
    const styles = config.styles || [];
    const year = new Date().getFullYear();

    // Primary search query if provided
    if (config.searchQuery) {
      queries.push({
        query: `${config.searchQuery} UI UX design inspiration ${year}`,
        purpose: 'primary',
        expectedSources: ['dribbble', 'behance', 'awwwards'],
      });
    }

    // Category-specific queries
    for (const category of categories) {
      const categoryTerm = this.categoryToSearchTerm(category);

      // Trending designs query
      queries.push({
        query: `best ${categoryTerm} design ${year} inspiration`,
        purpose: 'trending',
        expectedSources: ['dribbble', 'behance'],
        category,
      });

      // Platform-specific queries
      for (const source of config.sources || ['dribbble', 'awwwards', 'mobbin']) {
        queries.push({
          query: `site:${this.getSourceDomain(source)} ${categoryTerm} ${config.searchQuery || ''}`.trim(),
          purpose: 'source-specific',
          expectedSources: [source],
          category,
        });
      }
    }

    // Style-specific queries
    for (const style of styles) {
      const styleTerm = this.styleToSearchTerm(style);
      queries.push({
        query: `${styleTerm} UI design trend ${year}`,
        purpose: 'style',
        expectedSources: ['dribbble', 'behance', 'awwwards'],
        style,
      });
    }

    // Award-winning designs
    queries.push({
      query: `awwwards site of the day ${year} ${config.searchQuery || categories[0] || ''}`.trim(),
      purpose: 'awards',
      expectedSources: ['awwwards'],
    });

    // Limit and deduplicate
    const seen = new Set<string>();
    return queries.filter(q => {
      if (seen.has(q.query)) return false;
      seen.add(q.query);
      return true;
    }).slice(0, config.limit ? Math.min(8, Math.ceil(config.limit / 5)) : 5);
  }

  /**
   * Generate a prompt for Claude Code to execute web searches
   */
  generateClaudePrompt(config: CollectorConfig): string {
    const queries = this.generateSearchQueries(config);
    const categoryDesc = config.categories?.join(', ') || 'web';
    const styleDesc = config.styles?.join(', ') || 'modern';

    return `
## Design Scout: Web Search Task

Collect design inspiration for: **${config.searchQuery || categoryDesc}**
Target styles: ${styleDesc}

### Search Queries to Execute

${queries.map((q, i) => `${i + 1}. \`${q.query}\`
   - Purpose: ${q.purpose}
   - Expected sources: ${q.expectedSources.join(', ')}`).join('\n\n')}

### Instructions

For each search result, extract:
1. **Title** - The design/project name
2. **URL** - Link to the design
3. **Description** - Brief description of the design
4. **Source** - Which platform (dribbble, behance, awwwards, mobbin, etc.)
5. **Styles** - Detected design styles (minimalist, dark-mode, glassmorphism, etc.)

### Output Format

Return results as JSON array:
\`\`\`json
[
  {
    "title": "Design Title",
    "url": "https://...",
    "description": "Brief description",
    "source": "dribbble",
    "styles": ["minimalist", "dark-mode"],
    "imageUrl": "https://..." // if available
  }
]
\`\`\`

Collect at least ${config.limit || 20} design references.
`;
  }

  private categoryToSearchTerm(category: DesignCategory): string {
    const mapping: Record<DesignCategory, string> = {
      'web': 'web application',
      'mobile-ios': 'iOS mobile app',
      'mobile-android': 'Android mobile app',
      'dashboard': 'dashboard admin panel analytics',
      'landing-page': 'landing page website',
      'e-commerce': 'e-commerce online store shop',
      'saas': 'SaaS platform B2B',
      'portfolio': 'portfolio website creative',
      'social': 'social media app',
      'fintech': 'fintech banking finance app',
      'healthcare': 'healthcare medical wellness app',
      'education': 'education learning platform edtech',
    };
    return mapping[category] || category;
  }

  private styleToSearchTerm(style: DesignStyle): string {
    const mapping: Record<DesignStyle, string> = {
      'minimalist': 'minimalist clean simple',
      'brutalist': 'brutalist neo-brutalism bold',
      'glassmorphism': 'glassmorphism glass blur transparent',
      'neumorphism': 'neumorphism soft UI skeuomorphic',
      'bento': 'bento grid layout cards',
      'dark-mode': 'dark mode dark theme',
      'gradient': 'gradient colorful vibrant',
      '3d': '3D three-dimensional WebGL immersive',
      'illustration': 'illustration custom graphics hand-drawn',
      'typography-focused': 'typography editorial type-driven',
      'organic': 'organic shapes natural flowing',
      'geometric': 'geometric shapes patterns angular',
    };
    return mapping[style] || style;
  }

  private getSourceDomain(source: DesignSource): string {
    const domains: Record<DesignSource, string> = {
      'dribbble': 'dribbble.com',
      'behance': 'behance.net',
      'awwwards': 'awwwards.com',
      'appstore': 'apps.apple.com',
      'playstore': 'play.google.com',
      'cssawards': 'cssdesignawards.com',
      'siteinspire': 'siteinspire.com',
      'mobbin': 'mobbin.com',
      'figma': 'figma.com/community',
      'pinterest': 'pinterest.com',
      'layers': 'layers.to',
      'producthunt': 'producthunt.com',
    };
    return domains[source];
  }

  /**
   * Parse design items from web search results
   */
  parseSearchResults(results: SearchResult[], config: CollectorConfig): DesignItem[] {
    return results
      .filter(r => r.url && r.title)
      .map((result, index) => ({
        id: this.generateId(),
        title: result.title,
        description: result.description || '',
        source: result.source || this.detectSource(result.url),
        sourceUrl: result.url,
        imageUrls: result.imageUrl ? [result.imageUrl] : [],
        thumbnailUrl: result.imageUrl,
        category: config.categories?.[0] || 'web',
        styles: result.styles || this.inferStylesFromText(result.title + ' ' + (result.description || '')),
        colors: result.colors || [],
        tags: this.extractTags(result.title, result.description),
        likes: result.likes,
        collectedAt: new Date(),
        metadata: {
          searchRank: index + 1,
          searchQuery: config.searchQuery,
        },
      }));
  }

  /**
   * Parse results from Claude's WebSearch JSON output
   */
  parseClaudeSearchOutput(jsonOutput: string, config: CollectorConfig): DesignItem[] {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = jsonOutput.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : jsonOutput;

      const results = JSON.parse(jsonStr.trim()) as SearchResult[];
      return this.parseSearchResults(results, config);
    } catch (error) {
      console.error('Failed to parse Claude search output:', error);
      return [];
    }
  }

  private detectSource(url: string): DesignSource {
    const sourceMap: [string, DesignSource][] = [
      ['dribbble.com', 'dribbble'],
      ['behance.net', 'behance'],
      ['awwwards.com', 'awwwards'],
      ['mobbin.com', 'mobbin'],
      ['apps.apple.com', 'appstore'],
      ['play.google.com', 'playstore'],
      ['cssdesignawards', 'cssawards'],
      ['siteinspire', 'siteinspire'],
      ['figma.com', 'figma'],
      ['pinterest.com', 'pinterest'],
      ['layers.to', 'layers'],
      ['producthunt.com', 'producthunt'],
    ];

    for (const [domain, source] of sourceMap) {
      if (url.includes(domain)) return source;
    }
    return 'dribbble';
  }

  private inferStylesFromText(text: string): DesignStyle[] {
    const styles: DesignStyle[] = [];
    const lowerText = text.toLowerCase();

    const styleKeywords: Record<DesignStyle, string[]> = {
      'minimalist': ['minimal', 'minimalist', 'clean', 'simple', 'whitespace', 'sleek'],
      'brutalist': ['brutalist', 'brutal', 'raw', 'bold', 'neo-brutal'],
      'glassmorphism': ['glass', 'glassmorphism', 'blur', 'frosted', 'transparent', 'translucent'],
      'neumorphism': ['neumorphism', 'neumorphic', 'soft ui', 'soft shadow'],
      'bento': ['bento', 'grid layout', 'card grid', 'bento box', 'bento-style'],
      'dark-mode': ['dark', 'dark mode', 'night', 'black', 'dark theme'],
      'gradient': ['gradient', 'colorful', 'vibrant', 'mesh gradient'],
      '3d': ['3d', 'three-dimensional', 'webgl', 'immersive', 'spline'],
      'illustration': ['illustration', 'illustrated', 'hand-drawn', 'custom graphics', 'artwork'],
      'typography-focused': ['typography', 'type-driven', 'editorial', 'kinetic type'],
      'organic': ['organic', 'natural', 'flowing', 'curves', 'blob'],
      'geometric': ['geometric', 'shapes', 'angular', 'pattern', 'abstract'],
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

    const keywords = [
      'ui', 'ux', 'mobile', 'web', 'app', 'dashboard', 'landing',
      'responsive', 'animation', 'interaction', 'prototype', 'design system',
      'saas', 'fintech', 'ecommerce', 'social', 'healthcare', 'ai',
      'startup', 'enterprise', 'b2b', 'b2c', 'marketplace'
    ];

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    }

    return [...new Set(tags)].slice(0, 8);
  }

  // Required by base class
  async collect(config: CollectorConfig): Promise<DesignItem[]> {
    console.log('\n=== Design Scout: Web Search Mode ===\n');
    console.log(this.generateClaudePrompt(config));
    console.log('\n=====================================\n');
    console.log('Copy the above prompt and use with Claude Code WebSearch tool.');
    return [];
  }

  async search(query: string, config?: Partial<CollectorConfig>): Promise<DesignItem[]> {
    return this.collect({
      sources: config?.sources || ['dribbble', 'awwwards', 'mobbin'],
      searchQuery: query,
      ...config,
    });
  }
}

export interface SearchQuery {
  query: string;
  purpose: 'primary' | 'trending' | 'source-specific' | 'style' | 'awards';
  expectedSources: DesignSource[];
  category?: DesignCategory;
  style?: DesignStyle;
}

export interface SearchResult {
  title: string;
  url: string;
  description?: string;
  imageUrl?: string;
  source?: DesignSource;
  styles?: DesignStyle[];
  colors?: string[];
  likes?: number;
}

/**
 * Helper to create sample design items for testing/demo
 */
export function createSampleDesignItems(category: DesignCategory, count: number = 10): DesignItem[] {
  const templates: Partial<DesignItem>[] = [
    {
      title: 'Modern Dashboard Design',
      description: 'Clean admin dashboard with data visualization and dark mode',
      source: 'dribbble',
      styles: ['minimalist', 'dark-mode'],
      colors: ['#6366F1', '#1F2937', '#F9FAFB'],
      tags: ['dashboard', 'admin', 'analytics'],
    },
    {
      title: 'Fintech Mobile App UI',
      description: 'Banking app with glassmorphism effects and smooth animations',
      source: 'mobbin',
      styles: ['glassmorphism', 'gradient'],
      colors: ['#3B82F6', '#8B5CF6', '#FFFFFF'],
      tags: ['fintech', 'mobile', 'banking'],
    },
    {
      title: 'SaaS Landing Page',
      description: 'Conversion-focused landing page with bold typography',
      source: 'awwwards',
      styles: ['typography-focused', 'minimalist'],
      colors: ['#111827', '#F59E0B', '#F9FAFB'],
      tags: ['landing', 'saas', 'hero'],
    },
    {
      title: 'E-commerce Product Grid',
      description: 'Bento-style product showcase with hover effects',
      source: 'behance',
      styles: ['bento', 'minimalist'],
      colors: ['#10B981', '#374151', '#FFFFFF'],
      tags: ['ecommerce', 'product', 'grid'],
    },
    {
      title: 'Health & Wellness App',
      description: 'Calming wellness app with organic shapes and illustrations',
      source: 'mobbin',
      styles: ['organic', 'illustration'],
      colors: ['#14B8A6', '#FCD34D', '#F0FDF4'],
      tags: ['health', 'wellness', 'lifestyle'],
    },
    {
      title: 'AI Platform Dashboard',
      description: 'Modern AI/ML platform with data visualizations',
      source: 'dribbble',
      styles: ['dark-mode', 'gradient'],
      colors: ['#8B5CF6', '#EC4899', '#0F172A'],
      tags: ['ai', 'dashboard', 'platform'],
    },
    {
      title: 'Social Media App Redesign',
      description: 'Fresh take on social networking with card-based UI',
      source: 'behance',
      styles: ['bento', 'minimalist'],
      colors: ['#3B82F6', '#F472B6', '#FFFFFF'],
      tags: ['social', 'mobile', 'redesign'],
    },
    {
      title: 'Travel Booking Platform',
      description: 'Immersive travel booking experience with stunning imagery',
      source: 'awwwards',
      styles: ['3d', 'gradient'],
      colors: ['#0EA5E9', '#F97316', '#FEF3C7'],
      tags: ['travel', 'booking', 'web'],
    },
    {
      title: 'Design System Components',
      description: 'Comprehensive UI kit with accessibility focus',
      source: 'dribbble',
      styles: ['minimalist', 'geometric'],
      colors: ['#6366F1', '#E5E7EB', '#FFFFFF'],
      tags: ['design-system', 'components', 'ui-kit'],
    },
    {
      title: 'Crypto Trading Interface',
      description: 'Real-time trading dashboard with charts and analytics',
      source: 'dribbble',
      styles: ['dark-mode', 'gradient'],
      colors: ['#22C55E', '#EF4444', '#18181B'],
      tags: ['crypto', 'fintech', 'trading'],
    },
  ];

  const categoryFilters: Record<DesignCategory, string[]> = {
    'web': ['landing', 'web', 'platform'],
    'mobile-ios': ['mobile', 'app'],
    'mobile-android': ['mobile', 'app'],
    'dashboard': ['dashboard', 'admin', 'analytics'],
    'landing-page': ['landing', 'hero', 'saas'],
    'e-commerce': ['ecommerce', 'product', 'shop'],
    'saas': ['saas', 'platform', 'dashboard'],
    'portfolio': ['portfolio', 'creative'],
    'social': ['social', 'mobile'],
    'fintech': ['fintech', 'banking', 'crypto', 'trading'],
    'healthcare': ['health', 'wellness', 'medical'],
    'education': ['education', 'learning'],
  };

  const filterTags = categoryFilters[category] || [];

  let filtered = templates;
  if (filterTags.length > 0) {
    filtered = templates.filter(t =>
      t.tags?.some(tag => filterTags.includes(tag))
    );
    if (filtered.length === 0) filtered = templates;
  }

  return filtered.slice(0, count).map((template, i) => ({
    id: `sample-${category}-${i + 1}`,
    title: template.title || 'Design Sample',
    description: template.description || '',
    source: template.source as DesignSource || 'dribbble',
    sourceUrl: `https://${template.source || 'dribbble'}.com/sample/${i + 1}`,
    imageUrls: [],
    category,
    styles: template.styles as DesignStyle[] || ['minimalist'],
    colors: template.colors || ['#6366F1', '#F9FAFB'],
    tags: template.tags || [],
    likes: Math.floor(Math.random() * 3000) + 500,
    collectedAt: new Date(),
  }));
}
