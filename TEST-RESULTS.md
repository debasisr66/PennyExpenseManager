# Penny V3 verification results

Verified: 13 October 2026.

## Result

**PASS for publication.** No release-blocking issue remained in the tested scope.

| Check | Result |
| --- | --- |
| Automated Node tests | 184 passed, 0 failed, 0 skipped |
| Independent adversarial subset | 35 passed, 0 failed |
| Browser acceptance | 34 passed |
| JavaScript syntax | 16 first-party and test scripts passed `node --check` |
| Responsive layout | Passed at 390×844 and 1280×900 with no horizontal page overflow |
| Browser console | No application errors in the final local run |
| Export round trip | CSV, XLSX and JSON returned 10 QA records; XLSX/JSON also returned the budget |

The automated TAP log is in [tests/results.tap](tests/results.tap), and the recorded browser checks are in [tests/browser-results.json](tests/browser-results.json).

## Issues found and fixed

The adversarial review initially found three medium-priority data-quality problems: maximum-size exports could exceed the old import cap, Spanish `1.500` could be read as ₹1.50, and an ordinary Hindi UPI word order could lose the payment method. Limits and parsing were corrected, then independently retested. Additional regression checks cover Spanish decimal wording, foreign currencies, Unicode-hidden spreadsheet formulas, Excel dates, cross-tab storage conflicts and linked-file failures.

The V3.0.2 patch fixes the mobile speech lifecycle. Each attempt uses a new recognition session, keeps partial words visible, promotes a useful partial transcript when a phone omits its final speech event, and times out stalled start/listening states. An error or completed attempt leaves a working **Try voice again** action. Browser acceptance covered back-to-back Hindi and Spanish sessions plus a denied-permission recovery attempt. Hindi and Spanish continue to require review and acceptance of the English draft.

## Release limits

- Speech and translation were tested with deterministic browser fixtures. Physical microphone capture, speech-provider accuracy and language-pack availability require manual checks on each target browser/device.
- Filesystem permission revocation and disk-full behavior were simulated; the real browser/operating-system dialogs require device checks.
- Security review is scoped to this static client-side app and its import/export boundaries. It is not a penetration-test certificate.
- Daily exchange rates depend on `api.frankfurter.dev`; manual rates remain available when the service or network is unavailable.

The final browser database was restored to the nine fictional sample records: October total ₹13,338.50, October budget ₹18,000, plus one September expense.
