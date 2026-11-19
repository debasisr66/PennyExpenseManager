/* Theme preference. Runs in <head> before the stylesheet so a saved choice shows on first paint. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.PennyTheme = factory();
    let store = null;
    try {
      store = root.localStorage;
    } catch (error) {
      /* Blocked storage means System mode. */
    }
    root.PennyTheme.boot(root.document, store);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'penny-theme';
  const MODES = ['system', 'light', 'dark'];
  const BAR = { light: '#f5f7f3', dark: '#0D0D0F' };
  const resolve = (stored) => (stored === 'light' || stored === 'dark' ? stored : 'system');
  const next = (mode) => MODES[(MODES.indexOf(resolve(mode)) + 1) % MODES.length];
  const name = (mode) => ({ system: 'System', light: 'Light', dark: 'Dark' })[resolve(mode)];
  function label(mode, saved) {
    const m = resolve(mode);
    if (saved === false) return `Theme: ${name(m)} for now. This browser is not saving settings.`;
    if (m === 'system') return 'Theme: System. Follows your device setting.';
    return `Theme: ${name(m)}. Saved on this device.`;
  }
  const ariaLabel = (mode) => `Theme: ${name(mode)}. Change theme`;
  function load(storage) {
    try {
      return resolve(storage.getItem(KEY));
    } catch (error) {
      return 'system';
    }
  }
  function save(storage, mode) {
    try {
      if (resolve(mode) === 'system') storage.removeItem(KEY);
      else storage.setItem(KEY, resolve(mode));
      return { saved: true };
    } catch (error) {
      return { saved: false };
    }
  }
  function apply(doc, mode) {
    const m = resolve(mode);
    const html = doc.documentElement;
    if (m === 'system') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', m);
    const tags = doc.querySelectorAll('meta[name="theme-color"]');
    for (const tag of Array.from(tags)) {
      const own = /dark/.test(tag.getAttribute('media') || '') ? 'dark' : 'light';
      tag.setAttribute('content', BAR[m === 'system' ? own : m]);
    }
    return m;
  }
  function boot(doc, storage) {
    try {
      if (doc && storage) apply(doc, load(storage));
    } catch (error) {
      /* System mode is pure CSS, so a failure here is harmless. */
    }
  }
  return { KEY, MODES, BAR, resolve, next, label, ariaLabel, load, save, apply, boot };
});
