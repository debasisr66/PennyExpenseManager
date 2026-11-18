'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../recurring.js');
const { build } = require('./fixtures/make-freeze.cjs');

const base = path.resolve(__dirname, '..');
const REF = '2026-11';
const WINDOW = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
let seq = 0;
const x = (description, month, day, cents, category = 'Housing', extra = {}) => ({
  id: 'e' + ++seq,
  description,
  category,
  cents,
  date: month + '-' + String(day).padStart(2, '0'),
  tags: [],
  paymentMethod: 'unspecified',
  ...extra,
});
// One entry per listed month. cents and day may be a number or a per-month array.
const series = (description, months, cents = 100000, day = 1, category = 'Housing') =>
  months.map((m, i) =>
    x(
      description,
      m,
      Array.isArray(day) ? day[i] : day,
      Array.isArray(cents) ? cents[i] : cents,
      category,
    ),
  );
const keysOf = (r) => r.bills.map((b) => b.description);

// ---------- U: normalisation ----------
const norm = R.normalizeKey;
test('TC-RD-U01 full month names are dropped', () => assert.equal(norm('Rent November'), 'rent'));
test('TC-RD-U02 three-letter month abbreviations are dropped', () => {
  assert.equal(norm('Rent Nov'), 'rent');
  assert.equal(norm('Jan Rent May'), 'rent');
});
test('TC-RD-U03 sept is dropped', () => assert.equal(norm('Rent Sept'), 'rent'));
test('TC-RD-U04 month words are removed only as whole words', () => {
  assert.equal(norm('Decor'), 'decor');
  assert.equal(norm('Marching band'), 'marching band');
  assert.equal(norm('Novel'), 'novel');
});
test('TC-RD-U05 years 19xx and 20xx are dropped', () => {
  assert.equal(norm('Rent 2026'), 'rent');
  assert.equal(norm('Policy 1999 premium'), 'policy premium');
});
test('TC-RD-U06 other numbers are kept', () => {
  assert.equal(norm('Airtel 499'), 'airtel 499');
  assert.equal(norm('Airtel 599'), 'airtel 599');
  assert.equal(norm('Plan 2100'), 'plan 2100');
  assert.equal(norm('Plan 1899'), 'plan 1899');
});
test('TC-RD-U07 punctuation is stripped and spaces collapse', () =>
  assert.equal(norm('  Rent,,  (Flat)! '), 'rent flat'));
test('TC-RD-U08 case and NFKC are normalised', () =>
  assert.equal(norm('ＲＥＮＴ Flat'), 'rent flat'));
test('TC-RD-U09 Devanagari with combining marks stays intact', () => {
  assert.equal(norm('किराना सामान'), 'किराना सामान');
  const text = 'किराना, नवंबर 2026';
  assert.equal(norm(text), 'किराना नवंबर');
});
test('TC-RD-U10 descriptions with only a month or year give an empty key', () => {
  for (const d of ['Nov', '2026', 'Nov 2026', '', '  ', '!!!']) assert.equal(norm(d), '');
});
test('TC-RD-U11 "Room 1 rent" and "Room 2 rent" have different keys', () =>
  assert.notEqual(norm('Room 1 rent'), norm('Room 2 rent')));
test('TC-RD-U12 rows whose key is empty never group into a bill', () => {
  const rows = [...series('Nov', WINDOW), ...series('2026', WINDOW), ...series('Nov 2026', WINDOW)];
  const r = R.detect(rows, REF);
  assert.deepEqual(r.bills, []);
});

// ---------- R: rules ----------
test('TC-RD-R01 4 of 6 months passes', () => {
  const r = R.detect(series('Rent', WINDOW.slice(2)), REF);
  assert.equal(r.bills.length, 1);
  assert.equal(r.bills[0].monthsSeen, 4);
  assert.equal(r.bills[0].monthsChecked, 6);
});
test('TC-RD-R02 3 of 6 months fails', () =>
  assert.deepEqual(R.detect(series('Rent', WINDOW.slice(3)), REF).bills, []));
test('TC-RD-R03 bimonthly (months 2, 4, 6) fails', () =>
  assert.deepEqual(R.detect(series('Water', [WINDOW[1], WINDOW[3], WINDOW[5]]), REF).bills, []));
test('TC-RD-R04 two matches in one month fails the group', () => {
  const rows = [...series('Rent', WINDOW), x('Rent', '2026-08', 15, 100000, 'Housing')];
  assert.deepEqual(R.detect(rows, REF).bills, []);
});
test('TC-RD-R05 amount at exactly +10% of the median passes', () => {
  const rows = series('Rent', WINDOW, [10000, 10000, 10000, 10000, 10000, 11000]);
  assert.equal(R.detect(rows, REF).bills.length, 1);
});
test('TC-RD-R06 amount at +10% plus 1 paise fails', () => {
  const rows = series('Rent', WINDOW, [10000, 10000, 10000, 10000, 10000, 11001]);
  assert.deepEqual(R.detect(rows, REF).bills, []);
});
test('TC-RD-R07 amount at exactly -10% passes and -10% minus 1 paise fails', () => {
  const ok = series('Rent', WINDOW, [10000, 10000, 10000, 10000, 10000, 9000]);
  const bad = series('Rent', WINDOW, [10000, 10000, 10000, 10000, 10000, 8999]);
  assert.equal(R.detect(ok, REF).bills.length, 1);
  assert.deepEqual(R.detect(bad, REF).bills, []);
});
test('TC-RD-R08 day spread of 6 passes', () =>
  assert.equal(R.detect(series('Rent', WINDOW, 100000, [1, 1, 1, 1, 1, 7]), REF).bills.length, 1));
test('TC-RD-R09 day spread of 7 fails', () =>
  assert.deepEqual(R.detect(series('Rent', WINDOW, 100000, [1, 1, 1, 1, 1, 8]), REF).bills, []));
test('TC-RD-R10 days 29-31 are capped to 28 (spread 6 passes only with the cap)', () => {
  const r = R.detect(series('Rent', WINDOW, 100000, [22, 31, 22, 31, 22, 31]), REF);
  assert.equal(r.bills.length, 1);
  assert.equal(r.bills[0].day, 22);
});
test('TC-RD-R11 days 29, 30 and 31 map to 28 for the spread rule', () => {
  assert.equal(
    R.detect(series('Rent', WINDOW, 100000, [22, 29, 30, 31, 28, 22]), REF).bills.length,
    1,
  );
  assert.deepEqual(
    R.detect(series('Rent', WINDOW, 100000, [21, 29, 30, 31, 28, 21]), REF).bills,
    [],
  );
});
test('TC-RD-R12 nothing in the 2 most recent window months fails (cancelled)', () =>
  assert.deepEqual(R.detect(series('Gym', WINDOW.slice(0, 4)), REF).bills, []));
test('TC-RD-R13 a match in only the older of the 2 recent months still passes', () => {
  const r = R.detect(series('Gym', [WINDOW[0], WINDOW[1], WINDOW[2], WINDOW[4]]), REF);
  assert.equal(r.bills.length, 1);
});
test('TC-RD-R14 a payment-method change does not split the group', () => {
  const rows = series('Rent', WINDOW);
  rows[0].paymentMethod = 'upi';
  rows[3].paymentMethod = 'cash';
  assert.equal(R.detect(rows, REF).bills[0].monthsSeen, 6);
});
test('TC-RD-R15 a category change splits the group and loses that month', () => {
  const rows = series('Rent', WINDOW);
  rows[1].category = 'Other';
  rows[2].category = 'Other';
  rows[3].category = 'Other';
  assert.deepEqual(R.detect(rows, REF).bills, []);
  rows[3].category = 'Housing';
  assert.equal(R.detect(rows, REF).bills[0].monthsSeen, 4);
});
test('TC-RD-R16 fixed-price habit logged once a month passes (documented residual risk)', () => {
  const r = R.detect(series('Haircut', WINDOW, 50000, [3, 5, 4, 6, 3, 5], 'Other'), REF);
  assert.deepEqual(keysOf(r), ['Haircut']);
});
test('TC-RD-R17 "Room 1 rent" and "Room 2 rent" are separate bills', () => {
  const rows = [...series('Room 1 rent', WINDOW, 900000), ...series('Room 2 rent', WINDOW, 700000)];
  assert.deepEqual(keysOf(R.detect(rows, REF)), ['Room 1 rent', 'Room 2 rent']);
});
test('TC-RD-R18 malformed rows are skipped, not fatal', () => {
  const rows = [
    ...series('Rent', WINDOW),
    null,
    undefined,
    {},
    { description: 5, category: 'Housing', cents: 1, date: '2026-10-01' },
    x('Rent', '2026-10', 2, 0),
    x('Rent', '2026-10', 2, 1.5),
    x('Rent', '2026-10', 2, -5),
    { description: 'Rent', category: 'Housing', cents: 100000, date: 'bad' },
    { description: 'Rent', category: 'Housing', cents: 100000 },
  ];
  assert.equal(R.detect(rows, REF).bills.length, 1);
  assert.equal(R.detect(rows, REF).bills[0].monthsSeen, 6);
  const gym = ['2026-10-05', '2026-11-05', '2026-12-05', '2026-13-05'].map((date) =>
    x('Gym', '2026-10', 5, 100000, 'Other', { date }),
  );
  assert.deepEqual(R.detect(gym, '2027-01').bills, []);
  const arr = [1, 2, 3, 4].map(() =>
    x('Gym', '2026-10', 1, 100000, 'Other', { date: ['2026-10-01'] }),
  );
  assert.deepEqual(R.detect(arr, '2026-11').bills, []);
});

// ---------- W: window ----------
test('TC-RD-W01 a January reference wraps to July-December of the previous year', () => {
  const months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
  const r = R.detect(series('Rent', months), '2027-01');
  assert.deepEqual(r.window, { from: '2026-07', to: '2026-12' });
  assert.equal(r.bills[0].monthsSeen, 6);
});
test('TC-RD-W02 a past picker month uses the 6 months before it', () => {
  const r = R.detect(
    series('Rent', ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07']),
    '2026-08',
  );
  assert.deepEqual(r.window, { from: '2026-02', to: '2026-07' });
  assert.equal(r.bills.length, 1);
  // only May-Jul fall in that window
  assert.equal(R.detect(series('Rent', WINDOW), '2026-08').bills.length, 0);
});
test('TC-RD-W03 a future picker month behaves predictably', () => {
  const r = R.detect(series('Rent', WINDOW), '2027-03');
  assert.deepEqual(r.window, { from: '2026-09', to: '2027-02' });
  assert.deepEqual(r.bills, []);
});
test('TC-RD-W04 entries after the end of the reference month are ignored', () => {
  const rows = [
    ...series('Rent', WINDOW),
    x('Rent', '2026-12', 1, 5),
    x('Rent', '2027-01', 1, 5),
    x('Rent', '2026-12', 2, 5),
  ];
  const r = R.detect(rows, REF);
  assert.equal(r.bills.length, 1);
  assert.equal(r.bills[0].paidThisMonth, false);
  assert.equal(r.bills[0].cents, 100000);
});
test('TC-RD-W05 empty or missing history returns empty results', () => {
  const empty = { bills: [], window: { from: '2026-05', to: '2026-10' } };
  assert.deepEqual(R.detect([], REF), empty);
  assert.equal('lastMonth' in R.detect([], REF), false);
  assert.deepEqual(R.detect(undefined, REF), empty);
  assert.throws(() => R.detect([], '2026-13'), TypeError);
  assert.throws(() => R.detect([], '2026-1'), TypeError);
  assert.throws(() => R.detect([], '0000-03'), TypeError);
});

// ---------- O: output ----------
test('TC-RD-O01 cents is the lower median, in whole paise', () => {
  const r = R.detect(series('Rent', WINDOW.slice(2), [100, 101, 102, 103]), REF);
  assert.equal(r.bills[0].cents, 101);
  assert.ok(Number.isInteger(r.bills[0].cents));
  assert.equal(
    R.detect(series('Rent', WINDOW.slice(1), [100, 101, 102, 103, 104]), REF).bills[0].cents,
    102,
  );
});
test('TC-RD-O02 lastCents and description come from the latest match', () => {
  const rows = series('Netflix', WINDOW, [64900, 64900, 64900, 64900, 64900, 67000]);
  rows[5].description = 'NETFLIX Oct';
  const b = R.detect(rows, REF).bills[0];
  assert.equal(b.cents, 64900);
  assert.equal(b.lastCents, 67000);
  assert.equal(b.description, 'NETFLIX Oct');
});
test('TC-RD-O03 bills sort by amount descending, ties by description', () => {
  const rows = [
    ...series('Zeta', WINDOW, 5000),
    ...series('Alpha', WINDOW, 5000),
    ...series('Rent', WINDOW, 900000),
    ...series('Tiny', WINDOW, 100),
  ];
  assert.deepEqual(keysOf(R.detect(rows, REF)), ['Rent', 'Alpha', 'Zeta', 'Tiny']);
  const tie = [
    ...series('Same', WINDOW, 5000, 1, 'Other'),
    ...series('Same', WINDOW, 5000, 1, 'Housing'),
  ];
  assert.deepEqual(
    R.detect(tie, REF).bills.map((b) => b.category),
    ['Housing', 'Other'],
  );
});
test('TC-RD-O04 detect returns every bill; the UI caps at RULES.maxRows', () => {
  const rows = [];
  for (let i = 1; i <= 10; i++) rows.push(...series('Bill ' + i, WINDOW, i * 1000));
  const r = R.detect(rows, REF);
  assert.equal(r.bills.length, 10);
  assert.equal(R.RULES.maxRows, 8);
  assert.ok(r.bills.length > R.RULES.maxRows);
});
test('TC-RD-O05 paidThisMonth needs an entry passing amount and day rules', () => {
  const rows = series('Rent', WINDOW, 100000, 1);
  const paid = (extra) => R.detect([...rows, ...extra], REF).bills[0].paidThisMonth;
  assert.equal(paid([]), false);
  assert.equal(paid([x('Rent', REF, 2, 100000)]), true);
  assert.equal(paid([x('Rent', REF, 2, 110000)]), true);
  assert.equal(paid([x('Rent', REF, 2, 110001)]), false);
  assert.equal(paid([x('Rent', REF, 7, 100000)]), true);
  assert.equal(paid([x('Rent', REF, 8, 100000)]), false);
  assert.equal(paid([x('Rent', REF, 2, 100000, 'Other')]), false);
});

// ---------- F: freeze ----------
const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
};
test('TC-RD-F01 detect does not throw on deep-frozen input and does not mutate it', () => {
  const rows = deepFreeze([
    ...series('Rent', WINDOW),
    x('Electricity', '2026-10', 7, 214000),
    x('Rent', REF, 2, 100000),
  ]);
  const before = JSON.stringify(rows);
  assert.doesNotThrow(() => R.detect(rows, REF));
  assert.equal(JSON.stringify(rows), before);
});
test('TC-RD-F02 3.3.0 backup, CSV and migrateState match the golden fixture', () => {
  const golden = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fixtures', 'freeze-3.3.0.json'), 'utf8'),
  );
  const now = build();
  assert.equal(now.backup, golden.backup);
  assert.equal(now.csv, golden.csv);
  assert.equal(JSON.stringify(now.migrated), JSON.stringify(golden.migrated));
  assert.equal(JSON.stringify(now.migratedLegacy), JSON.stringify(golden.migratedLegacy));
  assert.deepEqual(Object.keys(now).sort(), Object.keys(golden).sort());
});
test('TC-RD-F03 CSP strings equal the 3.3.0 baseline', () => {
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
  const nginxCsp = [
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
  const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
  const nginx = fs.readFileSync(path.join(base, 'nginx.conf'), 'utf8');
  assert.equal(
    html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/)[1],
    meta,
  );
  assert.equal(nginx.match(/add_header\s+Content-Security-Policy\s+"([^"]*)"/)[1], nginxCsp);
});
test('TC-RD-F04 RULES is frozen and every value is pinned', () => {
  assert.ok(Object.isFrozen(R.RULES));
  assert.deepEqual(R.RULES, {
    windowMonths: 6,
    minMonthsSeen: 4,
    recentMonths: 2,
    amountToleranceRatio: 10,
    maxDaySpread: 6,
    dayCap: 28,
    maxRows: 8,
  });
});

// ---------- P: performance ----------
test('TC-RD-P01 10,000 expenses are detected in under 50 ms', (t) => {
  const rows = [];
  for (let i = 0; i < 10000; i++) {
    const m = WINDOW[i % 6];
    rows.push(x('Item ' + (i % 1500), m, (i % 27) + 1, 1000 + (i % 7) * 100, 'Other'));
  }
  R.detect(rows, REF);
  let best = Infinity;
  for (let i = 0; i < 5; i++) {
    const t0 = process.hrtime.bigint();
    R.detect(rows, REF);
    best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6);
  }
  t.diagnostic('best of 5: ' + best.toFixed(2) + ' ms');
  assert.ok(best < 50, 'best of 3 was ' + best.toFixed(1) + ' ms');
});

test('TC-RD-S01 sample data shows exactly the three sample bills', () => {
  const D = require('../data.js');
  const bills = R.detect(D.defaults('2026-10-20').expenses, '2026-10').bills;
  assert.deepEqual(
    bills.map((b) => [b.description, b.monthsSeen, b.paidThisMonth]),
    [
      ['Rent', 6, true],
      ['Train pass', 5, true],
      ['Music subscription', 4, false],
    ],
  );
  assert.ok(!bills.some((b) => b.description === 'Weekly groceries'));
  const jan = R.detect(D.defaults('2027-01-31').expenses, '2027-01').bills;
  assert.deepEqual(
    jan.map((b) => [b.description, b.monthsSeen]),
    [
      ['Rent', 6],
      ['Train pass', 5],
      ['Music subscription', 4],
    ],
  );
});
