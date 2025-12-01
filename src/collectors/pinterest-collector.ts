import * as cheerio from 'cheerio';
import type { DesignItem, CollectorConfig, DesignCategory, DesignStyle } from '../types/index.js';
import { BaseCollector } from './base-collector.js';

export class PinterestCollector extends BaseCollector {
  constructor() {
    super('pinterest', 'https://www.pinterest.com');
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
          const pageItems = this.parsePinterestPage(html, config);
          items.push(...pageItems);
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
        }
      }
    } catch (error) {
      console.error('Error collecting from Pinterest:', error);
    }

    return items.slice(0, limit);
  }

  async search(query: string, config?: Partial<CollectorConfig>): Promise<DesignItem[]> {
    const items: DesignItem[] = [];
    const limit = config?.limit || 10;

    try {
      // Add "ui design" or "web design" to improve results
      const designQuery = `${query} ui design`;
      const searchUrl = `${this.baseUrl}/search/pins/?q=${encodeURIComponent(designQuery)}`;
      const response = await this.fetchWithRetry(searchUrl);
      const html = await response.text();
      const pageItems = this.parsePinterestPage(html, config);
      items.push(...pageItems);
    } catch (error) {
      console.error('Error searching Pinterest:', error);
    }

    return items.slice(0, limit);
  }

  private buildUrls(config: CollectorConfig): string[] {
    const urls: string[] = [];

    // Category-specific searches
    if (config.categories?.length) {
      for (const category of config.categories) {
        const searchTerm = this.categoryToSearch(category);
        urls.push(`${this.baseUrl}/search/pins/?q=${encodeURIComponent(searchTerm)}`);
      }
    }

    // Style-specific searches
    if (config.styles?.length) {
      for (const style of config.styles) {
        const searchTerm = this.styleToSearch(style);
        urls.push(`${this.baseUrl}/search/pins/?q=${encodeURIComponent(searchTerm)}`);
      }
    }

    // Default searches for UI/UX inspiration
    if (urls.length === 0) {
      urls.push(`${this.baseUrl}/search/pins/?q=${encodeURIComponent('ui design inspiration')}`);
      urls.push(`${this.baseUrl}/search/pins/?q=${encodeURIComponent('web design modern')}`);
      urls.push(`${this.baseUrl}/search/pins/?q=${encodeURIComponent('mobile app design')}`);
    }

    return urls;
  }

  private categoryToSearch(category: DesignCategory): string {
    const mapping: Record<DesignCategory, string> = {
      'web': 'web design inspiration',
      'mobile-ios': 'ios app design',
      'mobile-android': 'android app design',
      'dashboard': 'dashboard ui design',
      'landing-page': 'landing page design',
      'e-commerce': 'ecommerce website design',
      'saas': 'saas ui design',
      'portfolio': 'portfolio website design',
      'social': 'social app design',
      'fintech': 'fintech app design',
      'healthcare': 'healthcare app design',
      'education': 'education app design',
    };
    return mapping[category] || 'ui design';
  }

  private styleToSearch(style: DesignStyle): string {
    const mapping: Record<DesignStyle, string> = {
      'minimalist': 'minimalist ui design',
      'brutalist': 'brutalist web design',
      'glassmorphism': 'glassmorphism ui',
      'neumorphism': 'neumorphism design',
      'bento': 'bento grid design',
      'dark-mode': 'dark mode ui design',
      'gradient': 'gradient ui design',
      '3d': '3d ui design',
      'illustration': 'illustration ui design',
      'typography-focused': 'typography design',
      'organic': 'organic shape design',
      'geometric': 'geometric ui design',
    };
    return mapping[style] || 'ui design';
  }

  private parsePinterestPage(html: string, config?: Partial<CollectorConfig>): DesignItem[] {
    const $ = cheerio.load(html);
    const items: DesignItem[] = [];

    // Pinterest pins - try multiple selectors
    const selectors = [
      'a[href*="/pin/"]',
      '[data-test-id="pin"]',
      '[class*="PinCard"]',
      'div[data-grid-item]',
    ];

    for (const selector of selectors) {
      if (items.length >= 20) break;

      $(selector).each((_, element) => {
        try {
          const $el = $(element);

          // Get pin URL
          let href = $el.attr('href') || '';
          if (!href) {
            href = $el.find('a[href*="/pin/"]').attr('href') || '';
          }
          if (!href.includes('/pin/')) return;

          // Get image
          const $img = $el.find('img').first();
          let imageUrl = $img.attr('src') || $img.attr('data-src') || '';

          // Pinterest uses different image sizes, try to get larger version
          if (imageUrl.includes('/236x/')) {
            imageUrl = imageUrl.replace('/236x/', '/736x/');
          }

          if (!imageUrl || items.length >= 30) return;

          // Get title/description
          const title = $img.attr('alt') ||
                       $el.find('[class*="title"]').text().trim() ||
                       $el.attr('aria-label') ||
                       'Pinterest Design';

          const sourceUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;

          // Skip duplicates
          if (items.some(i => i.sourceUrl === sourceUrl)) return;

          const item: DesignItem = {
            id: this.generateId(),
            title: this.cleanTitle(title),
            description: `Design inspiration from Pinterest`,
            source: 'pinterest',
            sourceUrl,
            imageUrls: [imageUrl],
            thumbnailUrl: imageUrl,
            category: this.inferCategory(title, config?.categories),
            styles: this.inferStyles(title),
            colors: this.extractColors(html),
            tags: this.extractTags(title),
            collectedAt: new Date(),
            metadata: {
              platform: 'pinterest',
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
    // Remove common Pinterest suffixes
    return title
      .replace(/\s*\|\s*Pinterest.*$/i, '')
      .replace(/\s*-\s*Pinterest.*$/i, '')
      .trim()
      .slice(0, 100); // Limit length
  }

  private inferCategory(title: string, preferred?: DesignCategory[]): DesignCategory {
    const titleLower = title.toLowerCase();

    if (preferred?.length) return preferred[0];

    if (titleLower.includes('mobile') || titleLower.includes('app')) {
      if (titleLower.includes('android')) return 'mobile-android';
      return 'mobile-ios';
    }
    if (titleLower.includes('dashboard') || titleLower.includes('admin')) return 'dashboard';
    if (titleLower.includes('landing')) return 'landing-page';
    if (titleLower.includes('shop') || titleLower.includes('ecommerce') || titleLower.includes('store')) {
      return 'e-commerce';
    }
    if (titleLower.includes('saas')) return 'saas';
    if (titleLower.includes('portfolio')) return 'portfolio';

    return 'web';
  }

  private inferStyles(title: string): DesignStyle[] {
    const styles: DesignStyle[] = [];
    const titleLower = title.toLowerCase();

    if (titleLower.includes('minimal') || titleLower.includes('clean') || titleLower.includes('simple')) {
      styles.push('minimalist');
    }
    if (titleLower.includes('dark')) styles.push('dark-mode');
    if (titleLower.includes('gradient') || titleLower.includes('colorful')) styles.push('gradient');
    if (titleLower.includes('3d') || titleLower.includes('isometric')) styles.push('3d');
    if (titleLower.includes('glass') || titleLower.includes('blur') || titleLower.includes('transparent')) {
      styles.push('glassmorphism');
    }
    if (titleLower.includes('neumorphism') || titleLower.includes('soft')) styles.push('neumorphism');
    if (titleLower.includes('illustration') || titleLower.includes('illustrated')) styles.push('illustration');
    if (titleLower.includes('bento')) styles.push('bento');
    if (titleLower.includes('brutalist')) styles.push('brutalist');
    if (titleLower.includes('geometric')) styles.push('geometric');
    if (titleLower.includes('organic')) styles.push('organic');

    return styles.length > 0 ? styles : ['minimalist'];
  }

  private extractTags(title: string): string[] {
    const words = title.toLowerCase().split(/[\s\-_,()[\]|]+/);
    const stopWords = ['the', 'and', 'for', 'a', 'an', 'in', 'on', 'to', 'with', 'by', 'pinterest', 'design', 'ui', 'ux'];
    const relevantTags = words.filter(word =>
      word.length > 2 && !stopWords.includes(word)
    );
    return [...new Set(relevantTags)].slice(0, 8);
  }
}
