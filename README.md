# Penny Expense Manager V3.2 — V3.2 release

Penny is a simple, mobile-friendly personal expense manager. Amounts, budgets, imports and exports use **Indian rupees (INR / ₹)**.

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

### V3.2 review candidate

This source includes Settings, month/all-month expense deletion, double-confirmed reset, ₹1,25,000 defaults, persistent saved tags, guarded undo, safer Hindi drafts and private diagnostics. See [plan.md](plan.md), [design.md](design.md), [TRACEABILITY.md](TRACEABILITY.md), and [V3.2-TEST-RESULTS.md](V3.2-TEST-RESULTS.md). V3.2 publication was approved on 19 October 2026. See [release notes](RELEASE-NOTES-v3.2.md) for changes, verification and known limits.

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
6. **Move your data.** Export expenses to CSV or Excel. Excel also carries budgets. Import CSV, `.xlsx` or a Penny JSON backup only after reviewing a preview. An undo snapshot is kept for imports.
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

- CSV: expenses only, with formula-leading cells protected.
- Excel `.xlsx`: expenses and budgets; formulas, hyperlinks, macros and external links are rejected.
- JSON: complete Penny backup, including expenses and budgets.
- Limits: 32 MB input, 10,000 expenses and 10,000 budgets. XLSX parsing also has expanded archive and worksheet limits.

## Testing and security

- [Test cases](TEST-CASES.md)
- [Test results](TEST-RESULTS.md)
- [OWASP security review](SECURITY-REVIEW.md)
- [Independent adversarial review](ADVERSARIAL-REVIEW.md)

Run the automated suite with Node.js 22 or later:

```sh
node --test tests/*.test.cjs
```

Run the local browser test harness with `node tests/serve-tests.cjs`, then open `http://127.0.0.1:8767/voice-harness`. The test route uses simulated speech and disposable in-memory files. The normal app never loads these fixtures.

The current release passed 189 automated tests, including 100 structured Hindi and 100 structured Spanish expense phrases, 37 browser acceptance checks, JavaScript syntax checks and an independent adversarial review. Real microphone/provider accuracy and actual filesystem permission or disk-full conditions still require checks on the target hardware. This is targeted review evidence, not a security certification.

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
- `voice.js`, `translation.js`: speech lifecycle and English draft translation
- `spreadsheet.js`, `import-worker.js`: bounded Excel processing
- `vendor/`: self-hosted SheetJS CE 0.20.3 and its license
- `tests/`: automated tests, browser fixtures and recorded results

GitHub Pages serves `main` from the repository root. The project is licensed under [Apache 2.0](LICENSE).


## Run and verify V3.2 locally

From this source folder:

```sh
python3 -m http.server 8769 --bind 127.0.0.1
# Open http://127.0.0.1:8769/
node --test tests/*.test.cjs
```

For Docker, install/start Docker Desktop, then run `./scripts/penny --start`; use `./scripts/penny --stop` to stop it. The script resolves its project folder relative to itself, or accepts a `PENNY_DIR` override. It uses port 8080 and the existing Penny container name: stop another local Penny container before using it. Do not replace an installed V3.1 launcher until you choose to switch versions.

The review build is tested separately on loopback port 8082, preserving the existing 8080 instance. Browser data is isolated by origin/port; use a full JSON backup to transfer records deliberately. CSV carries expenses only. Excel and JSON include budgets, saved tags and preferences; imported preferences require opt-in. Diagnostics never travel with financial backups.

Prebuilt GHCR images are not part of this app release. Docker is verified as a local source build; the registry and multi-platform publishing specification remains separate work.

Deployment verified: [v3.2 publication record](DEPLOYMENT-VERIFICATION-v3.2.md). All 13 public runtime files matched the release source; GitHub CI and Pages succeeded.
