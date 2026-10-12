import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import consent from '../resources/consent.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const STATIC_DIRS = ['css', 'images', 'resources'];
const VISITOR_PAGES = ['index.html', 'under-construction.html', 'resources/book.html', 'resources/cash-flow-underwriting.html', 'resources/workshop.html'];

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function deployedHtml() {
  const nested = STATIC_DIRS.flatMap(d => walk(join(ROOT, d))).filter(p => p.endsWith('.html'));
  return ['index.html', 'under-construction.html', ...nested.map(p => relative(ROOT, p))];
}

const read = rel => readFileSync(join(ROOT, rel), 'utf8');
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) || [];
const remote = /\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i;

test('readChoice reads only the undersight consent cookie', () => {
  assert.equal(consent.readChoice('a=1; undersight_consent=granted; b=2'), 'granted');
  assert.equal(consent.readChoice('undersight_consent=declined'), 'declined');
  assert.equal(consent.readChoice(''), null);
  assert.equal(consent.readChoice('xundersight_consent=granted'), null);
  assert.equal(consent.readChoice('undersight_consent=maybe'), null);
});

test('the choice cookie is first-party, one year, Lax, Secure on https', () => {
  assert.equal(consent.cookieFor('granted', true), 'undersight_consent=granted; Max-Age=31536000; Path=/; SameSite=Lax; Secure');
  assert.equal(consent.cookieFor('declined', false), 'undersight_consent=declined; Max-Age=31536000; Path=/; SameSite=Lax');
});

function fakeDoc(held) {
  const created = [];
  const parent = { replaceChild(live, old) { created.push({ live, old }); } };
  held.forEach(h => { h.parentNode = parent; });
  return {
    created,
    querySelectorAll: sel => (sel === 'script[type="text/plain"][data-consent]' ? held : []),
    createElement: () => {
      const attrs = {};
      return { attrs, text: '', setAttribute: (k, v) => { attrs[k] = v; } };
    },
  };
}

test('activate swaps held tags for live scripts with src restored', () => {
  const held = [{
    attributes: [
      { name: 'type', value: 'text/plain' },
      { name: 'data-consent', value: 'analytics' },
      { name: 'data-src', value: 'https://tags.example/t.js' },
      { name: 'async', value: '' },
    ],
    text: '',
  }];
  const doc = fakeDoc(held);
  assert.equal(consent.activate(doc), 1);
  assert.deepEqual(doc.created[0].live.attrs, { src: 'https://tags.example/t.js', async: '' });
  assert.equal(doc.created[0].old, held[0]);
});

test('activate with nothing held changes nothing', () => {
  const doc = fakeDoc([]);
  assert.equal(consent.activate(doc), 0);
  assert.equal(doc.created.length, 0);
});

test('no deployed page loads a third-party script, stylesheet, font or frame before consent', () => {
  const offenders = [];
  for (const rel of deployedHtml()) {
    const html = read(rel);
    for (const tag of tags(html, 'script')) {
      if (remote.test(tag) && !/type\s*=\s*["']text\/plain["']/i.test(tag)) offenders.push(`${rel}: ${tag}`);
    }
    for (const tag of tags(html, 'link')) {
      if (remote.test(tag) && /rel\s*=\s*["'][^"']*(stylesheet|preconnect|preload|prefetch|dns-prefetch|modulepreload)/i.test(tag)) offenders.push(`${rel}: ${tag}`);
    }
    for (const tag of [...tags(html, 'iframe'), ...tags(html, 'img')]) {
      if (/\bsrc\s*=\s*["']?(?:https?:)?\/\//i.test(tag)) offenders.push(`${rel}: ${tag}`);
    }
    if (/@import\s+url\(\s*["']?https?:/i.test(html)) offenders.push(`${rel}: remote @import`);
  }
  assert.deepEqual(offenders, []);
});

test('self-hosted fonts reference only local files', () => {
  const css = read('css/fonts.css');
  assert.doesNotMatch(css, /https?:/);
  for (const [, file] of css.matchAll(/url\(\/(css\/fonts\/[^)]+)\)/g)) {
    assert.ok(statSync(join(ROOT, file)).size > 0, file);
  }
});

test('every visitor page mounts the consent banner', () => {
  for (const rel of VISITOR_PAGES) {
    assert.match(read(rel), /<script src="\/resources\/consent\.js" defer><\/script>/, rel);
  }
});

test('the home page footer can reopen the banner', () => {
  assert.match(read('index.html'), /<button[^>]*data-consent-open/);
});

test('Turnstile loads only from the lead form submit, never at page load', () => {
  const html = read('index.html');
  assert.equal((html.match(/_loadTurnstile\(/g) || []).length, 2);
  const submit = html.slice(html.indexOf('function submitWhitepaperEmail()'), html.indexOf('function _postWhitepaperLead('));
  assert.match(submit, /_loadTurnstile\(\)/);
  const open = html.slice(html.indexOf('function openWhitepaperModal('), html.indexOf('var _turnstileLoad'));
  assert.doesNotMatch(open, /turnstile\.render|_loadTurnstile/);
});
