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
