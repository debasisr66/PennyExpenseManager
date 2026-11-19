# Third-party dependency record

As of 3.3.4, Penny has **no third-party runtime dependencies**. All runtime code is first-party. No package manager or build dependency is required to run Penny. A test checks that no `vendor/` directory or Excel code returns.

## Removed

| Component | Version | Local file | Status |
| --- | --- | --- | --- |
| SheetJS Community Edition | 0.20.3 | `vendor/xlsx-0.20.3.min.js` (SHA-256 `0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939`), license `vendor/SHEETJS-LICENSE` (Apache-2.0) | Removed in 3.3.0 with Excel import and export. Kept here as history. |

Before 3.3.0 the file was self-hosted so the application did not execute third-party CDN code at runtime.

V3.2 adds no external JavaScript dependency: `hindi.js` and `diagnostics.js` are local first-party modules. Docker verification uses Node 22 Alpine, then serves static files from unprivileged Nginx. Resolved base digests are retained in [`tests/evidence/docker-build.txt`](https://github.com/debasisr66/PennyExpenseManager/blob/v3.2/tests/evidence/docker-build.txt) at tag v3.2; no comprehensive fresh CVE scan is claimed.
