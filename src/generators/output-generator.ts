import * as fs from 'fs/promises';
import * as path from 'path';
import type { DesignProposal, DesignItem, MoodboardItem } from '../types/index.js';

export class OutputGenerator {
  private outputDir: string;

  constructor(outputDir: string = './output') {
    this.outputDir = outputDir;
  }

  async generateAllOutputs(proposal: DesignProposal): Promise<{
    moodboardPath: string;
    reportPath: string;
    snippetsPath: string;
  }> {
    await this.ensureOutputDirs();

    const [moodboardPath, reportPath, snippetsPath] = await Promise.all([
      this.generateMoodboardHtml(proposal),
      this.generateDesignReport(proposal),
      this.generateCodeSnippetsFile(proposal),
    ]);

    return { moodboardPath, reportPath, snippetsPath };
  }

  private async ensureOutputDirs(): Promise<void> {
    const dirs = ['moodboards', 'reports', 'snippets'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(this.outputDir, dir), { recursive: true });
    }
  }

  async generateMoodboardHtml(proposal: DesignProposal): Promise<string> {
    const timestamp = Date.now();
    const filename = `moodboard-${proposal.targetCategory}-${timestamp}.html`;
    const filepath = path.join(this.outputDir, 'moodboards', filename);

    const html = this.createMoodboardHtml(proposal);
    await fs.writeFile(filepath, html, 'utf-8');

    return filepath;
  }

  private createMoodboardHtml(proposal: DesignProposal): string {
    const { colorPalette, moodboard, trends } = proposal;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${proposal.title} - Moodboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${colorPalette.background};
      color: ${colorPalette.text};
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 48px; font-weight: 700; margin-bottom: 8px; }
    .subtitle { color: ${colorPalette.textSecondary}; font-size: 18px; margin-bottom: 40px; }

    .section { margin-bottom: 60px; }
    .section-title { font-size: 24px; font-weight: 600; margin-bottom: 24px; }

    .color-palette {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .color-swatch {
      width: 120px;
      text-align: center;
    }
    .color-box {
      width: 120px;
      height: 80px;
      border-radius: 12px;
      margin-bottom: 8px;
      border: 1px solid rgba(0,0,0,0.1);
    }
    .color-name { font-size: 14px; font-weight: 500; }
    .color-value { font-size: 12px; color: ${colorPalette.textSecondary}; }

    .moodboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }
    .moodboard-item {
      background: ${colorPalette.surface};
      border-radius: 16px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .moodboard-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.1);
    }
    .moodboard-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      background: ${colorPalette.surface};
    }
    .moodboard-content { padding: 20px; }
    .moodboard-title { font-weight: 600; margin-bottom: 8px; }
    .moodboard-source {
      font-size: 12px;
      color: ${colorPalette.textSecondary};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .moodboard-relevance { font-size: 14px; margin-bottom: 12px; }
    .aspects-list { list-style: none; }
    .aspects-list li {
      font-size: 13px;
      color: ${colorPalette.textSecondary};
      padding: 4px 0;
      padding-left: 16px;
      position: relative;
    }
    .aspects-list li::before {
      content: '→';
      position: absolute;
      left: 0;
      color: ${colorPalette.primary};
    }

    .trends-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .trend-card {
      background: ${colorPalette.surface};
      border-radius: 16px;
      padding: 24px;
    }
    .trend-name { font-weight: 600; font-size: 18px; margin-bottom: 8px; }
    .trend-popularity {
      display: inline-block;
      background: ${colorPalette.primary};
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .trend-description { font-size: 14px; color: ${colorPalette.textSecondary}; }

    .footer {
      text-align: center;
      padding: 40px;
      color: ${colorPalette.textSecondary};
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${proposal.title}</h1>
      <p class="subtitle">Generated on ${proposal.createdAt.toLocaleDateString()} • ${proposal.targetPlatform}</p>
    </header>

    <section class="section">
      <h2 class="section-title">Color Palette</h2>
      <div class="color-palette">
        ${this.renderColorSwatches(colorPalette)}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Design Inspiration</h2>
      <div class="moodboard-grid">
        ${moodboard.map(item => this.renderMoodboardItem(item)).join('')}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Trending Styles</h2>
      <div class="trends-grid">
        ${trends.slice(0, 6).map(trend => `
          <div class="trend-card">
            <div class="trend-name">${trend.name}</div>
            <span class="trend-popularity">${Math.round(trend.popularity)}% popular</span>
            <p class="trend-description">${trend.description}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <footer class="footer">
      <p>Generated by Design Scout Agent</p>
    </footer>
  </div>
</body>
</html>`;
  }

  private renderColorSwatches(palette: DesignProposal['colorPalette']): string {
    const colors = [
      { name: 'Primary', value: palette.primary },
      { name: 'Secondary', value: palette.secondary },
      { name: 'Accent', value: palette.accent },
      { name: 'Background', value: palette.background },
      { name: 'Surface', value: palette.surface },
      { name: 'Text', value: palette.text },
    ];

    return colors.map(({ name, value }) => `
      <div class="color-swatch">
        <div class="color-box" style="background: ${value}"></div>
        <div class="color-name">${name}</div>
        <div class="color-value">${value}</div>
      </div>
    `).join('');
  }

  private renderMoodboardItem(item: MoodboardItem): string {
    return `
      <div class="moodboard-item">
        <img class="moodboard-image" src="${item.imageUrl}" alt="${item.title}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23f0f0f0%22 width=%22300%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22>Image</text></svg>'">
        <div class="moodboard-content">
          <h3 class="moodboard-title">${item.title}</h3>
          <div class="moodboard-source">${item.source}</div>
          <p class="moodboard-relevance">${item.relevance}</p>
          <ul class="aspects-list">
            ${item.aspectsToAdopt.map(aspect => `<li>${aspect}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  async generateDesignReport(proposal: DesignProposal): Promise<string> {
    const timestamp = Date.now();
    const filename = `design-report-${proposal.targetCategory}-${timestamp}.md`;
    const filepath = path.join(this.outputDir, 'reports', filename);

    const markdown = this.createDesignReportMarkdown(proposal);
    await fs.writeFile(filepath, markdown, 'utf-8');

    return filepath;
  }

  private createDesignReportMarkdown(proposal: DesignProposal): string {
    const { colorPalette, trends, typographyRecommendations, layoutSuggestions } = proposal;

    return `# ${proposal.title}

**Generated:** ${proposal.createdAt.toISOString()}
**Platform:** ${proposal.targetPlatform}
**Category:** ${proposal.targetCategory}

---

## Executive Summary

This design proposal is based on analysis of ${proposal.references.length} design references from multiple sources including Dribbble, Awwwards, and Mobbin. The recommendations aim to create a modern, user-friendly ${proposal.targetCategory} experience.

---

## Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Primary | ![](https://via.placeholder.com/20/${colorPalette.primary.slice(1)}/${colorPalette.primary.slice(1)}) | \`${colorPalette.primary}\` |
| Secondary | ![](https://via.placeholder.com/20/${colorPalette.secondary.slice(1)}/${colorPalette.secondary.slice(1)}) | \`${colorPalette.secondary}\` |
| Accent | ![](https://via.placeholder.com/20/${colorPalette.accent.slice(1)}/${colorPalette.accent.slice(1)}) | \`${colorPalette.accent}\` |
| Background | ![](https://via.placeholder.com/20/${colorPalette.background.slice(1)}/${colorPalette.background.slice(1)}) | \`${colorPalette.background}\` |
| Surface | ![](https://via.placeholder.com/20/${colorPalette.surface.slice(1)}/${colorPalette.surface.slice(1)}) | \`${colorPalette.surface}\` |
| Text | ![](https://via.placeholder.com/20/${colorPalette.text.slice(1)}/${colorPalette.text.slice(1)}) | \`${colorPalette.text}\` |
| Success | ![](https://via.placeholder.com/20/${colorPalette.success.slice(1)}/${colorPalette.success.slice(1)}) | \`${colorPalette.success}\` |
| Warning | ![](https://via.placeholder.com/20/${colorPalette.warning.slice(1)}/${colorPalette.warning.slice(1)}) | \`${colorPalette.warning}\` |
| Error | ![](https://via.placeholder.com/20/${colorPalette.error.slice(1)}/${colorPalette.error.slice(1)}) | \`${colorPalette.error}\` |

---

## Typography

${typographyRecommendations.map(t => `
### ${t.role.charAt(0).toUpperCase() + t.role.slice(1)}
- **Font:** ${t.fontFamily}
- **Size:** ${t.fontSize}
- **Weight:** ${t.fontWeight}
- **Line Height:** ${t.lineHeight}
${t.letterSpacing ? `- **Letter Spacing:** ${t.letterSpacing}` : ''}
${t.googleFontsUrl ? `- [Google Fonts →](${t.googleFontsUrl})` : ''}
`).join('')}

---

## Trending Styles

${trends.slice(0, 5).map(trend => `
### ${trend.name} ${trend.emerging ? '🔥 Emerging' : ''}
**Popularity:** ${Math.round(trend.popularity)}%

${trend.description}

**Key Characteristics:**
${trend.keyCharacteristics.map(c => `- ${c}`).join('\n')}

**Related Styles:** ${trend.relatedStyles.join(', ')}
`).join('\n---\n')}

---

## Layout Recommendations

${layoutSuggestions.map(layout => `
### ${layout.name}
${layout.description}

**Grid System:** ${layout.gridSystem}

**Breakpoints:**
\`\`\`
${Object.entries(layout.breakpoints).map(([k, v]) => `${k}: ${v}`).join('\n')}
\`\`\`

**Spacing:**
\`\`\`
${Object.entries(layout.spacing).map(([k, v]) => `${k}: ${v}`).join('\n')}
\`\`\`

**Component Arrangement:** ${layout.componentArrangement}
`).join('\n---\n')}

---

## Reference Designs

${proposal.references.slice(0, 10).map((ref, i) => `
${i + 1}. **${ref.title}**
   - Source: ${ref.source}
   - URL: ${ref.sourceUrl}
   - Styles: ${ref.styles.join(', ')}
   ${ref.designer ? `- Designer: ${ref.designer}` : ''}
`).join('')}

---

## Implementation Notes

1. Start with the color palette and typography system
2. Build reusable components following the layout suggestions
3. Incorporate trending styles progressively
4. Test across all target platforms
5. Iterate based on user feedback

---

*Generated by Design Scout Agent*
`;
  }

  async generateCodeSnippetsFile(proposal: DesignProposal): Promise<string> {
    const timestamp = Date.now();
    const filename = `snippets-${proposal.targetCategory}-${timestamp}`;

    // Generate multiple files
    const cssPath = path.join(this.outputDir, 'snippets', `${filename}.css`);
    const tailwindPath = path.join(this.outputDir, 'snippets', `${filename}.tailwind.js`);

    const cssContent = proposal.codeSnippets
      .filter(s => s.language === 'css')
      .map(s => `/* ${s.name} */\n/* ${s.description} */\n/* Usage: ${s.usage} */\n\n${s.code}`)
      .join('\n\n');

    const tailwindContent = proposal.codeSnippets
      .filter(s => s.language === 'tailwind')
      .map(s => `// ${s.name}\n// ${s.description}\n// Usage: ${s.usage}\n\n${s.code}`)
      .join('\n\n');

    await Promise.all([
      fs.writeFile(cssPath, cssContent || '/* No CSS snippets generated */', 'utf-8'),
      fs.writeFile(tailwindPath, tailwindContent || '// No Tailwind snippets generated', 'utf-8'),
    ]);

    return cssPath;
  }
}
