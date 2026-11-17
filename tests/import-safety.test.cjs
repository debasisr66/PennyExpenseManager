'use strict';
// D3 and D5 (docs/specs/REMOVE-EXCEL-SPEC.md): Excel files are refused with a clear message, and
// imports whose source carries no preferences can never change preferences.
// readImportFile is lifted verbatim from app.js and run against the real data.js.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const D = require('../data.js');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function extractFunction(source, header) {
  const start = source.indexOf(header);
  assert.ok(start >= 0, `app.js must define ${header}`);
  let depth = 0, quote = null;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    const c = source[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw Error('Unbalanced braces in ' + header);
}
const readImportFile = new Function('D', extractFunction(app, 'async function readImportFile(file)') + '\nreturn readImportFile;')(D);
const file = (name, text) => ({ name, size: Buffer.byteLength(text), text: async () => text });
const EXCEL = 'Excel files are no longer supported. In Excel, use File › Save As › CSV, or import a Penny JSON backup.';
const seed = () => D.defaults('2026-11-17');

for (const name of ['old.xlsx', 'OLD.XLS', 'macro.xlsm', 'binary.xlsb'])
  test(`D3: ${name} is refused with the Excel message`, async () => {
    await assert.rejects(readImportFile(file(name, 'PK')), { message: EXCEL });
  });
test('D3: other file types get the CSV/JSON message', async () => {
  await assert.rejects(readImportFile(file('notes.txt', 'x')), { message: 'Choose a CSV file or a Penny JSON backup.' });
});
test('D5: CSV import carries no preferences', async () => {
  const r = await readImportFile(file('e.csv', D.exportCsv(seed())));
  assert.equal(r.state.expenses.length, 9);
  assert.equal(r.settingsNote, 'CSV files do not contain preferences.');
});
test('D5: JSON backup with settings keeps preferences available', async () => {
  const r = await readImportFile(file('b.json', D.exportBackup(seed())));
  assert.equal(r.settingsNote, '');
});
test('D5: JSON without settings (schema 3) carries no preferences', async () => {
  const raw = JSON.parse(D.exportBackup(seed()));
  delete raw.settings; delete raw.tagCatalog; raw.schemaVersion = 3;
  const r = await readImportFile(file('old.json', JSON.stringify(raw)));
  assert.equal(r.settingsNote, 'This file does not contain preferences.');
});
test('D5: the preferences checkbox is disabled whenever there is a note, and planImport only sees importSettingsChosen()', () => {
  const review = extractFunction(app, 'function reviewImport(');
  assert.match(review, /\$\('import-settings'\)\.checked = false;/);
  assert.match(review, /\$\('import-settings'\)\.disabled = settingsNote !== '';/);
  assert.match(extractFunction(app, 'function importSettingsChosen()'), /return !\$\('import-settings'\)\.disabled && \$\('import-settings'\)\.checked;/);
  const calls = [...app.matchAll(/D\.planImport\(([^;]*?)\);/gs)].map((m) => m[1]);
  assert.ok(calls.length >= 2, 'expected planImport calls in app.js');
  for (const args of calls) {
    assert.match(args, /importSettingsChosen\(\)/);
    assert.doesNotMatch(args, /'import-settings'/);
  }
});
test('D5 rationale: without the gate a CSV import would reset preferences', () => {
  const current = D.migrateState({ ...seed(), settings: { defaultMonthlyBudgetPaise: 432100, preferredVoiceLanguage: 'hi' } });
  const csv = D.importCsv(D.exportCsv(seed()));
  const plan = (useSettings) => D.planImport(current, csv, 'merge', false, useSettings);
  const settingsOf = (p) => (p.state || p).settings;
  assert.deepEqual(settingsOf(plan(false)), current.settings);
  assert.notDeepEqual(settingsOf(plan(true)), current.settings);
});
