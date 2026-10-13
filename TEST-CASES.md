# Penny V3 test cases

Date: 13 October 2026. These tests apply to the repository snapshot published as V3.

## Automated suites

Run `node --test tests/*.test.cjs` from the repository root.

| Area | Coverage |
| --- | --- |
| Expense core | INR validation, date/category/description rules, totals, budgets, chart data and migration |
| Search | tags, rail aliases, AND/OR, exclusions, phrases, fuzzy words, dates, months, min/max and malformed input |
| Payment methods | UPI, cards, cash, bank transfer, wallet, reserved tags and legacy conflicts |
| CSV/JSON | quoted and Unicode fields, formula protection, limits, round trips, duplicates and atomic validation |
| Excel | genuine XLSX round trips, budgets, date serials, limits, ZIP preflight and hostile workbook rejection |
| Storage | first run, IndexedDB-compatible revision checks, conflicts, import undo, linked-file changes and failures |
| Voice/translation | English parsing, Hindi/Spanish drafts, locale numbers, rails, foreign-currency warnings and cancellations |
| Adversarial | oversized valid data, injection-shaped data, prototype keys, malformed imports and concurrent writes |

## Browser acceptance cases

| ID | Action and expected result |
| --- | --- |
| V3B01 | Open a fresh app. Local database opens and no test link appears in the interface. |
| V3B02–03 | Add a credit-card expense, then edit it to cash. The total changes and only the matching reserved payment tag remains. |
| V3B04–05 | Search and filter by payment method and exclusion. Only matching rows appear; monthly totals remain unchanged. |
| V3B06 | Refresh. Expense edits and payment tags remain. |
| V3B07–11 | Preview CSV and Excel imports, skip duplicates, require replace confirmation, apply an import, then undo it. No preview mutates data. |
| V3B12–14 | Export CSV, genuine XLSX and JSON. Each downloads and can be parsed back into the expected records. |
| V3B15–20 | Simulate Hindi, Spanish, cancellation, incomplete translation, ambiguous `कल` and denied microphone permission. A reviewed English draft is required and keyboard entry remains available. |
| V3B21–22 | Import mixed valid/invalid CSV and formula-bearing XLSX. Each is rejected wholly with a safe message. |
| V3B23–24 | Remove disposable QA records and test an exceeded budget. Sample total and budget are restored afterward. |
| V3B25 | At 390×844, dashboard, filters, entry and data dialogs have no page overflow and remain usable. |
| V3B26 | At 1280×900, dashboard, list, chart, budget and What's New render without page overflow. |
| V3B27 | Deliver “250 Rs spent on groceries” in English voice mode. Amount immediately becomes ₹250.00, category becomes Food & groceries and description becomes groceries without a second draft-acceptance action. |
| V3B28 | At 390×844 with browser speech recognition unavailable, open **Use phone keyboard microphone**, enter the dictated phrase and prepare it. The same amount/category/description fields populate without page overflow. |

## Manual release checks

1. Open the hosted URL in a private window and confirm the sample total is ₹13,338.50 and budget is ₹18,000.
2. Add, edit and delete a disposable expense; confirm deletion asks first.
3. Download a JSON backup. Import it in another browser profile and review the preview before applying it.
4. Test a real microphone in English, Hindi and Spanish on each supported device. Check every English draft, amount, date and payment method before saving.
5. Request a live currency rate and confirm its date. Disconnect the network and confirm a manual rate can still be used.
6. Test the optional connected JSON file in a supporting browser. Change that file externally and confirm Penny refuses to overwrite it.

Do not put personal or financial records into the test fixtures committed to GitHub.
