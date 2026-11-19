'use strict';
// Colour tokens: literal ratchet, token sets, light pin, contrast (WCAG 2.x), tag chips.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('styles.css');

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
const tokenBlocks = [lightBlock];

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
const FIXED = {
  field: '#d4ded4', focus: '#d6aa51', 'cat-1': '#9aac80', 'cat-2': '#dab06c', 'cat-3': '#91b9bc',
  'cat-4': '#ad9cc2', 'cat-5': '#d39170', 'cat-6': '#adb4a2',
};
const TINTS = ['#eef3e8', '#edf2e9', '#eef3ea', '#edf2ed', '#efefeb', '#edf0e9', '#edf2eb'];
test('TC-TH-C04 light pin', () => {
  for (const [k, v] of Object.entries({ ...OLD, ...FIXED })) assert.equal(light[k], v, k);
  const s2 = hex(light['surface-2']);
  for (const t of TINTS) {
    const o = hex(t);
    for (const ch of ['r', 'g', 'b']) assert.ok(Math.abs(o[ch] - s2[ch]) <= 3, t + ' ' + ch);
  }
});
