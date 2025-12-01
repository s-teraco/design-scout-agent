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
    return this.createInteractiveMoodboardHtml(proposal);
  }

  private createInteractiveMoodboardHtml(proposal: DesignProposal): string {
    const { colorPalette, moodboard, trends } = proposal;
    const moodboardJson = JSON.stringify(moodboard);
    const trendsJson = JSON.stringify(trends);
    const paletteJson = JSON.stringify(colorPalette);

    return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${proposal.title} - Interactive Moodboard</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
  <style>
    :root {
      --bg: ${colorPalette.background};
      --surface: ${colorPalette.surface};
      --text: ${colorPalette.text};
      --text-secondary: ${colorPalette.textSecondary};
      --primary: ${colorPalette.primary};
      --secondary: ${colorPalette.secondary};
      --accent: ${colorPalette.accent};
    }
    [data-theme="dark"] {
      --bg: #0f172a;
      --surface: #1e293b;
      --text: #f8fafc;
      --text-secondary: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      transition: background 0.3s, color 0.3s;
    }

    /* Toolbar */
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--surface);
      border-bottom: 1px solid rgba(128,128,128,0.2);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-btn {
      background: var(--bg);
      border: 1px solid rgba(128,128,128,0.3);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .toolbar-btn:hover { background: var(--primary); color: white; border-color: var(--primary); }
    .toolbar-btn.active { background: var(--primary); color: white; }
    .search-input {
      background: var(--bg);
      border: 1px solid rgba(128,128,128,0.3);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      width: 200px;
    }
    .search-input:focus { outline: none; border-color: var(--primary); }
    .filter-select {
      background: var(--bg);
      border: 1px solid rgba(128,128,128,0.3);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 14px;
    }
    .spacer { flex: 1; }

    .container { max-width: 1400px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 48px; font-weight: 700; margin-bottom: 8px; }
    .subtitle { color: var(--text-secondary); font-size: 18px; margin-bottom: 40px; }

    .section { margin-bottom: 60px; }
    .section-title { font-size: 24px; font-weight: 600; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
    .badge { background: var(--primary); color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; }

    /* Color Palette */
    .color-palette { display: flex; gap: 16px; flex-wrap: wrap; }
    .color-swatch { width: 120px; text-align: center; cursor: pointer; transition: transform 0.2s; }
    .color-swatch:hover { transform: scale(1.05); }
    .color-box {
      width: 120px; height: 80px; border-radius: 12px;
      margin-bottom: 8px; border: 1px solid rgba(128,128,128,0.2);
      position: relative;
    }
    .color-box::after {
      content: 'Click to copy';
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.7); color: white; font-size: 12px;
      border-radius: 12px; opacity: 0; transition: opacity 0.2s;
    }
    .color-swatch:hover .color-box::after { opacity: 1; }
    .color-name { font-size: 14px; font-weight: 500; }
    .color-value { font-size: 12px; color: var(--text-secondary); }

    /* Moodboard Grid */
    .moodboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }
    .moodboard-item {
      background: var(--surface);
      border-radius: 16px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: grab;
      position: relative;
    }
    .moodboard-item:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
    .moodboard-item.dragging { opacity: 0.5; cursor: grabbing; }
    .moodboard-item.drag-over { border: 2px dashed var(--primary); }
    .moodboard-item.hidden { display: none; }
    .moodboard-image {
      width: 100%; height: 200px; object-fit: cover;
      background: var(--bg);
    }
    .moodboard-content { padding: 20px; }
    .moodboard-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
    .moodboard-title { font-weight: 600; flex: 1; }
    .moodboard-actions { display: flex; gap: 8px; }
    .action-btn {
      background: none; border: none; cursor: pointer;
      font-size: 18px; padding: 4px; border-radius: 4px;
      transition: background 0.2s;
    }
    .action-btn:hover { background: rgba(128,128,128,0.2); }
    .action-btn.favorited { color: #ef4444; }
    .moodboard-source {
      font-size: 12px; color: var(--text-secondary);
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;
    }
    .moodboard-relevance { font-size: 14px; margin-bottom: 12px; }
    .aspects-list { list-style: none; }
    .aspects-list li {
      font-size: 13px; color: var(--text-secondary);
      padding: 4px 0; padding-left: 16px; position: relative;
    }
    .aspects-list li::before { content: '→'; position: absolute; left: 0; color: var(--primary); }

    /* Comments */
    .comments-section { margin-top: 16px; border-top: 1px solid rgba(128,128,128,0.2); padding-top: 12px; }
    .comment { background: var(--bg); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; }
    .comment-input {
      width: 100%; background: var(--bg); border: 1px solid rgba(128,128,128,0.3);
      color: var(--text); padding: 8px 12px; border-radius: 8px; font-size: 13px;
      resize: none;
    }
    .comment-input:focus { outline: none; border-color: var(--primary); }

    /* Trends */
    .trends-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .trend-card { background: var(--surface); border-radius: 16px; padding: 24px; }
    .trend-name { font-weight: 600; font-size: 18px; margin-bottom: 8px; }
    .trend-popularity {
      display: inline-block; background: var(--primary); color: white;
      padding: 4px 12px; border-radius: 20px; font-size: 12px;
      font-weight: 600; margin-bottom: 12px;
    }
    .trend-description { font-size: 14px; color: var(--text-secondary); }

    /* Footer */
    .footer { text-align: center; padding: 40px; color: var(--text-secondary); font-size: 14px; }

    /* Toast */
    .toast {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: var(--text); color: var(--bg);
      padding: 12px 24px; border-radius: 8px;
      font-size: 14px; opacity: 0; transition: opacity 0.3s;
      z-index: 1000;
    }
    .toast.show { opacity: 1; }

    /* Modal */
    .modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8);
      display: none; align-items: center; justify-content: center; z-index: 200;
    }
    .modal.show { display: flex; }
    .modal-content {
      background: var(--surface); border-radius: 16px; padding: 32px;
      max-width: 500px; width: 90%;
    }
    .modal-title { font-size: 24px; font-weight: 600; margin-bottom: 16px; }
    .modal-close {
      position: absolute; top: 20px; right: 20px;
      background: none; border: none; color: white;
      font-size: 32px; cursor: pointer;
    }
    .share-link {
      width: 100%; background: var(--bg); border: 1px solid rgba(128,128,128,0.3);
      color: var(--text); padding: 12px; border-radius: 8px; font-size: 14px;
    }

    /* Print styles */
    @media print {
      .toolbar, .action-btn, .comments-section, .comment-input { display: none !important; }
      .moodboard-item { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar" id="toolbar">
    <div class="toolbar-group">
      <button class="toolbar-btn" onclick="toggleTheme()" title="Toggle Dark Mode">
        <span id="theme-icon">🌙</span> Theme
      </button>
    </div>
    <div class="toolbar-group">
      <input type="text" class="search-input" placeholder="Search designs..." oninput="filterItems(this.value)">
      <select class="filter-select" onchange="filterBySource(this.value)">
        <option value="">All Sources</option>
        <option value="dribbble">Dribbble</option>
        <option value="behance">Behance</option>
        <option value="awwwards">Awwwards</option>
        <option value="mobbin">Mobbin</option>
        <option value="figma">Figma</option>
        <option value="pinterest">Pinterest</option>
      </select>
      <button class="toolbar-btn" onclick="showFavorites()" id="fav-filter">
        ❤️ Favorites
      </button>
    </div>
    <div class="spacer"></div>
    <div class="toolbar-group">
      <button class="toolbar-btn" onclick="exportPNG()">📷 PNG</button>
      <button class="toolbar-btn" onclick="exportPDF()">📄 PDF</button>
      <button class="toolbar-btn" onclick="showShareModal()">🔗 Share</button>
    </div>
  </div>

  <div class="container" id="moodboard-container">
    <header>
      <h1>${proposal.title}</h1>
      <p class="subtitle">Generated on ${proposal.createdAt.toLocaleDateString()} • ${proposal.targetPlatform} • Interactive Moodboard</p>
    </header>

    <section class="section">
      <h2 class="section-title">Color Palette <span class="badge">Click to copy</span></h2>
      <div class="color-palette" id="color-palette"></div>
    </section>

    <section class="section">
      <h2 class="section-title">Design Inspiration <span class="badge" id="item-count">0 items</span></h2>
      <div class="moodboard-grid" id="moodboard-grid"></div>
    </section>

    <section class="section">
      <h2 class="section-title">Trending Styles</h2>
      <div class="trends-grid" id="trends-grid"></div>
    </section>

    <footer class="footer">
      <p>Generated by Design Scout Agent • Drag items to reorder • Double-click to zoom</p>
    </footer>
  </div>

  <div class="toast" id="toast"></div>

  <div class="modal" id="share-modal">
    <button class="modal-close" onclick="closeShareModal()">×</button>
    <div class="modal-content">
      <h3 class="modal-title">Share Moodboard</h3>
      <p style="margin-bottom: 16px; color: var(--text-secondary);">Copy this link to share your moodboard:</p>
      <input type="text" class="share-link" id="share-link" readonly>
      <button class="toolbar-btn" style="margin-top: 16px; width: 100%; justify-content: center;" onclick="copyShareLink()">
        📋 Copy Link
      </button>
    </div>
  </div>

  <script>
    // Data
    const moodboardData = ${moodboardJson};
    const trendsData = ${trendsJson};
    const paletteData = ${paletteJson};

    // State
    let favorites = JSON.parse(localStorage.getItem('moodboard-favorites') || '[]');
    let comments = JSON.parse(localStorage.getItem('moodboard-comments') || '{}');
    let itemOrder = JSON.parse(localStorage.getItem('moodboard-order') || 'null') || moodboardData.map((_, i) => i);
    let showingFavorites = false;

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      renderColorPalette();
      renderMoodboard();
      renderTrends();
      updateItemCount();

      // Check saved theme
      const savedTheme = localStorage.getItem('moodboard-theme') || 'light';
      document.documentElement.dataset.theme = savedTheme;
      updateThemeIcon();
    });

    // Render functions
    function renderColorPalette() {
      const colors = [
        { name: 'Primary', value: paletteData.primary },
        { name: 'Secondary', value: paletteData.secondary },
        { name: 'Accent', value: paletteData.accent },
        { name: 'Background', value: paletteData.background },
        { name: 'Surface', value: paletteData.surface },
        { name: 'Text', value: paletteData.text },
      ];

      const container = document.getElementById('color-palette');
      container.innerHTML = colors.map(c => \`
        <div class="color-swatch" onclick="copyColor('\${c.value}')">
          <div class="color-box" style="background: \${c.value}"></div>
          <div class="color-name">\${c.name}</div>
          <div class="color-value">\${c.value}</div>
        </div>
      \`).join('');
    }

    function renderMoodboard() {
      const container = document.getElementById('moodboard-grid');
      const orderedData = itemOrder.map(i => ({ ...moodboardData[i], originalIndex: i }));

      container.innerHTML = orderedData.map((item, displayIndex) => \`
        <div class="moodboard-item"
             data-index="\${item.originalIndex}"
             data-source="\${item.source}"
             data-title="\${item.title.toLowerCase()}"
             draggable="true"
             ondragstart="dragStart(event)"
             ondragover="dragOver(event)"
             ondrop="drop(event)"
             ondragend="dragEnd(event)"
             ondblclick="zoomImage('\${item.imageUrl}')">
          <img class="moodboard-image" src="\${item.imageUrl}" alt="\${item.title}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23f0f0f0%22 width=%22300%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22>Image</text></svg>'">
          <div class="moodboard-content">
            <div class="moodboard-header">
              <h3 class="moodboard-title">\${item.title}</h3>
              <div class="moodboard-actions">
                <button class="action-btn \${favorites.includes(item.originalIndex) ? 'favorited' : ''}"
                        onclick="toggleFavorite(\${item.originalIndex}, event)">
                  \${favorites.includes(item.originalIndex) ? '❤️' : '🤍'}
                </button>
              </div>
            </div>
            <div class="moodboard-source">\${item.source}</div>
            <p class="moodboard-relevance">\${item.relevance}</p>
            <ul class="aspects-list">
              \${item.aspectsToAdopt.map(a => \`<li>\${a}</li>\`).join('')}
            </ul>
            <div class="comments-section">
              <div id="comments-\${item.originalIndex}">
                \${(comments[item.originalIndex] || []).map(c => \`<div class="comment">\${c}</div>\`).join('')}
              </div>
              <textarea class="comment-input" placeholder="Add a comment..." rows="2"
                        onkeypress="handleCommentKeypress(event, \${item.originalIndex})"></textarea>
            </div>
          </div>
        </div>
      \`).join('');
    }

    function renderTrends() {
      const container = document.getElementById('trends-grid');
      container.innerHTML = trendsData.slice(0, 6).map(trend => \`
        <div class="trend-card">
          <div class="trend-name">\${trend.name}</div>
          <span class="trend-popularity">\${Math.round(trend.popularity)}% popular</span>
          <p class="trend-description">\${trend.description}</p>
        </div>
      \`).join('');
    }

    // Theme toggle
    function toggleTheme() {
      const html = document.documentElement;
      const newTheme = html.dataset.theme === 'light' ? 'dark' : 'light';
      html.dataset.theme = newTheme;
      localStorage.setItem('moodboard-theme', newTheme);
      updateThemeIcon();
    }

    function updateThemeIcon() {
      const icon = document.getElementById('theme-icon');
      icon.textContent = document.documentElement.dataset.theme === 'light' ? '🌙' : '☀️';
    }

    // Color copy
    function copyColor(color) {
      navigator.clipboard.writeText(color);
      showToast(\`Copied \${color} to clipboard!\`);
    }

    // Favorites
    function toggleFavorite(index, event) {
      event.stopPropagation();
      const idx = favorites.indexOf(index);
      if (idx > -1) {
        favorites.splice(idx, 1);
      } else {
        favorites.push(index);
      }
      localStorage.setItem('moodboard-favorites', JSON.stringify(favorites));
      renderMoodboard();
      showToast(idx > -1 ? 'Removed from favorites' : 'Added to favorites!');
    }

    function showFavorites() {
      showingFavorites = !showingFavorites;
      const btn = document.getElementById('fav-filter');
      btn.classList.toggle('active', showingFavorites);

      document.querySelectorAll('.moodboard-item').forEach(item => {
        const index = parseInt(item.dataset.index);
        if (showingFavorites && !favorites.includes(index)) {
          item.classList.add('hidden');
        } else {
          item.classList.remove('hidden');
        }
      });
      updateItemCount();
    }

    // Filter & Search
    function filterItems(query) {
      const q = query.toLowerCase();
      document.querySelectorAll('.moodboard-item').forEach(item => {
        const title = item.dataset.title;
        item.classList.toggle('hidden', !title.includes(q));
      });
      updateItemCount();
    }

    function filterBySource(source) {
      document.querySelectorAll('.moodboard-item').forEach(item => {
        if (!source || item.dataset.source === source) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
      updateItemCount();
    }

    function updateItemCount() {
      const visible = document.querySelectorAll('.moodboard-item:not(.hidden)').length;
      document.getElementById('item-count').textContent = \`\${visible} items\`;
    }

    // Drag and Drop
    let draggedItem = null;

    function dragStart(e) {
      draggedItem = e.target.closest('.moodboard-item');
      draggedItem.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    }

    function dragOver(e) {
      e.preventDefault();
      const target = e.target.closest('.moodboard-item');
      if (target && target !== draggedItem) {
        target.classList.add('drag-over');
      }
    }

    function drop(e) {
      e.preventDefault();
      const target = e.target.closest('.moodboard-item');
      if (target && target !== draggedItem) {
        const fromIndex = parseInt(draggedItem.dataset.index);
        const toIndex = parseInt(target.dataset.index);

        const fromOrderIdx = itemOrder.indexOf(fromIndex);
        const toOrderIdx = itemOrder.indexOf(toIndex);

        itemOrder.splice(fromOrderIdx, 1);
        itemOrder.splice(toOrderIdx, 0, fromIndex);

        localStorage.setItem('moodboard-order', JSON.stringify(itemOrder));
        renderMoodboard();
      }
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    function dragEnd(e) {
      if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
      }
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    // Comments
    function handleCommentKeypress(e, index) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const textarea = e.target;
        const text = textarea.value.trim();
        if (text) {
          if (!comments[index]) comments[index] = [];
          comments[index].push(text);
          localStorage.setItem('moodboard-comments', JSON.stringify(comments));
          textarea.value = '';
          renderMoodboard();
          showToast('Comment added!');
        }
      }
    }

    // Zoom
    function zoomImage(url) {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:300;cursor:zoom-out;';
      modal.innerHTML = \`<img src="\${url}" style="max-width:90%;max-height:90%;object-fit:contain;border-radius:8px;">\`;
      modal.onclick = () => modal.remove();
      document.body.appendChild(modal);
    }

    // Export
    async function exportPNG() {
      showToast('Generating PNG...');
      const container = document.getElementById('moodboard-container');
      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = 'moodboard.png';
      link.href = canvas.toDataURL();
      link.click();
      showToast('PNG downloaded!');
    }

    async function exportPDF() {
      showToast('Generating PDF...');
      const { jsPDF } = window.jspdf;
      const container = document.getElementById('moodboard-container');
      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('moodboard.pdf');
      showToast('PDF downloaded!');
    }

    // Share
    function showShareModal() {
      const link = window.location.href;
      document.getElementById('share-link').value = link;
      document.getElementById('share-modal').classList.add('show');
    }

    function closeShareModal() {
      document.getElementById('share-modal').classList.remove('show');
    }

    function copyShareLink() {
      const input = document.getElementById('share-link');
      input.select();
      navigator.clipboard.writeText(input.value);
      showToast('Link copied to clipboard!');
      closeShareModal();
    }

    // Toast
    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  <\/script>
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
