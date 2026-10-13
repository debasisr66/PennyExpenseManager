# Penny Expense Manager V3

Penny is a simple, mobile-friendly personal expense manager. Amounts, budgets, imports and exports use **Indian rupees (INR / ₹)**.

## Open the app

- [Use the hosted app](https://debasisr66.github.io/PennyExpenseManager/)
- Or download this repository and run `python3 -m http.server 8767`, then open `http://127.0.0.1:8767/`

The app starts with fictional sample records only when no saved Penny database exists. The sample October total is ₹13,338.50 against a ₹18,000 budget.

## Features in simple English

1. **Add, edit and delete expenses.** Record the date, INR amount, category, description, tags and payment method.
2. **See your month clearly.** The cards show monthly spending, budget and money left. The category chart explains where the money went. Penny warns you when the budget is exceeded.
3. **Search quickly.** Search descriptions, categories, amounts, dates, tags and payment methods. Use filters or searches such as `#groceries`, `rail:upi`, `coffee OR tea`, `-rail:cash`, `min:100` and `today`.
4. **Use inline tags.** Put tags such as `#groceries` in a description, or enter them in the Tags field. Tags can be clicked and searched.
5. **Record how you paid.** Choose UPI, credit card, debit card, cash, bank transfer, wallet or another method. Penny adds a matching searchable tag such as `#upi`.
6. **Move your data.** Export expenses to CSV or Excel. Excel also carries budgets. Import CSV, `.xlsx` or a Penny JSON backup only after reviewing a preview. An undo snapshot is kept for imports.
7. **Keep a portable copy.** Modern supported browsers can connect an empty JSON file that Penny updates after each save. A full JSON backup works in other browsers.
8. **Use optional voice entry.** Speak English, Hindi or Spanish. English fills the form immediately for review. Hindi and Spanish are shown as an English draft for correction and explicit acceptance. If a mobile browser lacks speech recognition, use the microphone on the phone keyboard in Penny's dictated-text fallback. Voice never saves automatically.
9. **Convert currencies.** The conversion bar estimates INR, USD, EUR and GBP using a requested daily rate or a manual rate. Expense records always remain INR.

## Storage and privacy

Penny is a static, client-side app with no account or server database. Records are stored in IndexedDB in the current browser. A localStorage fallback is used when IndexedDB is unavailable. Clearing site data can remove records, so download backups regularly.

Files and linked JSON copies are plain text and are not encrypted. Do not keep them in a shared location. Voice capture starts only after **Start listening**; the browser's speech service may send audio to its provider. Penny does not store audio. The currency service receives only a currency pair after **Get latest rate** is selected.

## Voice support

Speech recognition availability varies by browser, device and language. When the browser API is unavailable, **Use phone keyboard microphone** opens a text box where the device keyboard's own dictation can enter the phrase. The browser Translator API is used when available; otherwise Penny has a deliberately limited offline expense vocabulary for Hindi and Spanish and flags unknown words for correction. Ambiguous Hindi `कल` requires the date to be selected manually. Test the physical microphone and provider accuracy on the intended device before relying on voice entry.

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

The current release passed 181 automated tests, 31 browser acceptance checks, JavaScript syntax checks and an independent adversarial review. Real microphone/provider accuracy and actual filesystem permission or disk-full conditions still require checks on the target hardware. This is targeted review evidence, not a security certification.

## Project files

- `index.html`, `styles.css`, `app.js`: interface and browser behavior
- `core.js`, `data.js`: calculations, validation, search and portable formats
- `storage.js`: local database, import undo and optional linked file
- `voice.js`, `translation.js`: speech lifecycle and English draft translation
- `spreadsheet.js`, `import-worker.js`: bounded Excel processing
- `vendor/`: self-hosted SheetJS CE 0.20.3 and its license
- `tests/`: automated tests, browser fixtures and recorded results

GitHub Pages serves `main` from the repository root. The project is licensed under [Apache 2.0](LICENSE).
