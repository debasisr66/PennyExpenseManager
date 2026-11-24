# Changelog

## V3.3.7 — 2026-11-24 (built; awaiting owner live check and publish)

- **Voice never saves a guess.** A voice fill no longer defaults the category to "Other": if none was heard the category stays empty, the list shows "Choose a category" and Save is refused with "Choose a category." This also covers a Hindi draft the user edited. Filler descriptions (`expense`, `an expense`, `something`, `it`, `the`, `of`, `stuff`, `things`, `misc`, and a leading "an amount on") are cleared and Save is refused with "Describe the expense." Untranslated Spanish words no longer become the description. If no date was heard the date is today (not the 1st of the month being browsed) and the status says so. Typed descriptions are never touched.
- **Hindi and Spanish voice is labelled assisted.** The language list reads "(assisted)"; one caution line (shown only for Hindi and Spanish) replaces the old iPhone note, and a collapsed "Tips for speaking" block (44 px target) sits under it. The What's New, README and this file use the same wording.
- **Failure ladder.** A quiet end (nothing captured) now counts as a failure: it is logged and opens the keyboard microphone block. A second failure in a row adds "Voice is not working well right now. Type or use your keyboard microphone." and, for Hindi and Spanish, opens the Tips. A success resets the count. Today's first-error fallback is unchanged.
- **Diagnostics.** `VOICE_CAPTURE_FAILED` carries one new field, `reason`, from a fixed list of 13 values (`no-speech`, `not-allowed`, `service-not-allowed`, `audio-capture`, `network`, `aborted`, `language-not-supported`, `start-timeout`, `stuck`, `could-not-start`, `stop-failed`, `no-capture`, `other`). Anything else is dropped. No transcript, audio or free text.
- **Already safe, now proven:** an amount of 0, 0.00, negative, blank or unreadable is refused on every path (form, `validateExpense`, CSV, JSON, `store.save`). Guard tests V01-V03.
- Tests: 861 pass (844 existing unedited, 17 new in `tests/voice-guard.test.cjs`). Schema 4, CSV and JSON formats, F02, `detect`, `detectMarked`, the CSP, the deploy lists and `validateExpense` are unchanged. See [the spec](docs/specs/VOICE-GUARD-3.3.7-SPEC.md).
- **Not covered:** the phone's speech service still mishears or fails; the phone's 2nd and 3rd guesses are not used (3.3.8 idea); the 3.3.6 carry-overs stay deferred. No real-phone check yet: the owner's four-phrase live check is the gate.

## V3.3.6 — 2026-11-23

- **Fix: "कम" no longer blocks amounts.** The words that make an amount uncertain (कम, लगभग, नहीं, करीब and similar) now match as whole words, plus their inflected forms, so "कमरे का किराया 5000 रुपये" and "कमल कवन हज़ार रुपी" fill ₹5,000 and ₹1,000. "कम से कम 500 रुपये", "लगभग 500 रुपये" and "500 नहीं 600" still leave the amount empty.
- **Spoken rupee forms:** रुपी, रूपी, रुपीज and रुपीस (and Latin `rupee`, `rupiya`) read as rupees. **Neutral words:** एडवांस, बिल, पेमेंट, बकाया and किस्त are known, add to the description ("maid advance") and set no category.
- **Phone review:** after a Hindi or Spanish draft the review block scrolls into view (also on iPhone, where Date keeps focus), **Correct heard words** looks like a button, the keyboard microphone block collapses while speech works, and the status uses plain sentences ("Amount not clear. Tap Correct heard words, or type the amount below.").
- **Measurement only:** the phone is asked for 3 guesses (`maxAlternatives = 3`); only the first is used. Two new debug-log codes, `VOICE_ALTERNATIVES` and `VOICE_END`, record numbers only (guesses returned, words captured, duration). No transcript is logged.
- Tests: 844 pass (new `tests/hindi-voice.test.cjs`, real-phrase set `tests/hindi-real.json`). Schema 4, CSV and JSON formats, F02, `detect`, the CSP and the deploy lists are unchanged. See [the spec](docs/specs/HINDI-VOICE-3.3.6-SPEC.md).
- **Not covered:** the phone's own speech service still mishears or returns nothing at times (the owner saw three capture failures in a row on 24 November). Other substring checks in `hindi.js`, "रुपी 1000" and Latin "about" are deferred. See [the 3.3.7 spec](docs/specs/VOICE-GUARD-3.3.7-SPEC.md).

## V3.3.5 — 2026-11-20

- **New: mobile-first pass (CSS only).** On screens up to 700 px wide, buttons, Edit, Delete, tag chips and expandable headings are at least 44 px; checkbox and radio boxes are 24 px; adjacent targets have 4 px between them; the 9 and 10 px text is 11 px. Stat tiles and the converter wrap, so 200% text no longer scrolls sideways at 320 px. One appended block in `styles.css`; no change to `app.js`, markup, data, schema 4, CSV and JSON formats, the CSP or the deploy list. See [the spec](docs/specs/MOBILE-FIRST-3.3.5-SPEC.md).
- **Layout changes on phones at normal text size:** stat tiles go from 3 across to 2 + 1 at about 375-412 px and one per row at 360 px and below; at 320 px an average expense card is about 290 px tall (was 256) because tags wrap one per line.
- **Not covered:** landscape phones (812 × 375) keep the old small controls (Edit 38 px); this needs a follow-up. No real-phone, iOS Simulator or VoiceOver check was run; text scaling was script-based. The owner phone smoke test (B-MB10) is still due.
- Tests: 800 pass (new `tests/mobile.test.cjs`; `tests/mobile-audit.js` is a browser audit script, not deployed). `TC-TH-M01` now finds the 3.3.3 phone block by its marker.

## V3.3.4 — 2026-11-19

- **New categories: Utilities and Staff salary.** The list has 9 names, with the two new ones before "Other"; the form still starts on "Food & groceries". Both import and export through CSV and JSON with no format change. A backup that uses a new category does not import into 3.3.3 or older. Past entries are not moved: to move a bill, edit its last entry's category (a bill marked recurring under Housing becomes a new bill when logged under Utilities, and the old one shows "Stopped?" then hides). See [the spec, section 11](docs/specs/THEME-TOGGLE-3.3.3-SPEC.md).
- **Voice.** English: electricity, water, gas, utilities, broadband, wifi, internet, recharge and DTH map to Utilities (they left Housing); salary, maid, cook, driver, nanny and staff map to Staff salary. These two rules run last, so "taxi driver" and "staff lunch" keep their older category. Hindi keywords were added the same way; 20 Hindi-corpus phrases (15 Devanagari and 5 Hinglish) now expect Utilities instead of Housing. Spanish keywords were added in `translation.js` and produce the English draft that `core.js` then categorises. The Hindi entries added to `translation.js` are not reached (Hindi drafts use `hindi.js`).
- **Chart.** Tokens `--cat-7` and `--cat-8` for the new categories, checked for contrast in both themes (light `#4f6fa8` and `#a8506e`, dark `#9DB4E8` and `#E89BB5`). "Other" keeps its grey.
- **Fix (PR #23, best effort):** confirming Discard in the expense dialog no longer re-opens the dialog only to close it again. It was reported to leave the page zoomed on a phone. It could not be reproduced in a desktop browser, so it is not verified on a phone.
- Tests: 792 pass. Schema 4, CSV and JSON formats, the F02 and detect goldens and the CSP are unchanged.

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
