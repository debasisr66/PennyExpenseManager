# Group F: keep Docker, remove Excel. Impact and plan

Status: **Decisions D1–D5 approved (a) on 17 November 2026. Implemented; pending review.** The owner set the direction on 17 November 2026: keep Docker, remove Excel `.xlsx` import and export, and update everything that refers to them.
Scope: remove the Excel feature and the third-party SheetJS library. CSV and JSON import and export are unchanged. Docker stays.

## Why

SheetJS (`vendor/xlsx-0.20.3.min.js`, 280 KB) is Penny's **only third-party runtime code**. It is larger than all of Penny's own code (about 200 KB). It parses untrusted files, which is the riskiest thing the app does. It needs a web worker, a ZIP pre-flight parser and its own security tests. Removing it:

- leaves Penny with **no third-party runtime dependency**;
- removes 3 runtime files;
- lets the CSP drop worker permission.

Excel can still open Penny's CSV export directly.

## What changes for the user

| Today (3.2.1) | After (3.3.0) |
|---|---|
| Export CSV, **Excel** or JSON | Export CSV or JSON |
| Import CSV, **`.xlsx`** or JSON | Import CSV or JSON. A `.xlsx` file is refused with a clear message (D3) |
| Excel export carries budgets, tags and preferences | JSON backup carries them, as it already does. CSV carries expenses only, as it already does |

There is **no stored-data migration**. Browser data, the optional linked file (always JSON) and JSON backups are unaffected. Only existing `.xlsx` files are affected, because they can no longer be imported (D3).

## Every Excel touchpoint (checked)

| Area | File | Change |
|---|---|---|
| Runtime | `vendor/xlsx-0.20.3.min.js`, `vendor/SHEETJS-LICENSE` | Delete. `vendor/` becomes empty and is removed |
| Runtime | `spreadsheet.js` (workbook read and write, ZIP pre-flight) | Delete |
| Runtime | `import-worker.js` (Excel parse worker) | Delete |
| Runtime | `index.html` | Remove the two `<script>` tags and the **Export Excel** button. Update every label in the text audit below, including What's New (D4). Set the CSP `worker-src` per D1 |
| Runtime | `app.js` (about 40 lines: the `export-excel` handler and the worker import path, around lines 1117–1185) | Remove. `.xlsx` gets a clear refusal (D3) |
| Runtime | `data.js` | **No change.** CSV still uses `protectCell`, `fromRows` and the other shared helpers. Removing the exports that are now unused is out of scope |
| Build | `Dockerfile` | Drop `spreadsheet.js`, `import-worker.js` and the `vendor/` copy from the runtime list. Docker otherwise stays as it is |
| Build | `nginx.conf` | Remove `worker-src` from the CSP header (D1) |
| Build | `.github/workflows/pages.yml` | Drop the same files from the path triggers and the copy step, and remove `cp -R vendor` |
| Tests | see D2 | Remove the Excel-only tests, trim the mixed ones, add guard tests |
| Test fixture | `tests/import-fixtures.js` | Remove the "formula `.xlsx`" browser fixture button. The CSV and JSON fixtures stay |
| Docs | `README.md`, `docs/ARCHITECTURE.md`, `SECURITY-REVIEW.md`, `DEPENDENCIES.md`, `CHANGELOG.md` | Remove the Excel and SheetJS sections. `DEPENDENCIES.md` states that there are no third-party runtime dependencies. `SECURITY-REVIEW.md` A03 (supply chain) is updated to match |
| Config | `.prettierignore` | Drop `vendor/` |
| Version | `VERSION` and its seven copies | 3.3.0 (D4) |

## User-facing text audit (every label, message and dialog checked)

I scanned all visible text and `aria-label`, `title`, `placeholder` and `accept` attributes in `index.html`, and every user-facing string in `app.js`, `data.js` and `storage.js`. The terms searched were CSV, Excel, xlsx, JSON, import, export, backup, download, upload, file, spreadsheet and preferences.

**Must change** (it mentions Excel):

| Where | Today | After |
|---|---|---|
| Data & backups › Export, help text (`index.html:409`) | "All expenses are exported, regardless of your current search. Excel also includes monthly budgets, saved tags and preferences." | "All expenses are exported, regardless of your current search. CSV contains expenses only; the full backup also includes monthly budgets, saved tags and preferences." |
| Data & backups › Export, buttons (`:414–416`) | **Export CSV** · **Export Excel** · **Download full backup** | **Export CSV** · **Download full backup (JSON)** |
| Data & backups › Import, help text (`:421`) | "Choose CSV, Excel (.xlsx), or a Penny JSON backup. …" | "Choose a CSV file or a Penny JSON backup. …" (the rest is unchanged) |
| Import file picker (`:426`) | `accept=".csv,.xlsx,.json"` | `accept=".csv,.json"` |
| Wrong file type message (`app.js:1146`) | "Choose CSV, Excel (.xlsx), or JSON. Legacy .xls and macro-enabled workbooks are not supported." | For `.xlsx` and `.xls`: the D3 message. Otherwise: "Choose a CSV file or a Penny JSON backup." |
| Excel worker messages (`app.js:1159`, `:1166`) | "Safe Excel import needs …", "Excel parsing exceeded …" | Removed together with the worker |
| Excel export toast (`app.js:1124`) | "Excel export downloaded" | Removed |
| What's New (`:506`) | "Take your data with you. Import and export CSV/Excel, plus complete JSON backups." | "Take your data with you. Import and export CSV, plus complete JSON backups." |
| What's New header (`:476–477`) | Badge V3.2.1 (from the version test), with date "19 October 2026", which is stale | Badge V3.3.0 with the release date, and a new first item (D4): "Excel import and export removed. Use CSV, or a full JSON backup, which also carries budgets, tags and preferences. Penny now has no third-party code." |

**Checked; no change needed:**
- **Settings dialog:** only "Data & backups" › **Open data & backups**. It does not mention Excel. The diagnostics labels "Preview export" and "Download diagnostics" are a separate feature.
- **Header button** "Data & backups"; **Portable data file** section ("Connect an empty JSON file …"); **Start fresh** ("Download a full backup first …"); and the reset confirmation text.
- **Import review dialog:** "Review your import", the merge and replace choice, "Use budgets from this file" and "Import records". The budgets checkbox is already disabled when the file has no budgets, which is always the case for CSV.
- **Toasts:** "CSV export downloaded", "Full backup downloaded", "Import saved", and the undo-import messages.
- **CSV parser errors in `data.js`:** they mention only CSV.
- **"Upload" or "download CSV" wording:** Penny never says "upload"; it says **Import** and **Export**. This plan keeps those words. The single change is that the backup button now names its format: **Download full backup (JSON)**.

**Found during the audit: a pre-existing bug (D5).** The import review checkbox **"Import preferences and default budget (optional)"** (`#import-settings`) is enabled for every file, including CSV. CSV carries no preferences. So a CSV import with this box ticked **silently resets** the default monthly budget to ₹1,25,000 and the voice language to English. I confirmed this with `D.planImport` on 3.2.1. Once Excel is gone, JSON is the only file that carries preferences.

Unaffected (checked):
- **Studio:** it reads the release and assets only, and the asset name pattern stays the same.
- **Storage keys and data `schemaVersion`:** unchanged.
- **Voice, Hindi and translation:** unchanged.
- **The version test:** unchanged.
- **`compose.yaml` and `scripts/penny`:** version line only.

## Decisions

- **D1: CSP `worker-src`.** Penny creates no other worker.
  - (a) **Recommended.** Set `worker-src 'none'` in both the meta tag and the nginx header. A test asserts both say so.
  - (b) Drop the directive, so it falls back to `default-src 'self'` and still allows same-origin workers.
  - (c) Leave it as `'self'`.
- **D2: tests.** Removing a feature removes its tests, and the change is explicit, not quiet.
  - (a) **Recommended.** Do three things:
    - **Delete 9 Excel-only tests.** In `adversarial.test.cjs`: XLSX round trip; formulas and hyperlinks rejected; ZIP pre-flight; SheetJS forged metadata; Excel date serials. In `v3.test.cjs`: Excel round trip; formulas not evaluated; date serials and Sheet1; raw script rejected.
    - **Trim 2 mixed tests**, keeping every JSON and CSV assertion unchanged. These are `adversarial` "Maximum Unicode … JSON, CSV and XLSX" and `v32` ACC-10 "JSON and Excel round trip … CSV expenses only". The CSV formula-prefix test stays: it covers CSV.
    - **Add guard tests:**
      - `.xlsx` and `.xls` are refused with the D3 message;
      - no runtime file references `XLSX`, `spreadsheet.js`, `import-worker` or `vendor/`;
      - the CSP in `index.html` and `nginx.conf` has `worker-src 'none'`;
      - the Pages, Docker and HTML runtime file lists agree.

    The PR lists every removed test by name, with the count before and after.
  - (b) Delete only. This is smaller, but nothing stops Excel code from creeping back.
- **D3: existing `.xlsx` files.**
  - (a) **Recommended.** Choosing a `.xlsx` file shows: "Excel files are no longer supported. In Excel, use File › Save As › CSV, or import a Penny JSON backup." The release notes and What's New say the same. The note also tells anyone holding Excel exports to export a **JSON backup** before or after upgrading, because budgets travel only in JSON.
  - (b) As (a), and also keep the hosted 3.2.1 reachable for one-off conversions. This is not possible on Pages without a second deployment, so it is rejected for simplicity.
- **D4: version and What's New.**
  - (a) **Recommended.** Release 3.3.0, a user-visible feature removal. The What's New dialog gets a short 3.3.0 entry: Excel removed, use CSV or JSON, smaller and dependency-free. The release follows the same flow as 3.2.1: merge, deploy, your smoke test, then the release with your go-ahead.
  - (b) 4.0.0, treating the removal as a breaking change.
- **D5: the preferences checkbox on CSV import.** This is the bug found in the text audit.
  - (a) **Recommended.** Disable and untick **"Import preferences and default budget"** when the file is CSV, in the same way the budgets checkbox is already disabled when a file has no budgets. Show the hint "CSV files do not contain preferences." Add a test proving that a CSV import cannot change settings. This is a small behaviour change, so it is listed in the 3.3.0 notes as a fix.
  - (b) Leave it as it is and fix it separately. This keeps 3.3.0 to removal only, but ships with a known data-loss trap on the only remaining non-JSON import.

## Plan (if all (a))

The plan is one PR in four commits, each verified on its own:

1. **Tests first.** Delete and trim the Excel tests and add the guard tests. The guard tests **fail** on the current code, which shows they detect Excel. The kept CSV and JSON assertions pass, unchanged.
2. **Remove Excel.**
   - Delete the runtime files and edit `app.js` and `index.html` as above.
   - Update the CSP, `Dockerfile`, `pages.yml`, the test fixture and `.prettierignore`.
   - All tests pass. Prettier `--check` passes.
3. **Docs.** README, ARCHITECTURE, SECURITY-REVIEW, DEPENDENCIES, and the What's New entry.
4. **Release 3.3.0.** `VERSION` and its copies, plus a CHANGELOG entry.

## Freeze list (a check proves it)

- `core.js`, `data.js`, `storage.js`, `voice.js`, `translation.js`, `hindi.js`, `diagnostics.js` and `styles.css` are byte-identical to `main`.
- The CSV and JSON assertions inside the trimmed tests are unchanged. The proof is a diff that shows only XLSX lines removed.
- `compose.yaml` and `scripts/penny` change only their version lines.
- `notify-studio.yml`, `verify.yml` and `.dockerignore` are unchanged.
- Storage keys, data schema and existing releases and tags are unchanged.

## Test plan

- `node --test tests/*.test.cjs` passes. The PR states the count before and after, and lists the removed tests.
- **Guard tests:** they fail before commit 2 and pass after it.
- **Browser, local:**
  - CSV and JSON export and re-import round trip.
  - The `.xlsx` refusal message appears.
  - No console or CSP errors.
  - Every dialog opens.
  - At both 320 px and 1280 px.
- **`docker build`, then run the container:**
  - The app loads on `127.0.0.1`.
  - `vendor/` and `spreadsheet.js` return 404.
  - The CSP header shows `worker-src 'none'`.
- **Freeze check.**
- **Independent review** on a different model, briefed with the diff.
- **After merge:**
  - Pages deploys.
  - The live runtime files match `main`.
  - `vendor/xlsx-0.20.3.min.js` returns 404 live.
  - The Studio sync succeeds.
- **Your 2-minute smoke test** before the `v3.3.0` release:
  - Add, edit and delete an expense.
  - Export CSV and JSON, then re-import.
  - Choosing a `.xlsx` shows the message.
  - The version shows 3.3.0.

## Not in scope

- Removing `data.js` exports that are now unused (a later cleanup with its own AST and behaviour proof).
- Docker changes beyond the runtime file list.
- CSV format changes.
- Making budgets travel in CSV.
