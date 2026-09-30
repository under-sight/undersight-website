/**
 * Blog email gate: pure helpers shared by index.html (window.BlogGate) and
 * tests/blog-gate.test.mjs (CommonJS export). Loaded as a classic blocking
 * script because baked content can open a deep-linked post during parse.
 *
 * A post is gated when it has a PDF in CMS/Blog: the visitor sees it blurred
 * behind the email dialog, and submitting unlocks it and emails the PDF via
 * /api/whitepaper-lead. Posts without a PDF stay open (nothing to send).
 */
(function (root) {
  var UNLOCK_KEY = 'undersight:blog-unlocked';

  function shouldGate(post, unlocked) {
    return !!(post && post.hasPdf) && !unlocked;
  }

  // Storage can be missing or throw (private mode, blocked site data); the
  // gate then simply shows again, which is the safe failure.
  function isUnlocked(storage) {
    try { return !!storage && storage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; }
  }
  function markUnlocked(storage) {
    try { if (storage) storage.setItem(UNLOCK_KEY, '1'); } catch (e) { /* ignore */ }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function plainSummary(md) {
    return String(md || '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s*(#+|>)\s*/gm, '')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var SUMMARY_MAX = 200;

  // Most CMS posts have no Excerpt, so the lead paragraph stands in: the
  // first block that is not a heading, image, list, table, rule or legacy
  // `**Key:** value` front-matter line, trimmed at
  // a sentence end (or a word, with an ellipsis) within SUMMARY_MAX.
  function leadParagraph(md) {
    var blocks = String(md || '').split(/\n\s*\n/);
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i].trim();
      if (!b || /^(#|!\[|[-*+] |\d+\. |\||---|<|\*\*[\w ]+:\*\*)/.test(b)) continue;
      var text = plainSummary(b);
      if (text.length <= SUMMARY_MAX) return text;
      var cut = text.slice(0, SUMMARY_MAX);
      var end = cut.lastIndexOf('. ');
      if (end > 60) return cut.slice(0, end + 1);
      return cut.slice(0, cut.lastIndexOf(' ')) + '…';
    }
    return '';
  }

  function summaryOf(post) {
    post = post || {};
    return plainSummary(post.excerpt) || leadParagraph(post.body) || plainSummary(post.subtitle);
  }

  // The H1 carries the post summary for search engines and screen readers;
  // .sr-only keeps it out of the visual layout.
  function headingHtml(title, summary) {
    var s = plainSummary(summary);
    return escapeHtml(title) + (s ? '<span class="sr-only">: ' + escapeHtml(s) + '</span>' : '');
  }

  var api = { shouldGate: shouldGate, isUnlocked: isUnlocked, markUnlocked: markUnlocked,
    headingHtml: headingHtml, plainSummary: plainSummary, summaryOf: summaryOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BlogGate = api;
})(this);
