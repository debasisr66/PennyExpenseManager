# Penny V3 security review

Reviewed: 13 October 2026. The current official web application edition is [OWASP Top 10:2025](https://top10.owasp.org/2025/); it is the edition applied to this 2026 review. No separate OWASP web Top 10:2026 edition is claimed.

## Scope and result

Penny is a static, client-side application with no user accounts, server database or privileged API. Review covered source, browser behavior, local storage, voice drafts, search, imports, exports and the vendored spreadsheet library. No release-blocking finding remained after fixes. This is a targeted engineering review, not an OWASP certification or comprehensive penetration test.

| OWASP Top 10:2025 area | Applicability and evidence |
| --- | --- |
| A01 Broken Access Control | Limited applicability: there are no accounts, roles or server resources. The app refuses framed execution before reading the datastore. |
| A02 Security Misconfiguration | CSP limits scripts/workers to self, connections to self and the exchange-rate host, blocks objects and bases, and sends no referrer. GitHub Pages supplies HTTPS. |
| A03 Software Supply Chain Failures | SheetJS CE 0.20.3 is self-hosted with its Apache 2.0 license and recorded SHA-256; there is no runtime CDN dependency. |
| A04 Cryptographic Failures | No credentials are collected. The UI and README state that browser data and exported files are not encrypted. Users should protect backup locations. |
| A05 Injection | Dynamic HTML is escaped. CSV formula prefixes, including hidden/fullwidth variants, are neutralized. XLSX formulas, hyperlinks, macros and external links are rejected. |
| A06 Insecure Design | Imports require a preview and explicit apply; replacements require an extra confirmation and keep an undo copy. Voice requires an English draft review and separate save. |
| A07 Authentication Failures | Not applicable: the app has no authentication. Shared-device protection depends on the browser/OS profile. |
| A08 Software or Data Integrity Failures | Schema, currency, row, field, size and archive limits are enforced. Duplicate/conflicting IDs are handled safely. Datastore writes use revision checks. |
| A09 Security Logging and Alerting Failures | Local storage/import failures are visible without transmitting financial telemetry. There is no remote audit log because there is no backend. |
| A10 Mishandling of Exceptional Conditions | Tests cover malformed files, worker timeout, quota/write/close failures, external linked-file changes, stale tabs and notification errors. |

## Boundary controls

- CSV/JSON inputs are limited to 32 MB and 10,000 records; spreadsheet archives are checked before inflation and parsed in a worker with a five-second timeout.
- Imported currency must be INR. Foreign-currency voice phrases create a warning and no valid INR amount.
- The local datastore keeps a revision token so stale tabs cannot silently overwrite a newer save. If browser locking is unavailable, the interface advises using one tab and regular backups.
- A connected file is compared before each write. External changes detach the link and remain untouched while the local database save is retained.
- The exchange-rate request contains the currency pair only. Saved expenses are not sent to that service.

## Remaining risks

Anyone with access to the same unlocked browser profile or an unencrypted exported file can read the records. Browser speech services may send audio to their provider. Translation and recognition can be inaccurate, so every voice draft and final form must be checked. Browser extensions or a compromised device remain outside this app's protection. Dependency updates should repeat the supply-chain, import and regression reviews.

See [ADVERSARIAL-REVIEW.md](ADVERSARIAL-REVIEW.md) for independent findings and [TEST-RESULTS.md](TEST-RESULTS.md) for release evidence.
