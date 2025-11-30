import type { DesignItem, DesignSource, CollectorConfig } from '../types/index.js';

export abstract class BaseCollector {
  protected source: DesignSource;
  protected baseUrl: string;

  constructor(source: DesignSource, baseUrl: string) {
    this.source = source;
    this.baseUrl = baseUrl;
  }

  abstract collect(config: CollectorConfig): Promise<DesignItem[]>;

  abstract search(query: string, config?: Partial<CollectorConfig>): Promise<DesignItem[]>;

  protected generateId(): string {
    return `${this.source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async fetchWithRetry(
    url: string,
    options?: RequestInit,
    retries = 3
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'User-Agent': 'DesignScoutAgent/1.0',
            ...options?.headers,
          },
        });
        if (response.ok) return response;
        if (response.status === 429) {
          // Rate limited, wait and retry
          await this.delay(Math.pow(2, i) * 1000);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay(Math.pow(2, i) * 1000);
      }
    }
    throw new Error('Max retries exceeded');
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected extractColors(html: string): string[] {
    // Extract hex colors from HTML/CSS
    const hexPattern = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;
    const matches = html.match(hexPattern) || [];
    return [...new Set(matches)].slice(0, 10);
  }
}
