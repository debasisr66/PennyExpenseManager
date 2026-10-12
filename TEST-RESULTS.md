# Penny V2 verification results

Verified on **12 October 2026 (India time)**, before the V2 GitHub update.

## Result summary

- **89 automated checks passed; 0 failed, skipped, or cancelled.** Node.js v25.2.1; test sources and TAP output are included.
- **29 browser checks passed.** The normal app was exercised through browser UI; voice integration and rate failure/race paths used the clearly labeled test harness.
- INR throughout expenses, budgets and charts; live INR/USD conversion returned **1 INR = 0.01037 USD**, dated **2026-10-12**. The 1000 INR check displayed **$10.37** and left expenses unchanged.
- Responsive layouts checked at **390×844** and **1280×900**. Summary-card overflow found during QA was corrected; final page widths matched both tested viewports.
- Test-created expense was deleted and the normal sample budget restored after checking.

## Browser checks

| ID | Result | Check |
| --- | --- | --- |
| B01 | PASS | Fresh sample total, budget and chart use INR |
| B02 | PASS | Combined tags filter the list without changing monthly summary |
| B03 | PASS | Natural amount filter with text |
| B04 | PASS | Search empty state |
| B05 | PASS | Keyboard is the default; voice panel is closed |
| B06 | PASS | Keyboard add extracts inline hashtags, deduplicates tags and updates total |
| B07 | PASS | Inline tag addition |
| B08 | PASS | Inline tag removal |
| B09 | PASS | Editing an expense preserves tags and updates INR totals |
| B10 | PASS | Expense edits and tags persist after refresh |
| B11 | PASS | Budget exceeding warning uses the correct INR difference |
| B12 | PASS | Delete cancellation preserves the record; confirmation removes it and restores total |
| B13 | PASS | Month change isolates chart, total and budget while retaining all list records |
| B14 | PASS | Whitespace-only description is rejected |
| B15 | PASS | Voice panel opens only on request, explains audio handling and does not start capture |
| B16 | PASS | Returning to keyboard closes voice UI without saving a draft |
| B17 | PASS | Live INR/USD reference rate returned and conversion left expense total unchanged |
| B18 | PASS | Manual conversion from foreign currency to INR |
| B19 | PASS | Same-currency conversion uses rate 1 without network request |
| B20 | PASS | Invalid search filter has an explanation |
| B21 | PASS | What’s New is present with V2 features |
| B22 | PASS | Simulated final speech fills amount/date/category/description/tags and never auto-saves |
| B23 | PASS | Simulated permission denial preserves keyboard entry |
| B24 | PASS | Closing the expense dialog cancels speech; a late event cannot save |
| B25 | PASS | Network-rate failure explains fallback; a manual rate still converts |
| B26 | PASS | Malformed rate response is rejected and does not replace a valid manual rate |
| B27 | PASS | A delayed old-currency response cannot overwrite the new manual rate |
| B28 | PASS | 390px mobile layout has no page overflow after summary-card correction |
| B29 | PASS | 1280px desktop layout has no page overflow |

## Automated coverage

The suite checks integer paise precision, invalid amounts, real dates and leap years, tags/Unicode/duplicate limits, inline hashtag extraction, expense validation, V1 migration without data loss, V2 persistence format, corrupt records, monthly totals, category sums, budget boundaries, 20 search scenarios plus invalid syntax, spoken amounts/date/category/tag parsing, missing and negative voice amounts, foreign currency handling, conversion math, exchange-rate payload validation, speech service startup, final/interim results, permission and service errors, cancellation, and late event protection.

Speech lifecycle tests use a fake recognition service. Browser voice integration uses `tests/browser-fixtures.js`, loaded only by `/voice-harness` on the test server. No audio was captured or transmitted during these tests. Currency failure, malformed-response and delayed-response cases also use controlled fixtures. The normal app's successful rate request was checked against the actual service.

## Verification limits and remaining manual acceptance

- **Actual microphone capture, transcription accuracy, browser/OS permission prompts, and provider connectivity have not been exercised on the user's device.** V10 and V11 in TEST-CASES.md remain manual acceptance checks. Simulated speech integration and error handling passed, but these are not substitutes for a real-device speech check.
- Voice availability varies by browser/platform; keyboard entry is the supported fallback.
- Local `file:` opening was not browser-automated because the browser tool permits HTTP and HTTPS. Local HTTP preview was verified.
- Hosted asset delivery is checked separately after the GitHub push. A successful local result is not described as a completed deployment.

## Reproduce

```sh
node --test tests/*.test.cjs
node tests/serve-tests.cjs
```

The second command starts a loopback-only test server. Use `/` for the normal app and `/voice-harness` for simulated speech and rate failures. Results: `tests/results.tap` and `tests/browser-results.json`.
