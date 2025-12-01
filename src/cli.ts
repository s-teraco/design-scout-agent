#!/usr/bin/env node

import { Command } from 'commander';
import { getDesignScoutAgent } from './agents/index.js';
import type { DesignSource, DesignCategory, DesignStyle } from './types/index.js';

const program = new Command();

program
  .name('design-scout')
  .description('AI-powered design trend collection and proposal agent')
  .version('1.0.0');

program
  .command('scout')
  .description('Scout for design inspiration from multiple sources')
  .option('-s, --sources <sources>', 'Comma-separated sources (dribbble,awwwards,mobbin,behance,figma,pinterest)', 'dribbble,awwwards,mobbin')
  .option('-c, --category <category>', 'Target category (web,mobile-ios,dashboard,etc)')
  .option('-q, --query <query>', 'Search query')
  .option('-l, --limit <number>', 'Maximum items to collect', '30')
  .option('--sort <type>', 'Sort by: popular, recent, trending', 'popular')
  .option('--save', 'Save collected designs to local store')
  .action(async (options) => {
    const agent = getDesignScoutAgent();

    const sources = options.sources.split(',') as DesignSource[];
    const categories = options.category ? [options.category] as DesignCategory[] : undefined;

    try {
      const items = await agent.scout({
        sources,
        categories,
        searchQuery: options.query,
        limit: parseInt(options.limit),
        sortBy: options.sort,
        saveToStore: options.save,
      });

      console.log('\n' + agent.getSummary());
      console.log('\nTop 5 Items:');
      items.slice(0, 5).forEach((item, i) => {
        console.log(`${i + 1}. ${item.title} (${item.source})`);
        console.log(`   Styles: ${item.styles.join(', ')}`);
        console.log(`   URL: ${item.sourceUrl}`);
      });

      if (options.save) {
        console.log('\n✓ Designs saved to local store');
      }
    } catch (error) {
      console.error('Error scouting:', error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze collected designs for trends')
  .action(async () => {
    const agent = getDesignScoutAgent();

    try {
      const { analysis, trends } = await agent.analyze();

      console.log('\n=== Design Analysis ===\n');
      console.log('Dominant Styles:', analysis.dominantStyles.join(', '));
      console.log('Modernity Score:', analysis.modernityScore.toFixed(0));
      console.log('Uniqueness Score:', analysis.uniquenessScore.toFixed(0));

      console.log('\n=== Top Trends ===\n');
      trends.slice(0, 5).forEach((trend, i) => {
        console.log(`${i + 1}. ${trend.name} (${trend.popularity.toFixed(0)}% popularity)`);
        console.log(`   ${trend.description}`);
        console.log(`   Characteristics: ${trend.keyCharacteristics.slice(0, 3).join(', ')}`);
        console.log('');
      });
    } catch (error) {
      console.error('Error analyzing:', error);
      process.exit(1);
    }
  });

program
  .command('propose')
  .description('Generate a design proposal based on collected designs')
  .requiredOption('-c, --category <category>', 'Target category (web, mobile-ios, dashboard, landing-page, etc)')
  .option('-p, --platform <platform>', 'Target platform (web, ios, android, cross-platform)', 'web')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('--no-outputs', 'Skip generating output files')
  .action(async (options) => {
    const agent = getDesignScoutAgent();

    try {
      const { proposal, outputs } = await agent.propose({
        targetCategory: options.category as DesignCategory,
        targetPlatform: options.platform,
        generateOutputs: options.outputs,
        outputDir: options.output,
      });

      console.log('\n=== Design Proposal Generated ===\n');
      console.log(`Title: ${proposal.title}`);
      console.log(`Category: ${proposal.targetCategory}`);
      console.log(`Platform: ${proposal.targetPlatform}`);
      console.log(`Trends: ${proposal.trends.slice(0, 3).map(t => t.name).join(', ')}`);

      console.log('\nColor Palette:');
      console.log(`  Primary: ${proposal.colorPalette.primary}`);
      console.log(`  Secondary: ${proposal.colorPalette.secondary}`);
      console.log(`  Accent: ${proposal.colorPalette.accent}`);

      if (outputs) {
        console.log('\nGenerated Files:');
        console.log(`  Moodboard: ${outputs.moodboardPath}`);
        console.log(`  Report: ${outputs.reportPath}`);
        console.log(`  Snippets: ${outputs.snippetsPath}`);
      }
    } catch (error) {
      console.error('Error generating proposal:', error);
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Run full pipeline: scout, analyze, and propose')
  .option('-s, --sources <sources>', 'Comma-separated sources', 'dribbble,awwwards,mobbin')
  .option('-q, --query <query>', 'Search query')
  .option('-l, --limit <number>', 'Maximum items to collect', '30')
  .requiredOption('-c, --category <category>', 'Target category')
  .option('-p, --platform <platform>', 'Target platform', 'web')
  .option('-o, --output <dir>', 'Output directory', './output')
  .action(async (options) => {
    const agent = getDesignScoutAgent();

    try {
      console.log('Starting Design Scout pipeline...\n');

      const result = await agent.run(
        {
          sources: options.sources.split(',') as DesignSource[],
          searchQuery: options.query,
          limit: parseInt(options.limit),
        },
        {
          targetCategory: options.category as DesignCategory,
          targetPlatform: options.platform,
          outputDir: options.output,
        }
      );

      console.log('\n=== Pipeline Complete ===\n');
      console.log(`Collected: ${result.items.length} designs`);
      console.log(`Trends Found: ${result.trends.length}`);
      console.log(`Proposal: ${result.proposal.title}`);

      if (result.outputs) {
        console.log('\nOutputs:');
        console.log(`  ${result.outputs.moodboardPath}`);
        console.log(`  ${result.outputs.reportPath}`);
        console.log(`  ${result.outputs.snippetsPath}`);
      }
    } catch (error) {
      console.error('Error running pipeline:', error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show statistics from the design store')
  .action(async () => {
    const agent = getDesignScoutAgent();

    try {
      const stats = await agent.getStats();

      console.log('\n=== Design Store Statistics ===\n');
      console.log(`Total Designs: ${stats.totalDesigns}`);
      console.log(`Favorites: ${stats.totalFavorites}`);
      console.log(`Collections: ${stats.totalCollections}`);

      if (Object.keys(stats.designsBySource).length > 0) {
        console.log('\nBy Source:');
        Object.entries(stats.designsBySource).forEach(([source, count]) => {
          console.log(`  ${source}: ${count}`);
        });
      }

      if (Object.keys(stats.designsByCategory).length > 0) {
        console.log('\nBy Category:');
        Object.entries(stats.designsByCategory).forEach(([cat, count]) => {
          console.log(`  ${cat}: ${count}`);
        });
      }

      if (Object.keys(stats.designsByStyle).length > 0) {
        console.log('\nTop Styles:');
        Object.entries(stats.designsByStyle)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([style, count]) => {
            console.log(`  ${style}: ${count}`);
          });
      }
    } catch (error) {
      console.error('Error getting stats:', error);
      process.exit(1);
    }
  });

program
  .command('history')
  .description('Show collection history')
  .option('-l, --limit <number>', 'Number of entries to show', '10')
  .action(async (options) => {
    const agent = getDesignScoutAgent();

    try {
      const history = await agent.getHistory(parseInt(options.limit));

      console.log('\n=== Collection History ===\n');
      if (history.length === 0) {
        console.log('No history yet. Run `design-scout scout --save` to start collecting.');
      } else {
        history.forEach((entry, i) => {
          const date = new Date(entry.collectedAt).toLocaleString();
          console.log(`${i + 1}. ${date}`);
          console.log(`   Query: ${entry.query || '(no query)'}`);
          console.log(`   Sources: ${entry.sources.join(', ')}`);
          console.log(`   Items: ${entry.itemCount}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('Error getting history:', error);
      process.exit(1);
    }
  });

program.parse();
