'use strict';
// 3.3.2 Group B1: recurring-bill form helpers and the save pipeline.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../core.js');
const D = require('../data.js');
const R = require('../recurring.js');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
// expenseFromForm() in app.js minus the DOM: extractTags, then the shared R.withMarking.
function save(description, box, marked, step, paymentMethod = 'unspecified') {
  const typed = C.extractTags(description, box);
  const build = (tags) =>
    D.validateExpense({
      id: 'x1',
      date: '2026-11-01',
      amount: '100',
      category: C.categories[0],
      description: typed.description,
      tags,
      paymentMethod,
    });
  return R.withMarking(build, typed.tags, marked, step);
}
const wrap = (x) => ({ schemaVersion: 3, currency: 'INR', expenses: x, budgets: {} });

test('TC-RF-01 isRecurringTag matches only the exact tag shapes', () => {
  for (const t of ['recurring', 'every-2-months', 'every-3-months', 'every-12-months']) {
    assert.equal(R.isRecurringTag(t), true, t);
  }
  for (const t of ['every-1-month', 'every-6-months', 'every-2-month', 'constructor']) {
    assert.equal(R.isRecurringTag(t), false, t);
  }
  assert.deepEqual(R.applyMarking(['every-6-months', 'fitness'], false, 1), [
    'every-6-months',
    'fitness',
  ]);
  for (const t of ['recurringx', 'every-2-month-x', 'every--months', 'rent', '', 'xrecurring']) {
    assert.equal(R.isRecurringTag(t), false, t);
  }
  assert.equal(R.isRecurringTag('every-1234-months'), false);
});

test('TC-RF-02 readMarking: unmarked, marked, cadence, order', () => {
  assert.deepEqual(R.readMarking([]), { marked: false, step: 1, rest: [] });
  const plain = R.readMarking(['rent', 'upi']);
  assert.deepEqual(plain, { marked: false, step: 1, rest: ['rent', 'upi'] });
  const one = R.readMarking(['b', 'recurring', 'a']);
  assert.deepEqual(one, { marked: true, step: 1, rest: ['b', 'a'] });
  assert.deepEqual(R.readMarking(['recurring', 'every-3-months', 'z']), {
    marked: true,
    step: 3,
    rest: ['z'],
  });
});

test('TC-RF-03 readMarking: two cadence tags use the first valid one', () => {
  const r = R.readMarking(['recurring', 'every-5-months', 'every-12-months', 'every-2-months']);
  assert.equal(r.step, 12);
  assert.deepEqual(r.rest, ['every-5-months']);
  assert.equal(R.readMarking(['every-2-months']).marked, false);
  assert.deepEqual(R.readMarking(undefined), { marked: false, step: 1, rest: [] });
});

test('TC-RF-04 markingTags round trip for 1, 2, 3 and 12', () => {
  assert.deepEqual(R.markingTags(false, 12), []);
  assert.deepEqual(R.markingTags(true, 1), ['recurring']);
  for (const step of [2, 3, 12]) {
    const tags = R.markingTags(true, step);
    assert.deepEqual(tags, ['recurring', `every-${step}-months`]);
    assert.deepEqual(R.readMarking(tags), { marked: true, step, rest: [] });
  }
  assert.deepEqual(R.readMarking(R.markingTags(true, 1)), { marked: true, step: 1, rest: [] });
});

test('TC-RF-05 markingTags rejects other steps', () => {
  for (const s of [0, 4, 6, -1, 1.5, '2', NaN, undefined, null]) {
    assert.throws(() => R.markingTags(true, s), TypeError, String(s));
  }
});

test('TC-RF-06 tick, change step, untick round trip', () => {
  const a = save('Rent', '#home', true, 1);
  assert.deepEqual(a.tags, ['home', 'recurring']);
  const m = R.readMarking(a.tags);
  const b = save('Rent', m.rest.map((t) => '#' + t).join(' '), true, 3);
  assert.deepEqual(b.tags, ['home', 'recurring', 'every-3-months']);
  const m2 = R.readMarking(b.tags);
  assert.equal(m2.step, 3);
  const c = save('Rent', m2.rest.map((t) => '#' + t).join(' '), false, 3);
  assert.deepEqual(c.tags, ['home']);
});

test('TC-RF-07 typed recurring tags are stripped when unticked', () => {
  const x = save('Rent #recurring', '#every-2-months #home every-12-months', false, 1);
  assert.deepEqual(x.tags, ['home']);
  assert.equal(x.description, 'Rent');
});

test('TC-RF-08 typed recurring tags are rebuilt once when ticked', () => {
  const x = save('Rent #recurring #every-12-months', '#recurring #every-3-months #home', true, 2);
  assert.deepEqual(x.tags, ['home', 'recurring', 'every-2-months']);
});

test('TC-RF-09 payment rail tag still works with marking', () => {
  const x = save('Rent', '#home', true, 2, 'upi');
  assert.equal(x.paymentMethod, 'upi');
  assert.deepEqual(x.tags, ['home', 'recurring', 'every-2-months', 'upi']);
  const y = save('Rent', '#upi', true, 1);
  assert.equal(y.paymentMethod, 'upi');
  assert.ok(y.tags.includes('upi') && y.tags.includes('recurring'));
});

test('TC-RF-10 the 12-tag limit is hit only because of the marking', () => {
  const eleven = Array.from({ length: 11 }, (_, i) => '#t' + i).join(' ');
  assert.doesNotThrow(() => save('Rent', eleven, false, 1));
  assert.doesNotThrow(() => save('Rent', eleven, true, 1));
  assert.throws(() => save('Rent', eleven, true, 2), { message: R.TOO_MANY_TAGS });
  assert.doesNotThrow(() => save('Rent', eleven, false, 2));
  // A rail tag counts too.
  const ten = Array.from({ length: 10 }, (_, i) => '#t' + i).join(' ');
  assert.throws(() => save('Rent', ten, true, 2, 'upi'), { message: R.TOO_MANY_TAGS });
  // Over the limit without the marking: the original message stands.
  const twelve = Array.from({ length: 12 }, (_, i) => '#t' + i).join(' ');
  assert.throws(() => save('Rent', twelve, true, 1, 'upi'), /Use up to 12 tags/);
});

test('TC-RF-11 CSV and JSON export/import keep the marking tags', () => {
  const s = wrap([save('Rent', '#home', true, 12)]);
  const csv = D.exportCsv(s);
  assert.ok(csv.includes('#recurring #every-12-months'));
  assert.deepEqual(D.importCsv(csv).expenses[0].tags, ['home', 'recurring', 'every-12-months']);
  const json = D.importBackup(D.exportBackup(s));
  assert.deepEqual(json.expenses[0].tags, ['home', 'recurring', 'every-12-months']);
});

test('TC-RF-12 the 3.3.1 CSV header is unchanged', () => {
  const header = D.exportCsv(wrap([])).replace('\uFEFF', '').split('\r\n')[0];
  const want = ['id', 'date', 'amount', 'currency', 'category', 'description'];
  assert.equal(header, [...want, 'payment_method', 'tags'].map((h) => `"${h}"`).join(','));
});

test('TC-RF-13 expenseDraft includes the checkbox and the selected radio', () => {
  const src = read('app.js');
  const body = src.slice(src.indexOf('const expenseDraft'), src.indexOf('let confirmationPending'));
  assert.match(body, /\$\('recurring-bill'\)\.checked/);
  assert.match(body, /repeatStep\(\)/);
  assert.match(src, /const repeatStep = .*repeat-every.*input:checked/);
  // Source-level only: the dialog behaviour itself is not run here.
});

test('TC-RF-14 form markup has the controls, hidden by default', () => {
  const html = read('index.html');
  assert.match(html, /id="recurring-bill"\s+type="checkbox"/);
  assert.match(html, /<fieldset id="repeat-every"[^>]*hidden[^>]*disabled/);
  assert.match(html, /<legend>Repeats every<\/legend>/);
  for (const v of ['1', '2', '3', '12']) {
    assert.match(html, new RegExp(`name="repeat-step" value="${v}"`));
  }
  assert.equal((html.match(/id="recurring-bill"/g) || []).length, 1);
});
