import * as fs from 'fs/promises';
import * as path from 'path';
import type { DesignItem, DesignTrend, DesignCategory, DesignStyle, DesignSource } from '../types/index.js';

export interface StoredDesign extends DesignItem {
  savedAt: Date;
  favorite: boolean;
  notes?: string;
  collections: string[];
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  designIds: string[];
}

export interface TrendCache {
  trends: DesignTrend[];
  cachedAt: Date;
  expiresAt: Date;
}

export interface CollectionHistory {
  id: string;
  query?: string;
  categories: DesignCategory[];
  sources: DesignSource[];
  itemCount: number;
  collectedAt: Date;
}

export interface StoreData {
  designs: Record<string, StoredDesign>;
  collections: Record<string, Collection>;
  favorites: string[];
  trendCache: TrendCache | null;
  history: CollectionHistory[];
  version: string;
}

export interface SearchOptions {
  query?: string;
  categories?: DesignCategory[];
  styles?: DesignStyle[];
  sources?: DesignSource[];
  favoritesOnly?: boolean;
  collection?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'savedAt' | 'likes' | 'title';
  sortOrder?: 'asc' | 'desc';
}

const DEFAULT_STORE: StoreData = {
  designs: {},
  collections: {},
  favorites: [],
  trendCache: null,
  history: [],
  version: '1.0.0',
};

export class DesignStore {
  private dataDir: string;
  private storePath: string;
  private data: StoreData | null = null;
  private saveDebounce: NodeJS.Timeout | null = null;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    this.storePath = path.join(dataDir, 'designs.json');
  }

  /**
   * Initialize the store
   */
  async init(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });

    try {
      const content = await fs.readFile(this.storePath, 'utf-8');
      this.data = JSON.parse(content);

      // Migrate if needed
      if (this.data && !this.data.version) {
        this.data = { ...DEFAULT_STORE, ...this.data, version: '1.0.0' };
        await this.save();
      }
    } catch {
      this.data = { ...DEFAULT_STORE };
      await this.save();
    }
  }

  /**
   * Ensure store is initialized
   */
  private ensureInit(): StoreData {
    if (!this.data) {
      throw new Error('Store not initialized. Call init() first.');
    }
    return this.data;
  }

  /**
   * Save store to disk (debounced)
   */
  private async save(): Promise<void> {
    if (this.saveDebounce) {
      clearTimeout(this.saveDebounce);
    }

    this.saveDebounce = setTimeout(async () => {
      const data = this.ensureInit();
      await fs.writeFile(this.storePath, JSON.stringify(data, null, 2), 'utf-8');
    }, 100);
  }

  /**
   * Force immediate save
   */
  async flush(): Promise<void> {
    if (this.saveDebounce) {
      clearTimeout(this.saveDebounce);
      this.saveDebounce = null;
    }
    const data = this.ensureInit();
    await fs.writeFile(this.storePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // ==================== Design Operations ====================

  /**
   * Save a design item
   */
  async saveDesign(item: DesignItem, options?: { favorite?: boolean; notes?: string; collections?: string[] }): Promise<StoredDesign> {
    const data = this.ensureInit();

    // Check for duplicate by URL
    const existing = Object.values(data.designs).find(d => d.sourceUrl === item.sourceUrl);
    if (existing) {
      // Update existing
      const updated: StoredDesign = {
        ...existing,
        ...item,
        savedAt: existing.savedAt,
        favorite: options?.favorite ?? existing.favorite,
        notes: options?.notes ?? existing.notes,
        collections: options?.collections ?? existing.collections,
      };
      data.designs[existing.id] = updated;
      await this.save();
      return updated;
    }

    // Create new
    const stored: StoredDesign = {
      ...item,
      savedAt: new Date(),
      favorite: options?.favorite ?? false,
      notes: options?.notes,
      collections: options?.collections ?? [],
    };

    data.designs[item.id] = stored;
    await this.save();
    return stored;
  }

  /**
   * Save multiple design items
   */
  async saveDesigns(items: DesignItem[]): Promise<StoredDesign[]> {
    const results: StoredDesign[] = [];
    for (const item of items) {
      results.push(await this.saveDesign(item));
    }
    return results;
  }

  /**
   * Get a design by ID
   */
  getDesign(id: string): StoredDesign | null {
    const data = this.ensureInit();
    return data.designs[id] || null;
  }

  /**
   * Get all designs
   */
  getAllDesigns(): StoredDesign[] {
    const data = this.ensureInit();
    return Object.values(data.designs);
  }

  /**
   * Search designs with filters
   */
  searchDesigns(options: SearchOptions = {}): StoredDesign[] {
    const data = this.ensureInit();
    let results = Object.values(data.designs);

    // Filter by query (title, description, tags)
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query) ||
        d.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    // Filter by categories
    if (options.categories?.length) {
      results = results.filter(d => options.categories!.includes(d.category));
    }

    // Filter by styles
    if (options.styles?.length) {
      results = results.filter(d => d.styles.some(s => options.styles!.includes(s)));
    }

    // Filter by sources
    if (options.sources?.length) {
      results = results.filter(d => options.sources!.includes(d.source));
    }

    // Filter favorites only
    if (options.favoritesOnly) {
      results = results.filter(d => d.favorite);
    }

    // Filter by collection
    if (options.collection) {
      results = results.filter(d => d.collections.includes(options.collection!));
    }

    // Sort
    const sortBy = options.sortBy || 'savedAt';
    const sortOrder = options.sortOrder || 'desc';
    results.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'savedAt':
          comparison = new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
          break;
        case 'likes':
          comparison = (a.likes || 0) - (b.likes || 0);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || results.length;
    return results.slice(offset, offset + limit);
  }

  /**
   * Delete a design
   */
  async deleteDesign(id: string): Promise<boolean> {
    const data = this.ensureInit();
    if (data.designs[id]) {
      delete data.designs[id];
      data.favorites = data.favorites.filter(f => f !== id);

      // Remove from collections
      for (const collection of Object.values(data.collections)) {
        collection.designIds = collection.designIds.filter(d => d !== id);
      }

      await this.save();
      return true;
    }
    return false;
  }

  // ==================== Favorites ====================

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const data = this.ensureInit();
    const design = data.designs[id];
    if (!design) return false;

    design.favorite = !design.favorite;

    if (design.favorite) {
      if (!data.favorites.includes(id)) {
        data.favorites.push(id);
      }
    } else {
      data.favorites = data.favorites.filter(f => f !== id);
    }

    await this.save();
    return design.favorite;
  }

  /**
   * Get all favorites
   */
  getFavorites(): StoredDesign[] {
    return this.searchDesigns({ favoritesOnly: true });
  }

  // ==================== Collections ====================

  /**
   * Create a collection
   */
  async createCollection(name: string, description?: string): Promise<Collection> {
    const data = this.ensureInit();

    const collection: Collection = {
      id: `col-${Date.now()}`,
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      designIds: [],
    };

    data.collections[collection.id] = collection;
    await this.save();
    return collection;
  }

  /**
   * Get a collection
   */
  getCollection(id: string): Collection | null {
    const data = this.ensureInit();
    return data.collections[id] || null;
  }

  /**
   * Get all collections
   */
  getAllCollections(): Collection[] {
    const data = this.ensureInit();
    return Object.values(data.collections);
  }

  /**
   * Add design to collection
   */
  async addToCollection(collectionId: string, designId: string): Promise<boolean> {
    const data = this.ensureInit();
    const collection = data.collections[collectionId];
    const design = data.designs[designId];

    if (!collection || !design) return false;

    if (!collection.designIds.includes(designId)) {
      collection.designIds.push(designId);
      collection.updatedAt = new Date();
    }

    if (!design.collections.includes(collectionId)) {
      design.collections.push(collectionId);
    }

    await this.save();
    return true;
  }

  /**
   * Remove design from collection
   */
  async removeFromCollection(collectionId: string, designId: string): Promise<boolean> {
    const data = this.ensureInit();
    const collection = data.collections[collectionId];
    const design = data.designs[designId];

    if (!collection) return false;

    collection.designIds = collection.designIds.filter(id => id !== designId);
    collection.updatedAt = new Date();

    if (design) {
      design.collections = design.collections.filter(id => id !== collectionId);
    }

    await this.save();
    return true;
  }

  /**
   * Get designs in a collection
   */
  getCollectionDesigns(collectionId: string): StoredDesign[] {
    return this.searchDesigns({ collection: collectionId });
  }

  /**
   * Delete a collection
   */
  async deleteCollection(id: string): Promise<boolean> {
    const data = this.ensureInit();
    const collection = data.collections[id];
    if (!collection) return false;

    // Remove collection reference from designs
    for (const designId of collection.designIds) {
      const design = data.designs[designId];
      if (design) {
        design.collections = design.collections.filter(c => c !== id);
      }
    }

    delete data.collections[id];
    await this.save();
    return true;
  }

  // ==================== Trend Cache ====================

  /**
   * Cache trends
   */
  async cacheTrends(trends: DesignTrend[], ttlHours: number = 24): Promise<void> {
    const data = this.ensureInit();

    data.trendCache = {
      trends,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
    };

    await this.save();
  }

  /**
   * Get cached trends if valid
   */
  getCachedTrends(): DesignTrend[] | null {
    const data = this.ensureInit();

    if (!data.trendCache) return null;

    const now = new Date();
    if (new Date(data.trendCache.expiresAt) < now) {
      return null; // Cache expired
    }

    return data.trendCache.trends;
  }

  /**
   * Clear trend cache
   */
  async clearTrendCache(): Promise<void> {
    const data = this.ensureInit();
    data.trendCache = null;
    await this.save();
  }

  // ==================== History ====================

  /**
   * Add collection history entry
   */
  async addHistory(entry: Omit<CollectionHistory, 'id' | 'collectedAt'>): Promise<CollectionHistory> {
    const data = this.ensureInit();

    const historyEntry: CollectionHistory = {
      ...entry,
      id: `hist-${Date.now()}`,
      collectedAt: new Date(),
    };

    data.history.unshift(historyEntry);

    // Keep only last 100 entries
    if (data.history.length > 100) {
      data.history = data.history.slice(0, 100);
    }

    await this.save();
    return historyEntry;
  }

  /**
   * Get collection history
   */
  getHistory(limit: number = 20): CollectionHistory[] {
    const data = this.ensureInit();
    return data.history.slice(0, limit);
  }

  /**
   * Clear history
   */
  async clearHistory(): Promise<void> {
    const data = this.ensureInit();
    data.history = [];
    await this.save();
  }

  // ==================== Stats ====================

  /**
   * Get store statistics
   */
  getStats(): {
    totalDesigns: number;
    totalFavorites: number;
    totalCollections: number;
    designsBySource: Record<string, number>;
    designsByCategory: Record<string, number>;
    designsByStyle: Record<string, number>;
  } {
    const data = this.ensureInit();
    const designs = Object.values(data.designs);

    const designsBySource: Record<string, number> = {};
    const designsByCategory: Record<string, number> = {};
    const designsByStyle: Record<string, number> = {};

    for (const design of designs) {
      designsBySource[design.source] = (designsBySource[design.source] || 0) + 1;
      designsByCategory[design.category] = (designsByCategory[design.category] || 0) + 1;
      for (const style of design.styles) {
        designsByStyle[style] = (designsByStyle[style] || 0) + 1;
      }
    }

    return {
      totalDesigns: designs.length,
      totalFavorites: data.favorites.length,
      totalCollections: Object.keys(data.collections).length,
      designsBySource,
      designsByCategory,
      designsByStyle,
    };
  }

  // ==================== Export/Import ====================

  /**
   * Export store data
   */
  async export(): Promise<StoreData> {
    return this.ensureInit();
  }

  /**
   * Import store data (merges with existing)
   */
  async import(importData: Partial<StoreData>, merge: boolean = true): Promise<void> {
    const data = this.ensureInit();

    if (merge) {
      // Merge designs
      if (importData.designs) {
        for (const [id, design] of Object.entries(importData.designs)) {
          if (!data.designs[id]) {
            data.designs[id] = design;
          }
        }
      }

      // Merge collections
      if (importData.collections) {
        for (const [id, collection] of Object.entries(importData.collections)) {
          if (!data.collections[id]) {
            data.collections[id] = collection;
          }
        }
      }

      // Merge favorites
      if (importData.favorites) {
        data.favorites = [...new Set([...data.favorites, ...importData.favorites])];
      }
    } else {
      // Replace all
      this.data = { ...DEFAULT_STORE, ...importData };
    }

    await this.save();
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.data = { ...DEFAULT_STORE };
    await this.save();
  }
}

// Singleton instance
let storeInstance: DesignStore | null = null;

export function getDesignStore(dataDir?: string): DesignStore {
  if (!storeInstance) {
    storeInstance = new DesignStore(dataDir);
  }
  return storeInstance;
}
