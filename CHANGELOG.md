# Changelog

## V3.3.3 — 2026-11-19

- **New: dark and light theme.** The ◐ button in the header cycles System (default), Light and Dark. System follows the phone or computer setting live with no script. The choice is one `localStorage` key, `penny-theme`, on this device only: it is not in the expense data, backups, CSV, JSON or schema 4. A new `theme.js` in `<head>` applies a saved choice before first paint and sets the browser bar colour (`theme-color`). The CSP is unchanged. See [the spec](docs/specs/THEME-TOGGLE-3.3.3-SPEC.md).
- **Tokens and contrast.** Every colour in `styles.css` is now a custom property, with one light block and two identical dark blocks. The dark neutrals are Studio's (commit `8faaf62`); Penny keeps its green. Four existing light-theme gaps were fixed: focus ring, input borders, six chart colours and the "+ Tag" text. Tests cover contrast in both themes, tag chips in 360 hue steps and the light values.
- **Mobile first.** The phone header is two rows (about 111 px at 320–412 px, was 181 px at 320 px) with a 44 × 44 px theme button. Form fields are 16 px on phones, so iPhone Safari no longer zooms on focus. Hover rules apply only where the device can hover. Edit, Delete and chip targets are unchanged and move to 3.3.5.
- **Studio lineage.** The footer has a "Part of Studio" link with the Studio mark, opening the hub in a new tab.
- **Deploy lists.** `theme.js` joins the Dockerfile and both places in `pages.yml`. The version is 3.3.3.

## V3.3.2 — 2026-11-19

- **New: recurring bills.** Tick "Recurring bill" in the expense form and choose "Repeats every" 1, 2, 3 or 12 months. The sidebar panel is now "Bills". "Your recurring bills" shows Paid, Due soon, Overdue or “Stopped?” for the current month, found by the new `detectMarked` in `recurring.js`. "Looks recurring" stays below it for bills Penny noticed but you have not marked.
- **No new storage.** A marked bill carries the tags `recurring` and, for 2, 3 or 12 months, `every-N-months`. The form is the only writer: it strips these tags from anything typed and rebuilds them on save. They show as one locked label in the list and cannot be removed or added as separate tags. Search `#recurring` to find them. CSV, JSON and schema 4 are unchanged.
- **Sample data:** the sample Rent rows are marked as recurring. The sample still has 24 expenses.

## V3.3.1 — 2026-11-18

- **New: "Looks recurring" panel.** A read-only sidebar list of the bills you pay every month, found from your own entries by the new `recurring.js`. Strict rules: the same expense at about the same amount (within 10%) and day in at least 4 of the last 6 months, once a month. It shows the usual amount, usual day and evidence, and "paid this month". Nothing is saved, changed or sent, and no data format changes.
- **Sample data:** the sample (first visit and Reset) now includes past-month entries for Rent, Train pass and a music subscription, so the panel works on first visit. The sample now has 24 expenses; this month's total is unchanged.
- **Version note:** 3.3.1 is deliberately a patch number. It is the first step of a recurring-bills arc that rolls up to 3.4 (decision D6). See [the spec](docs/specs/RECURRING-DETECTOR-SPEC.md).

## V3.3.0 — 2026-11-17

- **Removed: Excel import and export.** The Export Excel button and `.xlsx` import are gone, along with the SheetJS library, `spreadsheet.js` and `import-worker.js`. Use CSV, which Excel opens directly, or the full JSON backup. Budgets, saved tags and preferences travel only in JSON, so download a JSON backup if you relied on Excel for them. To convert an old `.xlsx` file: in Excel, use File › Save As › CSV, then import the CSV. Choosing a `.xlsx` file now shows a message that explains this.
- **Security:** the Content Security Policy now sets `worker-src 'none'` (page and nginx header). Penny has no third-party runtime code. See [the spec](docs/specs/REMOVE-EXCEL-SPEC.md).
- **Fix:** a CSV import, or a JSON file from before schema 4 that has no preferences, could reset your default monthly budget and voice language if the "Import preferences and default budget" box was ticked. The box is now disabled, with a short note, for files that carry no preferences.
- Docker is unchanged apart from the shorter runtime file list.

## V3.2.1 — 2026-11-17

- Source formatting only; no behaviour change. Runtime JavaScript, CSS and HTML are now formatted with Prettier 3.3.3 (`.prettierrc.json`). Proofs: identical JavaScript syntax trees for every file, identical computed styles, text and layout for every element in the page and all 10 dialogs at 320 px and 1280 px, and the unchanged test suite passing. See [the spec](docs/specs/SOURCE-FORMATTING-SPEC.md).
- The app version now lives in `VERSION`, checked by `tests/version.test.cjs`.
- Documentation trimmed to `README.md`, `CHANGELOG.md`, `SECURITY-REVIEW.md`, `DEPENDENCIES.md` and `docs/ARCHITECTURE.md`; v3.2 records remain at tag `v3.2`.

## V3.2 — 2026-10-19

- Published source/tag `fff33cc` and verified GitHub CI, Pages, 13 public runtime hashes and the anonymous source download. Post-deployment evidence is in [DEPLOYMENT-VERIFICATION-v3.2.md](https://github.com/debasisr66/PennyExpenseManager/blob/49365a40073df01b6ca41b158044e39c3567e516/DEPLOYMENT-VERIFICATION-v3.2.md).

- Fixed Hindi-mode `spend rs.50 on donation` not filling Amount: support prefix Rs./INR notation and explicit monetary corrections in the English draft. Added 23 regression checks; full suite now 633 passing. Included in V3.2.

- Implemented Settings, scoped deletion with impact preview, two-stage reset, persistent tag catalogue and ₹1,25,000 factory/default budget.
- Added transactional bulk-change recovery with revision-guarded undo; reset disconnects linked files without overwriting them.
- Added error-only diagnostics, temporary debug, safe session/action identifiers, bounded retention, reviewed export and epoch-based clear/reset.
- Added a structured Hindi expense parser; fixed grouped-amount suffix corruption, unsafe qualifiers, multiple monetary spans, negation and partial paise amounts. Unsupported financial language stays unresolved.
- Added source-edit approval invalidation and field-aware correction. Tightened Spanish grouping/source-validation safeguards and preserved multiple recognised items.
- Updated schema-4 JSON/Excel portability, optional preference import, responsive dialogs and relative-path start/stop script.
- Executed automated regression/corpus tests and independent adversarial review. See [V3.2 test results](https://github.com/debasisr66/PennyExpenseManager/blob/49365a40073df01b6ca41b158044e39c3567e516/V3.2-TEST-RESULTS.md) for evidence and remaining device/language/usability gates. Owner approved publication on 19 October 2026.

## V3.2 planning documentation — 2026-10-19

- Added the implementation plan and target design for scoped expense deletion, double-confirmed reset, ₹1,25,000 default budget, saved tags and essential Settings.
- Made Hindi voice financial-integrity fixes release-blocking and specified expanded reviewed-language and target-device tests.
- Specified local error-only logging, temporary debug sessions, privacy limits and reset/clear integration.
- Added mobile/web HCI continuity requirements, functional/UI acceptance cases, detailed logging cases and requirement-to-artifact traceability.
- Preserve V3.1's familiar dashboard and task paths. This entry publishes planning documents only; no V3.2 runtime feature or test pass is claimed.

## 2026-10-16 — Studio hub integration documentation

### Added

- Documented Penny's integration with the Studio product hub and its featured Productivity listing.
- Explained Studio's product, source, release and download entry points alongside direct access to the hosted Penny app.
- Documented the existing `Notify studio hub` workflow: published releases and README/changelog changes on `main` request a Studio metadata refresh using the `product-updated` event.
- Explained the dispatch-token requirement, the separate local `penny --start` flow and the browser-storage boundary between hosted and local use.

This entry records the integration documentation update, not a new application binary release. Notification delivery and Studio refresh were not rerun as part of this documentation change.

## 3.1.0 — 2026-10-14

### Added and improved

- On-device Hindi and Spanish expense parsing creates an English draft after a transcript is captured.
- Common INR amounts, dates, categories and payment methods are recognized; unfamiliar words require correction and approval.
- Clearer messages distinguish captured text, incomplete vocabulary and a ready draft.
- Updated What's New and release documentation.

### Verification

- 189 automated tests passed, including coverage of 100 structured Hindi and 100 structured Spanish phrases.
- 37 recorded browser acceptance checks. Physical microphone accuracy remains device- and browser-dependent.

## 3.0.2 — 2026-10-13

### Fixed

- Repeated mobile voice attempts use fresh sessions, retain useful partial transcripts and recover from stalled or failed recognition.
- Hindi and Spanish drafts continue to require review before applying expense fields.

## 3.0.1 — 2026-10-13

### Improved

- Mobile voice entry and the phone-keyboard dictation fallback.
- Header access to What's New through a dialog.

Earlier V3 functionality includes INR expenses, budgets and charts, search and tags, payment methods, browser storage, and CSV/Excel/JSON portability. See the README for the current feature set.
