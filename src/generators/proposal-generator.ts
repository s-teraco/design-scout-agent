import type {
  DesignItem,
  DesignProposal,
  DesignTrend,
  DesignCategory,
  MoodboardItem,
  TypographyRecommendation,
  LayoutSuggestion,
  CodeSnippet,
  ColorPalette,
  AnalysisResult,
} from '../types/index.js';
import { DesignAnalyzer } from '../analyzers/design-analyzer.js';

export class ProposalGenerator {
  private analyzer: DesignAnalyzer;

  constructor() {
    this.analyzer = new DesignAnalyzer();
  }

  async generateProposal(
    items: DesignItem[],
    targetCategory: DesignCategory,
    targetPlatform: 'web' | 'ios' | 'android' | 'cross-platform' = 'web'
  ): Promise<DesignProposal> {
    const analysis = await this.analyzer.analyzeDesigns(items);
    const trends = await this.analyzer.identifyTrends(items);
    const colorPalette = this.analyzer.generateColorPalette(items);

    const moodboard = this.createMoodboard(items, analysis);
    const typography = this.generateTypographyRecommendations(analysis, targetPlatform);
    const layouts = this.generateLayoutSuggestions(analysis, targetCategory, targetPlatform);
    const snippets = this.generateCodeSnippets(colorPalette, analysis, targetPlatform);

    return {
      id: `proposal-${Date.now()}`,
      title: `${this.formatCategory(targetCategory)} Design Proposal`,
      targetCategory,
      targetPlatform,
      moodboard,
      trends,
      colorPalette,
      typographyRecommendations: typography,
      layoutSuggestions: layouts,
      codeSnippets: snippets,
      references: items.slice(0, 10),
      createdAt: new Date(),
    };
  }

  private createMoodboard(items: DesignItem[], analysis: AnalysisResult): MoodboardItem[] {
    // Select diverse items for moodboard
    const selectedItems: DesignItem[] = [];
    const usedStyles = new Set<string>();

    // Prioritize items with dominant styles
    for (const style of analysis.dominantStyles) {
      const styleItem = items.find(
        item => item.styles.includes(style) && !selectedItems.includes(item)
      );
      if (styleItem && !usedStyles.has(style)) {
        selectedItems.push(styleItem);
        usedStyles.add(style);
      }
    }

    // Fill remaining slots with high-engagement items
    const remaining = items
      .filter(item => !selectedItems.includes(item))
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 8 - selectedItems.length);

    selectedItems.push(...remaining);

    return selectedItems.slice(0, 8).map(item => ({
      imageUrl: item.imageUrls[0] || item.thumbnailUrl || '',
      title: item.title,
      source: item.source,
      relevance: this.generateRelevanceNote(item, analysis),
      aspectsToAdopt: this.identifyAspectsToAdopt(item),
    }));
  }

  private generateRelevanceNote(item: DesignItem, analysis: AnalysisResult): string {
    const matchingStyles = item.styles.filter(s => analysis.dominantStyles.includes(s));

    if (matchingStyles.length > 0) {
      return `Exemplifies ${matchingStyles.join(' and ')} trends`;
    }

    if ((item.likes || 0) > 1000) {
      return 'High engagement design with proven appeal';
    }

    return 'Unique approach worth considering';
  }

  private identifyAspectsToAdopt(item: DesignItem): string[] {
    const aspects: string[] = [];

    for (const style of item.styles) {
      switch (style) {
        case 'minimalist':
          aspects.push('Clean whitespace usage', 'Focused content hierarchy');
          break;
        case 'glassmorphism':
          aspects.push('Frosted glass effect', 'Layered transparency');
          break;
        case 'bento':
          aspects.push('Grid-based organization', 'Varied card sizes');
          break;
        case 'dark-mode':
          aspects.push('Dark color scheme', 'Accent color usage');
          break;
        case 'gradient':
          aspects.push('Smooth color transitions', 'Vibrant backgrounds');
          break;
        case '3d':
          aspects.push('Depth and dimension', 'Interactive elements');
          break;
      }
    }

    return [...new Set(aspects)].slice(0, 4);
  }

  private generateTypographyRecommendations(
    analysis: AnalysisResult,
    platform: string
  ): TypographyRecommendation[] {
    const isModern = analysis.modernityScore > 70;
    const isMinimal = analysis.dominantStyles.includes('minimalist');

    const headingFont = isModern ? 'Inter' : isMinimal ? 'Space Grotesk' : 'Poppins';
    const bodyFont = isMinimal ? 'Inter' : 'Open Sans';

    const baseFontSize = platform === 'web' ? '16px' : '17px';

    return [
      {
        role: 'heading',
        fontFamily: headingFont,
        fontSize: platform === 'web' ? '48px' : '34px',
        fontWeight: '700',
        lineHeight: '1.2',
        letterSpacing: '-0.02em',
        googleFontsUrl: `https://fonts.google.com/specimen/${headingFont.replace(' ', '+')}`,
      },
      {
        role: 'subheading',
        fontFamily: headingFont,
        fontSize: platform === 'web' ? '24px' : '22px',
        fontWeight: '600',
        lineHeight: '1.3',
        letterSpacing: '-0.01em',
      },
      {
        role: 'body',
        fontFamily: bodyFont,
        fontSize: baseFontSize,
        fontWeight: '400',
        lineHeight: '1.6',
        googleFontsUrl: `https://fonts.google.com/specimen/${bodyFont.replace(' ', '+')}`,
      },
      {
        role: 'caption',
        fontFamily: bodyFont,
        fontSize: platform === 'web' ? '14px' : '13px',
        fontWeight: '400',
        lineHeight: '1.5',
      },
      {
        role: 'button',
        fontFamily: headingFont,
        fontSize: platform === 'web' ? '16px' : '17px',
        fontWeight: '600',
        lineHeight: '1',
        letterSpacing: '0.01em',
      },
    ];
  }

  private generateLayoutSuggestions(
    analysis: AnalysisResult,
    category: DesignCategory,
    platform: string
  ): LayoutSuggestion[] {
    const suggestions: LayoutSuggestion[] = [];

    // Primary layout based on category
    if (category === 'dashboard' || category === 'saas') {
      suggestions.push({
        name: 'Sidebar + Main Content',
        description: 'Fixed sidebar navigation with scrollable main content area',
        gridSystem: 'CSS Grid with named areas',
        breakpoints: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
        },
        spacing: {
          xs: '4px',
          sm: '8px',
          md: '16px',
          lg: '24px',
          xl: '32px',
        },
        componentArrangement: 'sidebar-left, header-top, main-center',
      });
    }

    if (category === 'landing-page' || category === 'portfolio') {
      suggestions.push({
        name: 'Full-width Sections',
        description: 'Vertical stacking of full-width hero, features, and CTA sections',
        gridSystem: 'CSS Grid with max-width container',
        breakpoints: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1440px',
        },
        spacing: {
          section: '80px',
          component: '32px',
          element: '16px',
        },
        componentArrangement: 'hero-top, features-stacked, cta-bottom, footer',
      });
    }

    if (analysis.dominantStyles.includes('bento')) {
      suggestions.push({
        name: 'Bento Grid Layout',
        description: 'Asymmetric grid with varied card sizes for visual interest',
        gridSystem: 'CSS Grid with span variations',
        breakpoints: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
        },
        spacing: {
          gap: '16px',
          padding: '24px',
        },
        componentArrangement: 'mixed-size-cards in 4-6 column grid',
      });
    }

    // Mobile-specific layout
    if (platform !== 'web') {
      suggestions.push({
        name: 'Tab Bar Navigation',
        description: 'Bottom tab bar with 4-5 main sections, content scrolls above',
        gridSystem: 'Flexbox for screens, Stack for content',
        breakpoints: {
          compact: '0px',
          regular: '390px',
          large: '428px',
        },
        spacing: {
          safeArea: 'env(safe-area-inset-bottom)',
          contentPadding: '16px',
          sectionGap: '24px',
        },
        componentArrangement: 'status-bar-top, content-scroll, tab-bar-bottom',
      });
    }

    return suggestions;
  }

  private generateCodeSnippets(
    colorPalette: ColorPalette,
    analysis: AnalysisResult,
    platform: string
  ): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];

    // Color variables
    snippets.push({
      name: 'Color Palette',
      description: 'CSS custom properties for the design system colors',
      language: 'css',
      code: `:root {
  --color-primary: ${colorPalette.primary};
  --color-secondary: ${colorPalette.secondary};
  --color-accent: ${colorPalette.accent};
  --color-background: ${colorPalette.background};
  --color-surface: ${colorPalette.surface};
  --color-text: ${colorPalette.text};
  --color-text-secondary: ${colorPalette.textSecondary};
  --color-success: ${colorPalette.success};
  --color-warning: ${colorPalette.warning};
  --color-error: ${colorPalette.error};
}`,
      usage: 'Add to your global CSS file or :root selector',
    });

    // Tailwind config
    snippets.push({
      name: 'Tailwind Configuration',
      description: 'Tailwind CSS theme extension with custom colors',
      language: 'tailwind',
      code: `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '${colorPalette.primary}',
        secondary: '${colorPalette.secondary}',
        accent: '${colorPalette.accent}',
        background: '${colorPalette.background}',
        surface: '${colorPalette.surface}',
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
        body: ['Open Sans', 'sans-serif'],
      },
    },
  },
}`,
      usage: 'Merge with your existing tailwind.config.js',
    });

    // Style-specific snippets
    if (analysis.dominantStyles.includes('glassmorphism')) {
      snippets.push({
        name: 'Glassmorphism Effect',
        description: 'Frosted glass effect for cards and modals',
        language: 'css',
        code: `.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}

.glass-dark {
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}`,
        usage: 'Apply .glass class to cards, modals, or overlays',
      });
    }

    if (analysis.dominantStyles.includes('bento')) {
      snippets.push({
        name: 'Bento Grid',
        description: 'CSS Grid setup for bento-style layouts',
        language: 'css',
        code: `.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.bento-item {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
}

.bento-item.large {
  grid-column: span 2;
  grid-row: span 2;
}

.bento-item.wide {
  grid-column: span 2;
}

.bento-item.tall {
  grid-row: span 2;
}

@media (max-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}`,
        usage: 'Use with .bento-item children, add .large/.wide/.tall modifiers',
      });
    }

    if (analysis.dominantStyles.includes('gradient')) {
      snippets.push({
        name: 'Gradient Utilities',
        description: 'Reusable gradient backgrounds',
        language: 'css',
        code: `.gradient-primary {
  background: linear-gradient(135deg, ${colorPalette.primary} 0%, ${colorPalette.accent} 100%);
}

.gradient-subtle {
  background: linear-gradient(180deg, ${colorPalette.background} 0%, ${colorPalette.surface} 100%);
}

.gradient-text {
  background: linear-gradient(135deg, ${colorPalette.primary} 0%, ${colorPalette.accent} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-border {
  position: relative;
  background: var(--color-surface);
  border-radius: 16px;
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, ${colorPalette.primary}, ${colorPalette.accent});
  border-radius: inherit;
  z-index: -1;
}`,
        usage: 'Apply gradient classes to elements for vibrant effects',
      });
    }

    // Button component
    snippets.push({
      name: 'Button Component',
      description: 'Primary and secondary button styles',
      language: 'css',
      code: `.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 16px;
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: ${colorPalette.primary};
  color: white;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-secondary {
  background: transparent;
  color: ${colorPalette.primary};
  border: 2px solid ${colorPalette.primary};
}

.btn-secondary:hover {
  background: ${colorPalette.primary};
  color: white;
}`,
      usage: 'Use .btn with .btn-primary or .btn-secondary modifier',
    });

    return snippets;
  }

  private formatCategory(category: DesignCategory): string {
    const names: Record<DesignCategory, string> = {
      'web': 'Web Application',
      'mobile-ios': 'iOS Mobile App',
      'mobile-android': 'Android Mobile App',
      'dashboard': 'Dashboard',
      'landing-page': 'Landing Page',
      'e-commerce': 'E-commerce',
      'saas': 'SaaS Platform',
      'portfolio': 'Portfolio',
      'social': 'Social Platform',
      'fintech': 'Fintech',
      'healthcare': 'Healthcare',
      'education': 'Education',
    };
    return names[category] || category;
  }
}
