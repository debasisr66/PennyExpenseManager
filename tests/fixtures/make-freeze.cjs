'use strict';
/* Golden freeze generator. Run ONLY from a known-good 3.3.0 checkout:
   node tests/fixtures/make-freeze.cjs   (writes freeze-3.3.0.json next to this file)
   Refuses to overwrite an existing fixture unless --force is passed.
   The recurring tests recompute build() and compare with the committed JSON. */
const fs = require('node:fs'),
  path = require('node:path');
const D = require('../../data.js');
const state = {
  schemaVersion: 4,
  currency: 'INR',
  expenses: [
    {
      id: 'f1',
      description: 'Rent',
      cents: 1050000,
      category: 'Housing',
      date: '2026-09-01',
      paymentMethod: 'bank-transfer',
      tags: ['housing', 'bank-transfer'],
    },
    {
      id: 'f2',
      description: 'किराना सामान',
      cents: 86400,
      category: 'Food & groceries',
      date: '2026-09-03',
      paymentMethod: 'upi',
      tags: ['किराना', 'upi'],
    },
    {
      id: 'f3',
      description: '=SUM(A1) "quoted", comma',
      cents: 1,
      category: 'Other',
      date: '2026-10-04',
      paymentMethod: 'cash',
      tags: ['cash'],
    },
    {
      id: 'f4',
      description: 'Train pass',
      cents: 45000,
      category: 'Transport',
      date: '2026-10-05',
      paymentMethod: 'unspecified',
      tags: ['travel', 'work-trip'],
    },
  ],
  budgets: { '2026-09': 5000000, '2026-10': 0 },
  tagCatalog: ['extra'],
  settings: { defaultMonthlyBudgetPaise: 9000000, preferredVoiceLanguage: 'hi' },
};
const legacy = {
  expenses: [
    {
      id: 'l1',
      description: 'Old lunch',
      date: '2025-01-02',
      cents: 2550,
      category: 'Food & groceries',
    },
  ],
  budgets: { '2025-01': 100000 },
};
function build() {
  return {
    backup: D.exportBackup(state),
    csv: D.exportCsv(state),
    migrated: D.migrateState(state),
    migratedLegacy: D.migrateState(legacy),
  };
}
module.exports = { build };
if (require.main === module) {
  const out = path.join(__dirname, 'freeze-3.3.0.json');
  if (fs.existsSync(out) && !process.argv.includes('--force')) {
    console.error('freeze-3.3.0.json exists; pass --force to overwrite.');
    process.exit(1);
  }
  fs.writeFileSync(
    path.join(__dirname, 'freeze-3.3.0.json'),
    JSON.stringify(build(), null, 2) + '\n',
  );
}
