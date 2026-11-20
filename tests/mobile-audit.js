/* Browser audit (not deployed; not part of the test run). Load with a script tag from the
   test server, or paste into the console, then call pennyAudit().
   Reports, for what is visible now: sideways overflow, controls under 44 px,
   and text under 11 px. Checkbox and radio boxes are checked at 24 px; their
   labels are checked as controls. Run once per width, theme and open dialog. */
window.pennyAudit = () => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const inOpenDialog = (el) => {
    const d = el.closest('dialog');
    return !d || d.open;
  };
  const sel = 'button, a[href], input, select, textarea, summary';
  const small = [];
  for (const el of document.querySelectorAll(sel)) {
    if (!visible(el) || !inOpenDialog(el) || el.type === 'hidden') continue;
    if (el.classList.contains('sr-only')) continue;
    const r = el.getBoundingClientRect();
    const box = el.type === 'checkbox' || el.type === 'radio';
    const min = box ? 24 : 44;
    if (r.width < min - 0.5 || r.height < min - 0.5) {
      const id = el.id || el.className || el.tagName;
      small.push(`${el.tagName.toLowerCase()}#${id} ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
    }
  }
  const tiny = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || !inOpenDialog(el)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (own && px < 11) tiny.add(`${el.tagName.toLowerCase()}.${el.className} ${px}px`);
  }
  const doc = document.documentElement;
  const wide = (w) =>
    [...document.querySelectorAll('body *')]
      .filter((el) => visible(el) && inOpenDialog(el) && el.getBoundingClientRect().right > w + 0.5)
      .slice(0, 8)
      .map((el) => `${el.tagName}#${el.id} ${el.getBoundingClientRect().right | 0}`);
  const dialogs = [...document.querySelectorAll('dialog[open]')];
  return {
    width: doc.clientWidth,
    pageScrollWidth: doc.scrollWidth,
    pageOverflow: doc.scrollWidth > doc.clientWidth,
    wide: wide(doc.clientWidth),
    dialogOverflow: dialogs.map((d) => [d.id, d.scrollWidth > d.clientWidth]),
    headerHeight: Math.round(document.querySelector('header').getBoundingClientRect().height),
    controlsUnderMin: small,
    textUnder11: [...tiny],
  };
};
