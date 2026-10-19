> V3.2 release update: 633 automated tests pass locally and in Docker. [Current results](V3.2-TEST-RESULTS.md) and [release notes](RELEASE-NOTES-v3.2.md) distinguish completed checks from remaining device, language, accessibility and image-publication work. Historical evidence below is preserved.

> Historical V3/V3.1 evidence below. V3.2 evidence and limitations: [V3.2-TEST-RESULTS.md](V3.2-TEST-RESULTS.md).

# Penny V3 verification results

Verified: 14 October 2026.

## Result

**PASS for publication.** No release-blocking issue remained in the tested scope.

| Check | Result |
| --- | --- |
| Automated Node tests | 189 passed, 0 failed, 0 skipped |
| Independent adversarial subset | 35 passed, 0 failed |
| Browser acceptance | 37 passed |
| JavaScript syntax | 16 first-party and test scripts passed `node --check` |
| Responsive layout | Passed at 390×844 and 1280×900 with no horizontal page overflow |
| Browser console | No application errors in the final local run |
| Export round trip | CSV, XLSX and JSON returned 10 QA records; XLSX/JSON also returned the budget |

The automated TAP log is in [tests/results.tap](tests/results.tap), and the recorded browser checks are in [tests/browser-results.json](tests/browser-results.json).

## Issues found and fixed

The adversarial review initially found three medium-priority data-quality problems: maximum-size exports could exceed the old import cap, Spanish `1.500` could be read as ₹1.50, and an ordinary Hindi UPI word order could lose the payment method. Limits and parsing were corrected, then independently retested. Additional regression checks cover Spanish decimal wording, foreign currencies, Unicode-hidden spreadsheet formulas, Excel dates, cross-tab storage conflicts and linked-file failures.

The V3.0.2 patch fixes the mobile speech lifecycle. Each attempt uses a new recognition session, keeps partial words visible, promotes a useful partial transcript when a phone omits its final speech event, and times out stalled start/listening states. An error or completed attempt leaves a working **Try voice again** action. Browser acceptance covered back-to-back Hindi and Spanish sessions plus a denied-permission recovery attempt. Hindi and Spanish continue to require review and acceptance of the English draft.

V3.1.0 adds deterministic offline expense parsing after speech capture. Automated coverage validates 100 Hindi and 100 Spanish phrases across ten expense types, five payment methods and two natural sentence orders per language. Hindi digits, common spoken amounts, dates, unknown words, foreign currencies and unsafe decimals have dedicated checks. Mobile browser checks confirmed a complete Hindi medicine/credit-card draft, mandatory correction for unfamiliar Spanish vocabulary and the V3.1.0 **What’s New** dialog without overflow.

## Release limits

- Speech capture was tested with deterministic browser fixtures. Physical microphone capture and speech-provider accuracy require manual checks on each target browser/device. Once text is captured, the limited Hindi/Spanish expense parser runs offline and does not depend on a downloadable language pack.
- Filesystem permission revocation and disk-full behavior were simulated; the real browser/operating-system dialogs require device checks.
- Security review is scoped to this static client-side app and its import/export boundaries. It is not a penetration-test certificate.
- Daily exchange rates depend on `api.frankfurter.dev`; manual rates remain available when the service or network is unavailable.

The final browser database was restored to the nine fictional sample records: October total ₹13,338.50, October budget ₹18,000, plus one September expense.
