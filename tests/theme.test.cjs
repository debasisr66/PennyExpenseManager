'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../theme.js');

function fakeDoc() {
  const attrs = {};
  const html = {
    setAttribute: (k, v) => (attrs[k] = v),
    removeAttribute: (k) => delete attrs[k],
    getAttribute: (k) => attrs[k],
  };
  const meta = (media, content) => {
    const a = { media, content };
    return { setAttribute: (k, v) => (a[k] = v), getAttribute: (k) => a[k], a };
  };
  const light = meta('(prefers-color-scheme: light)', '#f5f7f3');
  const dark = meta('(prefers-color-scheme: dark)', '#0D0D0F');
  return {
    documentElement: html,
    querySelectorAll: (sel) => (sel === 'meta[name="theme-color"]' ? [light, dark] : []),
    attrs,
    light,
    dark,
  };
}

test('TC-TH-U01 resolve accepts only light and dark', () => {
  assert.equal(T.resolve('light'), 'light');
  assert.equal(T.resolve('dark'), 'dark');
  for (const v of [undefined, null, '', 'DARK', 'Light', 'system', 'blue', 0, {}]) {
    assert.equal(T.resolve(v), 'system', String(v));
  }
});

test('TC-TH-U02 next cycles and label gives the exact notice texts', () => {
  assert.equal(T.next('system'), 'light');
  assert.equal(T.next('light'), 'dark');
  assert.equal(T.next('dark'), 'system');
  assert.equal(T.next('junk'), 'light');
  assert.equal(T.label('dark'), 'Theme: Dark. Saved on this device.');
  assert.equal(T.label('light'), 'Theme: Light. Saved on this device.');
  assert.equal(T.label('system'), 'Theme: System. Follows your device setting.');
  assert.equal(T.label('dark', false), 'Theme: Dark for now. This browser is not saving settings.');
  assert.equal(T.ariaLabel('dark'), 'Theme: Dark. Change theme');
});

test('TC-TH-U03 save sets or removes the key and never throws', () => {
  const store = new Map();
  const ok = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  assert.deepEqual(T.save(ok, 'dark'), { saved: true });
  assert.equal(store.get('penny-theme'), 'dark');
  assert.deepEqual(T.save(ok, 'light'), { saved: true });
  assert.equal(store.get('penny-theme'), 'light');
  assert.deepEqual(T.save(ok, 'system'), { saved: true });
  assert.equal(store.has('penny-theme'), false);
  const boom = () => {
    throw new Error('blocked');
  };
  const bad = { getItem: boom, setItem: boom, removeItem: boom };
  assert.deepEqual(T.save(bad, 'dark'), { saved: false });
  assert.deepEqual(T.save(bad, 'system'), { saved: false });
  assert.equal(T.load(bad), 'system');
  assert.doesNotThrow(() => T.boot(fakeDoc(), bad));
});

test('TC-TH-U04 apply sets data-theme and both theme-color tags', () => {
  const doc = fakeDoc();
  T.apply(doc, 'dark');
  assert.equal(doc.attrs['data-theme'], 'dark');
  assert.equal(doc.light.a.content, '#0D0D0F');
  assert.equal(doc.dark.a.content, '#0D0D0F');
  T.apply(doc, 'light');
  assert.equal(doc.attrs['data-theme'], 'light');
  assert.equal(doc.light.a.content, '#f5f7f3');
  assert.equal(doc.dark.a.content, '#f5f7f3');
  T.apply(doc, 'system');
  assert.equal('data-theme' in doc.attrs, false);
  assert.equal(doc.light.a.content, '#f5f7f3');
  assert.equal(doc.dark.a.content, '#0D0D0F');
});

// ---- Markup, CSS, security and freeze checks (3.3.3) ----
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');
const css = read('styles.css').replace(/\[data-theme="(\w+)"\]/g, "[data-theme='$1']");
const themeSrc = read('theme.js');

test('TC-TH-S01 CSP in index.html and nginx.conf is byte-identical to 3.3.2', () => {
  const meta = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' https://api.frankfurter.dev",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  const nginx = [
    "default-src 'self'",
    "connect-src 'self' https://api.frankfurter.dev",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  assert.ok(html.includes(`content="${meta}"`));
  assert.ok(read('nginx.conf').includes(`Content-Security-Policy "${nginx}" always;`));
});

test('TC-TH-S02 theme.js is the only head script, before the stylesheet', () => {
  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
  const tags = head.match(/<script\b[^>]*>/g) || [];
  assert.deepEqual(tags, ['<script src="theme.js">']);
  assert.ok(head.indexOf('theme.js') < head.indexOf('styles.css'));
  const metaAt = head.indexOf('theme-color');
  assert.ok(metaAt < head.indexOf('theme.js'), 'meta tags exist before boot runs');
});

test('TC-TH-S03 theme.js is small, safe and touches only its own key and attributes', () => {
  const bans = ['innerHTML', 'eval(', 'new Function', 'fetch', 'XMLHttpRequest', 'document.write'];
  for (const banned of bans) {
    assert.equal(themeSrc.includes(banned), false, banned);
  }
  assert.equal(/\bFunction\s*\(/.test(themeSrc), false);
  assert.ok(themeSrc.split('\n').length <= 80);
  assert.deepEqual([...new Set(themeSrc.match(/'penny-[\w-]+'/g))], ["'penny-theme'"]);
  assert.deepEqual([...new Set(themeSrc.match(/'data-[\w-]+'/g))], ["'data-theme'"]);
  assert.deepEqual([...new Set(themeSrc.match(/meta\[[^\]]*\]/g))], ['meta[name="theme-color"]']);
});

function stripHoverBlocks(text) {
  let out = text;
  const find = () => out.indexOf('@media (hover: hover)');
  for (let at = find(); at >= 0; at = find()) {
    let depth = 0;
    let i = out.indexOf('{', at);
    for (; i < out.length; i++) {
      if (out[i] === '{') depth++;
      if (out[i] === '}' && --depth === 0) break;
    }
    out = out.slice(0, at) + out.slice(i + 1);
  }
  return out;
}

test('TC-TH-M01 mobile-first markup and CSS', () => {
  const bg = (block) => block.match(/--bg:\s*(#[0-9a-fA-F]{6})/)[1].toLowerCase();
  const light = bg(css.slice(css.indexOf(':root {')));
  const dark = bg(css.slice(css.indexOf(":root[data-theme='dark']")));
  const metas = [...html.matchAll(/<meta name="theme-color" media="([^"]+)" content="([^"]+)"/g)];
  assert.deepEqual(
    metas.map((m) => [m[1], m[2].toLowerCase()]),
    [
      ['(prefers-color-scheme: light)', light],
      ['(prefers-color-scheme: dark)', dark],
    ],
  );
  const toggle = css.match(/#theme-toggle\s*\{([^}]*)\}/)[1];
  for (const prop of ['width', 'height', 'min-width', 'min-height']) {
    assert.match(toggle, new RegExp(`(^|\\s)${prop}:\\s*44px`));
  }
  assert.ok(css.includes('@media (hover: hover)'));
  assert.equal(stripHoverBlocks(css).includes(':hover'), false);
  const phone = css.slice(css.indexOf('/* 3.3.3: theme toggle'));
  assert.match(phone, /input,\s*select,\s*textarea[^{]*\{\s*font-size:\s*16px/);
  assert.match(css, /\.logo\s*\{[^}]*color:\s*var\(--on-accent\)/);
  assert.match(css, /-webkit-tap-highlight-color:\s*var\(--tap\)/);
});

test('TC-TH-L01 footer Studio link', () => {
  const link = html.match(/<a\s+class="studio-link"[\s\S]*?<\/a\s*>/)[0];
  assert.match(link, /href="https:\/\/debasisr66\.github\.io\/studio\/"/);
  assert.match(link, /target="_blank"/);
  assert.match(link, /rel="noopener noreferrer"/);
  assert.match(link, /aria-label="Part of Studio \(opens in a new tab\)"/);
  assert.match(link, /<svg\b[^>]*aria-hidden="true"/);
  assert.match(link, /width="16"/);
});

test('TC-TH-F01 the theme preference is not part of the data model', () => {
  for (const f of ['core.js', 'data.js', 'storage.js', 'recurring.js', 'diagnostics.js']) {
    assert.equal(/penny-theme|PennyTheme|data-theme/.test(read(f)), false, f);
  }
  assert.equal(/schemaVersion\s*>\s*4/.test(read('data.js')), true);
});

test('TC-TH-S04 loading theme.js never throws when reading localStorage throws', () => {
  const root = { document: fakeDoc() };
  Object.defineProperty(root, 'localStorage', {
    get() {
      throw new Error('SecurityError');
    },
  });
  const src = fs.readFileSync(path.join(__dirname, '..', 'theme.js'), 'utf8');
  const script = new (require('node:vm').Script)(src);
  assert.doesNotThrow(() => script.runInNewContext({ globalThis: root }));
});
