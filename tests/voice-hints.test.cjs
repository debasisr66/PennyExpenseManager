'use strict';
// 3.3.8 voice hints. VH = number-without-rupee hint, HG = Hindi parser fixes, EN = English
// approximate words, VD = capture-failure observability, VR = release copies.
// Spec: docs/specs/VOICE-HINTS-3.3.8-SPEC.md §7. Each test marked "fails on 3.3.7" was run
// against origin/main and failed there.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../core.js');
const H = require('../hindi.js');
const T = require('../translation.js');
const V = require('../voice.js');
const S = require('../storage.js');
const Dg = require('../diagnostics.js');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const TODAY = '2026-11-24';
const HINT = new RegExp(
  'A number \\((\\d+)\\) was heard, but not as rupees\\. ' +
    "Say 'rupees' after it, or type the amount below\\.",
);
const hindi = (text) => T.fallback(text, 'hi');
const hindiStatus = (text) => T.plainIssues(hindi(text).unknown, text);

test('VH01 a lone number without a rupee word is named in the hint (Hindi and English)', () => {
  const text = 'सब्जी 350';
  const result = hindi(text);
  assert.equal(result.structured.fields.amountPaise, null, 'the amount stays empty');
  assert.match(hindiStatus(text), HINT);
  assert.equal(hindiStatus(text).match(HINT)[1], '350');
  assert.doesNotMatch(hindiStatus(text), /Amount not clear/);
  const en = C.parseVoice('chai 50', TODAY);
  assert.equal(en.amount, null, 'no field is filled by the hint');
  assert.match(en.warnings.join(' '), HINT);
  assert.equal(en.warnings.join(' ').match(HINT)[1], '50');
});

test('VH04 no hint when the number may be a quantity, a foreign amount or a paise amount', () => {
  // Control: the hint does appear for a lone number, so this test cannot pass by accident.
  assert.match(hindiStatus('सब्जी 350'), HINT);
  for (const text of [
    'सब्जी 500 रुपये दो किलो',
    'डेढ सौ रुपये सब्जी 2 किलो',
    'पांच सौ रुपये सब्जी 2',
    '500 रुपये 2 किलो',
    '50 डॉलर सब्जी',
    'लगभग 500 रुपये',
    '500 रुपये 50 पैसे',
    '2 किलो सब्जी 350',
    'कम से कम 500 रुपए',
  ])
    assert.doesNotMatch(hindiStatus(text), /A number/, text);
  for (const text of [
    'Spent about 2 kg rice 500 rupees',
    'chai 50 and 60',
    'Spent 500 rupees',
    'coffee 50 dollars',
    'coffee 50 $',
  ])
    assert.doesNotMatch(C.parseVoice(text, TODAY).warnings.join(' '), /A number/, text);
  // Without a transcript the old sentence is unchanged.
  assert.match(T.plainIssues(['amount: extra numeric evidence', 'amount']), /Amount not clear/);
});

test('VH02 uncertain wording keeps its own message, not the number hint', () => {
  const text = 'कम से कम 500 रुपए';
  assert.equal(hindi(text).structured.fields.amountPaise, null);
  assert.match(hindiStatus(text), /Amount not clear/);
  assert.match(hindiStatus(text), /Not understood: कम/);
});

test('VH03 the hint shows digits as text only and cannot inject markup', () => {
  const text = 'सब्जी <b>350</b>';
  const status = hindiStatus(text);
  assert.match(status, HINT, 'the hint appears for the lone number');
  assert.equal(status.indexOf(C.numberWithoutRupees('350')), 0, 'digits only, built by core');
  const app = read('app.js');
  assert.match(app, /plainIssues\(result\.unknown, text\)/);
  for (const id of ['translation-status', 'voice-status', 'voice-strong', 'form-error'])
    assert.ok(!new RegExp(`\\$\\('${id}'\\)\\.(?:innerHTML|outerHTML)`).test(app), id);
  assert.ok(!/insertAdjacentHTML/.test(app));
});

const amount = (text) => H.parse(text, TODAY).fields.amountPaise;
const method = (text) => H.parse(text, TODAY).fields.paymentMethod;

test('HG01 words ending in रु or रू are not rupee markers (G3a)', () => {
  for (const word of ['गुरु', 'गुरू', 'शुरू', 'शुरु']) {
    const r = H.parse(word + ' 500 रुपये', TODAY);
    assert.equal(r.fields.amountPaise, 50000, word);
    assert.ok(!r.issues.includes('multiple amounts'), word);
    assert.ok(r.unknownSpans.includes(word), word + ' is reported as unknown: ' + r.unknownSpans);
  }
  for (const word of ['गुरु', 'मेरु', 'तरु'])
    assert.equal(amount(word + ' 500'), null, word + ' never counts as a rupee marker');
  assert.equal(amount('सब्जी 500 रु'), 50000);
  assert.equal(amount('सब्जी 500रु'), 50000);
  assert.equal(amount('रु 500 सब्जी'), 50000);
  assert.equal(amount('सब्जी रू 500'), 50000);
  assert.equal(amount('पांच सौ रुपये सब्जी'), 50000);
});

test('HG02 कल is a whole word in the parser and in the app (G3b)', () => {
  for (const text of ['कल, 500 रुपये सब्जी', 'कल. 500 रुपये सब्जी', 'कल सब्जी 500 रुपये'])
    assert.ok(
      H.parse(text, TODAY).issues.includes('date: choose yesterday or tomorrow'),
      text,
    );
  assert.ok(!H.parse('कलम 500 रुपये', TODAY).issues.some((x) => x.startsWith('date')));
  assert.equal(H.parse('आज 500 रुपये सब्जी', TODAY).fields.date, TODAY);
  assert.equal(H.hasKal('कल, 500 रुपये'), true);
  assert.equal(H.hasKal('सब्जी कल'), true);
  assert.equal(H.hasKal('कलम 500 रुपये'), false);
  assert.equal(H.hasKal('आजकल 500 रुपये'), false);
  const app = read('app.js');
  assert.ok(!/\/कल\//.test(app), 'app.js has no unbounded कल test');
  assert.equal((app.match(/PennyHindi\.hasKal\(/g) || []).length, 2);
});

test('HG03 कैशबैक is money received: amount empty, method not cash (G3c)', () => {
  for (const text of ['कैशबैक 500 रुपये मिला', 'कैश बैक 500 रुपये मिला', '500 रुपये कैशबैक']) {
    assert.equal(amount(text), null, text);
    assert.notEqual(method(text), 'cash', text);
    assert.match(hindiStatus(text), /Amount not clear/, text);
  }
  assert.equal(amount('कैश 500 रुपये'), 50000);
  assert.equal(method('कैश 500 रुपये'), 'cash');
  assert.equal(method('नकद 500 रुपये सब्जी'), 'cash');
});

const cues = ['about', 'approx', 'approx.', 'approximately', 'around', 'roughly'];
test('EN01 an approximate word next to the amount leaves it empty with a warning (G4)', () => {
  const WARN = /The spoken amount is approximate; enter the exact amount below\./;
  for (const cue of [...cues, 'at least', 'over', 'under']) {
    for (const said of [
      `Spent ${cue} 500 rupees on lunch`,
      `lunch ${cue} 500 rs`,
      `Spent ${cue} ₹500 on lunch`,
    ]) {
      const draft = C.parseVoice(said, TODAY);
      assert.equal(draft.amount, null, said);
      assert.match(draft.warnings.join(' '), WARN, said);
    }
  }
  assert.equal(C.parseVoice('Spent about 2 kg rice, 500 rupees', TODAY).amount, 500);
  assert.equal(C.parseVoice('Spent 500 rupees on lunch', TODAY).amount, 500);
  assert.equal(C.parseVoice('lunch 500 rs', TODAY).amount, 500);
  assert.equal(C.parseVoice('Spent 500 rupees on lunch over the weekend', TODAY).amount, 500);
});

test('EN01 a Spanish translation that says "about 500 rupees" is not complete', async () => {
  const translator = { translate: async () => 'Spent about 500 rupees on food' };
  const exact = { translate: async () => 'Spent 500 rupees on food' };
  const said = 'Gasté 500 rupias en comida';
  assert.equal((await T.translate(said, 'es', exact)).complete, true, 'control');
  const result = await T.translate(said, 'es', translator);
  assert.equal(result.complete, false);
  assert.ok(result.unknown.some((x) => /amount differs/.test(x)));
});

function fakeRecogniser(options = {}) {
  const events = { failures: [], ends: [], statuses: [] };
  const instances = [];
  class Fake {
    constructor() {
      instances.push(this);
    }
    start() {
      this.onstart();
    }
    stop() {}
    abort() {}
  }
  let clock = 1000;
  const timers = [];
  const controller = V.create(
    Fake,
    {
      status: (status, message) => events.statuses.push([status, message]),
      failure: (reason) => events.failures.push(reason),
      end: (info) => events.ends.push(info),
    },
    {
      now: () => clock,
      setTimeout: (fn) => timers.push(fn) && fn,
      clearTimeout() {},
      ...options,
    },
  );
  return { controller, events, instances, timers, tick: (ms) => (clock += ms) };
}
const interim = (text) => ({
  resultIndex: 0,
  results: [Object.assign([{ transcript: text }], { isFinal: false })],
});

test('VD02 aborted after a Stop tap is user-stop; otherwise it stays aborted', () => {
  const stopped = fakeRecogniser();
  stopped.controller.start();
  stopped.controller.stop();
  stopped.instances[0].onerror({ error: 'aborted' });
  assert.deepEqual(stopped.events.failures, ['user-stop']);

  const phone = fakeRecogniser();
  phone.controller.start();
  phone.instances[0].onerror({ error: 'aborted' });
  assert.deepEqual(phone.events.failures, ['aborted']);

  // The 25 second listen timer calls the recogniser's stop itself: not a user stop.
  const timed = fakeRecogniser();
  timed.controller.start();
  timed.timers[timed.timers.length - 1]();
  timed.instances[0].onerror({ error: 'aborted' });
  assert.deepEqual(timed.events.failures, ['aborted']);

  // The flag is reset by the next start().
  const again = fakeRecogniser();
  again.controller.start();
  again.controller.stop();
  again.instances[0].onerror({ error: 'aborted' });
  again.controller.start();
  again.instances[1].onerror({ error: 'aborted' });
  assert.deepEqual(again.events.failures, ['user-stop', 'aborted']);

  // A different error after a Stop tap keeps its own name.
  const net = fakeRecogniser();
  net.controller.start();
  net.controller.stop();
  net.instances[0].onerror({ error: 'network' });
  assert.deepEqual(net.events.failures, ['network']);
});

test('VD02 a failure reports the words already heard and the duration', () => {
  const r = fakeRecogniser();
  r.controller.start();
  r.instances[0].onresult(interim('सब्जी तीन सौ'));
  r.tick(4200);
  r.controller.stop();
  r.instances[0].onerror({ error: 'aborted' });
  assert.deepEqual(r.events.failures, ['user-stop']);
  assert.deepEqual(r.events.ends, [{ count: 3, durationMs: 4200 }]);
  r.instances[0].onend();
  assert.equal(r.events.ends.length, 1, 'onend after a failure does not report twice');

  const quiet = fakeRecogniser();
  quiet.controller.start();
  quiet.tick(900);
  quiet.instances[0].onerror({ error: 'no-speech' });
  assert.deepEqual(quiet.events.ends, [{ count: 0, durationMs: 900 }]);
});

async function freshLog() {
  const log = Dg.create(),
    values = new Map();
  await log.attach(
    S.fallbackAdapter({
      getItem: (k) => (values.has(k) ? values.get(k) : null),
      setItem: (k, v) => values.set(k, v),
    }),
  );
  return log;
}

test('VD02 the log accepts user-stop and still drops unknown reasons', async () => {
  const log = await freshLog();
  const meta = { reason: 'user-stop', count: 2 };
  await log.emit('voice', 'VOICE_CAPTURE_FAILED', 'error', meta, 'action-12345678');
  assert.deepEqual((await log.list())[0].metadata, { reason: 'user-stop', count: 2 });
  for (const bad of ['USER-STOP', 'user stop', 'spent 5', 7, null]) {
    const fresh = await freshLog();
    await fresh.emit('voice', 'VOICE_CAPTURE_FAILED', 'error', { reason: bad }, 'action-12345678');
    assert.deepEqual((await fresh.list())[0].metadata, {}, String(bad));
  }
});

test('VD01 the failure handler records the streak before it logs, and logs it', () => {
  const app = read('app.js');
  const at = app.indexOf('failure(reason) {');
  assert.ok(at > 0, 'failure handler found');
  const body = app.slice(at, app.indexOf('alternatives(count)', at));
  const record = body.indexOf('voiceLadder.record(reason)');
  const log = body.indexOf("'VOICE_CAPTURE_FAILED'");
  assert.ok(record >= 0 && log >= 0 && record < log, 'record() comes before the log call');
  assert.match(body, /\{\s*reason,\s*count:\s*step\.count\s*\}/);
  assert.match(app, /status === 'complete'\) voiceLadder\.reset\(\)/);
});

test('VD03 the strong message has its own status element that Try voice again cannot clear', () => {
  const html = read('index.html');
  assert.match(html, /<p id="voice-strong" role="status"><\/p>/);
  assert.match(html, /<div id="voice-strong-box"[^>]*\bhidden\b/);
  assert.match(html, /id="dismiss-voice-strong"[^>]*>\s*Dismiss\s*</);
  const app = read('app.js');
  const from = app.indexOf('status(status, message) {');
  const status = app.slice(from, app.indexOf('preview(text) {'));
  const lines = status.split('\n').filter((l) => /voice-strong/.test(l));
  assert.equal(lines.length, 1, 'the status handler touches the notice once, on success');
  const first = status.indexOf('voice-strong');
  assert.match(status.slice(Math.max(0, first - 120), first), /status === 'complete'/);
  assert.ok(!/starting|listening/.test(lines.join('')));
  const failure = app.slice(app.indexOf('failure(reason) {'), app.indexOf('alternatives(count)'));
  assert.match(failure, /voice-strong/);
  assert.match(failure, /step\.strong/);
  assert.ok(!/\$\('voice-status'\)[^;]*strongMessage/.test(failure), 'not in the status line');
  assert.match(app, /dismiss-voice-strong'\)\.onclick/);
  const hides = app.match(/voice-strong-box'\)\.hidden = true/g) || [];
  assert.equal(hides.length, 2, 'only a success and Dismiss hide the notice');
  // No language gate: the notice is shown for English too.
  assert.ok(!/voice-language[^;]*voice-strong|voice-strong[^;]*voice-language/.test(failure));
  assert.match(read('styles.css'), /#dismiss-voice-strong\s*\{[^}]*min-height:\s*44px/);
});

test('VR01 version 3.3.8 and its What\'s New entry', () => {
  assert.equal(read('VERSION').trim(), '3.3.8');
  const html = read('index.html');
  assert.match(html, /V3\.3\.8/);
  assert.match(html, /Voice hints/);
  assert.match(read('CHANGELOG.md'), /^## V3\.3\.8 /m);
});
