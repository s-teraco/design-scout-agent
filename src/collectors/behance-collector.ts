import * as cheerio from 'cheerio';
import type { DesignItem, CollectorConfig, DesignCategory, DesignStyle } from '../types/index.js';
import { BaseCollector } from './base-collector.js';

export class BehanceCollector extends BaseCollector {
  constructor() {
    super('behance', 'https://www.behance.net');
  }

  async collect(config: CollectorConfig): Promise<DesignItem[]> {
    const items: DesignItem[] = [];
    const limit = config.limit || 10;

    try {
      // Behance gallery pages
      const urls = this.buildUrls(config);

      for (const url of urls) {
        if (items.length >= limit) break;

        try {
          const response = await this.fetchWithRetry(url);
          const html = await response.text();
          const pageItems = this.parseGalleryPage(html, config);
          items.push(...pageItems);
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
        }
      }
    } catch (error) {
      console.error('Error collecting from Behance:', error);
    }

    return items.slice(0, limit);
  }

  async search(query: string, config?: Partial<CollectorConfig>): Promise<DesignItem[]> {
    const items: DesignItem[] = [];
    const limit = config?.limit || 10;

    try {
      const searchUrl = `${this.baseUrl}/search/projects?search=${encodeURIComponent(query)}`;
      const response = await this.fetchWithRetry(searchUrl);
      const html = await response.text();
      const pageItems = this.parseGalleryPage(html, config);
      items.push(...pageItems);
    } catch (error) {
      console.error('Error searching Behance:', error);
    }

    return items.slice(0, limit);
  }

  private buildUrls(config: CollectorConfig): string[] {
    const urls: string[] = [];
    const sortParam = config.sortBy === 'recent' ? 'latest' : 'appreciations';

    // Add category-specific URLs
    if (config.categories?.length) {
      for (const category of config.categories) {
        const field = this.categoryToField(category);
        if (field) {
          urls.push(`${this.baseUrl}/search/projects?field=${field}&sort=${sortParam}`);
        }
      }
    }

    // Default: popular UI/UX projects
    if (urls.length === 0) {
      urls.push(`${this.baseUrl}/search/projects?field=ui%2Fux&sort=${sortParam}`);
      urls.push(`${this.baseUrl}/search/projects?field=web%20design&sort=${sortParam}`);
    }

    return urls;
  }

  private categoryToField(category: DesignCategory): string | null {
    const mapping: Record<DesignCategory, string> = {
      'web': 'web%20design',
      'mobile-ios': 'ui%2Fux',
      'mobile-android': 'ui%2Fux',
      'dashboard': 'ui%2Fux',
      'landing-page': 'web%20design',
      'e-commerce': 'web%20design',
      'saas': 'ui%2Fux',
      'portfolio': 'web%20design',
      'social': 'ui%2Fux',
      'fintech': 'ui%2Fux',
      'healthcare': 'ui%2Fux',
      'education': 'ui%2Fux',
    };
    return mapping[category] || null;
  }

  private parseGalleryPage(html: string, config?: Partial<CollectorConfig>): DesignItem[] {
    const $ = cheerio.load(html);
    const items: DesignItem[] = [];

    // Behance project cards
    $('div[class*="ProjectCover"]').each((_, element) => {
      try {
        const $el = $(element);
        const $link = $el.find('a[href*="/gallery/"]').first();
        const $img = $el.find('img').first();
        const $title = $el.find('[class*="Title"]').first();
        const $owner = $el.find('[class*="Owner"]').first();
        const $stats = $el.find('[class*="Stats"]').first();

        const href = $link.attr('href') || '';
        const imageUrl = $img.attr('src') || $img.attr('data-src') || '';
        const title = $title.text().trim() || $img.attr('alt') || 'Untitled';
        const designer = $owner.text().trim();

        if (!href || !imageUrl) return;

        const sourceUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;

        // Extract stats
        const statsText = $stats.text();
        const likesMatch = statsText.match(/(\d+(?:,\d+)*)/);
        const likes = likesMatch ? parseInt(likesMatch[1].replace(/,/g, ''), 10) : 0;

        const item: DesignItem = {
          id: this.generateId(),
          title,
          description: `Behance project by ${designer}`,
          source: 'behance',
          sourceUrl,
          imageUrls: [imageUrl],
          thumbnailUrl: imageUrl,
          designer,
          designerUrl: this.baseUrl,
          category: this.inferCategory(title, config?.categories),
          styles: this.inferStyles(title, imageUrl),
          colors: this.extractColors(html),
          tags: this.extractTags(title),
          likes,
          collectedAt: new Date(),
          metadata: {
            platform: 'behance',
          },
        };

        items.push(item);
      } catch (err) {
        // Skip invalid items
      }
    });

    // Fallback: try alternative selectors
    if (items.length === 0) {
      $('a[href*="/gallery/"]').each((_, element) => {
        try {
          const $el = $(element);
          const href = $el.attr('href') || '';
          const $img = $el.find('img').first();
          const imageUrl = $img.attr('src') || $img.attr('data-src') || '';
          const title = $img.attr('alt') || $el.attr('title') || 'Behance Design';

          if (!href || !imageUrl || items.length >= 20) return;

          const sourceUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;

          const item: DesignItem = {
            id: this.generateId(),
            title,
            description: `Design from Behance`,
            source: 'behance',
            sourceUrl,
            imageUrls: [imageUrl],
            thumbnailUrl: imageUrl,
            category: this.inferCategory(title, config?.categories),
            styles: this.inferStyles(title, imageUrl),
            colors: this.extractColors(html),
            tags: this.extractTags(title),
            collectedAt: new Date(),
          };

          items.push(item);
        } catch (err) {
          // Skip invalid items
        }
      });
    }

    return items;
  }

  private inferCategory(title: string, preferred?: DesignCategory[]): DesignCategory {
    const titleLower = title.toLowerCase();

    if (preferred?.length) return preferred[0];

    if (titleLower.includes('mobile') || titleLower.includes('app') || titleLower.includes('ios')) {
      return 'mobile-ios';
    }
    if (titleLower.includes('android')) return 'mobile-android';
    if (titleLower.includes('dashboard') || titleLower.includes('admin')) return 'dashboard';
    if (titleLower.includes('landing') || titleLower.includes('hero')) return 'landing-page';
    if (titleLower.includes('shop') || titleLower.includes('ecommerce') || titleLower.includes('store')) {
      return 'e-commerce';
    }
    if (titleLower.includes('saas') || titleLower.includes('platform')) return 'saas';

    return 'web';
  }

  private inferStyles(title: string, imageUrl: string): DesignStyle[] {
    const styles: DesignStyle[] = [];
    const combined = (title + imageUrl).toLowerCase();

    if (combined.includes('minimal') || combined.includes('clean')) styles.push('minimalist');
    if (combined.includes('dark')) styles.push('dark-mode');
    if (combined.includes('gradient')) styles.push('gradient');
    if (combined.includes('3d') || combined.includes('three')) styles.push('3d');
    if (combined.includes('glass') || combined.includes('blur')) styles.push('glassmorphism');
    if (combined.includes('neumorphism') || combined.includes('soft')) styles.push('neumorphism');
    if (combined.includes('illustration') || combined.includes('illust')) styles.push('illustration');
    if (combined.includes('bento')) styles.push('bento');

    return styles.length > 0 ? styles : ['minimalist'];
  }

  private extractTags(title: string): string[] {
    const words = title.toLowerCase().split(/[\s\-_,]+/);
    const relevantTags = words.filter(word =>
      word.length > 2 &&
      !['the', 'and', 'for', 'app', 'web'].includes(word)
    );
    return [...new Set(relevantTags)].slice(0, 8);
  }
}
