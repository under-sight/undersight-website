/**
 * <undersight-booking> — the undersight booking widget.
 *
 * A Shadow-DOM web component (no iframe, so it sizes itself and inherits the
 * page's design tokens) that talks to /api/booking. Drop it on any page:
 *
 *   <script type="module" src="/resources/booking-widget.js"></script>
 *   <undersight-booking host="Kyle Adriany" initials="KA" title="Discovery Call"
 *                       duration="30" contact="contact@undersight.ai"></undersight-booking>
 *
 * Attributes: api (default /api/booking), host, initials, org, title,
 * duration (minutes, display only), contact (fallback email when the API is down).
 *
 * The pure helpers below are exported for tests (tests/booking-widget.test.mjs);
 * the element registers itself only inside a browser.
 */

export const HOST_ZONE = 'America/Los_Angeles';
const US_ZONES = ['America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad2 = (n) => String(n).padStart(2, '0');
const nbsp = /[  ]/g;

export function visitorTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || HOST_ZONE; } catch { return HOST_ZONE; }
}

export function timeZoneChoices(visitor) {
  const out = [visitor];
  for (const z of US_ZONES) if (!out.includes(z)) out.push(z);
  return out;
}

const partCache = new Map();
function partsFormatter(tz) {
  let f = partCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    partCache.set(tz, f);
  }
  return f;
}

export function dayKeyInTz(iso, tz) {
  const p = {};
  for (const x of partsFormatter(tz).formatToParts(new Date(iso))) p[x.type] = x.value;
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** Map of 'YYYY-MM-DD' (in tz) → sorted ISO starts. */
export function groupByDay(slots, tz) {
  const map = new Map();
  for (const iso of [...slots].sort()) {
    const key = dayKeyInTz(iso, tz);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(iso);
  }
  return map;
}

/** Cells for a month grid: leading nulls up to the first weekday, then {key, day}. */
export function monthCells(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array(first.getUTCDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push({ key: `${year}-${pad2(month)}-${pad2(d)}`, day: d });
  return cells;
}

/** Fetch window for a month with a day of slack so zone skew never drops a day. */
export function monthRange(year, month) {
  return {
    from: new Date(Date.UTC(year, month - 1, 1) - 86400000).toISOString(),
    to: new Date(Date.UTC(year, month, 1) + 86400000).toISOString(),
  };
}

export function addMonths({ year, month }, n) {
  const i = year * 12 + (month - 1) + n;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
}

export function fmtTime(iso, tz) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso)).replace(nbsp, ' ').toLowerCase();
}

export function fmtDayLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

export function fmtLong(iso, tz) {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    .format(new Date(iso));
  return `${day} at ${fmtTime(iso, tz)}`;
}

export function tzLabel(tz, iso = new Date().toISOString()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(iso));
  const p = parts.find((x) => x.type === 'timeZoneName');
  return p ? p.value : tz;
}

const STYLES = `
:host { display: block; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--color-text-secondary, #3A3F47); }
*, *::before, *::after { box-sizing: border-box; }
.bw { display: grid; grid-template-columns: 236px 1fr; background: var(--color-surface, #fff); border: 1px solid var(--color-border, #D1D5DB); border-radius: 12px; box-shadow: var(--shadow-medium, 0 4px 16px rgba(35,38,44,.08)); overflow: hidden; }
.side { padding: 24px 22px; border-right: 1px solid var(--color-border-light, #E8EAED); background: var(--color-bg-alt, #FAFAFA); display: flex; flex-direction: column; gap: 14px; }
.av { width: 44px; height: 44px; border-radius: 50%; background: var(--color-text, #23262C); color: var(--color-bg, #fff); display: flex; align-items: center; justify-content: center; font: 600 15px/1 'Inter', sans-serif; letter-spacing: .02em; }
.host { font-size: 13px; color: var(--color-text-muted, #6B7280); }
.title { font: 700 20px/1.2 'Inter', sans-serif; letter-spacing: -.02em; color: var(--color-text, #23262C); margin-top: 2px; }
.meta { display: flex; flex-direction: column; gap: 8px; font-size: 13.5px; color: var(--color-text-secondary, #3A3F47); }
.meta div { display: flex; gap: 9px; align-items: center; }
.meta svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; color: var(--color-text-muted, #6B7280); }
.main { padding: 22px 24px 24px; min-width: 0; }
.pick { display: grid; grid-template-columns: minmax(0, 320px) minmax(180px, 1fr); gap: 26px; }
.mhead { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.mhead strong { font: 600 15px/1 'Inter', sans-serif; color: var(--color-text, #23262C); flex: 1; }
.nav { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--color-border, #D1D5DB); background: transparent; color: var(--color-text, #23262C); cursor: pointer; font-size: 16px; line-height: 1; }
.nav:disabled { opacity: .35; cursor: default; }
.nav:not(:disabled):hover { background: var(--color-accent-light, rgba(201,122,84,.08)); border-color: var(--color-accent, #C97A54); }
.dow, .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.dow span { text-align: center; font-size: 11px; font-weight: 600; letter-spacing: .06em; color: var(--color-text-muted, #6B7280); padding: 4px 0; }
.day { aspect-ratio: 1; border-radius: 8px; border: 1px solid transparent; background: transparent; font: 500 14px 'DM Sans', sans-serif; color: var(--color-text-muted, #6B7280); cursor: default; position: relative; }
.day.free { color: var(--color-accent, #C97A54); background: var(--color-accent-light, rgba(201,122,84,.08)); cursor: pointer; font-weight: 600; }
.day.free:hover { border-color: var(--color-accent, #C97A54); }
.day.sel, .day.sel:hover { background: var(--color-accent, #C97A54); color: var(--color-on-accent, #fff); border-color: var(--color-accent, #C97A54); }
.day.off { opacity: .45; }
.day.today::after { content: ''; position: absolute; left: 50%; bottom: 4px; width: 4px; height: 4px; border-radius: 50%; background: currentColor; transform: translateX(-50%); }
.day:focus-visible, .slot:focus-visible, .nav:focus-visible, .go:focus-visible, .back:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid var(--color-accent, #C97A54); outline-offset: 2px; }
.slots { display: flex; flex-direction: column; min-height: 300px; }
.lbl { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 600; color: var(--color-text, #23262C); margin-bottom: 10px; min-height: 30px; }
.lbl select { font: 500 12px 'DM Sans', sans-serif; color: var(--color-text-muted, #6B7280); background: transparent; border: 1px solid var(--color-border, #D1D5DB); border-radius: 6px; padding: 4px 6px; max-width: 170px; cursor: pointer; }
.list { display: flex; flex-direction: column; gap: 8px; max-height: 330px; overflow: auto; padding-right: 2px; }
.slot { border: 1px solid var(--color-accent, #C97A54); color: var(--color-accent, #C97A54); background: transparent; border-radius: 8px; padding: 10px 12px; font: 600 14px 'DM Sans', sans-serif; cursor: pointer; text-align: center; transition: background .12s, color .12s; }
.slot:hover { background: var(--color-accent, #C97A54); color: var(--color-on-accent, #fff); }
.empty { font-size: 13.5px; color: var(--color-text-muted, #6B7280); padding: 14px 0; line-height: 1.55; }
.form { max-width: 460px; display: flex; flex-direction: column; gap: 14px; }
.form .title { font-size: 20px; }
.when { font-size: 14px; color: var(--color-text-muted, #6B7280); margin-top: -8px; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--color-text, #23262C); }
input, textarea { font: 400 15px 'DM Sans', sans-serif; color: var(--color-text, #23262C); background: var(--color-surface, #fff); border: 1px solid var(--color-border, #D1D5DB); border-radius: 8px; padding: 10px 12px; width: 100%; }
textarea { min-height: 84px; resize: vertical; }
input:focus, textarea:focus { border-color: var(--color-accent, #C97A54); box-shadow: 0 0 0 3px var(--color-accent-focus, rgba(201,122,84,.2)); outline: none; }
.hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
.actions { display: flex; gap: 12px; align-items: center; margin-top: 4px; flex-wrap: wrap; }
.go { background: var(--color-accent, #C97A54); color: var(--color-on-accent, #fff); border: 0; border-radius: 8px; padding: 12px 22px; font: 600 15px 'DM Sans', sans-serif; cursor: pointer; }
.go:hover { background: var(--color-accent-hover, #B56A45); }
.go:disabled { opacity: .6; cursor: progress; }
.back { background: transparent; border: 0; color: var(--color-text-muted, #6B7280); font: 500 14px 'DM Sans', sans-serif; cursor: pointer; padding: 8px 4px; }
.back:hover { color: var(--color-text, #23262C); }
.err { font-size: 13.5px; color: var(--color-error, #D05454); line-height: 1.5; }
.done { max-width: 480px; display: flex; flex-direction: column; gap: 12px; }
.check { width: 44px; height: 44px; border-radius: 50%; background: var(--color-eucalyptus-light, rgba(107,158,140,.1)); color: var(--color-eucalyptus, #6B9E8C); display: flex; align-items: center; justify-content: center; font-size: 22px; }
.d1 { font: 700 24px/1.15 'Inter', sans-serif; letter-spacing: -.02em; color: var(--color-text, #23262C); }
.d2 { font-size: 15px; line-height: 1.55; }
dl { display: grid; grid-template-columns: 90px 1fr; gap: 8px 14px; margin: 6px 0 0; font-size: 14px; }
dt { color: var(--color-text-muted, #6B7280); }
dd { margin: 0; color: var(--color-text, #23262C); font-weight: 500; }
dd a { color: var(--color-accent, #C97A54); }
.status { font-size: 13px; color: var(--color-text-muted, #6B7280); padding: 40px 0; text-align: center; }
.foot { grid-column: 1 / -1; border-top: 1px solid var(--color-border-light, #E8EAED); padding: 9px 22px; font-size: 12px; color: var(--color-text-muted, #6B7280); display: flex; gap: 12px; }
@media (max-width: 720px) {
  .bw { grid-template-columns: 1fr; }
  .side { border-right: 0; border-bottom: 1px solid var(--color-border-light, #E8EAED); }
  .pick { grid-template-columns: 1fr; }
  .list { max-height: none; }
}
`;

const ICONS = {
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  video: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg>',
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
};

const IS_BROWSER = typeof HTMLElement !== 'undefined' && typeof customElements !== 'undefined' && typeof document !== 'undefined';

if (IS_BROWSER && !customElements.get('undersight-booking')) {
  const h = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'disabled' || k === 'selected') el[k] = Boolean(v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c !== null && c !== undefined) el.append(c);
    return el;
  };

  class UndersightBooking extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      const now = new Date();
      this.state = {
        view: 'loading', tz: visitorTimeZone(),
        month: { year: now.getFullYear(), month: now.getMonth() + 1 },
        cache: new Map(), dayKey: null, slot: null, form: { name: '', email: '', note: '' },
        error: null, result: null, durationMinutes: null, hostZone: HOST_ZONE,
      };
      this.firstMonth = { ...this.state.month };
    }

    get api() { return this.getAttribute('api') || '/api/booking'; }
    attr(name, fallback) { return this.getAttribute(name) || fallback; }

    connectedCallback() {
      this.render();
      this.loadMonth(this.state.month, true);
    }

    setState(patch) { Object.assign(this.state, patch); this.render(); }

    async loadMonth(month, autoSelect) {
      const key = `${month.year}-${month.month}`;
      if (!this.state.cache.has(key)) {
        this.setState({ view: 'loading', error: null });
        try {
          const { from, to } = monthRange(month.year, month.month);
          const res = await fetch(`${this.api}/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(`slots ${res.status}`);
          const data = await res.json();
          this.state.cache.set(key, data.slots || []);
          this.state.durationMinutes = data.durationMinutes || this.state.durationMinutes;
          this.state.hostZone = data.timeZone || this.state.hostZone;
        } catch (err) {
          this.setState({ view: 'error', error: 'unavailable' });
          return;
        }
      }
      const byDay = groupByDay(this.state.cache.get(key), this.state.tz);
      let dayKey = this.state.dayKey && byDay.has(this.state.dayKey) ? this.state.dayKey : null;
      if (!dayKey && autoSelect) {
        const firstDay = [...byDay.keys()].find((k) => k.startsWith(`${month.year}-${pad2(month.month)}`));
        if (firstDay) dayKey = firstDay;
        else if (this.monthsAhead(month) < 3) { this.state.month = addMonths(month, 1); return this.loadMonth(this.state.month, true); }
      }
      this.setState({ view: 'pick', month, dayKey, slot: null, error: null });
    }

    monthsAhead(month) { return (month.year - this.firstMonth.year) * 12 + (month.month - this.firstMonth.month); }
    slotsForMonth() { return this.state.cache.get(`${this.state.month.year}-${this.state.month.month}`) || []; }

    async submit(ev) {
      ev.preventDefault();
      const { form, slot, tz } = this.state;
      if (!form.name.trim() || !form.email.trim()) { this.setState({ error: 'fields' }); return; }
      this.setState({ view: 'submitting', error: null });
      try {
        const res = await fetch(`${this.api}/book`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), note: form.note.trim(), start: slot, timeZone: tz, website: this.honeypot || '' }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) { this.setState({ view: 'done', result: data }); return; }
        if (res.status === 409) {
          this.state.cache.delete(`${this.state.month.year}-${this.state.month.month}`);
          this.state.slot = null; this.state.error = 'taken';
          await this.loadMonth(this.state.month, true);
          return;
        }
        if (res.status === 400) { this.setState({ view: 'form', error: data.error || 'invalid' }); return; }
        if (res.status === 429) { this.setState({ view: 'form', error: 'rate' }); return; }
        this.setState({ view: 'form', error: 'unavailable' });
      } catch {
        this.setState({ view: 'form', error: 'unavailable' });
      }
    }

    errorText(code) {
      const contact = this.attr('contact', 'contact@undersight.ai');
      switch (code) {
        case 'taken': return 'That time was just taken. Pick another.';
        case 'fields': return 'Name and email are required.';
        case 'invalid_email': return 'That email address does not look right.';
        case 'invalid_name': return 'Please enter your name.';
        case 'invalid_start': return 'That time is no longer available. Pick another.';
        case 'rate': return 'Too many attempts from this connection. Try again in a minute.';
        default: return `Booking is temporarily unavailable. Email ${contact} and we will find a time.`;
      }
    }

    render() {
      const s = this.state;
      const root = this.shadowRoot;
      root.innerHTML = '';
      root.append(h('style', { html: STYLES }));
      const duration = s.durationMinutes || Number(this.attr('duration', '30'));
      const side = h('div', { class: 'side' }, [
        h('div', { class: 'av' }, this.attr('initials', 'KA')),
        h('div', {}, [h('div', { class: 'host' }, `${this.attr('host', 'Kyle Adriany')} · ${this.attr('org', 'undersight')}`), h('div', { class: 'title' }, this.attr('title', 'Discovery Call'))]),
        h('div', { class: 'meta' }, [
          h('div', { html: `${ICONS.clock}<span>${duration} min</span>` }),
          h('div', { html: `${ICONS.video}<span>Google Meet</span>` }),
          h('div', { html: `${ICONS.globe}<span>${escapeHtml(s.tz.replace(/_/g, ' '))} (${escapeHtml(tzLabel(s.tz))})</span>` }),
        ]),
      ]);
      const main = h('div', { class: 'main', 'aria-live': 'polite' });
      if (s.view === 'loading') main.append(h('div', { class: 'status' }, 'Checking the calendar…'));
      else if (s.view === 'error') main.append(h('div', { class: 'empty' }, this.errorText('unavailable')));
      else if (s.view === 'done') main.append(this.doneView());
      else if (s.view === 'form' || s.view === 'submitting') main.append(this.formView());
      else main.append(this.pickView());
      const foot = h('div', { class: 'foot' }, [h('span', {}, 'Times shown in your time zone'), h('span', { style: 'margin-left:auto' }, 'Invite and Meet link arrive by email')]);
      root.append(h('div', { class: 'bw' }, [side, main, foot]));
    }

    pickView() {
      const s = this.state;
      const byDay = groupByDay(this.slotsForMonth(), s.tz);
      const todayKey = dayKeyInTz(new Date().toISOString(), s.tz);
      const cal = h('div', { class: 'cal' });
      const prevDisabled = this.monthsAhead(s.month) <= 0;
      const nextDisabled = this.monthsAhead(s.month) >= 3;
      cal.append(h('div', { class: 'mhead' }, [
        h('strong', {}, `${MONTHS[s.month.month - 1]} ${s.month.year}`),
        h('button', { class: 'nav', type: 'button', 'aria-label': 'Previous month', disabled: prevDisabled, onclick: () => this.loadMonth(addMonths(s.month, -1), true) }, '‹'),
        h('button', { class: 'nav', type: 'button', 'aria-label': 'Next month', disabled: nextDisabled, onclick: () => this.loadMonth(addMonths(s.month, 1), true) }, '›'),
      ]));
      cal.append(h('div', { class: 'dow' }, WEEKDAYS.map((d) => h('span', {}, d[0]))));
      const grid = h('div', { class: 'grid', role: 'grid' });
      for (const cell of monthCells(s.month.year, s.month.month)) {
        if (!cell) { grid.append(h('div', {})); continue; }
        const free = byDay.has(cell.key);
        const cls = ['day', free ? 'free' : 'off', s.dayKey === cell.key ? 'sel' : '', cell.key === todayKey ? 'today' : ''].join(' ').trim();
        grid.append(h('button', {
          class: cls, type: 'button', disabled: !free, 'aria-label': fmtDayLabel(cell.key), 'aria-pressed': s.dayKey === cell.key ? 'true' : 'false',
          onclick: () => this.setState({ dayKey: cell.key, slot: null, error: null }),
        }, String(cell.day)));
      }
      cal.append(grid);

      const slots = h('div', { class: 'slots' });
      const tzSelect = h('select', { 'aria-label': 'Time zone', onchange: (e) => { this.state.tz = e.target.value; this.loadMonth(this.state.month, true); } },
        timeZoneChoices(s.tz).map((z) => h('option', { value: z, selected: z === s.tz }, `${z.replace(/_/g, ' ')} (${tzLabel(z)})`)));
      slots.append(h('div', { class: 'lbl' }, [h('span', {}, s.dayKey ? fmtDayLabel(s.dayKey) : 'Pick a day'), tzSelect]));
      if (s.error) slots.append(h('div', { class: 'err' }, this.errorText(s.error)));
      if (!s.dayKey) {
        slots.append(h('div', { class: 'empty' }, byDay.size ? 'Select a highlighted day to see open times.' : 'No open times this month. Try the next one.'));
      } else {
        slots.append(h('div', { class: 'list' }, (byDay.get(s.dayKey) || []).map((iso) => h('button', {
          class: 'slot', type: 'button', onclick: () => this.setState({ slot: iso, view: 'form', error: null }),
        }, fmtTime(iso, s.tz)))));
      }
      return h('div', { class: 'pick' }, [cal, slots]);
    }

    formView() {
      const s = this.state;
      const form = h('form', { class: 'form', novalidate: true, onsubmit: (e) => this.submit(e) });
      form.append(h('div', { class: 'title' }, 'Confirm your details'));
      form.append(h('div', { class: 'when' }, `${fmtLong(s.slot, s.tz)} ${tzLabel(s.tz, s.slot)}`));
      const field = (key, label, type, placeholder, tag = 'input') => {
        const input = h(tag, { type, name: key, placeholder, required: key !== 'note', autocomplete: key === 'note' ? 'off' : key, value: tag === 'input' ? s.form[key] : undefined, oninput: (e) => { s.form[key] = e.target.value; } });
        if (tag === 'textarea') input.value = s.form[key];
        return h('label', {}, [label, input]);
      };
      form.append(field('name', 'Name', 'text', 'Your name'));
      form.append(field('email', 'Work email', 'email', 'you@company.com'));
      form.append(field('note', 'What are we looking at? (optional)', 'text', 'One live submission, MCA', 'textarea'));
      const hp = h('input', { class: 'hp', type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', oninput: (e) => { this.honeypot = e.target.value; } });
      form.append(hp);
      if (s.error) form.append(h('div', { class: 'err', role: 'alert' }, this.errorText(s.error)));
      form.append(h('div', { class: 'actions' }, [
        h('button', { class: 'go', type: 'submit', disabled: s.view === 'submitting' }, s.view === 'submitting' ? 'Booking…' : 'Confirm booking'),
        h('button', { class: 'back', type: 'button', onclick: () => this.setState({ view: 'pick', slot: null, error: null }) }, '← Back'),
      ]));
      return form;
    }

    doneView() {
      const s = this.state;
      const r = s.result;
      const box = h('div', { class: 'done' });
      box.append(h('div', { class: 'check' }, '✓'));
      box.append(h('div', { class: 'd1' }, 'You’re booked'));
      box.append(h('div', { class: 'd2' }, 'A calendar invite with the Google Meet link is on its way to your inbox. Need to move it? Reply to the invite.'));
      const dl = h('dl');
      const rows = [
        ['When', `${fmtLong(r.start, s.tz)} ${tzLabel(s.tz, r.start)}`],
        ['Duration', `${s.durationMinutes || this.attr('duration', '30')} minutes`],
        ['Where', r.meetLink ? h('a', { href: r.meetLink, target: '_blank', rel: 'noopener' }, 'Google Meet') : 'Google Meet'],
        ['Host', this.attr('host', 'Kyle Adriany')],
      ];
      for (const [k, v] of rows) { dl.append(h('dt', {}, k)); dl.append(h('dd', {}, v)); }
      box.append(dl);
      box.append(h('button', { class: 'back', type: 'button', onclick: () => { this.state.cache.clear(); this.setState({ view: 'loading', dayKey: null, slot: null, result: null, form: { name: '', email: '', note: '' } }); this.loadMonth(this.state.month, true); } }, '← Book another'));
      return box;
    }
  }

  customElements.define('undersight-booking', UndersightBooking);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
