# Changelog

## V3.2 — 2026-10-19

- Published source/tag `fff33cc` and verified GitHub CI, Pages, 13 public runtime hashes and the anonymous source download. Post-deployment evidence is in DEPLOYMENT-VERIFICATION-v3.2.md.

- Fixed Hindi-mode `spend rs.50 on donation` not filling Amount: support prefix Rs./INR notation and explicit monetary corrections in the English draft. Added 23 regression checks; full suite now 633 passing. Included in V3.2.

- Implemented Settings, scoped deletion with impact preview, two-stage reset, persistent tag catalogue and ₹1,25,000 factory/default budget.
- Added transactional bulk-change recovery with revision-guarded undo; reset disconnects linked files without overwriting them.
- Added error-only diagnostics, temporary debug, safe session/action identifiers, bounded retention, reviewed export and epoch-based clear/reset.
- Added a structured Hindi expense parser; fixed grouped-amount suffix corruption, unsafe qualifiers, multiple monetary spans, negation and partial paise amounts. Unsupported financial language stays unresolved.
- Added source-edit approval invalidation and field-aware correction. Tightened Spanish grouping/source-validation safeguards and preserved multiple recognised items.
- Updated schema-4 JSON/Excel portability, optional preference import, responsive dialogs and relative-path start/stop script.
- Executed automated regression/corpus tests and independent adversarial review. See [V3.2 test results](V3.2-TEST-RESULTS.md) for evidence and remaining device/language/usability gates. Owner approved publication on 19 October 2026.

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

Earlier V3 functionality includes INR expenses, budgets and charts, search and tags, payment methods, browser storage, and CSV/Excel/JSON portability. See the README and test evidence for the current feature set.
