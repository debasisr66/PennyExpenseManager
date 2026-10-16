# Changelog

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
