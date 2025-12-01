import type { DesignSource, DesignItem, CollectorConfig } from '../types/index.js';
import { BaseCollector } from './base-collector.js';
import { DribbbleCollector } from './dribbble-collector.js';
import { AwwwardsCollector } from './awwwards-collector.js';
import { MobbinCollector } from './mobbin-collector.js';
import { BehanceCollector } from './behance-collector.js';
import { FigmaCollector } from './figma-collector.js';
import { PinterestCollector } from './pinterest-collector.js';
import { ProductHuntCollector } from './producthunt-collector.js';
import { WebSearchCollector, createSampleDesignItems } from './web-search-collector.js';

export { BaseCollector } from './base-collector.js';
export { DribbbleCollector } from './dribbble-collector.js';
export { AwwwardsCollector } from './awwwards-collector.js';
export { MobbinCollector } from './mobbin-collector.js';
export { BehanceCollector } from './behance-collector.js';
export { FigmaCollector } from './figma-collector.js';
export { PinterestCollector } from './pinterest-collector.js';
export { ProductHuntCollector } from './producthunt-collector.js';
export { WebSearchCollector, createSampleDesignItems } from './web-search-collector.js';
export type { SearchQuery, SearchResult } from './web-search-collector.js';

export class CollectorFactory {
  private static collectors: Map<DesignSource, BaseCollector> = new Map();

  static getCollector(source: DesignSource): BaseCollector {
    if (!this.collectors.has(source)) {
      this.collectors.set(source, this.createCollector(source));
    }
    return this.collectors.get(source)!;
  }

  private static createCollector(source: DesignSource): BaseCollector {
    switch (source) {
      case 'dribbble':
        return new DribbbleCollector();
      case 'awwwards':
        return new AwwwardsCollector();
      case 'mobbin':
        return new MobbinCollector();
      case 'behance':
        return new BehanceCollector();
      case 'figma':
        return new FigmaCollector();
      case 'pinterest':
        return new PinterestCollector();
      case 'producthunt':
        return new ProductHuntCollector();
      case 'appstore':
      case 'playstore':
      case 'cssawards':
      case 'siteinspire':
      case 'layers':
        // Placeholder - return Dribbble as fallback for now
        console.warn(`Collector for ${source} not yet implemented, using Dribbble as fallback`);
        return new DribbbleCollector();
      default:
        throw new Error(`Unknown design source: ${source}`);
    }
  }

  static async collectFromAll(config: CollectorConfig): Promise<DesignItem[]> {
    const allItems: DesignItem[] = [];
    const sources = config.sources.length ? config.sources : ['dribbble', 'awwwards', 'mobbin'] as DesignSource[];

    const limitPerSource = Math.ceil((config.limit || 30) / sources.length);

    const promises = sources.map(async (source) => {
      try {
        const collector = this.getCollector(source);
        const items = await collector.collect({ ...config, limit: limitPerSource });
        return items;
      } catch (error) {
        console.error(`Error collecting from ${source}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    for (const items of results) {
      allItems.push(...items);
    }

    // Sort by popularity/recency and limit
    return allItems
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, config.limit || 30);
  }

  static async searchAll(query: string, config?: Partial<CollectorConfig>): Promise<DesignItem[]> {
    const allItems: DesignItem[] = [];
    const sources = config?.sources?.length ? config.sources : ['dribbble', 'awwwards', 'mobbin'] as DesignSource[];

    const limitPerSource = Math.ceil((config?.limit || 30) / sources.length);

    const promises = sources.map(async (source) => {
      try {
        const collector = this.getCollector(source);
        const items = await collector.search(query, { ...config, limit: limitPerSource });
        return items;
      } catch (error) {
        console.error(`Error searching ${source}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    for (const items of results) {
      allItems.push(...items);
    }

    return allItems.slice(0, config?.limit || 30);
  }
}
