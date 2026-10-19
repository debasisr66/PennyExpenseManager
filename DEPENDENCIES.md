# Third-party dependency record

| Component | Version | Source | Local file | SHA-256 | License |
| --- | --- | --- | --- | --- | --- |
| SheetJS Community Edition | 0.20.3 | `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js` | `vendor/xlsx-0.20.3.min.js` | `0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939` | Apache-2.0; see `vendor/SHEETJS-LICENSE` |

The file is self-hosted so the application does not execute third-party CDN code at runtime. No package manager or build dependency is required to run Penny.


V3.2 adds no external JavaScript dependency: `hindi.js` and `diagnostics.js` are local first-party modules. Docker verification uses Node 22 Alpine, then serves static files from unprivileged Nginx. Resolved base digests are retained in `tests/evidence/docker-build.txt`; no comprehensive fresh CVE scan is claimed.
