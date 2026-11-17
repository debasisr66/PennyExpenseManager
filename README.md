# Penny Expense Manager 3.3.0

Penny is a simple, mobile-friendly personal expense manager. Amounts, budgets, imports and exports use **Indian rupees (INR / ₹)**.

**Current release: [3.3.0](https://github.com/debasisr66/PennyExpenseManager/releases/tag/v3.3.0) · 17 November 2026** · [Open the app](https://debasisr66.github.io/PennyExpenseManager/) · [Changelog](CHANGELOG.md)

| Release | What changed |
|---|---|
| **3.3.0** | Excel import and export removed. Penny now runs no third-party code. Use CSV, or a full JSON backup, which also carries budgets, saved tags and preferences. CSV files and older JSON backups can no longer reset preferences on import. The security policy blocks web workers. |
| **3.2.1** | Source formatting only, with no behaviour change. One `VERSION` file. Documentation trimmed; v3.2 records stay at tag `v3.2`. |
| **3.2** | Settings, start fresh and reset, guarded undo, safer Hindi drafts and private diagnostics (details below). |

## Open the app

- Find **Penny** in the [Studio product hub](https://github.com/debasisr66/studio), the shared entry point for the product collection. Studio lists Penny and surfaces available release notes, source links and downloads.
- [Use the hosted app](https://debasisr66.github.io/PennyExpenseManager/)
- Or download this repository and run `python3 -m http.server 8767`, then open `http://127.0.0.1:8767/`

The app starts with fictional sample records only when no saved Penny database exists. The sample current-month total is ₹13,338.50 against a ₹1,25,000 budget. Existing saved budgets are preserved during migration, including zero.

## Studio hub integration

Penny is part of Studio's hub-and-product structure: Studio is the place to discover products and their updates, while this repository contains Penny's application, tests and documentation. Penny is registered as a featured Productivity product in Studio's [`content/products.json`](https://github.com/debasisr66/studio/blob/main/content/products.json).

To use Penny through the hub, open Studio, find Penny in **Products**, and follow the available product or release link. The current hub offers **View on GitHub** or **Source**, plus **Download** when a release is available. The [hosted Penny app](https://debasisr66.github.io/PennyExpenseManager/) can also be opened directly. For the local Docker setup on this Mac, use `penny --start`; Studio's product listing does not start a local container.

Penny's [`Notify studio hub` workflow](https://github.com/debasisr66/PennyExpenseManager/blob/main/.github/workflows/notify-studio.yml) sends a `product-updated` event to `debasisr66/studio` when a release is published or when `README.md` or `CHANGELOG.md` changes on `main`. It can also be run manually. Dispatch requires the repository's `STUDIO_DISPATCH_TOKEN` secret to be configured with access to the Studio repository. Studio reads public repository and release metadata to refresh its product information; the notification workflow being present does not by itself confirm a successful refresh.

Expense records remain in Penny's browser storage. Studio's metadata refresh does not synchronize personal expenses. When switching between hosted and local Penny, use JSON export/import if you need to move records between those separate browser origins.

See [CHANGELOG.md](CHANGELOG.md) for the product and integration history.

## Features in simple English

### Features from V3.2 (still current)

V3.2 added Settings, month/all-month expense deletion, double-confirmed reset, ₹1,25,000 defaults, persistent saved tags, guarded undo, safer Hindi drafts and private diagnostics. See [ARCHITECTURE.md](docs/ARCHITECTURE.md), [TRACEABILITY.md](https://github.com/debasisr66/PennyExpenseManager/blob/v3.2/TRACEABILITY.md), and [V3.2-TEST-RESULTS.md](https://github.com/debasisr66/PennyExpenseManager/blob/49365a40073df01b6ca41b158044e39c3567e516/V3.2-TEST-RESULTS.md). V3.2 publication was approved on 19 October 2026. See [release notes](https://github.com/debasisr66/PennyExpenseManager/blob/v3.2/RELEASE-NOTES-v3.2.md) for changes, verification and known limits.

- **Settings:** change the default budget for unsaved months, find/add saved tags, access backups and review diagnostics.
- **Start fresh:** choose one month (the device's current month initially) or explicitly choose all months. Preview the count and total, then confirm. Budgets and tags stay.
- **Reset Penny:** acknowledge the whole-app impact, then type `RESET PENNY` and confirm again. Restore nine sample expenses and ₹1,25,000 defaults, keep tags, clear logs, stop debug and disconnect the portable file without overwriting it.
- **Undo last bulk change:** Settings can restore the previous financial state until another edit occurs. This does not restore cleared logs or reconnect a file.
- **Voice:** Hindi parsing understands a bounded expense vocabulary, number words, grouped digits and common Hinglish. It is not universal translation. Uncertain amounts/categories/dates/payment methods remain blank for correction; an explicit valid INR amount corrected in the English draft now fills Amount, including `Rs.50`; correct source text and prepare again to invalidate an older approval. Phone dictation capture is handled by the phone keyboard provider.
- **Diagnostics:** errors only by default. Optional debug lasts 30 minutes in this tab. Search codes, sessions or actions; preview before downloading. Logs omit expense data and spoken text. Clearing logs requires a separate confirmation.

Real iPhone capture, native-speaker language review and participant usability acceptance remain unverified and are disclosed release limitations. Automated parsing tests do not prove microphone reliability.

1. **Add, edit and delete expenses.** Record the date, INR amount, category, description, tags and payment method.
2. **See your month clearly.** The cards show monthly spending, budget and money left. The category chart explains where the money went. Penny warns you when the budget is exceeded.
3. **Search quickly.** Search descriptions, categories, amounts, dates, tags and payment methods. Use filters or searches such as `#groceries`, `rail:upi`, `coffee OR tea`, `-rail:cash`, `min:100` and `today`.
4. **Use inline tags.** Put tags such as `#groceries` in a description, or enter them in the Tags field. Tags can be clicked and searched.
5. **Record how you paid.** Choose UPI, credit card, debit card, cash, bank transfer, wallet or another method. Penny adds a matching searchable tag such as `#upi`.
6. **Move your data.** Export expenses to CSV, or download a full JSON backup that also carries budgets, saved tags and preferences. Import CSV or a Penny JSON backup only after reviewing a preview. An undo snapshot is kept for imports. Excel `.xlsx` files are not supported; in Excel use File › Save As › CSV.
7. **Keep a portable copy.** Modern supported browsers can connect an empty JSON file that Penny updates after each save. A full JSON backup works in other browsers.
8. **Use optional voice entry.** Speak English, Hindi or Spanish. Words appear while you speak, and each attempt starts with a clean microphone session. English fills the form immediately for review. Hindi and Spanish use an on-device expense parser for amounts, dates, categories and payment methods, then show a controlled English draft for correction and explicit acceptance. If direct recognition fails, choose **Try voice again** or use the microphone on the phone keyboard in Penny's dictated-text fallback. Voice never saves automatically.
9. **Convert currencies.** The conversion bar estimates INR, USD, EUR and GBP using a requested daily rate or a manual rate. Expense records always remain INR.

## Storage and privacy

Penny is a static, client-side app with no account or server database. Records are stored in IndexedDB in the current browser. A localStorage fallback is used when IndexedDB is unavailable. Clearing site data can remove records, so download backups regularly.

Files and linked JSON copies are plain text and are not encrypted. Do not keep them in a shared location. Voice capture starts only after **Start listening**; the browser's speech service may send audio to its provider. Penny does not store audio. The currency service receives only a currency pair after **Get latest rate** is selected.

## Voice support

Speech recognition availability varies by browser, device and language. Penny recreates the recognition session for every attempt, retains partial speech when a phone omits the final event, and exits stalled sessions so **Try voice again** remains usable. When the browser API is unavailable, **Use phone keyboard microphone** opens a text box where the device keyboard's own dictation can enter the phrase.

After a transcript is captured, Hindi and Spanish parsing works fully offline. Penny's deterministic expense parser recognizes common INR amounts, dates, expense types, tags and payment methods, then creates a controlled English draft. It flags unfamiliar words instead of guessing and requires the user to correct and approve the draft. The browser Translator API may improve wording on supported desktop browsers. This deliberately small parser is for expense phrases, not general-purpose translation; a large neural translation model is not bundled. Ambiguous Hindi `कल` requires the date to be selected manually. Test physical microphone capture and provider accuracy on the intended device before relying on voice entry.

## Data formats

- CSV: expenses only, with formula-leading cells protected. Excel opens it directly.
- JSON: the only format that carries budgets, saved tags and preferences. It is the complete Penny backup.
- Limits: 32 MB input, 10,000 expenses and 10,000 budgets.

## Testing and security

- [OWASP security review](SECURITY-REVIEW.md)
- [Architecture and design](docs/ARCHITECTURE.md)

v3.2 release records (at tag v3.2):

- [Test cases](https://github.com/debasisr66/PennyExpenseManager/blob/v3.2/TEST-CASES.md)
- [Test results](https://github.com/debasisr66/PennyExpenseManager/blob/v3.2/TEST-RESULTS.md)
- [Independent adversarial review](https://github.com/debasisr66/PennyExpenseManager/blob/v3.2/ADVERSARIAL-REVIEW.md)

Run the automated suite with Node.js 22 or later:

```sh
node --test tests/*.test.cjs
```

The app version lives in `VERSION`. To change it, edit that file and run the tests: `tests/version.test.cjs` names every copy that still needs updating. Release headings in this README and `CHANGELOG.md` are edited by hand.

Runtime source is formatted with Prettier 3.3.3 (settings in `.prettierrc.json`; tests are not formatted). To reformat without installing anything: `docker run --rm -v "$PWD":/src -w /src node:22-alpine npx --yes prettier@3.3.3 --write index.html styles.css *.js`.

Run the local browser test harness with `node tests/serve-tests.cjs`, then open `http://127.0.0.1:8767/voice-harness`. The test route uses simulated speech and disposable in-memory files. The normal app never loads these fixtures.

The automated suite includes structured Hindi and Spanish expense phrases; `node --test` prints the current count. Release evidence for v3.2 is in the [v3.2 test results](https://github.com/debasisr66/PennyExpenseManager/blob/49365a40073df01b6ca41b158044e39c3567e516/V3.2-TEST-RESULTS.md). Real microphone/provider accuracy and actual filesystem permission or disk-full conditions still require checks on the target hardware. This is targeted review evidence, not a security certification.

## Docker

Docker Desktop or another Docker-compatible runtime is required. Build and start Penny with:

```sh
penny --start
```

The `penny` command is installed in `~/.local/bin`, which is already on this Mac's command path. Its editable source is `scripts/penny` in this repository. Check or stop Penny with:

```sh
penny --status
penny --stop
```

`penny --start` builds the image, waits for a healthy container and opens `http://localhost:8080/`. Expense data remains in the browser's IndexedDB; rebuilding or removing the container does not move that browser data. Back up data before clearing browser site data. A remote deployment must use HTTPS for dependable microphone access.

## Project files

- `index.html`, `styles.css`, `app.js`: interface and browser behavior
- `core.js`, `data.js`: calculations, validation, search and portable formats
- `storage.js`: local database, import undo and optional linked file
- `voice.js`, `translation.js`, `hindi.js`: speech lifecycle, English draft translation and Hindi parsing
- `diagnostics.js`: on-device diagnostic logs
- `tests/`: automated tests and browser fixtures

GitHub Pages is deployed by `.github/workflows/pages.yml`, which publishes only the runtime files. The project is licensed under [Apache 2.0](LICENSE).


## Run and verify locally

From this source folder:

```sh
python3 -m http.server 8769 --bind 127.0.0.1
# Open http://127.0.0.1:8769/
node --test tests/*.test.cjs
```

For Docker, install/start Docker Desktop, then run `./scripts/penny --start`; use `./scripts/penny --stop` to stop it. The script resolves its project folder relative to itself, or accepts a `PENNY_DIR` override. It uses port 8080 and the existing Penny container name: stop another local Penny container before using it. The `penny` command in `~/.local/bin` is a copy of `scripts/penny`. Copy it again after upgrading so its banner shows the current version.

The review build is tested separately on loopback port 8082, preserving the existing 8080 instance. Browser data is isolated by origin/port; use a full JSON backup to transfer records deliberately. CSV carries expenses only. JSON includes budgets, saved tags and preferences; imported preferences require opt-in and are unavailable for CSV and for JSON files without preferences. Diagnostics never travel with financial backups.

Prebuilt GHCR images are not part of this app release. Docker is verified as a local source build; the registry and multi-platform publishing specification remains separate work.

Deployment verified for 3.3.0: published from commit `ee1dc34`. All 10 public runtime files match `main`, the removed Excel files return 404 and GitHub CI and Pages succeeded. Earlier: [v3.2 publication record](https://github.com/debasisr66/PennyExpenseManager/blob/49365a40073df01b6ca41b158044e39c3567e516/DEPLOYMENT-VERIFICATION-v3.2.md). All 13 public runtime files matched the release source; GitHub CI and Pages succeeded.
