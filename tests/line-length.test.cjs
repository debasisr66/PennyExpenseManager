'use strict';
// Line-length ratchet. The limit is Prettier's printWidth.
// Files in BASELINE may keep at most that many long lines
// (data and string literals). Every other file: zero.
// Counts must match exactly: lower an entry when lines shrink.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(base, f), 'utf8');
const LIMIT = JSON.parse(read('.prettierrc.json')).printWidth;

const BASELINE = {
  'app.js': 24,
  'core.js': 4,
  'data.js': 1,
  'hindi.js': 4,
  'translation.js': 2,
  'voice.js': 6,
  'index.html': 1,
  'scripts/penny': 3,
  'tests/adversarial.test.cjs': 35,
  'tests/core.test.cjs': 40,
  'tests/draft-amount.test.cjs': 7,
  'tests/hindi-corpus.test.cjs': 5,
  'tests/import-safety.test.cjs': 7,
  'tests/no-excel.test.cjs': 6,
  'tests/offline-language.test.cjs': 15,
  'tests/serve-tests.cjs': 9,
  'tests/ui-colours.test.cjs': 6,
  'tests/v3.test.cjs': 37,
  'tests/v32.test.cjs': 37,
  'tests/version.test.cjs': 6,
  'tests/voice.test.cjs': 16,
  'tests/browser-fixtures.js': 9,
  'tests/import-fixtures.js': 3,
  'tests/pending-translation-fixture.js': 1,
};

function listFiles(dir, pattern) {
  return fs
    .readdirSync(path.join(base, dir))
    .filter((name) => pattern.test(name))
    .map((name) => path.posix.join(dir, name));
}

function sourceFiles() {
  const root = listFiles('.', /\.(js|css|html)$/);
  const tests = listFiles('tests', /\.(cjs|js)$/);
  const extra = ['scripts/penny'];
  const all = [...root, ...tests, ...extra];
  return all.map((f) => f.replace(/^\.\//, ''));
}

function longLines(file) {
  const lines = read(file).split('\n');
  // Count characters (code points), not bytes or UTF-16 units.
  return lines.filter((l) => [...l].length > LIMIT).length;
}

test('LL01 printWidth is the line limit', () => {
  assert.equal(LIMIT, 100);
});

test('LL02 long-line counts match the baseline exactly', () => {
  const files = new Set(sourceFiles());
  for (const f of Object.keys(BASELINE)) {
    files.add(f);
  }
  const drift = [];
  for (const file of files) {
    const allowed = BASELINE[file] || 0;
    const exists = fs.existsSync(path.join(base, file));
    const found = exists ? longLines(file) : 0;
    if (found !== allowed) {
      drift.push(`${file}: ${found}, baseline ${allowed}`);
    }
  }
  const hint = 'shorten new long lines; lower or remove a baseline entry when lines shrink';
  assert.deepEqual(drift, [], hint);
});
