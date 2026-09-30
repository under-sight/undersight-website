// Pure helpers of the blog email gate (resources/blog-gate.js).
// Run: node --test tests/blog-gate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import gate from '../resources/blog-gate.js';

const { shouldGate, isUnlocked, markUnlocked, headingHtml, plainSummary } = gate;

function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
const throwingStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};

test('posts with a PDF are gated until the visitor unlocks', () => {
  assert.equal(shouldGate({ hasPdf: true }, false), true);
  assert.equal(shouldGate({ hasPdf: true }, true), false);
});

test('posts without a PDF are never gated: there is nothing to email', () => {
  assert.equal(shouldGate({ hasPdf: false }, false), false);
  assert.equal(shouldGate({}, false), false);
});

test('unlock persists in storage and survives a blocked storage', () => {
  const s = memoryStorage();
  assert.equal(isUnlocked(s), false);
  markUnlocked(s);
  assert.equal(isUnlocked(s), true);
  assert.equal(isUnlocked(throwingStorage), false);
  assert.doesNotThrow(() => markUnlocked(throwingStorage));
  assert.equal(isUnlocked(null), false);
});

test('heading carries the summary in a visually hidden span', () => {
  assert.equal(
    headingHtml('Follow the advance', 'Trace every dollar.'),
    'Follow the advance<span class="sr-only">: Trace every dollar.</span>',
  );
});

test('heading without a summary is the bare title', () => {
  assert.equal(headingHtml('Title', ''), 'Title');
  assert.equal(headingHtml('Title', '   '), 'Title');
});

test('heading escapes HTML in title and summary', () => {
  assert.equal(
    headingHtml('A <b> & "c"', '<script>x</script>'),
    'A &lt;b&gt; &amp; &quot;c&quot;<span class="sr-only">: &lt;script&gt;x&lt;/script&gt;</span>',
  );
});

test('summary drops markdown syntax and collapses whitespace', () => {
  assert.equal(
    plainSummary('**Bold** and _em_ with a [link](https://x.y) and `code`.\n\nNext  line'),
    'Bold and em with a link and code. Next line',
  );
});

test('summaryOf prefers the CMS excerpt', () => {
  assert.equal(gate.summaryOf({ excerpt: 'The excerpt.', subtitle: 'Sub', body: 'Body.' }), 'The excerpt.');
});

test('summaryOf falls back to the lead paragraph, skipping headings and images', () => {
  const body = '# Title\n\n![hero](/x.png)\n\nWe traced one advance for 30 days. It went further than expected.\n\nSecond paragraph.';
  assert.equal(gate.summaryOf({ excerpt: '', body }), 'We traced one advance for 30 days. It went further than expected.');
});

test('summaryOf trims a long lead paragraph at a sentence, then a word', () => {
  const sentence = 'A'.repeat(120) + '. ' + 'B'.repeat(150) + '.';
  assert.equal(gate.summaryOf({ body: sentence }), 'A'.repeat(120) + '.');
  const words = ('word ').repeat(80).trim();
  const s = gate.summaryOf({ body: words });
  assert.ok(s.length <= 201 && s.endsWith('…') && !s.includes('wor…'), s);
});

test('summaryOf skips legacy **Key:** front-matter lines', () => {
  assert.equal(gate.summaryOf({ body: '**Date:** 2026-05-08\n\n**Tag:** Case Study\n\nThe lead.' }), 'The lead.');
});

test('summaryOf uses the subtitle when the body has no paragraph', () => {
  assert.equal(gate.summaryOf({ subtitle: 'A vision', body: '# Only a heading' }), 'A vision');
  assert.equal(gate.summaryOf({}), '');
});

// index.html wiring: the gate must be loaded before the inline app script
// (baked content can open a deep-linked post during parse) and used by openPost.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('index.html loads blog-gate.js as a classic script before the app script', () => {
  const tag = html.indexOf('<script src="/resources/blog-gate.js"></script>');
  assert.ok(tag > 0, 'blog-gate.js script tag present');
  assert.ok(tag < html.indexOf('\n<script>\n'), 'loaded before the inline app script');
});

test('openPost writes the summary heading and applies the gate', () => {
  const body = html.slice(html.indexOf('function openPost('), html.indexOf('function filterBlog('));
  assert.match(body, /BlogGate\.headingHtml\(post\.title, BlogGate\.summaryOf\(post\)\)/);
  assert.match(body, /BlogGate\.shouldGate\(/);
  assert.match(body, /openBlogGate\(/);
});

test('css defines sr-only and the gated post treatment', () => {
  const css = readFileSync(new URL('../css/main.css', import.meta.url), 'utf8');
  assert.match(css, /\.sr-only\s*\{/);
  assert.match(css, /\.post-gated \.post-body\s*\{/);
});
