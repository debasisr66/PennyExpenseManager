# Penny Expense Manager V3

Penny is a simple, mobile-friendly personal expense manager. Amounts, budgets, imports and exports use **Indian rupees (INR / ₹)**.

## Open the app

- Find **Penny** in the [Studio product hub](https://github.com/debasisr66/studio), the shared entry point for the product collection. Studio lists Penny and surfaces available release notes, source links and downloads.
- [Use the hosted app](https://debasisr66.github.io/PennyExpenseManager/)
- Or download this repository and run `python3 -m http.server 8767`, then open `http://127.0.0.1:8767/`

The app starts with fictional sample records only when no saved Penny database exists. The sample October total is ₹13,338.50 against a ₹18,000 budget.

## Studio hub integration

Penny is part of Studio's hub-and-product structure: Studio is the place to discover products and their updates, while this repository contains Penny's application, tests and documentation. Penny is registered as a featured Productivity product in Studio's [`content/products.json`](https://github.com/debasisr66/studio/blob/main/content/products.json).

To use Penny through the hub, open Studio, find Penny in **Products**, and follow the available product or release link. The current hub offers **View on GitHub** or **Source**, plus **Download** when a release is available. The [hosted Penny app](https://debasisr66.github.io/PennyExpenseManager/) can also be opened directly. For the local Docker setup on this Mac, use `penny --start`; Studio's product listing does not start a local container.

Penny's [`Notify studio hub` workflow](https://github.com/debasisr66/PennyExpenseManager/blob/main/.github/workflows/notify-studio.yml) sends a `product-updated` event to `debasisr66/studio` when a release is published or when `README.md` or `CHANGELOG.md` changes on `main`. It can also be run manually. Dispatch requires the repository's `STUDIO_DISPATCH_TOKEN` secret to be configured with access to the Studio repository. Studio reads public repository and release metadata to refresh its product information; the notification workflow being present does not by itself confirm a successful refresh.

Expense records remain in Penny's browser storage. Studio's metadata refresh does not synchronize personal expenses. When switching between hosted and local Penny, use JSON export/import if you need to move records between those separate browser origins.

See [CHANGELOG.md](CHANGELOG.md) for the product and integration history.

## Features in simple English

### V3.2 planning documents

V3.2 is planned, not released. Its design preserves the familiar V3.1 interface while adding safer scoped deletion/reset, essential Settings, Hindi voice corrections and local diagnostics. Read the [implementation plan](plan.md), [architecture and UI design](design.md), [requirement traceability](TRACEABILITY.md), [functional/UI test specification](V3.2-TEST-CASES.md) and [event-log test specification](EVENT-LOG-TEST-CASES.md). Planned cases do not represent executed test results.

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
