import * as cheerio from 'cheerio';
import type { DesignItem, CollectorConfig, DesignCategory, DesignStyle } from '../types/index.js';
import { BaseCollector } from './base-collector.js';

export class FigmaCollector extends BaseCollector {
  constructor() {
    super('figma', 'https://www.figma.com/community');
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
          const pageItems = this.parseCommunityPage(html, config);
          items.push(...pageItems);
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
        }
      }
    } catch (error) {
      console.error('Error collecting from Figma:', error);
    }

    return items.slice(0, limit);
  }

  async search(query: string, config?: Partial<CollectorConfig>): Promise<DesignItem[]> {
    const items: DesignItem[] = [];
    const limit = config?.limit || 10;

    try {
      const searchUrl = `${this.baseUrl}/search?resource_type=mixed&sort_by=relevancy&query=${encodeURIComponent(query)}`;
      const response = await this.fetchWithRetry(searchUrl);
      const html = await response.text();
      const pageItems = this.parseCommunityPage(html, config);
      items.push(...pageItems);
    } catch (error) {
      console.error('Error searching Figma:', error);
    }

    return items.slice(0, limit);
  }

  private buildUrls(config: CollectorConfig): string[] {
    const urls: string[] = [];
    const sortParam = config.sortBy === 'recent' ? 'recent' : 'popular';

    // Category-specific community files
    if (config.categories?.length) {
      for (const category of config.categories) {
        const tag = this.categoryToTag(category);
        if (tag) {
          urls.push(`${this.baseUrl}/search?resource_type=mixed&sort_by=${sortParam}&query=${tag}`);
        }
      }
    }

    // Default URLs for popular resources
    if (urls.length === 0) {
      urls.push(`${this.baseUrl}/files?sort_by=${sortParam}`);
      urls.push(`${this.baseUrl}/search?resource_type=mixed&sort_by=${sortParam}&query=ui%20kit`);
      urls.push(`${this.baseUrl}/search?resource_type=mixed&sort_by=${sortParam}&query=design%20system`);
    }

    return urls;
  }

  private categoryToTag(category: DesignCategory): string | null {
    const mapping: Record<DesignCategory, string> = {
      'web': 'website',
      'mobile-ios': 'ios%20app',
      'mobile-android': 'android%20app',
      'dashboard': 'dashboard',
      'landing-page': 'landing%20page',
      'e-commerce': 'ecommerce',
      'saas': 'saas',
      'portfolio': 'portfolio',
      'social': 'social%20media',
      'fintech': 'fintech',
      'healthcare': 'healthcare',
      'education': 'education',
    };
    return mapping[category] || null;
  }

  private parseCommunityPage(html: string, config?: Partial<CollectorConfig>): DesignItem[] {
    const $ = cheerio.load(html);
    const items: DesignItem[] = [];

    // Figma community file cards
    $('a[href*="/community/file/"]').each((_, element) => {
      try {
        const $el = $(element);
        const href = $el.attr('href') || '';
        const $img = $el.find('img').first();
        const imageUrl = $img.attr('src') || '';
        const title = $el.find('[class*="title"]').text().trim() ||
                     $img.attr('alt') ||
                     $el.attr('aria-label') ||
                     'Figma Design';

        if (!href || items.length >= 20) return;

        const sourceUrl = href.startsWith('http') ? href : `https://www.figma.com${href}`;

        // Try to get creator info
        const $creator = $el.parent().find('[class*="creator"], [class*="author"]');
        const designer = $creator.text().trim() || 'Figma Community';

        // Try to get stats
        const $stats = $el.parent().find('[class*="likes"], [class*="duplicates"]');
        const statsText = $stats.text();
        const likesMatch = statsText.match(/(\d+(?:\.\d+)?[kKmM]?)/);
        let likes = 0;
        if (likesMatch) {
          const num = likesMatch[1];
          if (num.includes('k') || num.includes('K')) {
            likes = Math.round(parseFloat(num) * 1000);
          } else if (num.includes('m') || num.includes('M')) {
            likes = Math.round(parseFloat(num) * 1000000);
          } else {
            likes = parseInt(num, 10) || 0;
          }
        }

        const item: DesignItem = {
          id: this.generateId(),
          title,
          description: `Figma Community resource by ${designer}`,
          source: 'figma',
          sourceUrl,
          imageUrls: imageUrl ? [imageUrl] : [],
          thumbnailUrl: imageUrl,
          designer,
          designerUrl: 'https://www.figma.com/community',
          category: this.inferCategory(title, config?.categories),
          styles: this.inferStyles(title),
          colors: this.extractColors(html),
          tags: this.extractTags(title),
          likes,
          collectedAt: new Date(),
          metadata: {
            platform: 'figma',
            resourceType: this.inferResourceType(title),
          },
        };

        items.push(item);
      } catch (err) {
        // Skip invalid items
      }
    });

    // Also try plugin links
    $('a[href*="/community/plugin/"]').each((_, element) => {
      try {
        const $el = $(element);
        const href = $el.attr('href') || '';
        const title = $el.text().trim() || 'Figma Plugin';
        const $img = $el.find('img').first();
        const imageUrl = $img.attr('src') || '';

        if (!href || items.length >= 30) return;

        const sourceUrl = href.startsWith('http') ? href : `https://www.figma.com${href}`;

        const item: DesignItem = {
          id: this.generateId(),
          title,
          description: `Figma plugin`,
          source: 'figma',
          sourceUrl,
          imageUrls: imageUrl ? [imageUrl] : [],
          thumbnailUrl: imageUrl,
          category: 'web',
          styles: ['minimalist'],
          colors: [],
          tags: ['plugin', 'figma', ...this.extractTags(title)],
          collectedAt: new Date(),
          metadata: {
            platform: 'figma',
            resourceType: 'plugin',
          },
        };

        items.push(item);
      } catch (err) {
        // Skip invalid items
      }
    });

    return items;
  }

  private inferCategory(title: string, preferred?: DesignCategory[]): DesignCategory {
    const titleLower = title.toLowerCase();

    if (preferred?.length) return preferred[0];

    if (titleLower.includes('ios') || titleLower.includes('iphone')) return 'mobile-ios';
    if (titleLower.includes('android')) return 'mobile-android';
    if (titleLower.includes('mobile') || titleLower.includes('app')) return 'mobile-ios';
    if (titleLower.includes('dashboard') || titleLower.includes('admin')) return 'dashboard';
    if (titleLower.includes('landing')) return 'landing-page';
    if (titleLower.includes('shop') || titleLower.includes('ecommerce') || titleLower.includes('store')) {
      return 'e-commerce';
    }
    if (titleLower.includes('saas')) return 'saas';

    return 'web';
  }

  private inferStyles(title: string): DesignStyle[] {
    const styles: DesignStyle[] = [];
    const titleLower = title.toLowerCase();

    if (titleLower.includes('minimal') || titleLower.includes('clean')) styles.push('minimalist');
    if (titleLower.includes('dark')) styles.push('dark-mode');
    if (titleLower.includes('gradient')) styles.push('gradient');
    if (titleLower.includes('3d')) styles.push('3d');
    if (titleLower.includes('glass')) styles.push('glassmorphism');
    if (titleLower.includes('neumorphism') || titleLower.includes('soft ui')) styles.push('neumorphism');
    if (titleLower.includes('illustration')) styles.push('illustration');
    if (titleLower.includes('bento')) styles.push('bento');
    if (titleLower.includes('brutalist')) styles.push('brutalist');

    return styles.length > 0 ? styles : ['minimalist'];
  }

  private inferResourceType(title: string): string {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('ui kit') || titleLower.includes('uikit')) return 'ui-kit';
    if (titleLower.includes('design system')) return 'design-system';
    if (titleLower.includes('template')) return 'template';
    if (titleLower.includes('icon')) return 'icons';
    if (titleLower.includes('illustration')) return 'illustrations';
    if (titleLower.includes('component')) return 'components';
    if (titleLower.includes('wireframe')) return 'wireframes';

    return 'file';
  }

  private extractTags(title: string): string[] {
    const words = title.toLowerCase().split(/[\s\-_,()[\]]+/);
    const stopWords = ['the', 'and', 'for', 'a', 'an', 'in', 'on', 'to', 'with', 'by', 'free'];
    const relevantTags = words.filter(word =>
      word.length > 2 && !stopWords.includes(word)
    );
    return [...new Set(relevantTags)].slice(0, 10);
  }
}
