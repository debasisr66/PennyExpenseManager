/* Recurring-bill detector.
   Pure and deterministic: no DOM, storage, network or clock. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PennyRecurring = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // maxRows is a display cap for the UI.
  // detect() returns the full list and never truncates.
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
  });
  const NAMES = 'january february march april may june july august';
  const MORE = 'september october november december';
  const ABBR = 'jan feb mar apr jun jul aug sep sept oct nov dec';
  const MONTHS = new Set(`${NAMES} ${MORE} ${ABBR}`.split(' '));
  const WORD = /[\p{L}\p{M}\p{N}]+/gu;
  const YEAR = /^(19|20)\d\d$/;
  const REF_MONTH = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/;
  const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  const MARKED = Object.freeze({
    tag: 'recurring',
    soonDays: 7,
    minForType: 3,
    rangeEntries: 6,
    maxRows: 8,
  });
  const CADENCE = Object.freeze({
    __proto__: null,
    'every-2-months': 2,
    'every-3-months': 3,
    'every-12-months': 12,
  });
  const STATUS_RANK = Object.freeze({ overdue: 0, 'due-soon': 1, stopped: 2, paid: 3 });
  const tagsOf = (x) => (Array.isArray(x.tags) ? x.tags : []);
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
  // ---------- marked bills (3.3.2) ----------
  const DAY_MS = 86400000;
  function parseDate(text) {
    const y = Number(text.slice(0, 4));
    const m = Number(text.slice(5, 7));
    const d = Number(text.slice(8, 10));
    return { y, m, d };
  }
  const isoOf = (ms) => new Date(ms).toISOString().slice(0, 10);
  function isRealDate(text) {
    if (typeof text !== 'string' || !DATE.test(text)) {
      return false;
    }
    const { y, m, d } = parseDate(text);
    return isoOf(Date.UTC(y, m - 1, d)) === text;
  }
  function shiftMonths(date, delta) {
    const { y, m, d } = parseDate(date);
    const index = y * 12 + (m - 1) + delta;
    const year = Math.floor(index / 12);
    const mon = index % 12;
    const length = new Date(Date.UTC(year, mon + 1, 0)).getUTCDate();
    return isoOf(Date.UTC(year, mon, Math.min(d, length)));
  }
  function shiftDays(date, delta) {
    const { y, m, d } = parseDate(date);
    return isoOf(Date.UTC(y, m - 1, d) + delta * DAY_MS);
  }
  function markedRow(x) {
    const { id, description, category, cents, date } = x;
    const tags = tagsOf(x);
    return { id: id == null ? '' : String(id), description, category, cents, date, tags };
  }
  const byOrder = (a, b) => cmp(a.date, b.date) || cmp(a.id, b.id);
  function markedGroups(expenses) {
    const groups = new Map();
    for (const x of expenses) {
      const key = isValidRow(x) ? keyOf(x) : '';
      if (!key) {
        continue;
      }
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(markedRow(x));
    }
    return groups;
  }
  const isMarkedRow = (r) => r.tags.includes(MARKED.tag);
  function cadenceOf(row) {
    const tag = row.tags.find((t) => typeof t === 'string' && t in CADENCE);
    return tag === undefined ? 1 : CADENCE[tag];
  }
  function stepOf(entries) {
    return cadenceOf(entries.filter(isMarkedRow).sort(byOrder).pop());
  }
  function statusOf(today, last, step) {
    const next = shiftMonths(last, step);
    if (today < shiftDays(next, -MARKED.soonDays)) {
      return 'paid';
    }
    if (today < next) {
      return 'due-soon';
    }
    if (today < shiftMonths(last, 2 * step)) {
      return 'overdue';
    }
    return today < shiftMonths(last, 3 * step) ? 'stopped' : '';
  }
  function typeOf(entries) {
    if (entries.length < MARKED.minForType) {
      return { type: 'last' };
    }
    const recent = entries.slice(-MARKED.minForType).map(centsOf);
    const median = lowerMedian(recent);
    if (recent.every((c) => inBand(c, median))) {
      return { type: 'fixed', cents: median };
    }
    const range = entries.slice(-MARKED.rangeEntries).map(centsOf);
    return { type: 'varies', min: Math.min(...range), max: Math.max(...range) };
  }
  function markedBill(entries, today) {
    const step = stepOf(entries);
    const used = entries.filter((r) => r.date <= today).sort(byOrder);
    if (!used.length) {
      return null;
    }
    const last = used[used.length - 1];
    const status = statusOf(today, last.date, step);
    if (!status) {
      return null;
    }
    return {
      description: last.description,
      category: last.category,
      status,
      step,
      lastDate: last.date,
      lastCents: last.cents,
      nextDate: shiftMonths(last.date, step),
      ...typeOf(used),
      count: used.length,
    };
  }
  function byStatus(a, b) {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    const d = rank || cmp(a.nextDate, b.nextDate);
    return d || cmp(a.description, b.description) || cmp(a.category, b.category);
  }
  function detectMarked(expenses, today) {
    if (!isRealDate(today)) {
      throw TypeError('Invalid date.');
    }
    const rows = Array.isArray(expenses) ? expenses : [];
    const bills = [];
    for (const entries of markedGroups(rows).values()) {
      const bill = entries.some(isMarkedRow) ? markedBill(entries, today) : null;
      if (bill) {
        bills.push(bill);
      }
    }
    return { bills: bills.sort(byStatus) };
  }
  const hasTag = (x, tag) => tagsOf(x).includes(tag);
  function markedKeys(rows) {
    const keys = new Set();
    for (const x of rows) {
      if (isValidRow(x) && hasTag(x, MARKED.tag)) {
        keys.add(keyOf(x));
      }
    }
    return keys;
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
    const marked = markedKeys(rows);
    const bills = [];
    for (const [key, { win, cur }] of groups) {
      if (marked.has(key)) {
        continue;
      }
      const counts = monthCounts(win);
      if (!isRecurring(win, counts, recent)) {
        continue;
      }
      bills.push(toBill(win, cur, counts));
    }
    return {
      bills: bills.sort(byAmount),
      window: { from, to },
    };
  }
  return { RULES, MARKED, normalizeKey, detect, detectMarked };
});
