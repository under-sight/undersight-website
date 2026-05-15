/**
 * Generate all whitepaper PDFs from markdown content.
 * Uses Playwright to render branded HTML → PDF.
 *
 * Usage: node generate-all.js
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const WHITEPAPERS = [
  {
    slug: 'chat-advance',
    // Uses the custom HTML template already created
    html: path.resolve(__dirname, 'chat-advance.html'),
    out: path.resolve(__dirname, 'chat-advance-case-study.pdf'),
    custom: true,
  },
  {
    slug: 'deterministic-scorecards',
    md: '/tmp/wp-scorecards.md',
    out: path.resolve(__dirname, 'deterministic-scorecards.pdf'),
    tag: 'undersight Research',
    title: 'From Deterministic Scorecards to Agentic Credit Assessments',
    subtitle: 'A Vision for AI-Native Credit Assessment Architectures',
    author: 'Sajit Roshan',
    date: '2026-05-14',
  },
  {
    slug: 'institutional-capital',
    md: '/tmp/wp-institutional.md',
    out: path.resolve(__dirname, 'institutional-capital.pdf'),
    tag: 'undersight Research',
    title: 'Unlocking Institutional Capital for Mid-Tier MCA Funds',
    subtitle: 'A Technology-Enabled Transformation Thesis',
    author: 'Kyle Adriany',
    date: '2026-05-01',
  },
  {
    slug: '4d-financing',
    md: '/tmp/wp-4d-financing.md',
    out: path.resolve(__dirname, '4d-financing-case-study.pdf'),
    tag: 'undersight Case Study',
    title: 'How 4D Financing gets institutional-grade underwriting with a 2-person team',
    subtitle: 'Evidence-backed underwriting on every deal, with full audit trails',
    author: 'Kyle Adriany',
    date: '2026-05-12',
  },
];

function mdToHtml(md) {
  if (!md) return '';
  const body = md.trim();
  const lines = body.split('\n');
  let html = '';
  let inList = false;
  let inTable = false;
  let tableHeader = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\\$/, '').replace(/\\([~`*_{}[\]()#+\-.!])/g, '$1');
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) { html += '</ul>\n'; inList = false; }
      if (inTable) { html += '</tbody></table>\n'; inTable = false; }
      continue;
    }

    // Horizontal rules
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      if (inList) { html += '</ul>\n'; inList = false; }
      if (inTable) { html += '</tbody></table>\n'; inTable = false; }
      html += '<hr>\n';
      continue;
    }

    // Inline formatting
    const fmt = (t) => t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

    // Skip duplicate titles (already in cover)
    if (trimmed.startsWith('# ') && i < 5) continue;

    if (trimmed.startsWith('### ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h3>${fmt(trimmed.slice(4))}</h3>\n`;
    } else if (trimmed.startsWith('## ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h2>${fmt(trimmed.slice(3))}</h2>\n`;
    } else if (trimmed.startsWith('| ') && trimmed.endsWith('|')) {
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue; // separator
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) {
        inTable = true;
        tableHeader = true;
        html += '<table><thead><tr>' + cells.map(c => `<th>${fmt(c)}</th>`).join('') + '</tr></thead><tbody>\n';
      } else {
        html += '<tr>' + cells.map(c => `<td>${fmt(c)}</td>`).join('') + '</tr>\n';
      }
    } else if (/^\*\s/.test(trimmed)) {
      if (!inList) { html += '<ul>\n'; inList = true; }
      html += `<li>${fmt(trimmed.slice(2))}</li>\n`;
    } else if (/^\d+\.\s/.test(trimmed)) {
      html += `<li>${fmt(trimmed.replace(/^\d+\.\s+/, ''))}</li>\n`;
    } else if (trimmed.startsWith('> ')) {
      html += `<blockquote><p>${fmt(trimmed.slice(2))}</p></blockquote>\n`;
    } else {
      if (inList) { html += '</ul>\n'; inList = false; }
      if (inTable) { html += '</tbody></table>\n'; inTable = false; }
      html += `<p>${fmt(trimmed)}</p>\n`;
    }
  }
  if (inList) html += '</ul>\n';
  if (inTable) html += '</tbody></table>\n';
  return html;
}

function buildResearchHtml(wp) {
  const md = fs.readFileSync(wp.md, 'utf-8');
  // Strip frontmatter metadata lines
  const bodyMd = md.split('\n').filter(l => !l.match(/^\*\*(Date|Excerpt|Tag|Author|Subtitle):\*\*/)).join('\n');
  const bodyHtml = mdToHtml(bodyMd);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${wp.title} — undersight</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 40px 0; }
  @page :first { margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --g900: #23262C; --g800: #2E3138; --g700: #3A3F47;
    --g100: #F0F1F2; --g50: #F7F8F8;
    --amber: #C97A54; --white: #FFFFFF; --zinc: #D1D5DB;
  }
  body {
    font-family: 'DM Sans', -apple-system, sans-serif;
    color: var(--g900); font-size: 10.5pt; line-height: 1.7;
    background: var(--white);
  }
  h1,h2,h3,h4 {
    font-family: 'Inter', -apple-system, sans-serif;
    font-feature-settings: 'cv01','ss03'; line-height: 1.3;
  }

  /* Cover */
  .cover {
    width: 210mm; min-height: 297mm; background: var(--g900); color: var(--white);
    display: flex; flex-direction: column; justify-content: space-between;
    page-break-after: always; position: relative; overflow: hidden;
  }
  .cover-top { padding: 48px 56px 0; }
  .cover-logo {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Inter', sans-serif; font-weight: 600; font-size: 18px;
    font-feature-settings: 'cv01','ss03'; letter-spacing: -0.02em;
  }
  .cover-body { padding: 0 56px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .cover-tag {
    font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em; color: var(--amber);
    margin-bottom: 16px; font-feature-settings: 'cv01','ss03';
  }
  .cover-bar { width: 48px; height: 4px; background: var(--amber); margin-bottom: 24px; border-radius: 2px; }
  .cover h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 16px; max-width: 500px; }
  .cover .subtitle { font-size: 16px; line-height: 1.6; color: var(--zinc); max-width: 440px; margin-bottom: 20px; }
  .cover .meta { font-size: 13px; color: rgba(255,255,255,0.4); font-family: 'Inter', sans-serif; font-feature-settings: 'cv01','ss03'; }
  .cover-bottom {
    padding: 32px 56px; border-top: 1px solid rgba(255,255,255,0.08);
    display: flex; justify-content: space-between;
    font-size: 11px; color: rgba(255,255,255,0.4);
    font-family: 'Inter', sans-serif; font-feature-settings: 'cv01','ss03';
  }
  /* Geometric bg */
  .cover-visual {
    position: absolute; right: 40px; top: 50%; transform: translateY(-50%); opacity: 0.05;
  }

  /* Content pages */
  .page {
    width: 210mm; padding: 8px 56px 40px;
    page-break-after: always; position: relative;
  }
  .page:last-child { page-break-after: auto; }

  h2 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin: 28px 0 12px; color: var(--g900); }
  h2:first-child { margin-top: 0; }
  h3 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; color: var(--g800); }
  p { margin-bottom: 10px; color: var(--g700); }
  a { color: var(--amber); text-decoration: none; }

  ul, ol { margin: 8px 0 12px 20px; color: var(--g700); }
  li { margin-bottom: 4px; line-height: 1.6; }

  blockquote {
    background: var(--g50); border-left: 3px solid var(--amber);
    padding: 14px 20px; border-radius: 0 8px 8px 0; margin: 16px 0;
  }
  blockquote p { margin: 0; font-style: italic; color: var(--g800); }

  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 10pt; }
  th {
    text-align: left; padding: 8px 12px;
    font-family: 'Inter', sans-serif; font-feature-settings: 'cv01','ss03';
    font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
    color: var(--g700); border-bottom: 2px solid var(--g100); background: var(--g50);
  }
  td { padding: 8px 12px; border-bottom: 1px solid var(--g100); color: var(--g700); }
  tr:last-child td { border-bottom: none; }

  strong { font-weight: 600; color: var(--g900); }
  em { font-style: italic; }

  hr { border: none; border-top: 1px solid var(--g100); margin: 28px 0; break-inside: avoid; break-after: avoid; page-break-after: avoid; }

  /* Page break control */
  h2, h3 { break-after: avoid; page-break-after: avoid; }
  blockquote, table, ul, ol { break-inside: avoid; page-break-inside: avoid; }
  p { orphans: 3; widows: 3; }

  .page-footer {
    position: absolute; bottom: 24px; left: 56px; right: 56px;
    display: flex; justify-content: space-between;
    font-family: 'Inter', sans-serif; font-size: 10px; color: var(--zinc);
    font-feature-settings: 'cv01','ss03';
  }

  /* Back page */
  .back {
    width: 210mm; min-height: calc(297mm - 80px); display: flex; flex-direction: column;
    justify-content: center; align-items: center; text-align: center;
    position: relative;
  }
  .back-inner { max-width: 400px; }
  .back h2 { font-size: 28px; margin-bottom: 16px; }
  .back p { font-size: 14px; line-height: 1.6; color: var(--g700); margin-bottom: 32px; }
  .back-cta {
    display: inline-block; background: var(--amber); color: var(--white);
    font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 510;
    padding: 12px 32px; border-radius: 8px; text-decoration: none;
    font-feature-settings: 'cv01','ss03';
  }
  .back-contact { margin-top: 20px; font-size: 13px; color: var(--g700); }
  .back-contact a { color: var(--amber); }
  .back-footer {
    position: absolute; bottom: 32px; left: 0; right: 0; text-align: center;
    font-size: 11px; color: var(--zinc);
    font-family: 'Inter', sans-serif; font-feature-settings: 'cv01','ss03';
  }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <svg class="cover-visual" width="320" height="320" viewBox="0 0 320 320" fill="none">
    <circle cx="160" cy="160" r="100" stroke="rgba(255,255,255,1)" stroke-width="0.5" fill="none"/>
    <circle cx="160" cy="160" r="140" stroke="rgba(255,255,255,1)" stroke-width="0.5" fill="none"/>
    <circle cx="160" cy="160" r="60" stroke="rgba(255,255,255,1)" stroke-width="0.5" fill="none"/>
    <line x1="160" y1="20" x2="160" y2="300" stroke="rgba(255,255,255,1)" stroke-width="0.3"/>
    <line x1="20" y1="160" x2="300" y2="160" stroke="rgba(255,255,255,1)" stroke-width="0.3"/>
    <circle cx="160" cy="60" r="4" fill="#C97A54"/><circle cx="260" cy="160" r="4" fill="#C97A54"/>
    <circle cx="160" cy="260" r="4" fill="#C97A54"/><circle cx="60" cy="160" r="4" fill="#C97A54"/>
    <circle cx="160" cy="160" r="16" stroke="#C97A54" stroke-width="1.5" fill="none"/>
    <circle cx="160" cy="160" r="5" fill="#C97A54"/>
  </svg>
  <div class="cover-top">
    <div class="cover-logo">
      <svg viewBox="0 0 64 64" width="28" height="28"><g fill="#FFFFFF"><rect x="22" y="8" width="20" height="10" rx="1"/><path d="M20 21 L44 21 L44 36 L32 56 L20 36 Z"/></g><rect x="31" y="21" width="2" height="35" fill="#23262C"/><circle cx="32" cy="32" r="5" fill="#23262C"/></svg>
      undersight
    </div>
  </div>
  <div class="cover-body">
    <div class="cover-tag">${wp.tag}</div>
    <div class="cover-bar"></div>
    <h1>${wp.title}</h1>
    <div class="subtitle">${wp.subtitle}</div>
    <div class="meta">By ${wp.author} &middot; ${wp.date}</div>
  </div>
  <div class="cover-bottom"><span>undersight.ai</span><span>2025</span></div>
</div>

<!-- CONTENT -->
<div class="page">
${bodyHtml}
</div>

<!-- BACK PAGE -->
<div class="back">
  <div class="back-inner">
    <div class="cover-logo" style="justify-content:center;margin-bottom:48px;color:var(--g900);">
      <svg viewBox="0 0 64 64" width="32" height="32"><g fill="#23262C"><rect x="22" y="8" width="20" height="10" rx="1"/><path d="M20 21 L44 21 L44 36 L32 56 L20 36 Z"/></g><rect x="31" y="21" width="2" height="35" fill="#FFFFFF"/><circle cx="32" cy="32" r="5" fill="#FFFFFF"/></svg>
      undersight
    </div>
    <h2>Ready to see undersight in action?</h2>
    <p>Schedule a 30-minute discovery call. We&rsquo;ll walk through your workflow and show you what&rsquo;s possible with agentic underwriting.</p>
    <a href="https://calendly.com/kyle-undersight/30min" class="back-cta">Book a Discovery Call</a>
    <div class="back-contact">Or email us at <a href="mailto:contact@undersight.ai">contact@undersight.ai</a></div>
  </div>
  <div class="back-footer">undersight.ai &middot; AI underwriting infrastructure for alternative finance</div>
</div>

</body></html>`;
}

(async () => {
  const browser = await chromium.launch();

  for (const wp of WHITEPAPERS) {
    let filePath;

    if (wp.custom) {
      filePath = wp.html;
    } else {
      // Generate HTML from markdown
      const html = buildResearchHtml(wp);
      const tmpPath = `/tmp/wp-${wp.slug}.html`;
      fs.writeFileSync(tmpPath, html);
      filePath = tmpPath;
    }

    const page = await browser.newPage();
    await page.goto('file://' + filePath, { waitUntil: 'networkidle' });
    const pdfOpts = {
      path: wp.out,
      format: 'A4',
      printBackground: true,
    };
    // Custom templates handle their own margins; research papers use CSS @page margins
    if (wp.custom) {
      pdfOpts.margin = { top: 0, bottom: 0, left: 0, right: 0 };
    }
    await page.pdf(pdfOpts);
    await page.close();

    const size = Math.round(fs.statSync(wp.out).size / 1024);
    console.log(`Generated: ${path.basename(wp.out)} (${size}KB)`);
  }

  await browser.close();
})();
