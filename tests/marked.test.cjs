'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../recurring.js');
const { outputs } = require('./fixtures/detect-corpus.cjs');

let seq = 0;
const e = (date, cents = 100000, tags = ['recurring'], extra = {}) => ({
  id: 'e' + ++seq,
  description: 'Electricity',
  category: 'Bills',
  cents,
  date,
  tags,
  paymentMethod: 'unspecified',
  ...extra,
});
const run = (rows, today) => R.detectMarked(rows, today).bills;
const one = (rows, today) => {
  const bills = run(rows, today);
  assert.equal(bills.length, 1);
  return bills[0];
};
const dayBefore = (d) => new Date(Date.parse(d + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
};

// ---------- M: marking ----------
test('TC-RM-M01 an old marked entry marks the group', () => {
  const rows = [e('2026-01-05'), e('2026-02-05', 100000, []), e('2026-03-05', 100000, [])];
  const b = one(rows, '2026-03-10');
  assert.equal(b.lastDate, '2026-03-05');
  assert.equal(b.count, 3);
});
test('TC-RM-M02 cadence comes from the latest marked entry, not a later unmarked one', () => {
  const rows = [
    e('2026-01-05', 100000, ['recurring']),
    e('2026-03-05', 100000, ['recurring', 'every-3-months']),
    e('2026-03-20', 100000, []),
  ];
  const b = one(rows, '2026-03-25');
  assert.equal(b.step, 3);
  assert.equal(b.nextDate, '2026-06-20');
});
test('TC-RM-M03 a same-date tie is broken by id', () => {
  const a = e('2026-03-05', 100000, ['recurring', 'every-2-months'], { id: 'a' });
  const z = e('2026-03-05', 200000, ['recurring', 'every-3-months'], { id: 'z' });
  assert.equal(one([z, a], '2026-03-06').step, 3);
  assert.equal(one([a, z], '2026-03-06').lastCents, 200000);
});
test('TC-RM-M04 a back-dated unmarked entry does not change the step', () => {
  const marked = e('2026-03-05', 100000, ['recurring', 'every-2-months']);
  const rows = [marked, e('2026-01-02', 100000, [])];
  const b = one(rows, '2026-03-06');
  assert.equal(b.step, 2);
  assert.equal(b.lastDate, '2026-03-05');
});
test('TC-RM-M05 with two cadence tags the first valid one wins', () => {
  const tags = ['recurring', 'every-3-months', 'every-2-months'];
  assert.equal(one([e('2026-03-05', 100000, tags)], '2026-03-06').step, 3);
});
test('TC-RM-M06 an unknown cadence tag is ignored', () => {
  const tags = ['recurring', 'every-5-months'];
  assert.equal(one([e('2026-03-05', 100000, tags)], '2026-03-06').step, 1);
  const both = ['every-5-months', 'every-2-months', 'recurring'];
  assert.equal(one([e('2026-03-05', 100000, both)], '2026-03-06').step, 2);
});
test('TC-RM-M07 a cadence tag without recurring does not mark', () => {
  assert.deepEqual(run([e('2026-03-05', 100000, ['every-2-months'])], '2026-03-06'), []);
});
test('TC-RM-M08 a key without any marked entry is not a bill', () => {
  assert.deepEqual(run([e('2026-03-05', 100000, [])], '2026-03-06'), []);
});
test('TC-RM-M09 the step is read from a future-dated marked entry too', () => {
  const future = e('2026-09-05', 100000, ['recurring', 'every-12-months']);
  const rows = [e('2026-03-05', 100000, []), future];
  const b = one(rows, '2026-03-06');
  assert.equal(b.step, 12);
  assert.equal(b.lastDate, '2026-03-05');
});

// ---------- N: next due ----------
const next = (date, tags) => one([e(date, 100000, tags)], date).nextDate;
test('TC-RM-N01 31 Oct + 1 month is 30 Nov', () => assert.equal(next('2026-10-31'), '2026-11-30'));
test('TC-RM-N02 29 Feb 2028 + 12 months is 28 Feb 2029', () =>
  assert.equal(next('2028-02-29', ['recurring', 'every-12-months']), '2029-02-28'));
test('TC-RM-N03 next due crosses a year end', () => {
  assert.equal(next('2026-12-15'), '2027-01-15');
  assert.equal(next('2026-12-31', ['recurring', 'every-2-months']), '2027-02-28');
});
test('TC-RM-N04 steps 1, 2, 3 and 12', () => {
  assert.equal(next('2026-05-10'), '2026-06-10');
  assert.equal(next('2026-05-10', ['recurring', 'every-2-months']), '2026-07-10');
  assert.equal(next('2026-05-10', ['recurring', 'every-3-months']), '2026-08-10');
  assert.equal(next('2026-05-10', ['recurring', 'every-12-months']), '2027-05-10');
});

// ---------- S: status boundaries (last 2026-05-10, step 1) ----------
const LAST = [e('2026-05-10')];
const statusOn = (today, rows = LAST) => run(rows, today)[0]?.status;
test('TC-RM-S01 next - 8 days is paid', () => assert.equal(statusOn('2026-06-01'), 'paid'));
test('TC-RM-S02 next - 7 days is due-soon', () => assert.equal(statusOn('2026-06-03'), 'due-soon'));
test('TC-RM-S03 next - 1 day is due-soon', () => assert.equal(statusOn('2026-06-09'), 'due-soon'));
test('TC-RM-S04 next is overdue', () => assert.equal(statusOn('2026-06-10'), 'overdue'));
test('TC-RM-S05 the day before last + 2 steps is overdue', () =>
  assert.equal(statusOn('2026-07-09'), 'overdue'));
test('TC-RM-S06 last + 2 steps is stopped', () => assert.equal(statusOn('2026-07-10'), 'stopped'));
test('TC-RM-S07 the day before last + 3 steps is stopped', () =>
  assert.equal(statusOn('2026-08-09'), 'stopped'));
test('TC-RM-S08 last + 3 steps is hidden', () => assert.deepEqual(run(LAST, '2026-08-10'), []));
test('TC-RM-S09 month end: last 31 Jan, step 1', () => {
  const rows = [e('2027-01-31')];
  assert.equal(one(rows, '2027-02-20').status, 'paid');
  assert.equal(statusOn('2027-02-21', rows), 'due-soon');
  assert.equal(statusOn('2027-02-27', rows), 'due-soon');
  assert.equal(statusOn('2027-02-28', rows), 'overdue');
  assert.equal(statusOn('2027-03-30', rows), 'overdue');
  assert.equal(statusOn('2027-03-31', rows), 'stopped');
  assert.equal(statusOn('2027-04-29', rows), 'stopped');
  assert.deepEqual(run(rows, '2027-04-30'), []);
});
test('TC-RM-S10 step 2 boundaries', () => {
  const rows = [e('2026-05-10', 100000, ['recurring', 'every-2-months'])];
  assert.equal(statusOn('2026-07-02', rows), 'paid');
  assert.equal(statusOn('2026-07-03', rows), 'due-soon');
  assert.equal(statusOn('2026-07-10', rows), 'overdue');
  assert.equal(statusOn('2026-09-09', rows), 'overdue');
  assert.equal(statusOn('2026-09-10', rows), 'stopped');
  assert.equal(statusOn('2026-11-09', rows), 'stopped');
  assert.deepEqual(run(rows, '2026-11-10'), []);
});
test('TC-RM-S11 the soon window crosses a month start', () => {
  const rows = [e('2026-02-10')];
  assert.equal(statusOn('2026-03-03', rows), 'due-soon');
  assert.equal(statusOn('2026-03-02', rows), 'paid');
});

// ---------- T: type and amount ----------
test('TC-RM-T01 one and two entries are type last', () => {
  const one1 = one([e('2026-05-10', 120000)], '2026-05-11');
  const got = [one1.type, one1.lastCents, one1.cents, one1.count];
  assert.deepEqual(got, ['last', 120000, undefined, 1]);
  const two = one([e('2026-04-10', 50000), e('2026-05-10', 90000)], '2026-05-11');
  assert.deepEqual([two.type, two.lastCents, two.count], ['last', 90000, 2]);
  assert.equal('min' in two, false);
});
test('TC-RM-T02 three equal entries are fixed at the median', () => {
  const rows = [e('2026-03-10'), e('2026-04-10'), e('2026-05-10')];
  const b = one(rows, '2026-05-11');
  assert.deepEqual([b.type, b.cents, b.count], ['fixed', 100000, 3]);
  assert.equal('min' in b, false);
});
test('TC-RM-T03 exactly +10% is still fixed', () => {
  const rows = [e('2026-03-10', 100000), e('2026-04-10', 110000), e('2026-05-10', 100000)];
  const b = one(rows, '2026-05-11');
  assert.deepEqual([b.type, b.cents], ['fixed', 100000]);
});
test('TC-RM-T04 just past +10% varies, with min and max', () => {
  const rows = [e('2026-03-10', 100000), e('2026-04-10', 110001), e('2026-05-10', 100000)];
  const b = one(rows, '2026-05-11');
  assert.deepEqual([b.type, b.min, b.max, b.lastCents], ['varies', 100000, 110001, 100000]);
  assert.equal('cents' in b, false);
});
test('TC-RM-T05 the range covers only the last 6 of 8 entries', () => {
  const cents = [1, 900000, 100000, 120000, 100000, 130000, 100000, 110000];
  const rows = cents.map((c, i) => e('2026-0' + (i + 1) + '-10', c));
  const b = one(rows, '2026-08-11');
  assert.deepEqual([b.type, b.min, b.max, b.count], ['varies', 100000, 130000, 8]);
});
test('TC-RM-T06 the fixed test uses the last 3 entries only', () => {
  const rows = [e('2026-02-10', 5), e('2026-03-10'), e('2026-04-10'), e('2026-05-10')];
  const b = one(rows, '2026-05-11');
  assert.deepEqual([b.type, b.cents], ['fixed', 100000]);
});
test('TC-RM-T07 future-dated entries are excluded from last, type and count', () => {
  const rows = [
    e('2026-03-10'),
    e('2026-04-10'),
    e('2026-06-10', 900000),
    e('2026-07-10', 100000),
  ];
  const b = one(rows, '2026-04-12');
  assert.deepEqual([b.lastDate, b.type, b.count, b.lastCents], ['2026-04-10', 'last', 2, 100000]);
});
test('TC-RM-T08 a group with only future entries is not returned', () => {
  assert.deepEqual(run([e('2026-09-10')], '2026-05-01'), []);
});
test('TC-RM-T09 the row has exactly the documented fields', () => {
  const b = one([e('2026-05-10', 77700)], '2026-05-11');
  assert.deepEqual(b, {
    description: 'Electricity',
    category: 'Bills',
    status: 'paid',
    step: 1,
    lastDate: '2026-05-10',
    lastCents: 77700,
    nextDate: '2026-06-10',
    type: 'last',
    count: 1,
  });
});
test('TC-RM-T10 same-date entries: the greater id is last', () => {
  const hi = e('2026-05-10', 111, ['recurring'], { id: 'b' });
  const rows = [hi, e('2026-05-10', 222, [], { id: 'a' })];
  assert.equal(one(rows, '2026-05-11').lastCents, 111);
});

// ---------- O: sort and full list ----------
test('TC-RM-O01 order is overdue, due-soon, stopped, paid, then next date, name, category', () => {
  const rows = [
    e('2026-11-10', 1, ['recurring'], { description: 'Paid' }),
    e('2026-09-15', 1, ['recurring'], { description: 'Stopped' }),
    e('2026-10-15', 1, ['recurring'], { description: 'Overdue B' }),
    e('2026-10-14', 1, ['recurring'], { description: 'Overdue A' }),
    e('2026-10-25', 1, ['recurring'], { description: 'Soon' }),
    e('2026-10-14', 1, ['recurring'], { description: 'Overdue A', category: 'Aaa' }),
  ];
  const got = run(rows, '2026-11-20').map((b) => [b.description, b.category, b.status]);
  assert.deepEqual(got, [
    ['Overdue A', 'Aaa', 'overdue'],
    ['Overdue A', 'Bills', 'overdue'],
    ['Overdue B', 'Bills', 'overdue'],
    ['Soon', 'Bills', 'due-soon'],
    ['Stopped', 'Bills', 'stopped'],
    ['Paid', 'Bills', 'paid'],
  ]);
});
test('TC-RM-O02 more than maxRows bills are all returned', () => {
  const rows = [];
  for (let i = 0; i < 12; i++) {
    const description = 'Bill ' + String.fromCharCode(97 + i);
    rows.push(e('2026-05-10', 100, ['recurring'], { description }));
  }
  assert.equal(run(rows, '2026-05-11').length, 12);
  assert.ok(12 > R.MARKED.maxRows);
});
test('TC-RM-O03 due-soon ranks above stopped and paid', () => {
  const rows = [
    e('2026-10-25', 1, ['recurring'], { description: 'Soon' }),
    e('2026-11-10', 1, ['recurring'], { description: 'Paid' }),
  ];
  assert.deepEqual(run(rows, '2026-11-19').map((b) => b.status), ['due-soon', 'paid']);
});

// ---------- I: track I excludes marked keys ----------
const interval = (desc, cat, tags) =>
  ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((m) =>
    e(m + '-01', 100000, tags, { description: desc, category: cat }),
  );
test('TC-RM-I01 a group marked once is absent from detect', () => {
  const plain = interval('Rent', 'Housing', []);
  assert.equal(R.detect(plain, '2026-11').bills.length, 1);
  const marked = interval('Rent', 'Housing', []);
  marked[0].tags = ['recurring'];
  assert.equal(R.detect(marked, '2026-11').bills.length, 0);
});
test('TC-RM-I02 an unmarked look-alike in another category still appears', () => {
  const rows = [...interval('Rent', 'Housing', ['recurring']), ...interval('Rent', 'Other', [])];
  const bills = R.detect(rows, '2026-11').bills;
  assert.deepEqual(bills.map((b) => b.category), ['Other']);
});
test('TC-RM-I03 a marked entry outside the window still excludes the group', () => {
  const rows = [...interval('Rent', 'Housing', []), e('2024-01-01', 1, ['recurring'], {
    description: 'Rent',
    category: 'Housing',
  })];
  assert.equal(R.detect(rows, '2026-11').bills.length, 0);
});
test('TC-RM-I04 the month suffix does not escape the mark', () => {
  const rows = interval('Rent Nov', 'Housing', []);
  rows.push(e('2025-01-01', 1, ['recurring'], { description: 'Rent', category: 'Housing' }));
  assert.equal(R.detect(rows, '2026-11').bills.length, 0);
});

// ---------- F: purity and freeze ----------
test('TC-RM-F01 deep-frozen input does not throw and is not mutated', () => {
  const rows = [e('2026-03-10'), e('2026-04-10', 100000, ['recurring', 'every-2-months'])];
  const before = JSON.stringify(rows);
  deepFreeze(rows);
  const bills = run(rows, '2026-04-12');
  assert.equal(bills.length, 1);
  assert.equal(JSON.stringify(rows), before);
  assert.doesNotThrow(() => R.detect(rows, '2026-11'));
});
test('TC-RM-F02 detect output on the 3.3.1 corpus equals the golden', () => {
  const file = path.join(__dirname, 'fixtures', 'detect-3.3.1.json');
  const golden = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(JSON.stringify(outputs(R)), JSON.stringify(golden));
});
test('TC-RM-F03 an invalid today throws TypeError', () => {
  for (const bad of ['2026-02-30', '2026-13-01', '', undefined, null, '2026-4-1', 20260401]) {
    assert.throws(() => R.detectMarked([], bad), { name: 'TypeError', message: 'Invalid date.' });
  }
});
test('TC-RM-F04 a leap day is a valid today', () => {
  assert.deepEqual(R.detectMarked([], '2028-02-29'), { bills: [] });
  assert.throws(() => R.detectMarked([], '2027-02-29'), TypeError);
});
test('TC-RM-F05 non-array input gives no bills', () => {
  for (const bad of [null, undefined, {}, 'x', 7]) {
    assert.deepEqual(R.detectMarked(bad, '2026-05-01'), { bills: [] });
  }
});
test('TC-RM-F06 bad rows are skipped', () => {
  const rows = [
    null,
    { description: 'x' },
    e('2026-05-10', 0),
    e('2026-05-10', 1.5),
    e('2026-05-10', 100, ['recurring'], { description: '2026 !!' }),
    e('2026-05-10', 100, ['recurring'], { description: 5 }),
    e('2026-05-10'),
  ];
  const b = one(rows, '2026-05-11');
  assert.equal(b.count, 1);
});
test('TC-RM-F07 missing or non-array tags are treated as empty', () => {
  const rows = [e('2026-04-10', 100, null), e('2026-05-10', 100, 'recurring')];
  rows.push(e('2026-06-10', 1, undefined));
  delete rows[2].tags;
  assert.deepEqual(run(rows, '2026-06-11'), []);
  rows.push(e('2026-03-10'));
  assert.equal(one(rows, '2026-06-11').count, 4);
});
test('TC-RM-F08 non-string tags and inherited names are not cadences', () => {
  const tags = [5, null, 'constructor', 'toString', 'recurring'];
  assert.equal(one([e('2026-05-10', 100, tags)], '2026-05-11').step, 1);
});
test('TC-RM-F09 rows without a string id compare as empty', () => {
  const a = e('2026-05-10', 111, ['recurring'], { id: undefined });
  const b = e('2026-05-10', 222, [], { id: 'a' });
  assert.equal(one([a, b], '2026-05-11').lastCents, 222);
});
test('TC-RM-F10 MARKED is frozen and pinned; RULES is unchanged', () => {
  assert.ok(Object.isFrozen(R.MARKED));
  assert.deepEqual(R.MARKED, {
    tag: 'recurring',
    soonDays: 7,
    minForType: 3,
    rangeEntries: 6,
    maxRows: 8,
  });
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

// ---------- D: description drift ----------
test('TC-RM-D01 a renamed marked bill becomes a new group', () => {
  const renamed = { description: 'Electricity bill' };
  const rows = [e('2026-04-10'), e('2026-05-10', 100000, ['recurring'], renamed)];
  const bills = run(rows, '2026-05-11');
  const got = bills.map((b) => [b.description, b.count]);
  assert.deepEqual(got, [['Electricity', 1], ['Electricity bill', 1]]);
});
test('TC-RM-D02 a changed category becomes a new group', () => {
  const rows = [e('2026-04-10'), e('2026-05-10', 100000, ['recurring'], { category: 'Home' })];
  const bills = run(rows, '2026-05-11');
  assert.deepEqual(bills.map((b) => [b.category, b.count]), [['Bills', 1], ['Home', 1]]);
});
test('TC-RM-D03 a month word in the description does not split the group', () => {
  const may = { description: 'Electricity May' };
  const rows = [e('2026-04-10'), e('2026-05-10', 100000, ['recurring'], may)];
  const b = one(rows, '2026-05-11');
  assert.equal(b.count, 2);
  assert.equal(b.description, 'Electricity May');
});

// ---------- P: performance ----------
test('TC-RM-P01 10,000 rows run detectMarked in under 50 ms', (t) => {
  const rows = [];
  for (let i = 0; i < 10000; i++) {
    const tags = i % 10 === 0 ? ['recurring'] : [];
    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String((i % 27) + 1).padStart(2, '0');
    rows.push(e('2026-' + month + '-' + day, 1000 + (i % 7) * 100, tags, {
      description: 'Item ' + (i % 1500),
      category: 'Other',
    }));
  }
  R.detectMarked(rows, '2026-11-19');
  let best = Infinity;
  for (let i = 0; i < 5; i++) {
    const t0 = process.hrtime.bigint();
    R.detectMarked(rows, '2026-11-19');
    best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6);
  }
  t.diagnostic('best of 5: ' + best.toFixed(2) + ' ms');
  assert.ok(best < 50, 'best of 5 was ' + best.toFixed(1) + ' ms');
});

test('TC-RM-F11 numeric ids tie-break like their string form, whatever the input order', () => {
  const a = e('2026-10-05', 111, ['recurring', 'every-2-months'], { id: 1 });
  const b = e('2026-10-05', 222, ['recurring', 'every-3-months'], { id: 2 });
  const one = R.detectMarked([a, b], '2026-10-20').bills[0];
  const two = R.detectMarked([b, a], '2026-10-20').bills[0];
  assert.equal(one.lastCents, 222);
  assert.equal(one.step, 3);
  assert.deepEqual(two, one);
});
