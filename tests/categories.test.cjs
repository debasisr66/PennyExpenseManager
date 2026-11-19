'use strict';
// 3.3.4: Utilities and Staff salary (spec section 11, TC-CAT-01..06).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../core.js');
const D = require('../data.js');
const H = require('../hindi.js');
const T = require('../translation.js');
const corpus = require('./hindi-corpus.json');

const DATE = '2026-10-19';
const NAMES = [
  'Food & groceries', 'Housing', 'Transport', 'Shopping', 'Health',
  'Entertainment', 'Utilities', 'Staff salary', 'Other',
];

test('TC-CAT-01 the category list is the 9 names in order', () => {
  assert.deepEqual([...C.categories], NAMES);
});

test('TC-CAT-02 each new category round-trips through CSV and JSON', () => {
  for (const category of ['Utilities', 'Staff salary']) {
    const base = D.defaults(DATE);
    const state = D.migrateState({
      ...base,
      expenses: [{ ...base.expenses[0], category, description: 'Bill', cents: 123400 }],
    });
    const viaCsv = D.importCsv(D.exportCsv(state));
    assert.equal(viaCsv.expenses[0].category, category);
    const viaJson = D.importBackup(D.exportBackup(state));
    assert.equal(viaJson.expenses[0].category, category);
  }
});

test('TC-CAT-03 English keywords map to the new categories', () => {
  const cases = {
    Utilities: [
      'electricity', 'water', 'gas', 'utilities', 'broadband', 'wifi', 'internet', 'recharge',
      'DTH',
    ],
    'Staff salary': ['salary', 'maid', 'cook', 'driver', 'nanny', 'staff'],
  };
  for (const [category, words] of Object.entries(cases))
    for (const word of words)
      assert.equal(C.parseVoice(`spent 500 on ${word}`, DATE).category, category, word);
  assert.equal(C.parseVoice('spent 500 on rent', DATE).category, 'Housing');
});

test('TC-CAT-03 Hindi keywords map to the new categories', () => {
  const cases = {
    Utilities: ['बिजली', 'पानी', 'गैस', 'रिचार्ज'],
    'Staff salary': ['तनख्वाह', 'वेतन', 'पगार', 'बाई', 'कामवाली', 'ड्राइवर'],
  };
  for (const [category, words] of Object.entries(cases))
    for (const word of words) {
      const r = H.parse(`आज ${word} पर 500 रुपये खर्च किए`, DATE);
      assert.equal(r.fields.category, category, word);
    }
});

test('TC-CAT-03 Spanish keywords map to the new categories', () => {
  const cases = {
    Utilities: ['electricidad', 'agua', 'gas', 'internet'],
    'Staff salary': ['salario', 'sueldo', 'empleada'],
  };
  for (const [category, words] of Object.entries(cases))
    for (const word of words) {
      const out = T.fallback(`gasté 500 en ${word}`, 'es');
      assert.equal(C.parseVoice(out.text, DATE).category, category, word);
    }
});

test('TC-CAT-04 the declared corpus changes are exactly the electricity phrases', () => {
  const changed = corpus.cases.filter((c) => c.category === 'Utilities');
  assert.equal(changed.length, 20, '15 Devanagari plus 5 Hinglish phrases');
  assert.equal(changed.filter((c) => c.kind === 'devanagari').length, 15);
  for (const c of changed) assert.match(c.text, /बिजली|bijli/);
  assert.equal(corpus.cases.filter((c) => /बिजली|bijli/.test(c.text)).length, 20);
  assert.equal(corpus.cases.filter((c) => c.category === 'Housing').length, 20);
});

test('TC-CAT-05 goldens exist; sample data uses neither new category', () => {
  const cats = new Set(D.defaults(DATE).expenses.map((x) => x.category));
  assert.ok(!cats.has('Utilities') && !cats.has('Staff salary'));
  assert.ok(fs.existsSync(path.join(__dirname, 'fixtures', 'detect-3.3.1.json')));
});
// TC-CAT-06 is in ui-colours.test.cjs (C03 now covers --cat-0..--cat-8 in both themes).
test('TC-CAT-06 the chart colour mapping gives every category a distinct token, Other grey', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(app, /category === 'Other' \? 6 : i >= 6 \? i \+ 1 : i/);
});
