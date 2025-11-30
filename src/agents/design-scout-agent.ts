import type {
  DesignItem,
  DesignProposal,
  DesignTrend,
  CollectorConfig,
  DesignCategory,
  DesignSource,
  DesignStyle,
} from '../types/index.js';
import { CollectorFactory } from '../collectors/index.js';
import { DesignAnalyzer } from '../analyzers/design-analyzer.js';
import { ProposalGenerator } from '../generators/proposal-generator.js';
import { OutputGenerator } from '../generators/output-generator.js';

export interface ScoutOptions {
  sources?: DesignSource[];
  categories?: DesignCategory[];
  styles?: DesignStyle[];
  searchQuery?: string;
  limit?: number;
  sortBy?: 'popular' | 'recent' | 'trending';
}

export interface ProposalOptions {
  targetCategory: DesignCategory;
  targetPlatform?: 'web' | 'ios' | 'android' | 'cross-platform';
  generateOutputs?: boolean;
  outputDir?: string;
}

export class DesignScoutAgent {
  private analyzer: DesignAnalyzer;
  private proposalGenerator: ProposalGenerator;
  private collectedItems: DesignItem[] = [];

  constructor() {
    this.analyzer = new DesignAnalyzer();
    this.proposalGenerator = new ProposalGenerator();
  }

  /**
   * Scout for designs based on options
   */
  async scout(options: ScoutOptions = {}): Promise<DesignItem[]> {
    const config: CollectorConfig = {
      sources: options.sources || ['dribbble', 'awwwards', 'mobbin'],
      categories: options.categories,
      styles: options.styles,
      searchQuery: options.searchQuery,
      limit: options.limit || 30,
      sortBy: options.sortBy || 'popular',
    };

    console.log(`Scouting designs from ${config.sources.join(', ')}...`);

    if (options.searchQuery) {
      this.collectedItems = await CollectorFactory.searchAll(options.searchQuery, config);
    } else {
      this.collectedItems = await CollectorFactory.collectFromAll(config);
    }

    console.log(`Collected ${this.collectedItems.length} design items`);
    return this.collectedItems;
  }

  /**
   * Search for specific designs
   */
  async search(query: string, options: Partial<ScoutOptions> = {}): Promise<DesignItem[]> {
    return this.scout({ ...options, searchQuery: query });
  }

  /**
   * Analyze collected designs
   */
  async analyze(items?: DesignItem[]): Promise<{
    analysis: Awaited<ReturnType<DesignAnalyzer['analyzeDesigns']>>;
    trends: DesignTrend[];
  }> {
    const targetItems = items || this.collectedItems;

    if (targetItems.length === 0) {
      throw new Error('No designs to analyze. Run scout() first.');
    }

    console.log(`Analyzing ${targetItems.length} designs...`);

    const [analysis, trends] = await Promise.all([
      this.analyzer.analyzeDesigns(targetItems),
      this.analyzer.identifyTrends(targetItems),
    ]);

    return { analysis, trends };
  }

  /**
   * Generate a design proposal
   */
  async propose(options: ProposalOptions): Promise<{
    proposal: DesignProposal;
    outputs?: {
      moodboardPath: string;
      reportPath: string;
      snippetsPath: string;
    };
  }> {
    if (this.collectedItems.length === 0) {
      throw new Error('No designs collected. Run scout() first.');
    }

    console.log(`Generating ${options.targetCategory} design proposal...`);

    const proposal = await this.proposalGenerator.generateProposal(
      this.collectedItems,
      options.targetCategory,
      options.targetPlatform || 'web'
    );

    let outputs: {
      moodboardPath: string;
      reportPath: string;
      snippetsPath: string;
    } | undefined;

    if (options.generateOutputs !== false) {
      const outputGenerator = new OutputGenerator(options.outputDir || './output');
      outputs = await outputGenerator.generateAllOutputs(proposal);
      console.log(`Generated outputs:`);
      console.log(`  Moodboard: ${outputs.moodboardPath}`);
      console.log(`  Report: ${outputs.reportPath}`);
      console.log(`  Snippets: ${outputs.snippetsPath}`);
    }

    return { proposal, outputs };
  }

  /**
   * Full pipeline: scout, analyze, and propose
   */
  async run(
    scoutOptions: ScoutOptions,
    proposalOptions: ProposalOptions
  ): Promise<{
    items: DesignItem[];
    analysis: Awaited<ReturnType<DesignAnalyzer['analyzeDesigns']>>;
    trends: DesignTrend[];
    proposal: DesignProposal;
    outputs?: {
      moodboardPath: string;
      reportPath: string;
      snippetsPath: string;
    };
  }> {
    // Scout
    const items = await this.scout(scoutOptions);

    // Analyze
    const { analysis, trends } = await this.analyze();

    // Propose
    const { proposal, outputs } = await this.propose(proposalOptions);

    return { items, analysis, trends, proposal, outputs };
  }

  /**
   * Get collected items
   */
  getCollectedItems(): DesignItem[] {
    return this.collectedItems;
  }

  /**
   * Clear collected items
   */
  clearCollectedItems(): void {
    this.collectedItems = [];
  }

  /**
   * Get a summary for display
   */
  getSummary(): string {
    if (this.collectedItems.length === 0) {
      return 'No designs collected yet.';
    }

    const sources = [...new Set(this.collectedItems.map(i => i.source))];
    const styles = [...new Set(this.collectedItems.flatMap(i => i.styles))];

    return `
Design Scout Summary
====================
Items Collected: ${this.collectedItems.length}
Sources: ${sources.join(', ')}
Styles Found: ${styles.slice(0, 5).join(', ')}${styles.length > 5 ? '...' : ''}
    `.trim();
  }
}

// Singleton instance for CLI usage
let agentInstance: DesignScoutAgent | null = null;

export function getDesignScoutAgent(): DesignScoutAgent {
  if (!agentInstance) {
    agentInstance = new DesignScoutAgent();
  }
  return agentInstance;
}
