'use strict';
// 3.3.5 mobile-first guards (spec TC-MB-T01..T07). CI has no browser, so these pin the CSS rules
// and a registry of every control the code emits. Layout facts (widths, overflow) are the
// recorded browser checks in the spec (B-MB01..B-MB10).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('styles.css');
const MARKER = '/* 3.3.5 mobile-first */';

// Minimal CSS reader: returns rules [{sel, decl:{prop:value}, media:[...]}] in source order.
function parse(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const walk = (s, media) => {
    let i = 0;
    while (i < s.length) {
      const open = s.indexOf('{', i);
      if (open < 0) break;
      const head = s.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < s.length && depth) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') depth--;
        j++;
      }
      const body = s.slice(open + 1, j - 1);
      if (head.startsWith('@media')) walk(body, media.concat(head.slice(6).trim()));
      else if (!head.startsWith('@')) {
        const decl = {};
        for (const d of body.split(';')) {
          const k = d.indexOf(':');
          if (k > 0) decl[d.slice(0, k).trim()] = d.slice(k + 1).trim();
        }
        rules.push({ sel: head.replace(/\s+/g, ' '), decl, media });
      }
      i = j;
    }
  };
  walk(src, []);
  return rules;
}
const PHONE = '(max-width: 700px)';
const markerAt = css.indexOf(MARKER);
const block = markerAt < 0 ? '' : css.slice(markerAt);
const blockRules = parse(block);
const allRules = parse(css);
const px = (v) => (v && /^(\d+(\.\d+)?)px$/.test(v) ? parseFloat(v) : NaN);
const inPhone = (r) => r.media.length === 1 && r.media[0] === PHONE;
const find = (rules, sel, prop) =>
  rules.filter(
    (r) =>
      inPhone(r) &&
      r.sel
        .split(',')
        .map((s) => s.trim())
        .includes(sel) &&
      prop in r.decl,
  );

test('TC-MB-T02 the 3.3.5 block exists, is last, and sets button and summary minimums', () => {
  assert.ok(markerAt > 0, `styles.css must contain the marker ${MARKER}`);
  assert.equal(css.indexOf(MARKER, markerAt + 1), -1, 'marker appears once');
  const [b] = find(blockRules, 'button', 'min-width');
  assert.ok(b, 'button { min-width } inside @media (max-width: 700px) in the 3.3.5 block');
  assert.ok(px(b.decl['min-width']) >= 44, 'button min-width >= 44px');
  assert.ok(
    px(find(blockRules, 'button', 'min-height')[0]?.decl['min-height']) >= 44,
    'button min-height >= 44px',
  );
  const s = find(blockRules, 'summary', 'min-height')[0];
  assert.ok(s && px(s.decl['min-height']) >= 44, 'summary min-height >= 44px');
  assert.equal(s.decl.display, 'flex');
  assert.equal(s.decl['align-items'], 'center');
});

test('TC-MB-T03 checkbox and radio boxes are drawn at least 24 x 24 px on phones', () => {
  const rules = blockRules.filter(
    (r) => inPhone(r) && /input\[type=['"]?(checkbox|radio)['"]?\]/.test(r.sel) && r.decl.width,
  );
  assert.ok(rules.length, 'a phone rule sizes input[type=checkbox] / radio');
  for (const kind of ['checkbox', 'radio']) {
    const r = rules.find((x) => x.sel.includes(kind));
    assert.ok(r, `${kind} rule exists`);
    assert.ok(px(r.decl.width) >= 24 && px(r.decl.height) >= 24, `${kind} is >= 24 x 24px`);
    assert.ok(!/min-height/.test(JSON.stringify(r.decl)) || px(r.decl['min-height']) >= 24);
  }
});

test('TC-MB-T04 no phone width above 288px; nowrap allowlisted', () => {
  // Phone-only nowrap rules and why they are safe: both are short single-word labels
  // ("Add expense", header buttons) sized in 3.3.3 to fit 288px.
  const NOWRAP_OK = new Set(['.panel-head #add', '.header-actions > button:not(#theme-toggle)']);
  for (const r of allRules.filter((x) => x.media.some((m) => /max-width:\s*(\d+)px/.test(m)))) {
    for (const prop of ['width', 'min-width']) {
      const v = px(r.decl[prop]);
      if (!isNaN(v))
        assert.ok(v <= 288, `${r.media} ${r.sel} { ${prop}: ${v}px } cannot fit 320px`);
    }
    if (/nowrap/.test(r.decl['white-space'] || ''))
      assert.ok(
        NOWRAP_OK.has(r.sel),
        `${r.sel} uses white-space: nowrap on phones; allowlist it with a reason`,
      );
  }
});

test('TC-MB-T05 no effective font-size below 11px', () => {
  const small = allRules.filter((r) => px(r.decl['font-size']) < 11 && !blockRules.includes(r));
  assert.ok(small.length > 0 || markerAt > 0);
  for (const r of blockRules)
    if ('font-size' in r.decl)
      assert.ok(px(r.decl['font-size']) >= 11 || isNaN(px(r.decl['font-size'])), `${r.sel}`);
  for (const r of small) {
    const fixed = blockRules.some(
      (o) =>
        inPhone(o) &&
        o.decl['font-size'] &&
        px(o.decl['font-size']) >= 11 &&
        o.sel.split(',').some((s) =>
          r.sel
            .split(',')
            .map((x) => x.trim())
            .includes(s.trim()),
        ),
    );
    assert.ok(
      fixed,
      `${r.sel} { font-size: ${r.decl['font-size']} } is under 11px: override it in 3.3.5`,
    );
  }
});

test('TC-MB-T06 stat tiles wrap and the converter controls wrap (large-text reflow)', () => {
  const stats = find(blockRules, '.stats', 'grid-template-columns')[0];
  assert.ok(
    stats && /auto-fit|auto-fill/.test(stats.decl['grid-template-columns']),
    '.stats uses auto-fit',
  );
  const conv = blockRules.find(
    (r) =>
      (inPhone(r) && /\.conversion-controls/.test(r.sel) && r.decl['grid-template-columns']) ||
      (r.decl?.['flex-wrap'] === 'wrap' && /conversion/.test(r.sel)),
  );
  assert.ok(conv, 'the converter controls reflow in the 3.3.5 block');
  for (const sel of ['.expense-name', '.tag-chip', '.description']) {
    const r = blockRules.find(
      (x) =>
        inPhone(x) &&
        x.sel
          .split(',')
          .map((s) => s.trim())
          .some((s) => s.includes(sel)) &&
        x.decl['overflow-wrap'],
    );
    assert.ok(r, `${sel} has overflow-wrap in the 3.3.5 block`);
  }
});

test('TC-MB-T07 3.3.3 regression guard', () => {
  const hdr = allRules.filter(
    (r) => inPhone(r) && r.sel.includes('.header-actions > button:not(#theme-toggle)'),
  );
  assert.ok(
    hdr.some((r) => px(r.decl['min-height']) >= 44 && px(r.decl['font-size']) === 11),
    'header buttons 44px tall, 11px text',
  );
  const tg = allRules.find((r) => r.sel === '#theme-toggle' && !r.media.length && r.decl.width);
  assert.ok(
    px(tg.decl.width) === 44 &&
      px(tg.decl.height) === 44 &&
      px(tg.decl['min-width']) === 44 &&
      px(tg.decl['min-height']) === 44,
  );
  const field = allRules.find(
    (r) =>
      inPhone(r) &&
      r.sel
        .split(',')
        .map((s) => s.trim())
        .includes('textarea') &&
      r.decl['font-size'],
  );
  assert.equal(field.decl['font-size'], '16px');
  for (const r of allRules.filter((x) => /:hover/.test(x.sel)))
    assert.ok(
      r.media.some((m) => /hover:\s*hover/.test(m)),
      `${r.sel} must be inside @media (hover: hover)`,
    );
  const html = read('index.html');
  const vp = html.match(/<meta[^>]*name="viewport"[^>]*>/)[0];
  assert.ok(!/user-scalable|maximum-scale/.test(vp), 'pinch-zoom stays allowed');
});

// TC-MB-T01 registry: every kind of control the sources emit is mapped to a rule or an exemption.
const sources = ['index.html', 'app.js', 'recurring.js', 'voice.js', 'theme.js'].map((f) => [
  f,
  read(f),
]);
const kinds = new Map();
for (const [f, text] of sources) {
  for (const m of text.matchAll(/<(button|summary|select|textarea|a|input)\b([^>]*)>/g)) {
    const tag = m[1];
    if (tag === 'a' && !/href/.test(m[2])) continue;
    const type = tag === 'input' ? (m[2].match(/type="(\w+)"/) || [0, 'text'])[1] : '';
    const key = tag + (type ? `[type=${type}]` : '');
    if (!kinds.has(key)) kinds.set(key, []);
    kinds.get(key).push(f);
  }
  // Exemption: <pre tabindex="0"> is a keyboard-scrollable log region, not a tap target.
  const noPre = text.replace(/<pre\b[^>]*>/g, '');
  for (const m of noPre.matchAll(/role="button"|role='button'|tabindex="0"|onclick=/g))
    kinds.set(`custom ${m[0]} in ${f}`, [f]);
  for (const m of text.matchAll(
    /createElement\(['"](button|summary|a|input|select|textarea)['"]\)/g,
  ))
    if (!kinds.has(m[1] === 'input' ? 'input[type=text]' : m[1]))
      kinds.set(m[1] + ' (createElement)', [f]);
}
const hasRule = (sel, prop, min) =>
  find(blockRules, sel, prop).some((r) => px(r.decl[prop]) >= min);
const REGISTRY = {
  button: () => hasRule('button', 'min-width', 44) && hasRule('button', 'min-height', 44),
  summary: () => hasRule('summary', 'min-height', 44),
  'input[type=text]': () =>
    /input,\s*select\s*\{[^}]*min-height:\s*44px/.test(css.replace(/\n/g, ' ')),
  'input[type=date]': () => REGISTRY['input[type=text]'](),
  'input[type=month]': () => REGISTRY['input[type=text]'](),
  'input[type=number]': () => REGISTRY['input[type=text]'](),
  select: () => REGISTRY['input[type=text]'](),
  textarea: () => REGISTRY['input[type=text]'](),
  'input[type=search]': () => REGISTRY['input[type=text]'](),
  'input[type=file]': () => REGISTRY['input[type=text]'](),
  'input[type=checkbox]': () =>
    hasRule("input[type='checkbox']", 'width', 24) ||
    blockRules.some((r) => /checkbox/.test(r.sel) && px(r.decl.width) >= 24),
  'input[type=radio]': () => blockRules.some((r) => /radio/.test(r.sel) && px(r.decl.width) >= 24),
  // In-text link: the footer Studio link is 44px by .studio-link; no other <a href> exists.
  a: () => /\.studio-link\s*\{[^}]*min-height:\s*44px/.test(css.replace(/\n/g, ' ')),
};
test('TC-MB-T01 every control kind the code emits maps to a size rule', () => {
  assert.ok(kinds.has('button') && kinds.has('summary'), 'registry saw buttons and summaries');
  for (const [key, files] of kinds) {
    assert.ok(
      REGISTRY[key],
      `New control kind "${key}" (${files[0]}) has no size rule: add rule + REGISTRY entry`,
    );
    assert.ok(
      REGISTRY[key](),
      `Control kind "${key}" (${files[0]}): its 44px phone rule is missing or too small`,
    );
  }
});
