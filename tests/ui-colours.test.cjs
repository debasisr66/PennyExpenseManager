'use strict';
// Colour tokens: literal ratchet, token sets, light pin, contrast (WCAG 2.x), tag chips.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('styles.css').replace(/\[data-theme="(\w+)"\]/g, "[data-theme='$1']");

function blockBody(selector) {
  const out = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf(selector + ' {', from);
    if (at < 0) return out;
    const open = css.indexOf('{', at);
    const close = css.indexOf('}', open);
    out.push({ at, end: close + 1, body: css.slice(open + 1, close) });
    from = close;
  }
}
const tokensOf = (body) =>
  Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const LIGHT = blockBody(':root').filter((b) => b.body.includes('--bg:'));
const lightBlock = LIGHT[0];
const light = tokensOf(lightBlock.body);
const darkMedia = blockBody(":root:not([data-theme='light'])")[0];
const darkAttr = blockBody(":root[data-theme='dark']")[0];
assert.ok(darkMedia && darkAttr, 'both dark blocks exist');
const dark = tokensOf(darkAttr.body);
const tokenBlocks = [lightBlock, darkMedia, darkAttr];

function hex(h) {
  let x = h.replace('#', '');
  if (x.length === 3 || x.length === 4) x = [...x].map((c) => c + c).join('');
  const n = x.match(/../g).map((v) => parseInt(v, 16));
  return { r: n[0], g: n[1], b: n[2], a: n.length === 4 ? n[3] / 255 : 1 };
}
function over(top, under) {
  const a = top.a;
  return {
    r: top.r * a + under.r * (1 - a),
    g: top.g * a + under.g * (1 - a),
    b: top.b * a + under.b * (1 - a),
    a: 1,
  };
}
function lum(c) {
  const f = [c.r, c.g, c.b].map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}
function ratio(a, b) {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const rgbOf = (tokens, name, under) => {
  const c = hex(tokens[name]);
  return c.a < 1 && under ? over(c, under) : c;
};
const contrast = (tokens, fg, bg) => ratio(rgbOf(tokens, fg, rgbOf(tokens, bg)), rgbOf(tokens, bg));

// The 7 original 3.3.2 checks (kept): white is now --surface.
for (const fg of ['ink', 'muted', 'red']) {
  for (const bg of ['surface', 'bg']) {
    test('UI normal text contrast ' + fg + ' / ' + bg, () => {
      assert.ok(contrast(light, fg, bg) >= 4.5);
    });
  }
}
test('UI primary button text contrast', () => assert.ok(contrast(light, 'on-accent', 'green') >= 4.5));

// TC-TH-C01
const NAMED = /\b(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|silver|navy|teal|gold)\b/;
function colourLiterals(text) {
  const found = [];
  const stripped = text.replace(/var\(--[\w-]+\)/g, 'VAR');
  for (const decl of stripped.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:\s*([^;{}]+)/g)) {
    const [, prop, value] = decl;
    if (prop.startsWith('--')) continue;
    for (const m of value.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) found.push(prop + ': ' + m[0]);
    for (const m of value.matchAll(/\b(rgba?|hsla?)\(\s*\d/g)) found.push(prop + ': ' + m[0]);
    if (NAMED.test(value)) found.push(prop + ': ' + value);
  }
  return found;
}
test('TC-TH-C01 no colour literals outside the token blocks', () => {
  let rest = css;
  for (const b of [...tokenBlocks].sort((x, y) => y.at - x.at)) rest = rest.slice(0, b.at) + rest.slice(b.end);
  assert.deepEqual(colourLiterals(rest), []);
  assert.deepEqual(app().match(/#[0-9a-fA-F]{3,8}\b/g) || [], []);
  const inline = [...read('index.html').matchAll(/style="([^"]*)"/g)].map((m) => m[1]);
  for (const s of inline) assert.deepEqual(colourLiterals(s), [], s);
});
function app() {
  return read('app.js');
}

// TC-TH-C04: light values equal 3.3.2 except the approved fixes.
const OLD = {
  bg: '#f5f7f3', surface: '#ffffff', line: '#e1e7df', 'line-2': '#d5dfd1', ink: '#193c36',
  muted: '#5d7069', 'brand-dot': '#9fae9d', green: '#216653', 'on-accent': '#ffffff',
  red: '#ad3e35', track: '#d8e2d3', 'bar-track': '#f0f3ed', 'warn-bg': '#fff2ed',
  'locked-bg': '#eef3fb', 'locked-line': '#c4d3ea', 'tag-l': '96%', 'tag-line-l': '81%',
  'tag-s': '65%', 'tag-line-s': '48%', 'chip-hover': '#ffffff77', shadow: '#173a3526',
  'shadow-soft': '#193c3605', backdrop: '#14372f65', 'cat-0': '#28745b',
};
const NEW = { tap: '#21665333' };
const FIXED = {
  field: '#7f8f86', focus: '#9a6b00', 'cat-1': '#6f8a4a', 'cat-2': '#a2741a', 'cat-3': '#3d8389',
  'cat-4': '#7d68a3', 'cat-5': '#b0613a', 'cat-6': '#6f7768',
  'cat-7': '#4f6fa8', 'cat-8': '#a8506e',
};
const TINTS = ['#eef3e8', '#edf2e9', '#eef3ea', '#edf2ed', '#efefeb', '#edf0e9', '#edf2eb'];
test('TC-TH-C04 light pin', () => {
  for (const [k, v] of Object.entries({ ...OLD, ...NEW, ...FIXED })) assert.equal(light[k], v, k);
  const s2 = hex(light['surface-2']);
  for (const t of TINTS) {
    const o = hex(t);
    for (const ch of ['r', 'g', 'b']) assert.ok(Math.abs(o[ch] - s2[ch]) <= 3, t + ' ' + ch);
  }
});

// TC-TH-C02
test('TC-TH-C02 light and dark blocks define the same tokens; the dark blocks are identical', () => {
  const keys = (t) => Object.keys(t).sort();
  assert.deepEqual(keys(dark), keys(light));
  assert.deepEqual(keys(tokensOf(darkMedia.body)), keys(light));
  assert.equal(darkMedia.body.replace(/\s+/g, ' ').trim(), darkAttr.body.replace(/\s+/g, ' ').trim());
  assert.match(css.slice(0, darkMedia.at), /@media \(prefers-color-scheme: dark\) \{\s*$/);
});

// TC-TH-C03: section 3.3 of the spec, both themes. [foreground, background, need, note]
const PAIRS = [
  ['ink', 'surface', 4.5], ['ink', 'bg', 4.5], ['ink', 'surface-2', 4.5],
  ['muted', 'bg', 4.5], ['muted', 'surface-2', 4.5], ['muted', 'surface', 4.5],
  ['red', 'surface', 4.5], ['red', 'bg', 4.5], ['green', 'surface', 4.5],
  ['on-accent', 'green', 4.5], ['on-accent', 'red', 4.5], ['surface', 'ink', 4.5],
  ['focus', 'bg', 3], ['focus', 'surface', 3], ['focus', 'surface-2', 3],
  ['field', 'surface', 3], ['green', 'track', 3], ['red', 'track', 3],
  ['red', 'warn-bg', 4.5], ['ink', 'locked-bg', 4.5], ['green', 'surface-2', 4.5],
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => ['cat-' + n, 'bar-track', 3]),
];
for (const [name, tokens] of [['light', light], ['dark', dark]]) {
  test('TC-TH-C03 contrast pairs, ' + name, () => {
    const bad = PAIRS.filter(([fg, bg, need]) => contrast(tokens, fg, bg) < need).map(
      ([fg, bg, need]) => `${fg} on ${bg}: ${contrast(tokens, fg, bg).toFixed(2)} < ${need}`,
    );
    assert.deepEqual(bad, []);
  });
}

// TC-TH-C05: tag chips, hues 0-359 step 15, resting and with the hover overlay.
function hsl(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a: 1 };
}
for (const [name, tokens] of [['light', light], ['dark', dark]]) {
  test('TC-TH-C05 tag chip text, ' + name, () => {
    const pct = (k) => parseFloat(tokens[k]);
    const ink = rgbOf(tokens, 'ink');
    const hover = hex(tokens['chip-hover']);
    const bad = [];
    for (let h = 0; h < 360; h += 15) {
      const bg = hsl(h, pct('tag-s'), pct('tag-l'));
      const rest = ratio(ink, bg);
      const hov = ratio(ink, over(hover, bg));
      if (rest < 4.5 || hov < 4.5) bad.push(`${h}: ${rest.toFixed(2)} / ${hov.toFixed(2)}`);
    }
    assert.deepEqual(bad, []);
  });
}

// TC-TH-C06
test('TC-TH-C06 color-scheme per block and a placeholder rule on --muted', () => {
  assert.match(lightBlock.body, /color-scheme:\s*light;/);
  assert.match(darkMedia.body, /color-scheme:\s*dark;/);
  assert.match(darkAttr.body, /color-scheme:\s*dark;/);
  assert.match(css, /::placeholder\s*\{[^}]*color:\s*var\(--muted\)/);
});

// TC-TH-C07: Studio's neutrals at debasisr66/studio 8faaf62 (css/site.css), read-only copy.
test('TC-TH-C07 dark neutrals equal Studio 8faaf62', () => {
  const studio = {
    bg: '#0d0d0f', surface: '#151519', 'surface-2': '#1c1c22', line: '#26262e',
    field: '#6e6e7c', ink: '#ededf0', muted: '#8b8b97',
  };
  for (const [k, v] of Object.entries(studio)) assert.equal(dark[k].toLowerCase(), v, k);
});

test('TC-TH-C08 theme.js bar colours equal --bg, and dialogs use --surface', () => {
  const T = require('../theme.js');
  assert.equal(T.BAR.light.toLowerCase(), light.bg);
  assert.equal(T.BAR.dark.toLowerCase(), dark.bg);
  assert.match(css, /\ndialog\s*\{\s*background:\s*var\(--surface\)/);
});
