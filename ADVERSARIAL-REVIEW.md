# Penny V3 independent adversarial review

Date: 13 October 2026. Scope: implementation in the repository root, modules plus browser integration code inspected; no publishing performed by this reviewer. Independent tests: `tests/adversarial.test.cjs`, run with `node --test tests/adversarial.test.cjs`.

## Final disposition

**No remaining release-blocking finding in the reviewed scope.** Independent final run: **35 tests passed, 0 failed**, approximately 10.8 seconds. All three initial P2 regressions pass after implementation fixes. No concrete P1 vulnerability was identified. Browser acceptance/mobile checks and real-device limitations remain separate from this module review.

## Initial findings (resolved)

The first independent snapshot run had 25 tests, 22 passed and 3 failed. The findings below describe that original implementation; fixes and evidence are recorded at the end.

### P2 — app produces backups and CSV files it cannot import

`data.js` admits 10,000 expenses, 100-character descriptions and twelve 32-character tags. A valid maximum ASCII state exports JSON of 8,258,999 bytes and CSV of 5,728,975 bytes, exceeding its own 5 MB import limit. A valid Hindi version exports JSON of 17,658,999 bytes and CSV of 15,128,975 bytes. Export succeeds but restore fails. Linked-file connect can also write such an oversized file, then its next save refuses the file and disconnects it. Browser storage clearing after downloading the apparently valid backup risks loss of the full data set.

Fix: ensure every admitted stored state can export/import through its portable backup format. Count UTF-8 bytes, distinguish uncompressed text limits from XLSX compressed ZIP limits, and bound generated backups before writing a linked file. Raising JSON/CSV limit to a sufficiently bounded value or consistently limiting admitted state size are both valid designs.

### P2 — Spanish numeric thousands silently becomes a fractional expense

`translation.js` fallback accepts `Gasté 1.500 rupias en comida hoy` as complete English `spent 1.500 rupees on food today`. `core.js` parses ₹1.50 without warning. In Spanish, the period is commonly a thousands separator, so ₹1,500 is the expected interpretation (or ambiguous numeric format must require correction). The resulting amount differs by 1,000× despite translation claiming completeness.

Fix: normalize locale numeric grouping and decimal separators before constructing the English draft; reject/flag ambiguous forms rather than guessing silently. Add regression tests for Spanish grouped and decimal amounts, including `1.500,50` and `250,50`.

### P2 — normal Hindi voice phrase drops payment rail

The app's advertised Hindi construction `मैंने आज किराने पर दो सौ पचास रुपये खर्च किए यूपीआई से` translates to `i today groceries on two hundred fifty rupees spent upi by`, marked complete. `app.js` rail extraction recognizes `by upi`, not `upi by`, so produces `unspecified` and no `#upi`. The amount is correctly ₹250, but the ordinary advertised input loses an expressly supplied field and the English draft is grammatically fragmented.

Fix: normalize common Hindi postpositions into English rail phrases before parsing, or support both word orders with an explicit English draft. Exercise UPI, credit/debit card, cash and bank transfer phrases.

## Additional voice observations

`Gasté doscientos cincuenta coma cincuenta rupias en comida hoy` becomes incomplete `spent two hundred fifty coma fifty rupees...` but the parser silently extracts only the final fifty as ₹50; the original means ₹250.50. Likewise `Gasté 250 dólares...` becomes incomplete `spent 250 dólares...` and the parser accepts ₹250. `app.js` blocks uncorrected Hindi characters when applying drafts but does not block uncorrected Spanish words. A checkbox alone permits accepting the warned incomplete draft without editing it. A strong fix either parses these common terms correctly or requires explicit correction of untranslated terms before numeric extraction. At a minimum, partial/foreign-currency ambiguity must not produce an apparently unambiguous amount without a warning.

`ढाई सौ` is marked complete but translates to `two point five hundred`; the parser correctly refuses this number and displays an amount warning. This is limited vocabulary coverage rather than silent incorrect storage.

## Independent passing evidence

- CSV quoted commas, embedded newlines, quotes, apostrophes, accents/Hindi and formula-like descriptions roundtrip exactly; formula-leading description cells are prefixed with an apostrophe on export.
- XLSX text, numeric paise, custom/reserved tags and monthly budgets roundtrip; formulas and hyperlinks are rejected.
- Malformed CSV, duplicate headers, bad dates/amounts, extra columns, unsupported schema/currency and mixed valid/invalid row sets are rejected before a partial import state exists.
- Prototype-shaped budgets are rejected and do not pollute global prototypes. Hostile ID/description strings remain literal data in module roundtrip; reviewed DOM interpolation escapes dynamic values.
- Duplicate import is idempotent. Conflicting IDs abort merge without overwriting existing records.
- Rail/tag consistency enforces one rail; conflicting older tag records are preserved and flagged for review rather than silently destroyed.
- Search AND/OR, exclusion, rail filters, date/amount combinations and query length/error limits work in tested cases. Search does not alter underlying monthly totals.
- ZIP preflight rejects invalid/non-XLSX archives, trailing bytes and file limits. Forged central-directory expanded lengths pass preflight but SheetJS rejects mismatched inflated lengths; no confirmed bypass was demonstrated. Worker isolation and a five-second terminate timeout provide an additional operational bound. Final ZIP limits are 32 MB compressed input and 64 MB expanded aggregate/individual part; the final roundtrip tests cover a large legitimate workbook within these bounds.
- Datastore compare-and-swap rejects stale concurrent save; simulated quota failure does not claim a successful local save.
- External changes to linked files are left intact, the local save remains available, and the link is detached with an explicit warning.
- Simulated linked-file disk/close failure preserves the local database copy and the old file content; connecting an existing different JSON file rejects without modifying it.
- Imports retain an undo snapshot. Negative and explicit English foreign-currency voice inputs do not generate a valid INR amount.

## OWASP edition and scope

The official current release is [OWASP Top 10:2025](https://top10.owasp.org/2025/), as confirmed by the [OWASP project page](https://owasp.org/www-project-top-ten/). This is the edition applicable to review in 2026; no separate 2026 edition is claimed.

This client-only app has no server account/authorization system. A01/A07 server access-control and authentication tests therefore have limited applicability. Reviewed controls include restricted local network destinations and self-hosted script CSP (A02), vendored spreadsheet dependency and worker boundary (A03), explicit plain-file handling (A04), DOM escaping/spreadsheet formula mitigation (A05), import confirmation and voice approval design (A06), full schema validation/CAS/undo (A08), visible failure messages without finance telemetry (A09), and exceptional storage/import conditions (A10). The size/voice findings primarily concern A06/A08/A10.

## Verification limits

This review used deterministic module tests and source inspection. It did not test a physical microphone, speech-provider accuracy, browser on-device translation availability, actual Excel UI execution, actual filesystem full/permission dialogs or mobile screen layout. File failures were simulated. Browser/microphone/UI evidence must be provided separately and labeled accurately. A passing set of tests is targeted evidence, not an OWASP certification or comprehensive penetration test.

## Fix verification

All three initial P2 findings were independently retested against the revised implementation and now pass:

1. JSON/CSV imports use a 32 MB UTF-8 byte cap with bounded 10,000 expenses and 10,000 budgets. Large ASCII and Hindi states successfully roundtrip. A 10,000-row Hindi fixture with full-size descriptions and twelve full-size tags exports JSON over 16 MiB and successfully re-imports via JSON and CSV; XLSX export/read also returns the exact complete state. Linked-file connect checks output byte length before writing. XLSX exporter runs archive preflight on its own output.
2. Spanish `1.500` yields ₹1,500. `1.500,50`, `250,50`, and `doscientos cincuenta coma cincuenta` yield ₹1,500.50, ₹250.50 and ₹250.50 respectively. Spanish dólares/euros/pesos/libras produce explicit INR conversion warnings and a null amount. Unrecognized `quince` decimal wording stays incomplete and does not invent a valid amount.
3. Hindi ordinary expense wording produces a canonical English draft with `via upi`; UPI, cash, credit card, debit card and bank transfer payment examples are preserved and amounts remain ₹250. The `कल` date remains explicitly ambiguous in app integration and requires manual date selection.
4. Source review verifies incomplete fallback drafts cannot be applied by checking the acceptance box alone; they require changing the English draft. Draft edits uncheck acceptance. This requires an actual user correction/review; it is not a general-language validation or translation guarantee.

Command: `node --test tests/adversarial.test.cjs`.
Final totals: 35 tests, 35 passes, 0 failures, 0 skipped.

Reviewed snapshot SHA-256:

| File | SHA-256 |
| --- | --- |
| data.js | 1935a2dc47cda26b258bf5006a6abc298bd832c9df4e038a03a4fee298442bcc |
| storage.js | 2625478e1d3f65b6e40387e9eba1b1dc9346355a46709958f17a5c801c27995d |
| spreadsheet.js | 8afa3874ff9aa222d5a38294b15385f88d133e24b09477fb9f1da29aa303364b |
| translation.js | 86836837eeda64bc5938cb9e49c971b1c430a3a62b95391ef0ef409960ebc93d |
| core.js | cafe98d853b0841a259627fb27cd8965f2323a9b565c67440ba1f29047bad4bb |
| voice.js | 80ff14d1fb9a3b76ab9ed96daa95084681edaae7e850f1f323f733c874527f3e |
| app.js | 39ad99af428044595e37515015bcac340645a40bf77afe8cb9cff6462dd76e05 |
| index.html | 54d756194f55be7a9005b52b39b63166f74b12321d1d778d1e3068e93873b649 |

Final frozen-snapshot re-review added five independent regression cases. All pass: native Spanish translator input receives normalized numeric text and mismatched translated amounts are marked incomplete; Unicode-hidden/fullwidth CSV formula prefixes are protected and preserve validated text; foreign currency symbols produce no INR amount; `Sheet1` workbooks with Excel serial dates import correctly while Excel's bogus 1900 leap day rejects; and notification failures after successful save do not misreport persistence failure. Source inspection additionally confirms `from`/`through` payment phrases, early refusal to load inside a frame, a visible fallback-without-tab-lock warning, and correct disposal of stale asynchronously prepared translators.

No publishing was performed by this reviewer.
