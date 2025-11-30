import * as cheerio from 'cheerio';
import type { DesignItem, CollectorConfig, DesignCategory, DesignStyle } from '../types/index.js';
import { BaseCollector } from './base-collector.js';

export class AwwwardsCollector extends BaseCollector {
  constructor() {
    super('awwwards', 'https://www.awwwards.com');
  }

  async collect(config: CollectorConfig): Promise<DesignItem[]> {
    const items: DesignItem[] = [];
    const limit = config.limit || 20;

    const endpoints = this.buildEndpoints(config);

    for (const endpoint of endpoints) {
      try {
        const response = await this.fetchWithRetry(endpoint);
        const html = await response.text();
        const $ = cheerio.load(html);

        $('.box-photo, .js-collectable, article[data-id]').each((_, element) => {
          if (items.length >= limit) return false;

          const $el = $(element);
          const item = this.parseDesignItem($, $el, config);
          if (item) {
            items.push(item);
          }
        });

        await this.delay(1500); // Rate limiting - Awwwards is stricter
      } catch (error) {
        console.error(`Error collecting from ${endpoint}:`, error);
      }
    }

    return items.slice(0, limit);
  }

  async search(query: string, config?: Partial<CollectorConfig>): Promise<DesignItem[]> {
    const searchUrl = `${this.baseUrl}/websites/search/?text=${encodeURIComponent(query)}`;
    const items: DesignItem[] = [];
    const limit = config?.limit || 20;

    try {
      const response = await this.fetchWithRetry(searchUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      $('.box-photo, .js-collectable, article[data-id]').each((_, element) => {
        if (items.length >= limit) return false;

        const $el = $(element);
        const item = this.parseDesignItem($, $el, { ...config, searchQuery: query } as CollectorConfig);
        if (item) {
          items.push(item);
        }
      });
    } catch (error) {
      console.error(`Error searching Awwwards for "${query}":`, error);
    }

    return items;
  }

  private buildEndpoints(config: CollectorConfig): string[] {
    const endpoints: string[] = [];

    // Build filter based on categories
    if (config.categories?.length) {
      for (const category of config.categories) {
        const tag = this.categoryToFilter(category);
        endpoints.push(`${this.baseUrl}/websites/${tag}/`);
      }
    }

    // Sort handling
    const sortPath = config.sortBy === 'recent' ? 'websites/' : 'awards/';
    if (!endpoints.length) {
      endpoints.push(`${this.baseUrl}/${sortPath}`);
    }

    return endpoints;
  }

  private categoryToFilter(category: DesignCategory): string {
    const mapping: Record<DesignCategory, string> = {
      'web': '',
      'mobile-ios': 'mobile',
      'mobile-android': 'mobile',
      'dashboard': 'web-application',
      'landing-page': 'landing-page',
      'e-commerce': 'e-commerce',
      'saas': 'web-application',
      'portfolio': 'portfolio',
      'social': 'social',
      'fintech': 'finance',
      'healthcare': 'health',
      'education': 'education',
    };
    return mapping[category] || '';
  }

  private parseDesignItem(
    $: cheerio.CheerioAPI,
    $el: cheerio.Cheerio<any>,
    config: CollectorConfig
  ): DesignItem | null {
    try {
      const $link = $el.find('a[href*="/sites/"]').first();
      const href = $link.attr('href') || $el.find('a').first().attr('href') || '';

      const $img = $el.find('img').first();
      const imgSrc = $img.attr('src') || $img.attr('data-src') || $img.attr('data-srcset')?.split(' ')[0] || '';
      const title = $el.find('.bt-site-title, h2, .title').first().text().trim() ||
                   $img.attr('alt') || 'Untitled';

      const $designer = $el.find('.bt-agency, .agency-name, .author').first();
      const designerName = $designer.text().trim();
      const designerHref = $designer.attr('href') || $el.find('a[href*="/agency/"]').attr('href');

      // Extract scores if available
      const $score = $el.find('.score, .bt-score, [class*="score"]');
      const scoreText = $score.text().trim();
      const score = parseFloat(scoreText) || undefined;

      // Extract tags/categories
      const tags: string[] = [];
      $el.find('.tag, .category, .bt-tag').each((_, tagEl) => {
        tags.push($(tagEl).text().trim());
      });

      return {
        id: this.generateId(),
        title,
        description: $el.find('.description, .bt-description').text().trim() || '',
        source: 'awwwards',
        sourceUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
        imageUrls: imgSrc ? [imgSrc] : [],
        thumbnailUrl: imgSrc || undefined,
        designer: designerName || undefined,
        designerUrl: designerHref ? (designerHref.startsWith('http') ? designerHref : `${this.baseUrl}${designerHref}`) : undefined,
        category: config.categories?.[0] || 'web',
        styles: this.inferStylesFromPage($, $el),
        colors: this.extractColorsFromElement($, $el),
        tags: [...tags, ...(config.searchQuery ? [config.searchQuery] : [])],
        likes: score ? Math.round(score * 100) : undefined,
        views: undefined,
        collectedAt: new Date(),
        metadata: score ? { awwwardsScore: score } : undefined,
      };
    } catch {
      return null;
    }
  }

  private inferStylesFromPage($: cheerio.CheerioAPI, $el: cheerio.Cheerio<any>): DesignStyle[] {
    const styles: DesignStyle[] = [];
    const text = $el.text().toLowerCase();
    const tags = $el.find('.tag, .bt-tag').text().toLowerCase();
    const combined = `${text} ${tags}`;

    const styleKeywords: Record<DesignStyle, string[]> = {
      'minimalist': ['minimal', 'clean', 'simple', 'white space'],
      'brutalist': ['brutalist', 'brutal', 'raw'],
      'glassmorphism': ['glass', 'blur', 'frosted', 'transparent'],
      'neumorphism': ['neumorphism', 'soft ui', 'skeuomorphic'],
      'bento': ['bento', 'grid', 'card-based'],
      'dark-mode': ['dark', 'night', 'black'],
      'gradient': ['gradient', 'colorful', 'vibrant'],
      '3d': ['3d', 'three-dimensional', 'webgl'],
      'illustration': ['illustration', 'illustrated', 'hand-drawn'],
      'typography-focused': ['typography', 'type', 'editorial'],
      'organic': ['organic', 'natural', 'flowing'],
      'geometric': ['geometric', 'shapes', 'angular'],
    };

    for (const [style, keywords] of Object.entries(styleKeywords)) {
      if (keywords.some(kw => combined.includes(kw))) {
        styles.push(style as DesignStyle);
      }
    }

    return styles.length ? styles : ['minimalist'];
  }

  private extractColorsFromElement($: cheerio.CheerioAPI, $el: cheerio.Cheerio<any>): string[] {
    const styleAttr = $el.attr('style') || '';
    const bgColor = $el.find('[style*="background"]').attr('style') || '';
    const combined = `${styleAttr} ${bgColor}`;

    return this.extractColors(combined);
  }
}
