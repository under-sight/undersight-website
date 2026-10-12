(function (root) {
  var COOKIE = 'undersight_consent';
  var MAX_AGE = 31536000;
  var PRIVACY_URL = 'https://legal.undersight.ai';
  var COPY = {
    body: 'Any third-party analytics or marketing tags load only after you click Accept, and the site works fully if you decline. undersight stores your choice in a first-party cookie for one year.',
    accept: 'Accept',
    decline: 'Decline',
    privacy: 'Privacy policy',
    reopen: 'Cookie settings',
  };

  function readChoice(cookieString) {
    var parts = String(cookieString || '').split(/;\s*/);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === COOKIE + '=granted') return 'granted';
      if (parts[i] === COOKIE + '=declined') return 'declined';
    }
    return null;
  }

  function cookieFor(choice, secure) {
    return COOKIE + '=' + choice + '; Max-Age=' + MAX_AGE + '; Path=/; SameSite=Lax' + (secure ? '; Secure' : '');
  }

  function activate(doc) {
    var inert = doc.querySelectorAll('script[type="text/plain"][data-consent]');
    for (var i = 0; i < inert.length; i++) {
      var held = inert[i];
      var live = doc.createElement('script');
      for (var j = 0; j < held.attributes.length; j++) {
        var attr = held.attributes[j];
        if (attr.name === 'type' || attr.name === 'data-consent') continue;
        live.setAttribute(attr.name === 'data-src' ? 'src' : attr.name, attr.value);
      }
      live.text = held.text;
      held.parentNode.replaceChild(live, held);
    }
    return inert.length;
  }

  var STYLE = [
    '.us-consent{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:var(--color-surface,var(--bg,Canvas));color:var(--color-text,var(--ink,CanvasText));border-top:1px solid var(--color-border,var(--line,GrayText));font-family:var(--font-sans,system-ui,sans-serif);}',
    '.us-consent[hidden]{display:none;}',
    '.us-consent-inner{max-width:1200px;margin:0 auto;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:24px;}',
    '.us-consent p{margin:0;font-size:14px;line-height:1.6;color:var(--color-text-secondary,var(--ink,CanvasText));max-width:760px;}',
    '.us-consent a{color:inherit;text-decoration:underline;}',
    '.us-consent-actions{display:flex;gap:10px;flex-shrink:0;}',
    '.us-consent button{min-height:44px;padding:10px 20px;border-radius:6px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;border:1px solid var(--color-border,ButtonBorder);background:transparent;color:inherit;}',
    '.us-consent button[data-consent-accept]{background:var(--color-accent,var(--amber,var(--amber-rust,ButtonText)));border-color:var(--color-accent,var(--amber,var(--amber-rust,ButtonText)));color:var(--color-accent-text,var(--color-on-accent,Canvas));}',
    '.us-consent button:focus-visible{outline:2px solid var(--color-accent,Highlight);outline-offset:2px;}',
    '@media (max-width:760px){.us-consent-inner{flex-direction:column;align-items:stretch;gap:12px;}.us-consent-actions button{flex:1;}}',
  ].join('');

  function buildBanner(doc) {
    var style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);
    var banner = doc.createElement('div');
    banner.className = 'us-consent';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.setAttribute('data-consent-banner', '');
    banner.hidden = true;
    banner.innerHTML =
      '<div class="us-consent-inner"><p></p><div class="us-consent-actions">' +
      '<button type="button" data-consent-decline></button>' +
      '<button type="button" data-consent-accept></button></div></div>';
    var p = banner.querySelector('p');
    p.appendChild(doc.createTextNode(COPY.body + ' '));
    var link = doc.createElement('a');
    link.href = PRIVACY_URL;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = COPY.privacy;
    p.appendChild(link);
    banner.querySelector('[data-consent-decline]').textContent = COPY.decline;
    banner.querySelector('[data-consent-accept]').textContent = COPY.accept;
    doc.body.appendChild(banner);
    return banner;
  }

  function mount(win) {
    var doc = win.document;
    var banner = buildBanner(doc);
    var choice = readChoice(doc.cookie);
    banner.hidden = choice !== null;
    if (choice === 'granted') activate(doc);
    function save(next) {
      doc.cookie = cookieFor(next, win.location.protocol === 'https:');
      banner.hidden = true;
      if (next === 'granted') {
        activate(doc);
        win.dispatchEvent(new Event('undersight:consent-granted'));
      }
    }
    banner.querySelector('[data-consent-accept]').addEventListener('click', function () { save('granted'); });
    banner.querySelector('[data-consent-decline]').addEventListener('click', function () { save('declined'); });
    doc.addEventListener('click', function (event) {
      var target = event.target;
      if (target && target.closest && target.closest('[data-consent-open]')) {
        event.preventDefault();
        banner.hidden = false;
        banner.querySelector('[data-consent-accept]').focus();
      }
    });
    var reopen = doc.querySelectorAll('[data-consent-open]');
    for (var i = 0; i < reopen.length; i++) {
      if (!reopen[i].textContent.trim()) reopen[i].textContent = COPY.reopen;
    }
    return banner;
  }

  var api = { COOKIE: COOKIE, COPY: COPY, readChoice: readChoice, cookieFor: cookieFor, activate: activate, mount: mount };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.UndersightConsent = api;
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', function () { mount(root); });
    } else {
      mount(root);
    }
  }
})(this);
