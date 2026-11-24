'use strict';
// 3.3.7 voice guard. V = save guard characterisation (pass on 3.3.6), VF = voice fill,
// VD = diagnostics and failure ladder, VT = text. Spec: docs/specs/VOICE-GUARD-3.3.7-SPEC.md §7.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../core.js');
const D = require('../data.js');
const S = require('../storage.js');
const T = require('../translation.js');
const V = require('../voice.js');
const Dg = require('../diagnostics.js');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const TODAY = '2026-11-24';
const row = (amount) => ({
  id: 'x1',
  date: TODAY,
  amount,
  category: 'Housing',
  description: 'Rent',
  tags: [],
  paymentMethod: 'unspecified',
});

test('V01 validateExpense refuses a zero, negative, blank or unreadable amount', () => {
  for (const bad of ['0', '0.00', '00', '0.001', '-5', '', '1e3', 'abc'])
    assert.throws(() => D.validateExpense(row(bad)), undefined, `amount ${JSON.stringify(bad)}`);
  assert.equal(D.validateExpense(row('0.01')).cents, 1);
});

test('V02 CSV and JSON import refuse a zero or negative amount', () => {
  const good = { schemaVersion: 4, currency: 'INR', expenses: [], budgets: {} };
  const kept = D.validateExpense(row('10'));
  const csv = D.exportCsv({ ...good, expenses: [kept] });
  assert.equal(D.importCsv(csv).expenses.length, 1);
  for (const bad of ['0.00', '-5.00']) {
    const edited = csv.replace('"10.00"', `"${bad}"`);
    assert.notEqual(edited, csv);
    assert.throws(() => D.importCsv(edited), undefined, `csv ${bad}`);
  }
  for (const cents of [0, -500]) {
    const json = JSON.stringify({ ...good, expenses: [{ ...kept, cents }] });
    assert.throws(() => D.importBackup(json), undefined, `json ${cents}`);
  }
});

test('V03 store.save rejects a state whose expense has cents 0; app.js writes only via commit', async () => {
  const memory = new Map();
  const storage = {
    getItem: (k) => (memory.has(k) ? memory.get(k) : null),
    setItem: (k, v) => memory.set(k, String(v)),
    removeItem: (k) => memory.delete(k),
  };
  const store = S.create(S.fallbackAdapter(storage));
  const state = { schemaVersion: 4, currency: 'INR', expenses: [], budgets: {} };
  await store.init(state);
  const kept = D.validateExpense(row('10'));
  await assert.rejects(() => store.save({ ...state, expenses: [{ ...kept, cents: 0 }] }));
  assert.equal((await store.load()).state.expenses.length, 0);
  const app = read('app.js');
  assert.equal((app.match(/store\.save\(/g) || []).length, 1, 'only commit calls store.save');
});

test('VF01 a voice fill with no category leaves it empty (English, Spanish, edited draft)', () => {
  const fill = (text) => C.voiceFill(C.parseVoice(text, TODAY), TODAY);
  assert.equal(fill('Spent 250 rupees on stuff').category, '');
  assert.equal(fill('Spent 250 rupees today').category, '');
  const es = T.fallback('Gasté 250 rupias en algo raro', 'es');
  assert.equal(C.voiceFill(C.parseVoice(es.text, TODAY), TODAY).category, '');
  const edited = 'Spent 250 rupees on my pet ferret';
  assert.equal(C.voiceFill(C.parseVoice(edited, TODAY), TODAY).category, '');
  assert.ok(!/\|\|\s*'Other'/.test(read('app.js')), "app.js must not default a voice category");
  assert.match(read('app.js'), /C\.voiceFill\(/);
});

test('VF02 filler descriptions are cleared; real ones and typed text are kept', () => {
  const clean = C.cleanVoiceDescription;
  for (const filler of [
    'expense',
    'an expense',
    'something',
    'an amount on rent'.replace('rent', 'something'),
    'of',
    'it',
    'the',
    'stuff',
    'misc',
    'things',
    '',
  ])
    assert.equal(clean(filler), '', JSON.stringify(filler));
  assert.equal(clean('an amount on rent'), 'rent');
  assert.equal(clean('rent'), 'rent');
  assert.equal(clean('maid advance'), 'maid advance');
  assert.equal(clean('the rent'), 'the rent');
  const fromSpoken = C.voiceFill(C.parseVoice('Spent 250 rupees on expense today', TODAY), TODAY);
  assert.equal(fromSpoken.description, '');
  // Typed text never goes through the voice helper: the source must only call it in voice fill.
  const app = read('app.js');
  assert.equal((app.match(/cleanVoiceDescription|C\.voiceFill/g) || []).length >= 1, true);
  const typed = app.slice(app.indexOf('function buildExpense'), app.indexOf('function buildExpense') + 900);
  assert.ok(!/voiceFill|cleanVoiceDescription/.test(typed));
});

test('VF05 a voice fill with no date heard sets today, not the browsed month', () => {
  const fill = C.voiceFill(C.parseVoice('Spent 250 rupees on rent', TODAY), TODAY);
  assert.equal(fill.date, TODAY);
  assert.equal(fill.dateHeard, false);
  const heard = C.voiceFill(C.parseVoice('Spent 250 rupees on rent yesterday', TODAY), TODAY);
  assert.equal(heard.date, '2026-11-23');
  assert.equal(heard.dateHeard, true);
});

test('VF03 a voice fill that heard amount, category and an item fills all three', () => {
  const draft = C.parseVoice('Spent 250 rupees on groceries today via upi', TODAY);
  const fill = C.voiceFill(draft, TODAY);
  assert.equal(draft.amount, 250);
  assert.equal(fill.category, 'Food & groceries');
  assert.equal(fill.description, 'groceries');
});

test('VF04 a Hindi draft keeps unresolved fields empty (3.3.6 guard)', () => {
  const app = read('app.js');
  assert.match(app, /f\.category === null \|\| issues\.includes\('category'\)/);
  assert.match(app, /\$\('category'\)\.value = '';/);
});

test('VD01 VOICE_CAPTURE_FAILED keeps an allowed reason and drops anything else', async () => {
  const log = Dg.create();
  const reasons = [
    'no-speech',
    'not-allowed',
    'service-not-allowed',
    'audio-capture',
    'network',
    'aborted',
    'language-not-supported',
    'start-timeout',
    'stuck',
    'could-not-start',
    'stop-failed',
    'no-capture',
    'other',
  ];
  for (const reason of reasons) {
    await log.emit('voice', 'VOICE_CAPTURE_FAILED', 'error', { reason }, 'action-' + reason);
  }
  const events = await log.list();
  assert.equal(events.length, reasons.length);
  assert.deepEqual(events.map((e) => e.metadata.reason).sort(), [...reasons].sort());
  for (const bad of ['spent 250 on rent', 'NO-SPEECH', 42, null, '']) {
    const fresh = Dg.create();
    await fresh.emit('voice', 'VOICE_CAPTURE_FAILED', 'error', { reason: bad }, 'action-12345678');
    assert.deepEqual((await fresh.list())[0].metadata, {}, String(bad));
  }
  // Two failures with different reasons on different actions are two events, not merged.
  const two = Dg.create();
  await two.emit('voice', 'VOICE_CAPTURE_FAILED', 'error', { reason: 'network' }, 'action-aaaaaaaa');
  await two.emit('voice', 'VOICE_CAPTURE_FAILED', 'error', { reason: 'aborted' }, 'action-bbbbbbbb');
  const merged = await two.list();
  assert.deepEqual(merged.map((e) => e.metadata.reason).sort(), ['aborted', 'network']);
});

function recogniser() {
  const failures = [];
  const statuses = [];
  const instances = [];
  class Fake {
    constructor() {
      instances.push(this);
    }
    start() {
      this.onstart();
    }
    stop() {
      this.onend();
    }
    abort() {}
  }
  const controller = V.create(Fake, {
    status: (...a) => statuses.push(a),
    failure: (reason) => failures.push(reason),
  });
  return { controller, failures, statuses, instances };
}

test('VD02 a quiet end is a failure with reason no-capture; errors report their name', () => {
  const quiet = recogniser();
  quiet.controller.start();
  quiet.instances[0].onend();
  assert.deepEqual(quiet.failures, ['no-capture']);
  const known = recogniser();
  known.controller.start();
  known.instances[0].onerror({ error: 'network' });
  known.instances[0].onend();
  assert.deepEqual(known.failures, ['network']);
  const unknown = recogniser();
  unknown.controller.start();
  unknown.instances[0].onerror({ error: 'something-new' });
  assert.deepEqual(unknown.failures, ['other']);
  const ok = recogniser();
  ok.controller.start();
  ok.instances[0].onresult({
    resultIndex: 0,
    results: [Object.assign([{ transcript: 'Spent 5 rupees' }], { isFinal: true })],
  });
  ok.instances[0].onend();
  assert.deepEqual(ok.failures, []);
  class Broken {
    start() {
      throw Error('blocked');
    }
  }
  const failures = [];
  V.create(Broken, { status() {}, failure: (r) => failures.push(r) }).start();
  assert.deepEqual(failures, ['could-not-start']);
});

test('VD02 ladder: quiet end opens the keyboard; second failure in a row is stronger; success resets', () => {
  const ladder = V.createLadder();
  const first = ladder.record('no-capture');
  assert.equal(first.count, 1);
  assert.equal(first.openKeyboard, true);
  assert.equal(first.strong, false);
  const second = ladder.record('network');
  assert.equal(second.count, 2);
  assert.equal(second.strong, true);
  assert.equal(second.openTips, true);
  assert.equal(V.strongMessage, 'Voice is not working well right now. Type or use your keyboard microphone.');
  ladder.reset();
  const again = ladder.record('aborted');
  assert.equal(again.count, 1);
  assert.equal(again.strong, false);
});

test('VT01 language labels and the caution line match the spec', () => {
  const html = read('index.html');
  assert.match(html, /<option value="hi">Hindi · हिन्दी \(assisted\)<\/option>/);
  assert.match(html, /<option value="es">Spanish · Español \(assisted\)<\/option>/);
  assert.match(html, /<option value="en">English<\/option>/);
  const caution =
    'Hindi and Spanish voice is assisted. Your phone may mishear, and Penny understands only common words. Check the amount, category and date. Nothing is saved until you tap Save.';
  const flat = html.replace(/\s+/g, ' ');
  assert.ok(flat.includes(caution), 'caution text');
  assert.match(html, /id="voice-caution"[^>]*hidden/);
  assert.match(html, /<details[^>]*id="voice-tips"/);
  assert.match(read('app.js'), /voice-caution/);
});

test('VT02 the category list starts with a disabled placeholder and a custom message', () => {
  const app = read('app.js');
  assert.match(app, /<option value="" disabled>Choose a category<\/option>/);
  assert.match(app, /setCustomValidity\('Choose a category\.'\)/);
  assert.match(app, /setCustomValidity\('Describe the expense\.'\)/);
});
