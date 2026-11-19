> **3.3.3 (19 November 2026):** one new first-party script, `theme.js`, allowed by the existing `script-src 'self'`; the CSP is byte-identical in `index.html` and `nginx.conf` (pinned by test). It reads and writes one non-sensitive `localStorage` key, `penny-theme`, sets the `data-theme` attribute and the `theme-color` meta tags, and uses no `innerHTML`, `eval`, `fetch` or `document.write` (test TC-TH-S03). It never throws if storage is blocked. One outbound link (footer, "Part of Studio") opens only on click, in a new tab with `rel="noopener noreferrer"` and no referrer. No network calls, no schema change and no third-party code.
>
> **3.3.2 (19 November 2026):** no new surface. Recurring bills use the existing tags field. There are no network calls, no new storage, no schema change and no third-party code. The CSP is unchanged and the Bills panel renders with `textContent`.
>
> **3.3.1 (18 November 2026):** no new surface. The "Looks recurring" panel adds no network calls, no storage writes and no third-party code; the CSP is unchanged and the panel renders with `textContent`.
>
> **3.3.0 update (17 November 2026):** Excel `.xlsx` import and export and the vendored SheetJS library were removed. Penny now contains no third-party runtime code and creates no web workers. Rows below marked "3.3.0" replace the earlier wording; the rest of this review is historical.

> V3.2 release update: 633 automated tests pass locally and in Docker. [Current results](https://github.com/debasisr66/PennyExpenseManager/blob/49365a40073df01b6ca41b158044e39c3567e516/V3.2-TEST-RESULTS.md) and [release notes](https://github.com/debasisr66/PennyExpenseManager/blob/v3.2/RELEASE-NOTES-v3.2.md) distinguish completed checks from remaining device, language, accessibility and image-publication work. Historical evidence below is preserved.

> Historical V3/V3.1 evidence below. V3.2 evidence and limitations: [V3.2-TEST-RESULTS.md](https://github.com/debasisr66/PennyExpenseManager/blob/49365a40073df01b6ca41b158044e39c3567e516/V3.2-TEST-RESULTS.md).

# Penny V3 security review

Reviewed: 13 October 2026. The current official web application edition is [OWASP Top 10:2025](https://top10.owasp.org/2025/); it is the edition applied to this 2026 review. No separate OWASP web Top 10:2026 edition is claimed.

## Scope and result

Penny is a static, client-side application with no user accounts, server database or privileged API. Review covered source, browser behavior, local storage, voice drafts, search, imports and exports. (At review time this included the vendored spreadsheet library, removed in 3.3.0.) No release-blocking finding remained after fixes. This is a targeted engineering review, not an OWASP certification or comprehensive penetration test.

| OWASP Top 10:2025 area | Applicability and evidence |
| --- | --- |
| A01 Broken Access Control | Limited applicability: there are no accounts, roles or server resources. The app refuses framed execution before reading the datastore. |
| A02 Security Misconfiguration | 3.3.0: CSP limits scripts to self and sets `worker-src 'none'` (in both the page and the nginx header; a test enforces this), limits connections to self and the exchange-rate host, blocks objects and bases, and sends no referrer. GitHub Pages supplies HTTPS. |
| A03 Software Supply Chain Failures | 3.3.0: Penny has no third-party runtime code. SheetJS CE 0.20.3, the only third-party component, was removed together with Excel import and export. There is no runtime CDN dependency and no vendored code. |
| A04 Cryptographic Failures | No credentials are collected. The UI and README state that browser data and exported files are not encrypted. Users should protect backup locations. |
| A05 Injection | Dynamic HTML is escaped. CSV formula prefixes, including hidden/fullwidth variants, are neutralized. 3.3.0: Excel files are no longer accepted, so spreadsheet-specific parsing risks no longer apply. |
| A06 Insecure Design | Imports require a preview and explicit apply; replacements require an extra confirmation and keep an undo copy. Voice requires an English draft review and separate save. |
| A07 Authentication Failures | Not applicable: the app has no authentication. Shared-device protection depends on the browser/OS profile. |
| A08 Software or Data Integrity Failures | Schema, currency, row, field and size limits are enforced. Duplicate/conflicting IDs are handled safely. Datastore writes use revision checks. |
| A09 Security Logging and Alerting Failures | Local storage/import failures are visible without transmitting financial telemetry. There is no remote audit log because there is no backend. |
| A10 Mishandling of Exceptional Conditions | Tests cover malformed files, quota/write/close failures, external linked-file changes, stale tabs and notification errors. |

## Boundary controls

- CSV/JSON inputs are limited to 32 MB and 10,000 records. (3.3.0: the spreadsheet archive and worker limits no longer exist because Excel import was removed.)
- Imported currency must be INR. Foreign-currency voice phrases create a warning and no valid INR amount.
- The local datastore keeps a revision token so stale tabs cannot silently overwrite a newer save. If browser locking is unavailable, the interface advises using one tab and regular backups.
- A connected file is compared before each write. External changes detach the link and remain untouched while the local database save is retained.
- The exchange-rate request contains the currency pair only. Saved expenses are not sent to that service.

## Remaining risks

Anyone with access to the same unlocked browser profile or an unencrypted exported file can read the records. Browser speech services may send audio to their provider. Translation and recognition can be inaccurate, so every voice draft and final form must be checked. Browser extensions or a compromised device remain outside this app's protection. Any future dependency should repeat the supply-chain, import and regression reviews.

See [ADVERSARIAL-REVIEW.md](https://github.com/debasisr66/PennyExpenseManager/blob/v3.2/ADVERSARIAL-REVIEW.md) for independent findings and [TEST-RESULTS.md](https://github.com/debasisr66/PennyExpenseManager/blob/v3.2/TEST-RESULTS.md) for release evidence.
