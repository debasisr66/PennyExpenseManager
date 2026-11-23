'use strict';
// 3.3.6 Hindi voice: whole-word checks, rupee forms, neutral words, plain issues, measurement.
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../hindi.js');
const V = require('../voice.js');
const T = require('../translation.js');
const L = require('../diagnostics.js');
const S = require('../storage.js');
const real = require('./hindi-real.json');
const DATE = '2026-11-23';
const amount = (text) => H.parse(text, DATE).fields.amountPaise;

const RUPEE_FORMS = ['रुपी', 'रूपी', 'रुपीज', 'रूपीज', 'रुपीस', 'रूपीस'];
test('TC-HV-U01 each rupee form gives the same amount as रुपये, after the amount', () => {
  for (const form of RUPEE_FORMS) {
    assert.equal(amount('दूध 1000 ' + form), 100000, form);
    assert.equal(amount('एक हज़ार ' + form + ' दूध'), 100000, form + ' words');
  }
});
test('TC-HV-U01 each rupee form behaves like रुपये before the amount', () => {
  for (const form of RUPEE_FORMS) {
    const a = H.parse(form + ' 1000 दूध', DATE),
      b = H.parse('रुपये 1000 दूध', DATE);
    assert.equal(a.fields.amountPaise, b.fields.amountPaise, form);
    assert.equal(a.normalizedTranscript, b.normalizedTranscript, form);
  }
});
test('TC-HV-U01 Latin rupee and rupiya work; rupee forms inside longer words do not', () => {
  assert.equal(amount('दूध 1000 rupee'), 100000);
  assert.equal(amount('दूध 1000 rupiya'), 100000);
  assert.equal(H.parse('दूध 1000 रुपीयाँ', DATE).normalizedTranscript.includes('रुपये'), false);
});

const NEUTRAL = {
  एडवांस: 'advance',
  बिल: 'bill',
  पेमेंट: 'payment',
  बकाया: 'dues',
  किस्त: 'instalment',
};
for (const [word, english] of Object.entries(NEUTRAL))
  test('TC-HV-U02 neutral word ' + word, () => {
    const r = H.parse(word + ' 1000 रुपये', DATE);
    assert.equal(r.fields.amountPaise, 100000);
    assert.equal(r.fields.category, null);
    assert.deepEqual(r.unknownSpans, []);
    assert.equal(r.issues.includes('category'), false);
    assert.equal(r.englishDraft, 'Spent 1000 rupees on ' + english);
    const withCategory = H.parse('दूध ' + word + ' 1000 रुपये', DATE);
    assert.equal(withCategory.fields.category, 'Food & groceries');
    assert.match(withCategory.englishDraft, new RegExp('milk groceries ' + english));
  });
test('TC-HV-U02 फीस is unchanged (still school fees)', () => {
  assert.match(H.parse('फीस 500 रुपये', DATE).englishDraft, /school fees/);
});

test('TC-HV-U03 कामवाली के एडवांस 1000 रुपी', () => {
  const r = H.parse('कामवाली के एडवांस 1000 रुपी', DATE);
  assert.equal(r.fields.amountPaise, 100000);
  assert.equal(r.fields.category, 'Staff salary');
  assert.match(r.englishDraft, /maid advance/);
  assert.equal(r.reviewState, 'review-ready');
  assert.deepEqual(r.issues, []);
});

for (const word of ['कमरे', 'कमल', 'कमीज़', 'कमीशन', 'कमाई'])
  test('TC-HV-U04 ' + word + ' does not block the amount', () => {
    assert.equal(amount(word + ' के लिए 5000 रुपये'), 500000);
  });
test('TC-HV-U04 कमरे का किराया 5000 रुपये', () => {
  const r = H.parse('कमरे का किराया 5000 रुपये', DATE);
  assert.equal(r.fields.amountPaise, 500000);
  assert.equal(r.fields.category, 'Housing');
});

class AltRecognition {
  constructor() {
    AltRecognition.last = this;
  }
  start() {
    this.onstart();
  }
  stop() {
    this.onend();
  }
  abort() {}
}
test('TC-HV-U05 asks for 3 alternatives but uses only the top guess', () => {
  const transcripts = [],
    alternatives = [];
  const c = V.create(AltRecognition, {
    status: () => {},
    transcript: (t) => transcripts.push(t),
    alternatives: (n) => alternatives.push(n),
  });
  c.start('hi-IN');
  const r = AltRecognition.last;
  assert.equal(r.maxAlternatives, 3);
  const result = Object.assign(
    [{ transcript: 'कमल कवन हज़ार रुपी' }, { transcript: 'दूसरा' }, { transcript: 'तीसरा' }],
    { isFinal: true },
  );
  r.onresult({ resultIndex: 0, results: [result] });
  r.onend();
  assert.deepEqual(transcripts, ['कमल कवन हज़ार रुपी']);
  assert.deepEqual(alternatives, [3]);
});
test('TC-HV-U05 end of listening reports words captured and duration only', () => {
  const ends = [];
  let now = 1000;
  const c = V.create(
    AltRecognition,
    { status: () => {}, transcript: () => {}, end: (info) => ends.push(info) },
    { now: () => now },
  );
  c.start('hi-IN');
  now = 3500;
  const result = Object.assign([{ transcript: 'दूध 250 रुपये' }], { isFinal: true });
  AltRecognition.last.onresult({ resultIndex: 0, results: [result] });
  AltRecognition.last.onend();
  assert.deepEqual(ends, [{ count: 3, durationMs: 2500 }]);
});

test('TC-HV-U06 plainIssues gives a plain sentence per issue family', () => {
  const p = T.plainIssues;
  assert.match(p(['amount']), /Amount not clear\. Tap Correct heard words/);
  assert.match(p(['amount needs explicit correction']), /Amount not clear/);
  assert.match(p(['multiple amounts']), /Amount not clear/);
  assert.match(p(['category']), /Category not clear\. Choose it below\./);
  assert.match(p(['expense type']), /Category not clear/);
  assert.match(p(['date: choose yesterday or tomorrow']), /Date not clear/);
  assert.match(p(['payment method']), /Payment method not clear/);
  assert.match(p(['कमल', 'कवन']), /Not understood: कमल, कवन/);
  assert.equal(p([]), '');
  assert.equal((p(['amount', 'amount: extra numeric evidence']).match(/Amount/g) || []).length, 1);
  assert.doesNotMatch(p(['amount: extra numeric evidence']), /numeric evidence/);
});

for (const text of [
  'कम से कम 500 रुपये',
  'लगभग 500 रुपये',
  '500 नहीं 600 रुपये',
  'करीब हज़ार रुपये',
])
  test('TC-HV-S01 uncertain phrase keeps the amount empty: ' + text, () => {
    assert.equal(amount(text), null);
  });
test('TC-HV-S01 each uncertain word still blocks when it stands alone', () => {
  for (const w of ['नहीं', 'नही', 'लगभग', 'करीब', 'ज्यादा', 'अधिक', 'कम', 'वापस', 'रिफंड'])
    assert.equal(amount('दूध ' + w + ' 500 रुपये'), null, w);
});

test('TC-HV-S02 diagnostics keep only count, durationMs and language', async () => {
  const log = L.create(),
    values = new Map();
  await log.attach(
    S.fallbackAdapter({
      getItem: (k) => values.get(k) || null,
      setItem: (k, v) => values.set(k, v),
    }),
  );
  log.setDebug(true);
  await log.emit('voice', 'VOICE_ALTERNATIVES', 'debug', {
    count: 3,
    transcript: 'कमल कवन',
    amount: 100000,
    language: 'hi',
  });
  await log.emit('voice', 'VOICE_END', 'debug', { count: 3, durationMs: 2500, text: 'x' });
  const events = (await log.list()).reverse();
  assert.deepEqual(events.map((e) => e.code), ['VOICE_ALTERNATIVES', 'VOICE_END']);
  assert.deepEqual(events[0].metadata, { count: 3, language: 'hi' });
  assert.deepEqual(events[1].metadata, { count: 3, durationMs: 2500 });
  assert.doesNotMatch(JSON.stringify(events), /कमल|100000/);
});

test('TC-HV-S03 owner capture: ₹1,000, no category, review required', () => {
  const r = H.parse('कमल कवन हज़ार रुपी', DATE);
  assert.equal(r.fields.amountPaise, 100000);
  assert.equal(r.fields.category, null);
  assert.equal(r.reviewState, 'needs-correction');
});

for (const c of real.cases)
  test('TC-HV-R01 ' + c.id + ' ' + c.heard, () => {
    const r = H.parse(c.heard, DATE);
    assert.equal(r.fields.amountPaise, c.amountPaise);
    if (c.category !== undefined) assert.equal(r.fields.category, c.category);
    assert.equal(r.reviewState === 'review-ready', c.complete);
    if (c.descriptionIncludes) assert.match(r.englishDraft, new RegExp(c.descriptionIncludes));
  });

// Audit of other Devanagari substring checks (spec §11).
test('Audit: पैसेंजर (passenger) is not read as पैसे (paise)', () => {
  assert.equal(amount('पैसेंजर ट्रेन 50 रुपये'), 5000);
  assert.equal(amount('50 पैसे'), null);
});
