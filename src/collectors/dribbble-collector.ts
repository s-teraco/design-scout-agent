import * as cheerio from 'cheerio';
import type { DesignItem, CollectorConfig, DesignCategory, DesignStyle } from '../types/index.js';
import { BaseCollector } from './base-collector.js';

export class DribbbleCollector extends BaseCollector {
  constructor() {
    super('dribbble', 'https://dribbble.com');
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

        $('[data-thumbnail-id], .shot-thumbnail').each((_, element) => {
          if (items.length >= limit) return false;

          const $el = $(element);
          const item = this.parseDesignItem($, $el, config);
          if (item) {
            items.push(item);
          }
        });

        await this.delay(1000); // Rate limiting
      } catch (error) {
        console.error(`Error collecting from ${endpoint}:`, error);
      }
    }

    return items.slice(0, limit);
  }

  async search(query: string, config?: Partial<CollectorConfig>): Promise<DesignItem[]> {
    const searchUrl = `${this.baseUrl}/search/shots/popular?q=${encodeURIComponent(query)}`;
    const items: DesignItem[] = [];
    const limit = config?.limit || 20;

    try {
      const response = await this.fetchWithRetry(searchUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      $('[data-thumbnail-id], .shot-thumbnail').each((_, element) => {
        if (items.length >= limit) return false;

        const $el = $(element);
        const item = this.parseDesignItem($, $el, { ...config, searchQuery: query } as CollectorConfig);
        if (item) {
          items.push(item);
        }
      });
    } catch (error) {
      console.error(`Error searching Dribbble for "${query}":`, error);
    }

    return items;
  }

  private buildEndpoints(config: CollectorConfig): string[] {
    const endpoints: string[] = [];
    const sortPath = config.sortBy === 'recent' ? 'recent' : 'popular';

    if (config.categories?.length) {
      for (const category of config.categories) {
        const tag = this.categoryToTag(category);
        endpoints.push(`${this.baseUrl}/tags/${tag}?sort=${sortPath}`);
      }
    } else {
      endpoints.push(`${this.baseUrl}/shots/${sortPath}`);
    }

    return endpoints;
  }

  private categoryToTag(category: DesignCategory): string {
    const mapping: Record<DesignCategory, string> = {
      'web': 'web-design',
      'mobile-ios': 'ios',
      'mobile-android': 'android',
      'dashboard': 'dashboard',
      'landing-page': 'landing-page',
      'e-commerce': 'e-commerce',
      'saas': 'saas',
      'portfolio': 'portfolio',
      'social': 'social-media',
      'fintech': 'fintech',
      'healthcare': 'healthcare',
      'education': 'education',
    };
    return mapping[category] || category;
  }

  private parseDesignItem(
    $: cheerio.CheerioAPI,
    $el: cheerio.Cheerio<any>,
    config: CollectorConfig
  ): DesignItem | null {
    try {
      const $link = $el.find('a').first();
      const href = $link.attr('href') || '';
      const $img = $el.find('img').first();
      const imgSrc = $img.attr('src') || $img.attr('data-src') || '';
      const title = $img.attr('alt') || $link.attr('title') || 'Untitled';

      const $designer = $el.find('.display-name, .user-info a').first();
      const designerName = $designer.text().trim();
      const designerUrl = $designer.attr('href');

      const $stats = $el.find('.stats, .shot-stats');
      const likesText = $stats.find('.likes, [data-likes]').text() || '0';
      const viewsText = $stats.find('.views, [data-views]').text() || '0';

      return {
        id: this.generateId(),
        title,
        description: '',
        source: 'dribbble',
        sourceUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
        imageUrls: [imgSrc],
        thumbnailUrl: imgSrc,
        designer: designerName || undefined,
        designerUrl: designerUrl ? `${this.baseUrl}${designerUrl}` : undefined,
        category: config.categories?.[0] || 'web',
        styles: this.inferStyles(title, imgSrc),
        colors: [],
        tags: config.searchQuery ? [config.searchQuery] : [],
        likes: this.parseNumber(likesText),
        views: this.parseNumber(viewsText),
        collectedAt: new Date(),
      };
    } catch {
      return null;
    }
  }

  private inferStyles(title: string, _imgSrc: string): DesignStyle[] {
    const styles: DesignStyle[] = [];
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('minimal') || lowerTitle.includes('clean')) {
      styles.push('minimalist');
    }
    if (lowerTitle.includes('dark') || lowerTitle.includes('night')) {
      styles.push('dark-mode');
    }
    if (lowerTitle.includes('gradient')) {
      styles.push('gradient');
    }
    if (lowerTitle.includes('3d') || lowerTitle.includes('three')) {
      styles.push('3d');
    }
    if (lowerTitle.includes('glass') || lowerTitle.includes('blur')) {
      styles.push('glassmorphism');
    }
    if (lowerTitle.includes('bento')) {
      styles.push('bento');
    }

    return styles.length ? styles : ['minimalist'];
  }

  private parseNumber(str: string): number {
    const cleaned = str.replace(/[^0-9.kKmM]/g, '');
    const multiplier = str.toLowerCase().includes('k') ? 1000 : str.toLowerCase().includes('m') ? 1000000 : 1;
    return Math.round(parseFloat(cleaned) * multiplier) || 0;
  }
}
