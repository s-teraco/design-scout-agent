import * as cheerio from 'cheerio';
import type { DesignItem, CollectorConfig, DesignCategory, DesignStyle } from '../types/index.js';
import { BaseCollector } from './base-collector.js';

export class ProductHuntCollector extends BaseCollector {
  constructor() {
    super('producthunt', 'https://www.producthunt.com');
  }

  async collect(config: CollectorConfig): Promise<DesignItem[]> {
    const items: DesignItem[] = [];
    const limit = config.limit || 10;

    try {
      const urls = this.buildUrls(config);

      for (const url of urls) {
        if (items.length >= limit) break;

        try {
          const response = await this.fetchWithRetry(url);
          const html = await response.text();
          const pageItems = this.parseProductHuntPage(html, config);
          items.push(...pageItems);
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
        }
      }
    } catch (error) {
      console.error('Error collecting from ProductHunt:', error);
    }

    return items.slice(0, limit);
  }

  async search(query: string, config?: Partial<CollectorConfig>): Promise<DesignItem[]> {
    const items: DesignItem[] = [];
    const limit = config?.limit || 10;

    try {
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      const response = await this.fetchWithRetry(searchUrl);
      const html = await response.text();
      const pageItems = this.parseProductHuntPage(html, config);
      items.push(...pageItems);
    } catch (error) {
      console.error('Error searching ProductHunt:', error);
    }

    return items.slice(0, limit);
  }

  private buildUrls(config: CollectorConfig): string[] {
    const urls: string[] = [];

    // Category-specific topics
    if (config.categories?.length) {
      for (const category of config.categories) {
        const topic = this.categoryToTopic(category);
        if (topic) {
          urls.push(`${this.baseUrl}/topics/${topic}`);
        }
      }
    }

    // Default: trending products and design tools
    if (urls.length === 0) {
      urls.push(`${this.baseUrl}`); // Homepage shows trending
      urls.push(`${this.baseUrl}/topics/design-tools`);
      urls.push(`${this.baseUrl}/topics/developer-tools`);
      urls.push(`${this.baseUrl}/topics/productivity`);
    }

    return urls;
  }

  private categoryToTopic(category: DesignCategory): string | null {
    const mapping: Record<DesignCategory, string> = {
      'web': 'web-app',
      'mobile-ios': 'iphone',
      'mobile-android': 'android',
      'dashboard': 'analytics',
      'landing-page': 'marketing',
      'e-commerce': 'e-commerce',
      'saas': 'saas',
      'portfolio': 'design-tools',
      'social': 'social-media-tools',
      'fintech': 'fintech',
      'healthcare': 'health-fitness',
      'education': 'education',
    };
    return mapping[category] || null;
  }

  private parseProductHuntPage(html: string, config?: Partial<CollectorConfig>): DesignItem[] {
    const $ = cheerio.load(html);
    const items: DesignItem[] = [];

    // Product cards
    const selectors = [
      'a[href*="/posts/"]',
      '[data-test="post-item"]',
      '[class*="PostItem"]',
    ];

    for (const selector of selectors) {
      if (items.length >= 20) break;

      $(selector).each((_, element) => {
        try {
          const $el = $(element);

          // Get post URL
          let href = $el.attr('href') || '';
          if (!href) {
            href = $el.find('a[href*="/posts/"]').attr('href') || '';
          }
          if (!href.includes('/posts/')) return;

          // Get product image/thumbnail
          const $img = $el.find('img').first();
          const imageUrl = $img.attr('src') || $img.attr('data-src') || '';

          // Get title
          const title = $el.find('h3, [class*="title"], [class*="name"]').first().text().trim() ||
                       $img.attr('alt') ||
                       'ProductHunt Product';

          // Get tagline/description
          const tagline = $el.find('[class*="tagline"], [class*="description"], p').first().text().trim() ||
                         `New product on ProductHunt`;

          // Get upvotes
          const votesText = $el.find('[class*="vote"], [class*="upvote"]').text();
          const votesMatch = votesText.match(/(\d+)/);
          const likes = votesMatch ? parseInt(votesMatch[1], 10) : 0;

          const sourceUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;

          // Skip duplicates
          if (items.some(i => i.sourceUrl === sourceUrl)) return;
          if (items.length >= 30) return;

          const item: DesignItem = {
            id: this.generateId(),
            title: this.cleanTitle(title),
            description: tagline,
            source: 'producthunt',
            sourceUrl,
            imageUrls: imageUrl ? [imageUrl] : [],
            thumbnailUrl: imageUrl,
            category: this.inferCategory(title + ' ' + tagline, config?.categories),
            styles: this.inferStyles(title + ' ' + tagline),
            colors: this.extractColors(html),
            tags: this.extractTags(title, tagline),
            likes,
            collectedAt: new Date(),
            metadata: {
              platform: 'producthunt',
              tagline,
            },
          };

          items.push(item);
        } catch (err) {
          // Skip invalid items
        }
      });
    }

    return items;
  }

  private cleanTitle(title: string): string {
    return title.trim().slice(0, 80);
  }

  private inferCategory(text: string, preferred?: DesignCategory[]): DesignCategory {
    const textLower = text.toLowerCase();

    if (preferred?.length) return preferred[0];

    if (textLower.includes('ios') || textLower.includes('iphone')) return 'mobile-ios';
    if (textLower.includes('android')) return 'mobile-android';
    if (textLower.includes('mobile') || textLower.includes('app')) return 'mobile-ios';
    if (textLower.includes('dashboard') || textLower.includes('analytics')) return 'dashboard';
    if (textLower.includes('landing') || textLower.includes('marketing')) return 'landing-page';
    if (textLower.includes('shop') || textLower.includes('ecommerce') || textLower.includes('store') || textLower.includes('commerce')) {
      return 'e-commerce';
    }
    if (textLower.includes('saas') || textLower.includes('platform') || textLower.includes('tool')) return 'saas';
    if (textLower.includes('social')) return 'social';
    if (textLower.includes('finance') || textLower.includes('payment') || textLower.includes('banking')) return 'fintech';
    if (textLower.includes('health') || textLower.includes('fitness') || textLower.includes('medical')) return 'healthcare';
    if (textLower.includes('education') || textLower.includes('learning') || textLower.includes('course')) return 'education';

    return 'saas';
  }

  private inferStyles(text: string): DesignStyle[] {
    const styles: DesignStyle[] = [];
    const textLower = text.toLowerCase();

    if (textLower.includes('minimal') || textLower.includes('clean') || textLower.includes('simple')) {
      styles.push('minimalist');
    }
    if (textLower.includes('dark')) styles.push('dark-mode');
    if (textLower.includes('ai') || textLower.includes('modern')) styles.push('minimalist');
    if (textLower.includes('3d')) styles.push('3d');

    return styles.length > 0 ? styles : ['minimalist'];
  }

  private extractTags(title: string, tagline: string): string[] {
    const combined = (title + ' ' + tagline).toLowerCase();
    const words = combined.split(/[\s\-_,()[\]|:]+/);
    const stopWords = ['the', 'and', 'for', 'a', 'an', 'in', 'on', 'to', 'with', 'by', 'your', 'you', 'all', 'new', 'first'];
    const relevantTags = words.filter(word =>
      word.length > 2 && !stopWords.includes(word)
    );
    return [...new Set(relevantTags)].slice(0, 10);
  }
}
