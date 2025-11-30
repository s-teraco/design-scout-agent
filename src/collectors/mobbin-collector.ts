import * as cheerio from 'cheerio';
import type { DesignItem, CollectorConfig, DesignCategory, DesignStyle } from '../types/index.js';
import { BaseCollector } from './base-collector.js';

export class MobbinCollector extends BaseCollector {
  constructor() {
    super('mobbin', 'https://mobbin.com');
  }

  async collect(config: CollectorConfig): Promise<DesignItem[]> {
    const items: DesignItem[] = [];
    const limit = config.limit || 20;

    // Mobbin specializes in mobile app UI patterns
    const platform = this.determinePlatform(config.categories);
    const endpoints = this.buildEndpoints(platform, config);

    for (const endpoint of endpoints) {
      try {
        const response = await this.fetchWithRetry(endpoint);
        const html = await response.text();
        const $ = cheerio.load(html);

        $('[data-testid="screen-card"], .screen-card, article').each((_, element) => {
          if (items.length >= limit) return false;

          const $el = $(element);
          const item = this.parseDesignItem($, $el, config, platform);
          if (item) {
            items.push(item);
          }
        });

        await this.delay(1200);
      } catch (error) {
        console.error(`Error collecting from ${endpoint}:`, error);
      }
    }

    return items.slice(0, limit);
  }

  async search(query: string, config?: Partial<CollectorConfig>): Promise<DesignItem[]> {
    const platform = config?.categories ? this.determinePlatform(config.categories) : 'ios';
    const searchUrl = `${this.baseUrl}/browse/${platform}/apps?q=${encodeURIComponent(query)}`;
    const items: DesignItem[] = [];
    const limit = config?.limit || 20;

    try {
      const response = await this.fetchWithRetry(searchUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      $('[data-testid="screen-card"], .screen-card, article').each((_, element) => {
        if (items.length >= limit) return false;

        const $el = $(element);
        const item = this.parseDesignItem($, $el, { ...config, searchQuery: query } as CollectorConfig, platform);
        if (item) {
          items.push(item);
        }
      });
    } catch (error) {
      console.error(`Error searching Mobbin for "${query}":`, error);
    }

    return items;
  }

  private determinePlatform(categories?: DesignCategory[]): 'ios' | 'android' | 'web' {
    if (!categories?.length) return 'ios';

    if (categories.includes('mobile-android')) return 'android';
    if (categories.includes('mobile-ios')) return 'ios';
    if (categories.some(c => ['web', 'landing-page', 'dashboard', 'e-commerce'].includes(c))) return 'web';

    return 'ios';
  }

  private buildEndpoints(platform: 'ios' | 'android' | 'web', config: CollectorConfig): string[] {
    const endpoints: string[] = [];
    const basePath = `${this.baseUrl}/browse/${platform}`;

    // Pattern-based endpoints for common UI patterns
    const patterns = [
      'onboarding',
      'login',
      'home',
      'profile',
      'settings',
      'checkout',
      'search',
      'navigation',
    ];

    if (config.searchQuery) {
      endpoints.push(`${basePath}/apps?q=${encodeURIComponent(config.searchQuery)}`);
    } else if (config.categories?.length) {
      // Map categories to Mobbin patterns
      for (const category of config.categories) {
        const pattern = this.categoryToPattern(category);
        if (pattern) {
          endpoints.push(`${basePath}/patterns/${pattern}`);
        }
      }
    }

    // Default: get trending/popular
    if (!endpoints.length) {
      endpoints.push(`${basePath}/apps`);
    }

    return endpoints;
  }

  private categoryToPattern(category: DesignCategory): string | null {
    const mapping: Record<DesignCategory, string | null> = {
      'web': null,
      'mobile-ios': null,
      'mobile-android': null,
      'dashboard': 'dashboard',
      'landing-page': 'home',
      'e-commerce': 'checkout',
      'saas': 'dashboard',
      'portfolio': 'profile',
      'social': 'feed',
      'fintech': 'payment',
      'healthcare': 'appointment',
      'education': 'course',
    };
    return mapping[category];
  }

  private parseDesignItem(
    $: cheerio.CheerioAPI,
    $el: cheerio.Cheerio<any>,
    config: CollectorConfig,
    platform: 'ios' | 'android' | 'web'
  ): DesignItem | null {
    try {
      const $link = $el.find('a').first();
      const href = $link.attr('href') || '';

      const $img = $el.find('img').first();
      const imgSrc = $img.attr('src') || $img.attr('data-src') || '';
      const altText = $img.attr('alt') || '';

      // App name and screen type
      const $appName = $el.find('[data-testid="app-name"], .app-name, h3, h4').first();
      const appName = $appName.text().trim() || altText.split(' - ')[0] || 'Untitled App';

      const $screenType = $el.find('[data-testid="screen-type"], .screen-type, .pattern-name').first();
      const screenType = $screenType.text().trim() || 'Screen';

      const title = `${appName} - ${screenType}`;

      // Extract multiple screenshots if available
      const imageUrls: string[] = [];
      $el.find('img').each((_, imgEl) => {
        const src = $(imgEl).attr('src') || $(imgEl).attr('data-src');
        if (src && !imageUrls.includes(src)) {
          imageUrls.push(src);
        }
      });

      // Determine category based on platform
      const category: DesignCategory = platform === 'android' ? 'mobile-android' :
                                        platform === 'ios' ? 'mobile-ios' : 'web';

      return {
        id: this.generateId(),
        title,
        description: `Mobile UI pattern from ${appName}`,
        source: 'mobbin',
        sourceUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
        imageUrls: imageUrls.length ? imageUrls : (imgSrc ? [imgSrc] : []),
        thumbnailUrl: imgSrc || undefined,
        designer: appName,
        designerUrl: undefined,
        category,
        styles: this.inferMobileStyles($, $el),
        colors: [],
        tags: [platform, screenType.toLowerCase(), ...(config.searchQuery ? [config.searchQuery] : [])],
        collectedAt: new Date(),
        metadata: {
          platform,
          screenType,
          appName,
        },
      };
    } catch {
      return null;
    }
  }

  private inferMobileStyles($: cheerio.CheerioAPI, $el: cheerio.Cheerio<any>): DesignStyle[] {
    const styles: DesignStyle[] = [];
    const text = $el.text().toLowerCase();
    const imgSrc = $el.find('img').attr('src')?.toLowerCase() || '';

    // Analyze based on visual cues in image name or surrounding text
    if (text.includes('dark') || imgSrc.includes('dark')) {
      styles.push('dark-mode');
    }
    if (text.includes('minimal') || text.includes('clean')) {
      styles.push('minimalist');
    }
    if (text.includes('gradient') || text.includes('colorful')) {
      styles.push('gradient');
    }
    if (text.includes('card') || text.includes('bento')) {
      styles.push('bento');
    }

    return styles.length ? styles : ['minimalist'];
  }
}
