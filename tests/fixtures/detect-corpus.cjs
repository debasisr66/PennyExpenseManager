'use strict';
/* Deterministic corpus for the 3.3.1 detect() freeze (TC-RM-F02).
   No #recurring tags, so 3.3.2 must return byte-identical output.
   Regenerate the golden ONLY from a 3.3.1 checkout:
   node tests/fixtures/detect-corpus.cjs --write */
const fs = require('node:fs');
const path = require('node:path');
const NAMES = ['Rent', 'Rent Nov', 'Airtel 499', 'Netflix', 'Gym', 'Milk', 'SIP', 'Maid'];
const CATS = ['Housing', 'Bills', 'Other'];
const TAGS = [[], ['upi'], ['family', 'cash'], ['every-2-months']];
function corpus() {
  let seed = 20261119;
  const rnd = (n) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  const rows = [];
  let id = 0;
  // Series with jittered day and amount and skipped months: some pass, some fail.
  for (let g = 0; g < 240; g++) {
    const name = NAMES[rnd(NAMES.length)] + ' ' + (g % 30);
    const category = CATS[rnd(CATS.length)];
    const cents = [99900, 100000, 64900, 250000][rnd(4)];
    const day = rnd(28) + 1;
    const start = 2025 * 12 + rnd(18);
    const len = 3 + rnd(10);
    const tags = TAGS[rnd(TAGS.length)];
    for (let k = 0; k < len; k++) {
      if (rnd(5) === 0) continue;
      const idx = start + k;
      const month = String((idx % 12) + 1).padStart(2, '0');
      const d = Math.min(28, Math.max(1, day + rnd(9) - 4));
      rows.push({
        id: 'c' + id++,
        description: name,
        category,
        cents: cents + (rnd(4) === 0 ? rnd(30000) : rnd(5000)),
        date: Math.floor(idx / 12) + '-' + month + '-' + String(d).padStart(2, '0'),
        tags,
        paymentMethod: 'unspecified',
      });
    }
  }
  return rows;
}
const REFS = ['2025-06', '2025-12', '2026-01', '2026-07', '2026-11', '2027-02'];
function outputs(R) {
  const D = require('../../data.js');
  const rows = corpus();
  const chunks = [rows.slice(0, 200), rows];
  const out = {};
  for (const ref of REFS) {
    out[ref] = chunks.map((c) => R.detect(c, ref));
    out['sample-' + ref] = R.detect(D.defaults(ref + '-20').expenses, ref);
  }
  return out;
}
module.exports = { corpus, outputs, REFS };
if (require.main === module && process.argv.includes('--write')) {
  const file = path.join(__dirname, 'detect-3.3.1.json');
  if (fs.existsSync(file) && !process.argv.includes('--force')) {
    throw Error('Refusing to overwrite ' + file);
  }
  const R = require('../../recurring.js');
  fs.writeFileSync(file, JSON.stringify(outputs(R)) + '\n');
  console.log('wrote', file);
}
