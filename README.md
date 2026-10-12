# PennyExpenseManager — V2

A simple, mobile-friendly personal expense manager. All expense amounts, budgets and charts use **Indian rupees (INR / ₹)**. No account, installation, dependencies, or build step is required.

## Open the app

- Hosted app: [Penny Expense Manager](https://debasisr66.github.io/PennyExpenseManager/).
- On your computer: download this repository using **Code → Download ZIP**, extract it, and open `index.html`. Keep `styles.css`, `core.js`, `voice.js`, and `app.js` in the same folder.
- Optional local server: `python3 -m http.server 8766`, then open `http://localhost:8766`.

The app starts with sample records only when this browser has no saved Penny data. A fresh V2 sample month totals **₹13,338.50**, against a **₹18,000.00** budget. There is also one previous-month expense of **₹380.00**.

## Features in simple English

1. **Add an expense:** enter its date, amount in rupees, category, and description.
2. **See every expense:** records appear newest first. Edit or delete using the buttons beside each record. Deletion asks for confirmation.
3. **Monthly overview:** select a month to see its total, category chart, and budget. The list still covers every month.
4. **Set your budget:** choose your monthly spending limit. A red warning shows how far you exceed it. A zero budget is supported.
5. **Smart search:** use the bar at the top to search descriptions, categories, tags, dates, and amounts. Combine terms to narrow results. Small spelling mistakes in longer words are tolerated.
6. **Inline tags:** type `Weekly groceries #groceries #family` in the description, or use the Tags field. The saved description becomes `Weekly groceries`, with colored tags underneath. Use **+ Tag** beside an existing expense to add a tag; use **×** to remove one. Click a tag to search it. Existing tags are suggested as you type. Tags are lowercase, deduplicated, and limited to 12 per expense, with 1–32 letters, numbers, underscores or hyphens each.
7. **Optional voice entry:** keyboard entry is the default. Choose **Add expense → Use voice → Start listening**, then say, for example, “Spent 250 rupees on groceries today, tags groceries and family.” Review the draft fields and choose **Save expense** yourself. Spoken amounts such as “two hundred fifty rupees” are supported. Voice never saves automatically. Stop listening, return to the keyboard, or cancel at any time.
8. **Currency conversion bar:** convert between INR, USD, EUR and GBP. Choose the amount, From currency, and Convert to currency, then **Get latest rate**. The date and reference rate are shown. You can enter a manual rate when offline or when the service is unavailable. Estimates never modify expense amounts or budgets.
9. **What’s New:** the app includes an in-app summary of V2 changes and a link to the test cases.

## Search examples

| Search | What it finds |
| --- | --- |
| `#groceries` | Expenses with a matching tag; tag prefixes work too |
| `#groceries #family` | Expenses with both tags |
| `groceries over 500` | Matching descriptions, categories or tags costing more than ₹500 |
| `this month` / `last month` | Expenses dated in that calendar month, relative to today's date |
| `"weekly groceries"` | That phrase |
| `category:transport` | Matching category |
| `min:100 max:500` | Amounts between ₹100 and ₹500, inclusive |
| `month:2026-10` | Expenses in October 2026 |
| `after:2026-10-01 before:2026-10-31` | Expenses in the inclusive date range |

Search filters the list and shows a matching subtotal. Your selected month's overview and budget warning remain based on **all** spending for that month, so a search cannot hide an over-budget warning.

## Data and the V1 upgrade

Data stays in localStorage in the same browser and on the same device. There is no server database or device sync. Clearing browser data removes saved records. Data opened from a local file and data opened from the hosted URL belong to different browser storage locations; the app does not automatically copy between them.

V2 uses the V1 storage key, preserves expense IDs, dates, descriptions, numerical amounts, and budgets, and adds tags without deleting records. **The V1 USD label was incorrect for this use case. Existing numerical amounts are now displayed as INR; no exchange multiplier is applied.** Fresh V2 sample amounts have been updated to rupee examples. Existing users retain their records and totals. Corrupt saved data is left untouched; a warning explains that temporary sample data cannot be saved over it.

## Voice compatibility and privacy

Voice uses the browser's Web Speech API with English (India). Support varies by browser and platform. It can require a microphone, browser permission, HTTPS, and an internet connection. If unsupported, denied, or unavailable, the app explains the problem and keeps keyboard entry available.

Listening starts only after the user selects **Start listening**. The browser's speech provider may process audio on its servers; Penny does not store audio. Transcripts are displayed as drafts and become saved expense text only after the user saves. Speech parsing is a small, local rules-based helper, not a general AI assistant. Foreign currency speech is flagged for manual conversion to INR. [Browser speech documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)

## Exchange rates

The conversion bar fetches daily reference rates from [Frankfurter](https://frankfurter.dev/). Requests include only the currency pair; the amount and all expense data remain in the browser. Requests happen only when you click **Get latest rate**. Rates have a date and are estimates; fees and actual payment rates can differ. Old or malformed responses cannot overwrite a newly selected currency pair or manual rate. There is no API key.

## Tests and verification

- [Test cases and manual instructions](TEST-CASES.md)
- [Verification results and limitations](TEST-RESULTS.md)
- [Automated TAP output](tests/results.tap)
- [Browser check results](tests/browser-results.json)

Run the dependency-free automated suite with Node.js 22 or newer:

```sh
node --test tests/*.test.cjs
```

For browser tests with simulated speech and network failures:

```sh
node tests/serve-tests.cjs
```

Open `http://127.0.0.1:8767/voice-harness`. This test route loads a fake speech service and clearly labeled test controls; it does not capture audio. The normal app does not load these fixtures.

The automated suite, browser CRUD/search/tag/budget checks, live conversion, simulated voice integration, network-failure handling, and mobile/desktop layouts were verified. **Real microphone capture and speech-provider accuracy require a manual check on your target browser/device; they are not claimed as verified.**

## Project files

- `index.html`: app structure
- `styles.css`: responsive layout and colors
- `core.js`: validation, search, tags, migration, voice draft parsing, and conversion math
- `voice.js`: speech lifecycle and error handling
- `app.js`: browser interactions, storage, and rate requests
- `tests/`: runnable tests, browser fixtures, and recorded results

GitHub Pages serves the repository's `main` branch from `/(root)`. `.nojekyll` keeps the site as plain static files. Existing repository license: [Apache 2.0](LICENSE).
