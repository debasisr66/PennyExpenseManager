/* Recurring-bill detector.
   Pure and deterministic: no DOM, storage, network or clock. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PennyRecurring = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // maxRows and lastMonthMaxRows are display caps for the UI.
  // detect() returns the full lists and never truncates.
  // amountToleranceRatio 10 means abs(cents - median) * 10 <= median
  // (10%, integer maths only).
  const RULES = Object.freeze({
    windowMonths: 6,
    minMonthsSeen: 4,
    recentMonths: 2,
    amountToleranceRatio: 10,
    maxDaySpread: 6,
    dayCap: 28,
    maxRows: 8,
    lastMonthMaxRows: 5,
  });
  const NAMES = 'january february march april may june july august';
  const MORE = 'september october november december';
  const ABBR = 'jan feb mar apr jun jul aug sep sept oct nov dec';
  const MONTHS = new Set(`${NAMES} ${MORE} ${ABBR}`.split(' '));
  const WORD = /[\p{L}\p{M}\p{N}]+/gu;
  const YEAR = /^(19|20)\d\d$/;
  const REF_MONTH = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/;
  const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  const keep = (t) => !MONTHS.has(t) && !YEAR.test(t);
  function normalizeKey(description) {
    const text = String(description).normalize('NFKC').toLowerCase();
    return (text.match(WORD) || []).filter(keep).join(' ');
  }
  const pad = (n, width) => String(n).padStart(width, '0');
  function addMonths(month, delta) {
    const year = Number(month.slice(0, 4));
    const mon = Number(month.slice(5, 7)) - 1;
    const index = year * 12 + mon + delta;
    const y = pad(Math.floor(index / 12), 4);
    const m = pad((index % 12) + 1, 2);
    return y + '-' + m;
  }
  const monthOf = (row) => row.date.slice(0, 7);
  const centsOf = (row) => row.cents;
  const cappedDay = (row) => {
    const day = Number(row.date.slice(8, 10));
    return Math.min(day, RULES.dayCap);
  };
  const newer = (best, row) => (row.date >= best.date ? row : best);
  const latest = (rows) => rows.reduce(newer);
  function lowerMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    return sorted[(sorted.length - 1) >> 1];
  }
  function inBand(cents, median) {
    const gap = Math.abs(cents - median);
    return gap * RULES.amountToleranceRatio <= median;
  }
  function spreadOk(days) {
    const spread = Math.max(...days) - Math.min(...days);
    return spread <= RULES.maxDaySpread;
  }
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  function byAmount(a, b) {
    if (a.cents !== b.cents) {
      return b.cents - a.cents;
    }
    const d = cmp(a.description, b.description);
    return d || cmp(a.category, b.category);
  }
  function isValidRow(x) {
    if (!x) {
      return false;
    }
    if (typeof x.description !== 'string') {
      return false;
    }
    if (typeof x.category !== 'string') {
      return false;
    }
    if (!Number.isSafeInteger(x.cents)) {
      return false;
    }
    if (x.cents <= 0) {
      return false;
    }
    if (typeof x.date !== 'string') {
      return false;
    }
    return DATE.test(x.date);
  }
  function keyOf(row) {
    const name = normalizeKey(row.description);
    return name ? row.category + '\u0000' + name : '';
  }
  function toRow(x) {
    const { description, category, cents, date } = x;
    return { description, category, cents, date };
  }
  // key -> { win: window rows, cur: reference month rows }
  function groupRows(expenses, from, ref) {
    const groups = new Map();
    for (const x of expenses) {
      if (!isValidRow(x)) {
        continue;
      }
      const month = monthOf(x);
      if (month < from || month > ref) {
        continue;
      }
      const key = keyOf(x);
      if (!key) {
        continue;
      }
      if (!groups.has(key)) {
        groups.set(key, { win: [], cur: [] });
      }
      const side = month === ref ? 'cur' : 'win';
      groups.get(key)[side].push(toRow(x));
    }
    return groups;
  }
  function monthCounts(rows) {
    const counts = new Map();
    for (const row of rows) {
      const month = monthOf(row);
      counts.set(month, (counts.get(month) || 0) + 1);
    }
    return counts;
  }
  function isRecurring(win, counts, recent) {
    if (counts.size < RULES.minMonthsSeen) {
      return false;
    }
    if ([...counts.values()].some((n) => n > 1)) {
      return false;
    }
    const median = lowerMedian(win.map(centsOf));
    if (!win.every((r) => inBand(r.cents, median))) {
      return false;
    }
    if (!spreadOk(win.map(cappedDay))) {
      return false;
    }
    return win.some((r) => monthOf(r) >= recent);
  }
  function toBill(win, cur, counts) {
    const cents = lowerMedian(win.map(centsOf));
    const days = win.map(cappedDay);
    const last = latest(win);
    const paid = (r) => {
      if (!inBand(r.cents, cents)) {
        return false;
      }
      return spreadOk([...days, cappedDay(r)]);
    };
    return {
      description: last.description,
      category: last.category,
      cents,
      lastCents: last.cents,
      day: lowerMedian(days),
      monthsSeen: counts.size,
      monthsChecked: RULES.windowMonths,
      paidThisMonth: cur.some(paid),
    };
  }
  function lastItems(groups, to, seen) {
    const items = [];
    for (const [key, { win, cur }] of groups) {
      if (cur.length || seen.has(key)) {
        continue;
      }
      const prior = win.filter((r) => monthOf(r) === to);
      if (prior.length === 1) {
        items.push(toRow(prior[0]));
      }
    }
    return items;
  }
  function detect(expenses, ref) {
    if (!REF_MONTH.test(ref)) {
      throw TypeError('Invalid reference month.');
    }
    const from = addMonths(ref, -RULES.windowMonths);
    const to = addMonths(ref, -1);
    const recent = addMonths(ref, -RULES.recentMonths);
    const rows = Array.isArray(expenses) ? expenses : [];
    const groups = groupRows(rows, from, ref);
    const bills = [];
    const seen = new Set();
    for (const [key, { win, cur }] of groups) {
      const counts = monthCounts(win);
      if (!isRecurring(win, counts, recent)) {
        continue;
      }
      seen.add(key);
      bills.push(toBill(win, cur, counts));
    }
    const lastMonth = lastItems(groups, to, seen);
    return {
      bills: bills.sort(byAmount),
      window: { from, to },
      lastMonth: lastMonth.sort(byAmount),
    };
  }
  return { RULES, normalizeKey, detect };
});
