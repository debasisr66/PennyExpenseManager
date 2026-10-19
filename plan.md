# Penny V3.2 implementation plan

Date: 19 October 2026  
Plan revision: 5 — adds HCI continuity, responsive UI acceptance and artifact traceability  
Target application version: 3.2.0  
Status: Plan only; implementation, destructive operations and publication have not started

## 1. Outcome

**Release priority:** correcting Hindi voice expense understanding is mandatory in V3.2. Do not release Settings/reset improvements while confirmed voice amount corruption remains. This update is planning and diagnosis only; production voice code has not been fixed in this turn. See `design.md` for the proposed architecture and contracts.

Allow a person opening Penny with sample or existing expenses to start fresh by selected month or across all months, and manage the app through a Settings area. Full reset requires two distinct confirmations. All destructive operations preserve saved tags.

| Action | Expenses | Budgets | Saved tags |
| --- | --- | --- | --- |
| Delete selected-month expenses | Remove only expenses in the selected month; current month selected initially | Keep all saved budgets and the default budget setting | Keep all known custom tags and payment tags |
| Delete all month expenses | Remove every expense across all months, only after explicit scope selection | Keep all saved budgets and the default budget setting | Keep all known custom tags and payment tags |
| Reset Penny to defaults | Replace existing expenses with the fictional sample set relative to the current month | Remove saved monthly budgets; restore ₹1,25,000 current-month budget and default monthly budget | Keep all known tags and include default sample tags |

**Interpretation of reset:** restore V3.2 demonstration defaults, including sample expenses and the revised ₹1,25,000 budget. Delete all month expenses is the route to a genuinely empty expense list across all months. Explain this distinction before confirmation.

An empty list must remain empty after refresh or restart. Sample expenses must not reappear merely because there are no records. Neither operation removes tags, uninstalls Penny, clears the browser's site storage wholesale or deletes data in another browser origin/profile.

## 2. User experience

### 2.1 Easy entry point

- Add a clearly labelled **Start fresh** action near the expense-list controls, visually secondary to **Add expense**.
- Add a header **Settings** button with sections for Budget, Tags, Preferences, Data & backups, and Start fresh. Existing budget/data shortcuts can open the relevant Settings section.
- Open a mobile-friendly dialog with two choices: **Delete expenses** and **Reset Penny to defaults**. Month versus all-month scope belongs inside Delete expenses.
- Keep destructive actions outside the normal expense-entry flow. Reuse existing buttons, dialog styles, keyboard support and status messages.

### 2.2 Delete expenses by month or across all months

1. Initially select **Selected month**, with the device's current local calendar month as the default, even if the dashboard is viewing a different month. Provide a labelled month picker so the person can choose another month/year.
2. Offer a separate radio choice **All months**. Do not preselect it or infer it from an empty month. Switching scope or month clears the confirmation checkbox.
3. Show a live impact preview: selected month/year or “all months,” record count, total INR amount and how many records will remain. Searches and filters must not silently narrow this operation. Zero matches disable the action.
4. Say: “Your budgets and saved tags will be kept.”
5. Offer **Download full backup** before the action; explain that the backup includes existing expenses, budgets, saved tags and preferences.
6. Require an initially unchecked, scope-specific confirmation: **Delete expenses for October 2026** (example) or **Delete all month expenses**. The final button repeats that exact scope.
7. Enable the final delete action only after confirmation, a nonzero matching count and storage readiness.
8. Delete only the previewed target records atomically and offer **Undo last data change**. For all months the expense list becomes empty; selected-month deletion leaves all other months untouched.
9. Clear search/filter state and show the selected month after month deletion or the current month after all-month deletion. Display the resulting count and preserved budget/tags.

No multi-month batch selection is needed in V3.2: one selected month or all months keeps the scope simple. Cancel resets selection and confirmation state; reopening starts at the current month again.

If there are no expenses, show “There are no expenses to delete” and disable the delete action. Opening or cancelling a dialog does not change records.

### 2.3 Reset Penny

1. Show exactly what will happen: replace all months' expenses with nine fictional samples, remove saved monthly budgets, restore the current-month and default monthly budget to ₹1,25,000, restore preferences, clear diagnostic logs, return logging to Errors only, and keep saved tags.
2. Explain that eight samples belong to the current month and one to the previous month. Current-month sample total is ₹13,338.50.
3. Offer **Download full backup**.
4. **Confirmation one:** require an unchecked acknowledgement: **I understand this resets Penny across all months, including expenses, budgets and preferences. Saved tags will be kept.** Only then enable **Continue to reset review**. This stage does not write data.
5. **Confirmation two:** show a separate final review screen with the exact counts, ₹1,25,000 budget, samples-restored explanation and retained-tag count. Require the user to type `RESET PENNY`, then explicitly click **Reset entire Penny app**. The phrase field starts empty. Back/cancel clears it; a changed revision invalidates both stages. No reset occurs on the first checkbox, the Continue action or incidental Enter while typing.
6. Save the default state plus the retained tag catalogue; reset transient UI state and return to the current-month overview.
7. Show a success message and offer **Undo last data change**.

Full reset therefore requires two distinct stages of informed confirmation, not two adjacent checkboxes. Keep Cancel visible at both stages, avoid default focus on the destructive button, and never bypass this flow through a keyboard shortcut, alternate entry point or stale event handler.

### 2.4 Reset scope

“Everything” means all Penny expenses, monthly budget overrides, default budget setting, persisted preferences and transient UI choices: active filters/search, current month, conversion inputs, open drafts and active voice work. Restore a ₹1,25,000 default budget, keyboard entry and English as the preferred voice language. Preserve the complete saved tag catalogue, built-in categories/payment methods and application version. Disconnect an optional linked data file on successful full reset; do not overwrite that external file with sample data. Explain that it must be explicitly reconnected if desired. Monthly/all-month expense deletion follows the existing linked-file save behavior.

Browser/OS microphone permissions, downloaded files, Studio settings, Docker installation and other browser origins are outside reset scope. No operation calls `localStorage.clear()` or deletes unrelated site data.

### 2.5 Settings design and boundaries

Settings provides a single discoverable place for existing controls and the new preferences. Use a desktop dialog and mobile full-height panel with section navigation, clear Save/Cancel behavior and unsaved-change handling.

| Section | V3.2 controls | Checks and balances |
| --- | --- | --- |
| Budget | Default monthly budget; selected-month saved budget; remove an explicit month override | INR validation; preview old/new values; never rewrite other months implicitly |
| Tags | Search catalogue, add custom tags, show usage counts and payment-tag meaning | Normalize/deduplicate; bounded catalogue; no permanent catalogue deletion or bulk rename in V3.2 |
| Preferences | Preferred voice language (English/Hindi/Spanish); keyboard remains default entry | Persist language only; never store microphone consent or start recording on Settings save |
| Data & backups | Existing JSON/CSV/Excel import/export, linked-file controls and recovery | Reuse current previews, confirmation and validation; no second competing import implementation |
| Start fresh | Month/all-month deletion and two-stage full reset | Separate destructive section; scoped impact previews and recovery |
| About | App version, What's New and help on local storage | Explain browser-origin limits and backup/recovery retention |
| Diagnostics | Error log, temporary debug toggle, session/action filters, export and clear | Error-only by default; bounded local retention; debug expires; no raw personal content |

INR remains the fixed expense currency. Built-in categories and payment methods remain viewable, predefined choices. Custom categories, custom rails, themes, tag renaming and permanent tag-catalogue deletion are deferred to avoid broad schema and historical-record changes in this release. Settings centralizes supported items; it does not imply every internal constant is editable.

Save settings through the same validated revision-checked state pipeline. A bad field must not partially persist another field. Show errors beside fields, preserve entered values on a failed write, and report success only after persistence.

### 2.6 Budget default and migration

- Factory default is **₹1,25,000.00**, stored as **12,500,000 integer paise**. Never interpret `125000` as paise.
- First launch seeds the current month with this budget. Full reset restores the same current-month entry and default preference.
- Migration must preserve every existing explicitly saved monthly budget, including zero and the old ₹18,000 sample value; it must not guess which value the person edited.
- A month without an explicit override uses the configurable default. Label it **Default budget**; saving a monthly value creates a month-specific override labelled **Saved budget**.
- Changing the default affects only months without an override. Preview this before saving. Removing an override returns that month to the default, with an explicit old/new-value explanation.
- Treat zero as a valid saved budget, not a missing value. Removing a monthly override returns to the default. V3.2 does not add a separate “No budget” preference or treat zero as disabled; this keeps the warning behavior unambiguous.
- Export/import, chart warnings, remaining-to-spend calculations and period labels must resolve budgets through one shared function so Settings and the dashboard agree.
- Current-month sample total remains ₹13,338.50. With the new factory budget, remaining-to-spend is ₹1,11,661.50; recompute displayed percentage from actual values.

## 3. Current findings and technical impacts

<a id="voice"></a>
### 3.0 Critical voice workstream

#### Findings reproduced during plan preparation

These are local parser spot checks against the current V3.1 implementation, not physical-microphone tests. Expected amounts come from the phrases; observed outputs were produced by `PennyTranslation.fallback`.

| Input or variation | Expected | Observed | Priority |
| --- | --- | --- | --- |
| `मैंने आज किराने पर 1,250 रुपये खर्च किए यूपीआई से` | ₹1,250 | ₹250, marked complete | Release blocker: silent amount corruption |
| `आज किराने पर साढ़े तीन सौ रुपये नकद दिए` | ₹350 | ₹300; unfamiliar `साढ़े` flagged | Release blocker: unsafe numeric candidate even with correction flag |
| `आज किराने पर डेढ़ हजार रुपये दिए` | ₹1,500 | Amount unresolved; `डेढ़` flagged | Required common-phrase coverage |
| `मैंने आज सब्ज़ियाँ खरीदने में ढाई सौ रुपये खर्च किये` | ₹250, produce, natural wording | Amount recovered, but `सब्ज़ियाँ`, `खरीदने`, `किये` flagged | Required language-variant coverage |
| `aaj doodh par 250 rupaye kharch kiye upi se` | ₹250, milk, UPI | Amount/type unresolved | Required bounded Romanized/Hinglish support |
| `आज 250 रुपये का दूध और फल खरीदा` | Description retains milk and fruit | Only fruit retained, marked complete | Semantic coverage: do not silently drop items |

The existing 100 Hindi phrase checks are generated from ten item names, five rails and two sentence templates, with mostly digit amounts. They do not establish recognition of all Hindi words, dialects, natural number expressions or mobile speech accuracy. Existing category checks are broad rather than exact for every phrase.

#### Required behavior

- Treat capture, transcript correction, expense understanding and draft approval as separate stages with distinct messages.
- Expand Hindi vocabulary by expense intent, phrase variants, inflections, spelling/nukta forms and reviewed Romanized/Hinglish aliases. Do not attempt a general-purpose translation engine or claim “all Hindi words” coverage.
- Correct amount parsing first: grouped Western/Indian numerals, Devanagari digits, paise, Hindi number words and common forms such as डेढ़, ढाई, सवा, साढ़े and पौने. Support only verified compositions; unresolved numeric spans produce no numeric candidate.
- Never extract a valid-looking suffix from an invalid larger amount. `1,250` must become 1250, never 250; `1,25,000` must become 125000. Malformed grouping must be rejected rather than partly matched.
- Preserve the full original transcript for side-by-side review and allow the user to correct it in Hindi before reprocessing. Regenerating invalidates previous approval.
- Preserve merchant names, item lists and unknown meaningful words. Show unresolved source spans separately; do not erase them when generating fluent English.
- A known field may remain usable while another is unresolved, but unresolved amount/date fields must remain blank and highlighted. No parser/model may silently invent a default amount, category or payment rail.
- Hindi/Spanish drafts require review; ambiguous/missing financial fields require explicit correction. Editing any field or source text invalidates approval for that draft revision. Voice never saves automatically.
- Browser Translator API is an optional wording aid with a bounded timeout. It must not override canonical financial facts or bypass uncertainty merely because the local parser is incomplete. Translation rejection/timeout falls back to the deterministic parser with a clear status.
- Keep Hindi expense parsing offline after text capture. Speech capture may still require the browser/keyboard provider; label capture network failure separately from parser coverage gaps. No new cloud translation API, API keys or embedded neural model in V3.2.
- Retain Spanish and English regression coverage and all repeat-session/cancel/reset behavior. Avoid improving Hindi by breaking existing languages.

#### Required voice validation

Create a versioned, manually reviewed corpus with expected amount-in-paise, date resolution, payment rail, category, description terms, unknown spans and expected review state. Keep generated combinatorial cases as extra coverage, not substitutes for varied examples.

- At least 250 distinct Hindi cases: at least 150 natural Devanagari phrases, 50 Romanized/Hinglish phrases and 50 ambiguous, unsupported or hostile phrases. Count genuinely distinct utterances, not cosmetic whitespace variants.
- Separately enumerate vocabulary, number, spelling and sentence-order coverage. Include ordinary groceries, bills, rent, medical, transport, education/fees and subscriptions; map unsupported categories to an explicit user choice rather than inventing categories.
- Cover Hindi integers 0–99 at the number primitive level, hundreds/thousands/lakh composition, grouped digits, decimals/paise, approximate numbers, corrections, multiple amounts, dates mistaken for money, refunds/negation and mixed currencies.
- Add exact field assertions for category/rail/date/description preservation, not just “some category exists.” Use held-out examples authored separately from parser rules to avoid teaching to the tests.
- Required regression amounts: ₹250, ₹350, ₹1,250, ₹1,500 and ₹1,25,000. An unresolved financial expression must return an explicit unresolved result, never a partial numeric guess.
- Browser tests must exercise draft edits, source correction, native Translator success/failure/mismatch, timeout, keyboard dictation, partial capture, repeated attempts, cancellation, switching languages and reset during processing.
- Physical iPhone 13 Chrome acceptance: record exact tested iOS/browser versions and language settings; perform at least 20 planned Hindi utterances over two sessions, including ten repeated attempts in one open expense dialog, and a permission/retry cycle. Report capture failures separately from parser failures. Use Safari as a comparison where available, not as a substitute for the user's Chrome path.
- For every captured supported utterance, financial facts must be exact or visibly unresolved. Zero silently accepted amount/date/rail mismatches in the entire corpus or device checks. Zero loss of meaningful unknown source text. Every critical reproduced bug has a named passing regression before release.
- Native-speaker review is required for Hindi phrasing and expected results. Where target-device or reviewer access is unavailable, mark it pending and keep voice sign-off incomplete rather than claiming full verification.

Optional scope reduction must not remove any of this workstream's financial-safety or target-device gates.

### 3.1 Persistent tag catalogue is required

Currently `app.js` derives `known-tags` from `state.expenses.flatMap(x => x.tags)`. There is no independent tag catalogue. `data.js` migration and import planning construct state with expenses and budgets only. Simply emptying the expense array would therefore violate “Keep the tags.”

Introduce top-level persisted `tagCatalog` and validated `settings` in schema 4, independently of application version 3.2.0. Settings contains `defaultMonthlyBudgetPaise` and `preferredVoiceLanguage`; saved monthly budgets remain in `budgets`. Legacy records migrate with a ₹1,25,000 default setting and English preference while preserving every monthly budget entry.

Rules:

- On migration, collect all tags from existing expenses and union with any valid saved catalogue and built-in payment tags.
- Normalize and deduplicate catalogue entries with the existing tag rules; sort suggestions consistently.
- Keep payment-tag/rail conflict rules on individual expense records unchanged.
- Capture newly created or imported tags into the catalogue in the same state commit as the expense change.
- Removing a tag from one expense removes that association, not the catalogue entry. Settings can add/search catalogue tags; catalogue deletion and rename are deferred.
- Reset unions retained catalogue tags with sample tags. Monthly and all-month deletion preserve the catalogue exactly after normalization.
- Catalogue entries are reusable suggestions; they do not add an expense, affect totals or force a payment method.
- Use a bounded catalogue: propose 5,000 unique tags, with the existing per-tag length/character constraints. Do not reuse the per-expense tag-count limit as a catalogue limit.
- If migration or import would exceed the limit, reject the operation with a clear message and preserve original data; never silently discard saved tags. Confirm this bound against maximum supported datasets before implementation is finalized.

### 3.2 Default state must have one source

Extract the inline sample initialization from `app.js` into a pure default-state factory, taking a local calendar date as input. Use it for first launch and reset so they cannot drift.

- Preserve original amounts, categories, descriptions, payment methods and sample tag associations.
- Compute current and previous months from the device's local date, including year boundaries.
- Give samples predictable, valid unique IDs within the replacement dataset.
- Only use first-run seeding when no saved document exists, not when saved expenses are empty.
- Repeated reset replaces the sample dataset; it must not append duplicates.
- Factory budget is ₹1,25,000 and preferences come from a single factory definition. Never seed over existing monthly budgets during an upgrade.

### 3.3 Storage and recovery

Reuse the existing revision-checked commit pipeline for both operations. Add a dedicated last-data-change recovery snapshot with operation type and timestamp, rather than overwriting the existing import undo record ambiguously.

- Snapshot the full pre-operation state and write the replacement state in one IndexedDB transaction.
- A failed snapshot or replacement write must not report success or partially clear IndexedDB records.
- Keep the existing import backup behavior and identify each recovery action accurately in the UI.
- Persist one most recent delete/reset recovery snapshot across reloads, not an unlimited history.
- Enable destructive-operation undo only while the main document is still at the operation's resulting revision. If a later save/import/edit occurred, disable it with an explanation so undo cannot silently erase newer work.
- Undo itself requires an impact preview and explicit confirmation, and retains the union of current and restored tags.
- A second delete/reset replaces the previous recovery snapshot after explaining that only the latest operation can be undone.
- Store recovery metadata and the backup together; reject corrupt snapshots safely.
- Include catalogue and settings in optional linked JSON writes for normal edits and month/all-month deletions. Full reset disconnects its linked handle after a successful local commit and preserves the external file; the reset summary explains this exception.
- A linked-file update failure after a successful local operation must say “Saved locally; linked file needs attention.” Offer export/reconnect; do not claim the local reset failed.

Fallback adapter limitation: localStorage has no multi-key database transaction. Use a single serialized envelope containing the current document and data-change snapshot for these operations, or an equivalently safe design. Handle quota failure before changing the visible state. Document cross-tab limitations where browser locks are unavailable; do not claim full IndexedDB guarantees in that fallback.

### 3.4 Async and multi-tab behavior

- Disable final action while another save, import or storage initialization is active.
- Cancel active recognition, pending translation and stale voice callbacks after a successful reset; a late result must not reopen or populate a discarded draft.
- Abort pending currency requests and reset conversion controls as part of reset.
- A revision conflict must abort the action, load the newest state and require the user to review and confirm a fresh impact summary. Never automatically retry a destructive action.
- Broadcast successful changes using the existing tab-notification path.
- Display the final committed state only after storage success.
- Cancel/close/escape returns focus to the invoking control and leaves all saved data intact.
- Freeze month/all-month scope, target IDs, impact counts, settings change and expected revision into a validated operation plan. Recheck it at commit. A month change, tab change or revised source state invalidates the corresponding approval; no stale confirmation may authorize a broader operation.
- During reset, pause linked-file propagation before committing and disconnect it on success. If local commit fails, leave the original app data and linked-file relationship intact. Recovery restores application data/settings, not external file permissions automatically.

## 4. Import, export and compatibility

| Surface | V3.2 requirement |
| --- | --- |
| Full JSON backup | Round-trip schema 4 including `tagCatalog`, settings and monthly overrides; recovery history excluded from ordinary portable backup |
| Legacy JSON | Read supported older schemas and derive catalogue from expense tags without reseeding empty lists |
| CSV | Remains expense-only; preserve unused local catalogue entries during imports and explain the limitation |
| Excel | Extend full workbook export with validated Tags and Settings sheets; accept legacy workbooks without them |
| Merge import | Union incoming and current catalogues with imported expense tags |
| Replace import | Replace chosen records/budgets using existing options; retain current catalogue and union incoming tags |
| Linked JSON file | Write schema 4 with catalogue/settings after ordinary commits; full reset explicitly disconnects the file without overwriting it |
| Older Penny | Schema 4 may be refused by V3.1; document that downgrade needs a compatible backup |

New Excel Tags sheet: a single `tag` column, one normalized tag per row; reject formulas, invalid strings, duplicate header columns and oversized catalogues using the same bounded import policy. Do not expose history or personal data beyond the explicit exported content.

New Excel Settings sheet uses `key,value` with an allowlist for default monthly budget and preferred language; record the budget unit explicitly as INR in its key/format and convert it exactly into paise. Reject duplicate/unknown keys, formulas and invalid values. Importing settings is a separate **Import preferences and default budget** opt-in, initially unchecked, shown in the preview. Existing monthly-budget import controls remain separate. Importing a legacy file never resets current preferences implicitly.

## 5. Proposed module impact

| File or area | Change |
| --- | --- |
| `index.html` | Settings navigation, month/all-month choice, two-stage reset confirmations, recovery and V3.2 What's New |
| `styles.css` | Responsive destructive-action styling, readable impact summaries and focus states |
| `app.js` | Settings flows, scoped operation plans, confirmation invalidation, budget resolution, tag suggestions and async cancellation |
| New default-state module or `data.js` | Shared default-state factory; deterministic date input for testing |
| `data.js` | Schema 4 catalogue/settings validation, ₹1,25,000 defaults, month-scoped deletion and JSON/import behavior |
| `storage.js` | Atomic recovery snapshot, revision guard and IndexedDB/fallback migrations |
| `spreadsheet.js` | Tags/Settings sheet export/import with legacy compatibility, allowlists and preview opt-in |
| `import-worker.js` | Carry catalogue from workbook parsing through worker messages |
| `voice.js` | Capture lifecycle regressions, provenance of partial/final text, timeouts and repeat-session/cancel behavior |
| `translation.js` | Hindi normalization/phrase vocabulary, structured field extraction, unknown-span preservation and safe optional Translator use |
| `core.js` or new Hindi parser module | Exact amount primitives, canonical paise/date extraction and shared validation without English/Spanish regressions |
| Voice corpus and browser fixtures | Reviewed natural Hindi/Hinglish cases, exact field assertions and translator-error/device evidence |
| New `diagnostics.js` and log viewer | Structured local events, redaction, correlation, retention, debug lifecycle, export and clear |
| Tests and browser fixtures | Destructive-action scenarios, schema migration, failures, recovery and accessibility |
| Docker allowlist | Copy a new runtime module if introduced; keep built assets and tests consistent |
| Start/stop script and Compose | Update visible app/image version labels; preserve existing paths |

## 6. Nonfunctional requirements and risks

| Requirement or risk | Response |
| --- | --- |
| Accidental data loss | Default to current month; wider deletion explicitly selected; full reset requires two stages, scope summary, typed phrase, backup and guarded undo |
| Tag loss | Independent catalogue persisted through migration, reset, deletion and portable formats |
| False success | Commit state only after successful persistence; distinct linked-file warning |
| Storage limits | Test near-supported-limit snapshot writes and quota failure; preserve data on failure |
| Concurrency | Revision guard and fresh reconfirmation after conflicts |
| Privacy | No telemetry or external notification of expense deletion; browser-origin scope explained |
| Security | Escape tag text, validate schema and file inputs; do not weaken import limits |
| Mobile/accessibility | 390-pixel dialog, keyboard navigation, labelled checkbox, focus restoration, announced result |
| Performance | One bounded state transformation and one main commit, not a loop of per-row deletions |
| Consistency | Default-state factory shared by first run and reset; test clock supplied explicitly |

### Security verification and failure gates

Review against the applicable official OWASP Top 10 version at implementation time; record the actual edition rather than inventing a “2026” standard. This remains a targeted client-side security review, not certification.

| Boundary | Required negative checks | Release-blocking condition |
| --- | --- | --- |
| Destructive action | Call final handler without either reset stage, with unchecked month acknowledgement, changed scope or duplicate click | Any unconfirmed, widened or repeated write |
| State/schema | Unknown settings keys, prototype-shaped objects, invalid dates, non-INR amounts, oversized catalogue | Unsafe coercion, prototype pollution or accepted invalid state |
| UI rendering | HTML/script-shaped tags, descriptions, import names and errors | Any execution or unsafe HTML insertion |
| Storage | Quota failure, snapshot failure, interrupted commit, stale revision, unavailable locks | Data loss, false success or overwritten newer work |
| Recovery | Corrupt snapshot, newer edits after reset, reset after import undo and vice versa | Undo silently erases later data or misidentifies snapshot |
| File boundary | External linked-file change, revoked permission, full reset, malicious Settings/Tags sheets | External overwrite without intended consent or bypassed file limits |
| Async lifecycle | Late speech, translation and currency callbacks during/after reset | Discarded draft reappears or data changes outside the confirmed operation |
| Origin/privacy | Studio/Pages/local access, browser permissions, error reporting | Sending expense data to Studio, logs or unrelated services |
| Dependencies/runtime | Current bundled dependency review, CSP/worker behavior and Docker constraints | New unresolved high-risk regression in changed scope |
| Voice financial integrity | Grouped-number truncation, qualifiers, multiple currencies/amounts, native translation discrepancies | Any silent amount/date/rail substitution or suffix matching |
| Speech/translation privacy | Malicious transcript text, provider error output, diagnostics exports and storage | Script execution, automatic audio upload, transcript retention without consent or leaked personal audio/text |

Do not add remote tracking for Settings actions or resets. Error messages must explain recovery without dumping private records. Security results must include reproducible cases, observed outcome and resolution, with no unresolved data-loss or confirmation-bypass finding at release.

The recovery snapshot deliberately retains old expenses locally until superseded. Explain this: reset/delete-all is a convenience operation with recovery, not a secure erasure feature. Secure deletion and recovery-history management are out of scope.

## 7. Test plan and release acceptance

### Automated coverage

1. Schema 3 to 4 migration preserves amounts, IDs, dates, budgets and every valid tag.
2. Existing empty saved datasets stay empty; no sample reinsertion on reload.
3. Selected-month deletion removes only matching dates; default scope is the current local month. All-month deletion requires a fresh explicit selection and preserves budgets/settings/catalogue.
4. Reset produces the exact current-relative sample set and ₹1,25,000 current-month budget; no old-month overrides remain. The factory default/preferred language are restored; tags remain.
5. Month/year rollover and leap-calendar inputs produce valid default dates.
6. Repeated resets do not duplicate records or catalogue entries.
7. Removing the final expense does not remove its tags from saved suggestions.
8. JSON, Excel and linked JSON round-trip unused catalogue tags; legacy imports remain supported.
9. Catalogue limits, invalid Unicode/HTML-shaped tags, corrupt snapshots and quota failure are handled safely.
10. Failed persistence leaves original data and UI state intact; linked-file failure reports local success accurately.
11. Stale revisions abort destructive changes; undo is rejected after later writes.
12. Recovery survives refresh and restores pre-operation expenses and budgets with tags retained.
13. Late voice/translation/rate results cannot repopulate reset forms.
14. Existing 189-test baseline remains passing; update the actual release test count rather than asserting an old total.
15. Month/year selection includes January rollover, leap dates, an empty month and an app left open across midnight/month rollover. The shown scope remains explicit and frozen; opening a new dialog uses today's month.
16. Changing month, scope, revision or operation clears acknowledgements; neither reset stage alone can write. Exact typed phrase, final button and latest revision are all required.
17. Settings save is atomic; invalid budgets/languages/tags cannot partially update another preference. Changes to default budget do not rewrite explicit month entries, including zero.
18. Default budget is stored as 12,500,000 paise; effective-budget resolution and dashboard warnings distinguish an absent override, explicit zero and any supported unset state.
19. JSON/Excel preferences import requires separate opt-in; old backups retain current settings when preferences are absent. Settings and unused tags round-trip correctly.
20. Reset preserves external linked-file contents and disconnects it only after local success. Failure before commit preserves the original relationship.
21. Execute the critical voice corpus and exact financial-integrity assertions in section 3.0. Treat safety-negative cases as correct only when uncertainty is exposed, not when a plausible English sentence is returned.

### Browser acceptance

- Fresh/sample user can find Start fresh and see clear action differences.
- Month confirmation and first reset acknowledgement start unchecked; reset's final typed phrase starts empty. Cancel, escape and close do nothing.
- The delete dialog opens at the current month, even from another dashboard month. Its preview clearly identifies the month and unaffected months.
- A filtered view never silently changes deletion scope. Switching to All months refreshes counts and clears confirmation.
- Selected-month deletion preserves every other month. All-month deletion produces an empty list and reusable saved tags; budgets and preferences remain.
- Both full-reset stages are exercised separately. Confirming only stage one, going Back, changing state in another tab, or duplicate-clicking cannot reset data.
- Reset restores expected samples and ₹1,25,000 budget, clears transient UI/preferences, disconnects the linked file and keeps custom tags.
- Settings Budget, Tags, Preferences, Data & backups and About sections work with keyboard and on mobile. Unsaved edits are handled explicitly.
- Refresh and a local-container restart retain the result in the same browser origin/profile.
- Backup, undo, second reset, intervening edits, tab conflicts and linked-file errors follow the specified recovery rules.
- Desktop and mobile flows remain usable; no overflow, focus loss or console errors.
- User tests physical voice again after reset to confirm a fresh attempt still works.
- Complete the Hindi device matrix and reviewed corpus in section 3.0; report capture-versus-understanding outcomes separately. Confirm no previously accepted draft can apply after source correction, new capture, language change or reset.

Release gate: all relevant automated and browser checks pass, no unresolved data-loss issue remains, documents match actual behavior and results are recorded for the exact release SHA. Publishing V3.2 is a later explicit release action, not part of this plan.

## 8. Documentation impact and update inventory

All current documentation must be reviewed for V3.2 impact. Update live documents when behavior changes; retain historical release evidence and previously delivered document versions. Create new versions of shareable journey/scorecard/design artifacts rather than silently changing historical claims.

| Document or artifact | Planned update |
| --- | --- |
| `README.md` | Settings guide, default/current month budgets, month/all-month deletion, two-stage reset, tag persistence, recovery and compatibility |
| `CHANGELOG.md` | V3.2.0 entry with actual release date, new actions and migration notes |
| App What's New | Settings, scoped deletion, double-confirmed reset, ₹1,25,000 default and saved-tag retention |
| `START-HERE.txt` | Remove samples by month/all months, restore V3.2 defaults, and find Settings |
| `TEST-CASES.md` | Month boundaries, scope changes, two-stage reset, Settings, budget migration, security and recovery |
| `TEST-RESULTS.md` | Actual V3.2 counts, tested source SHA, failures resolved and limits |
| `tests/results.tap` and browser results JSON | Fresh executed evidence; preserve old evidence through Git history |
| `SECURITY-REVIEW.md` | Destructive-action safeguards, local recovery retention, import changes and concurrency review |
| `ADVERSARIAL-REVIEW.md` | New review results for stale tabs, storage failures, malformed catalogue and interrupted reset |
| `design.md` | V3.2 target design including capture/understanding contracts, financial-field safety, reset/Settings and trust boundaries |
| `EVENT-LOG-TEST-CASES.md` | Observable behavior, privacy, retention, debug expiry, failure injection and reset race scenarios; results recorded separately |
| `V3.2-TEST-CASES.md` | Requirement-linked functional/UI/security acceptance cases; planned until executed |
| `TRACEABILITY.md` | Stable requirement IDs connecting plan, design, proposed modules, tests, documentation and actual release evidence |
| Voice coverage and issue records | New reviewed corpus index, reproduced examples, supported vocabulary limits, device results and unresolved cases; no real personal recordings committed |
| `DEPENDENCIES.md` and `LICENSE` | Review; change only if dependencies or licensing actually change |
| `DOCKERIZATION-SPEC.md` | Version, runtime modules, backup/schema assumptions and reset smoke tests |
| `DOCKER-RELEASE-PUBLISHING-SPEC.md` | V3.2 candidate, catalogue persistence/rollback compatibility and publication gates |
| Penny Journey Map Word/HTML | New version describing first-run feedback, scoped deletion, Settings and the informed-reset design lesson |
| Penny Release Scorecard Word/HTML | New V3.2 edition using verified counts and explicit Docker/voice limits |
| Penny Architecture and Design Markdown/HTML | Catalogue/settings schema, effective budget resolution, recovery and two-stage reset/save/undo diagrams |
| Outputs source copy and ZIP | Refresh after verification; keep code, docs and test evidence synchronized |
| Studio hub | Let documented README/changelog/release events request refresh; verify delivery, do not claim metadata sync success without evidence |

The architecture document should add a Mermaid sequence for “preview → confirm → revision check → snapshot and replace → refresh → optional undo.” The data-model view should show catalogue entries independent of expenses.

Historical V3.1 sample budgets of ₹18,000 remain valid historical facts. New V3.2 first-run and reset examples must use ₹1,25,000. Update screenshots, expected balances, budget percentages, help copy and sample files accordingly; do not rewrite previous release evidence to imply the new budget was tested in V3.1.

## 9. Implementation sequence

1. **Baseline and scope:** inspect latest remote, preserve unrelated changes, capture existing test results and retain a sample legacy backup fixture.
2. **Voice diagnosis and safety first:** capture current failing transcripts; build reviewed corpus and canonical amount/field contract; fix silent grouped-number corruption and Hindi numeric qualifiers before expanding vocabulary. Implement the Hindi voice workstream and preserve English/Spanish regressions.
3. **Data foundations:** implement schema 4 catalogue/settings, shared ₹1,25,000 defaults, effective-budget resolution, month-scoped planners and compatibility tests.
4. **Recovery and persistence:** implement atomic snapshots, fallback behavior, revision-safe undo and failure tests.
5. **UI and observability:** build essential Settings sections including Diagnostics, month scope selector, two-stage reset, backup/recovery controls, empty state and async cancellation. Implement section 12's bounded logger before final browser/device reproduction and test the reset/purge transaction boundary.
6. **Portability:** update JSON/Excel imports and exports and linked-file reset behavior; verify unused tags/settings round-trip and import opt-ins are explicit.
7. **Quality:** run the reviewed Hindi corpus, full suite, mobile/desktop browser cases, data-loss adversarial checks and target-device voice regression.
8. **Documentation:** complete required factual/evidence updates; defer optional shareable-artifact styling and video work as described below.
9. **Release preparation:** bump display version and applicable Docker/script labels to 3.2.0; prepare reviewable change summary and publication plan.
10. **Release:** only after approval, publish the verified app/docs to GitHub and confirm Pages/Studio workflow outcomes. Docker registry publication follows its separate gate.

## 10. Definition of done

- [ ] Deletion starts with current-month scope and retains every other month's records.
- [ ] All-month deletion is separately selected, accurately previewed and explicitly confirmed.
- [ ] Full reset cannot run until two distinct confirmation stages and the typed phrase are completed.
- [ ] Reset restores V3.2 samples, ₹1,25,000 factory/current-month budget and preferences while retaining all tags.
- [ ] Existing saved budgets survive upgrade; effective defaults never overwrite explicit monthly values.
- [ ] Settings has validated budgets, tag additions/search and existing data/recovery controls; any deferred voice preference is omitted consistently.
- [ ] Reset disconnects the linked file without modifying external file contents.
- [ ] Empty records remain empty after reopening.
- [ ] Catalogue migration, JSON/Excel portability and linked-file handling pass.
- [ ] Recovery works across reloads and never overwrites newer edits silently.
- [ ] Storage, multi-tab, quota and async failure cases are verified.
- [ ] All relevant regression, accessibility and mobile checks pass.
- [ ] Every document in the impact inventory is reviewed and updated or explicitly marked unchanged.
- [ ] Release evidence is tied to the tested source SHA.
- [ ] All critical Hindi amount defects are fixed and no incomplete financial candidate is presented as reliable.
- [ ] Reviewed natural Hindi/Hinglish corpus, English/Spanish regressions and iPhone Chrome voice gates pass or remain explicitly release-blocking.
- [ ] GitHub/Pages publication and any Docker registry publication occur only under their release approvals.
- [ ] Diagnostics defaults to error-only, temporary debug expires, records are bounded/redacted and session/action tracing works.
- [ ] Log clearing/full reset invalidate queued events and debug sessions across tabs; no private payload enters diagnostic exports.
- [ ] Event-log tests have executed results, and diagnostic failure never changes a successful expense-save outcome.
- [ ] UI continuity and accessibility acceptance in section 13 pass with no additional mandatory steps for the normal V3.1 keyboard expense path.
- [ ] Every in-scope requirement in `TRACEABILITY.md` has a design anchor, planned tests and later executed evidence; no planned test is described as passing.

## 11. Recommended models and token budget

This is an engineering estimate for the complete V3.2 implementation, tests, document updates and approved app release, not a measured bill or an enforced tool budget. No development/delegation has been started by this plan. Physical-device access, CI latency and image builds are time/resource constraints that extra tokens cannot resolve.

### Model naming

Use **GPT-6.1 Sol with low reasoning effort** for the user's suggested “GPT-6.1 Sol Light” planning role. Official documentation identifies `gpt-6.1-sol` and its `low`, `medium`, `high`, `xhigh` and `max` efforts; it does not establish a separate model named “Sol Light.” If the app displays a Light label, confirm its mapping in that app rather than treating it as a different API model. This plan recommends settings; it does not change the current chat model.

Official sources checked on 17 October 2026: [GPT-6.1 Sol model](https://developers.openai.com/api/docs/models/gpt-6.1-sol) and [model-selection guidance](https://developers.openai.com/api/docs/guides/model-selection). Model availability depends on the account and execution surface. The workload allocations below are recommendations based on this project's risk, not official guarantees of model performance.

### Phase allocation

Token amounts are **thousands of aggregate model tokens across calls**, including input/tool context and generated reasoning/output. They are not the final document length or a per-response limit. Context replay, visual review and retries can increase usage substantially; track actual usage at each checkpoint.

| Phase | Recommended model / effort | Target tokens | Deliverable and escalation rule |
| --- | --- | ---: | --- |
| Plan refinement and acceptance matrix | GPT-6.1 Sol / low | 10,000 | Freeze user behavior, defaults and document scope; use medium for unresolved schema/recovery tradeoffs |
| Data/schema and recovery design | GPT-6.1 Sol / high | 20,000 | Review schema 4 migration, transaction and undo design before destructive UI is wired |
| Development and integration | GPT-6.1 Sol / high for voice/storage; medium for UI | 110,000 | Hindi financial-integrity/parser work plus month deletion, reset, minimal Settings and portable formats |
| Automated/browser testing and fixes | GPT-6.1 Sol / medium, high for failures | 65,000 | Reviewed Hindi corpus, fault injection, browser/device evidence and full regression |
| Independent adversarial/security review | GPT-6 Astra / high | 25,000 | Separate review of destructive flow, data migration, undo and security boundaries; no self-certified pass |
| Documentation and visual artifact updates | GPT-6.1 Sol / low for prose, medium for required diagrams/Word layout | 15,000 | Accuracy/compatibility/voice limits first; defer optional visual polish while updating required live documents |
| Local Docker and release-package regression | GPT-6.1 Sol / medium | 15,000 | Validate updated allowlist/version, build tests, local health and runtime smoke checks; do not assume GHCR is published |
| Final diff review, Git push and deployment checks | GPT-6.1 Sol / low; medium if conflict | 5,000 | Inspect exact changed files, use a current-head lease, publish only approved scope and verify Pages/Studio outcomes |
| **Planned work subtotal** | | **265,000** | |
| **Contingency** | Use where observed failures justify it | **85,000** | Hindi coverage/ambiguity, migration failures, target-device diagnosis and context overhead |
| **Revised recommended total envelope** | | **350,000** | Re-estimate after Hindi corpus and schema/recovery checkpoints; no execution budget is activated by this estimate |

If Astra is unavailable, use a separate GPT-6.1 Sol high-effort review pass with fresh task context and fault-oriented cases, and document that substitution. GPT-6 Luna may handle bounded extraction, formatting or evidence-index tasks after the implementation is stable; keep destructive storage decisions and final release review with Sol/Astra. A model does not replace deterministic tests or human reset confirmation.

### Budget controls and handoffs

- Use a short checkpoint handoff: exact source SHA, changed files, decisions, passing/failing checks, unresolved risks and remaining work. Avoid replaying the full product history in every phase.
- At approximately 150,000 aggregate tokens, report actual usage and remaining risks. At the 265,000 planned subtotal, explain any contingency draw. Before exceeding 350,000, request a revised budget if a hard spending cap has been agreed.
- Do not treat exhausted tokens as evidence that a security check passed or the release is complete. Narrow/split unfinished work and keep it unpublished if release blockers remain.
- Estimate currency cost separately from actual input/cached-input/output mix and the user's plan; token totals do not convert directly into a reliable dollar quote or Codex subscription percentage.
- Separate Git push and image publication. Ordinary documented app changes need the user's release authorization; Docker image publication still follows the dedicated registry specification and artifact approval gate.
- The independent reviewer can be a separately authorized agent or a separate manual review task; this recommendation does not itself start delegation.

### Optional scope reduction

The user accepted scope reduction. Keep Hindi voice diagnosis/fixes and reviewed/device tests, month deletion, two-stage reset, saved tags, default-budget management, recovery, security gates and accurate live documentation mandatory. Keep Settings to essential budget/tag/data/reset controls; preferred-language persistence and extra preference UI polish may be deferred, with the existing language selector remaining available. Defer a narrated video, additional decorative layouts and expanded journey-map/scorecard storytelling; update factual release status and limitations in current documentation, and label untouched older artifacts as historical. Do not reduce voice amount-safety, data-loss, schema, confirmation or security tests to stay within tokens. Spanish is regression scope, not a new broad vocabulary project.

If language preference persistence is deferred, remove its new Settings/Excel controls from the implemented scope consistently rather than leaving partial schema or documentation promises. Record final scope before coding and use the lower effort documentation budget above for accuracy and evidence. The new Diagnostics controls and privacy/reset guarantees in section 12 are essential scope; only decorative dashboards, configurable retention and remote log shipping are deferred.

<a id="diagnostics"></a>
## 12. Local event logging and MTTR workstream

### 12.1 Purpose and scope

Add a small local diagnostic event log for observability and troubleshooting. It must answer: which session, which action, which component, at which stage, what failed, how long it took, and which safe recovery action followed when debug was enabled. MTTR means time to diagnose and recover from a fault; logging supports it but is not itself a measured improvement or a service availability guarantee.

Default **Errors only** records failures, not every user action. Session and action IDs on errors allow grouping even with debug off. **Debug for this session** adds bounded start/stage/result events for reproducing a problem. A complete historical action trail is deliberately unavailable when debug is off; do not market this as an audit ledger.

No server telemetry service, account identifier, analytics backend or log shipping is added. Logs stay in the current browser origin/profile unless the user previews and exports a diagnostic file.

### 12.2 Settings controls

- Add **Settings → Diagnostics**. Default mode: **Errors only**.
- Show **Enable debug for 30 minutes**, remaining time and **Stop debug now**. Debug is tab-session scoped, ends on reload/tab close, and is never restored from a backup or preference import.
- Explain that debug adds technical action/stage details while still excluding expense contents and spoken text. Audio capture remains independently user-initiated.
- Show timestamp, severity, stable event code, component, session ID, action ID and outcome. Expand safe details on demand; offer Copy event reference.
- Filter by session, action ID, component, time range and severity; newest first with paging. Display “No matching events” separately from logging/storage unavailable.
- Provide **Export diagnostics** with time/session scope, record count and preview; downloads sanitized JSON with log schema/app version and explicit test/environment capability indicators. No automatic external upload.
- Provide **Clear diagnostic logs** with a scope/count confirmation, distinct from deleting expenses. Clearing logs does not delete expenses, budgets, tags or recovery data.
- Disabling debug stops future debug events immediately; it does not silently clear existing logs. Disclose this and offer the separate Clear action.
- Retention is fixed for V3.2 and displayed in Settings: errors seven days, debug events 24 hours, maximum 1,000 records and 2 MiB serialized retained payload per browser-origin log store, whichever bound is reached first. Limit every event to 2 KiB. Oldest events are evicted first; log eviction never affects expense data.

### 12.3 What is logged

| Component | Error-only examples | Extra debug examples |
| --- | --- | --- |
| Startup/storage | Initialization/read/write failure, revision conflict, quota failure | Capability flags, operation start/result and duration |
| Voice | Capture denied/timeout/error, parser integrity failure, translator timeout/mismatch | Fresh session start, capture stage, parser rule/version and review-state transition |
| Imports/exports | Invalid file/schema, workbook worker failure, download preparation failure | Format, bounded row count, preview/apply completion; never file names/contents |
| Budget/settings | Invalid persisted setting, failed commit | Save start/result, setting key allowlist only; never financial value |
| Delete/reset/undo | Invalid approval/scope plan, snapshot failure, stale revision | Scope kind, affected count, confirmation stage and result; no expense IDs or values |
| Currency/linking | Rate failure, external-file conflict or write failure | Pair from fixed currency allowlist and duration; no file path/name |
| Unexpected runtime | Unhandled error/rejection with stable sanitized code | Safe stack-free module/action breadcrumbs when available |

Ordinary unknown Hindi vocabulary is an expected `needs-correction` result, not an error flood. It is debug-only as a reason code/count; raw words are never logged. Recognized financial-integrity violations are error events with a constant reason code, never source amount or text. “User saved” remains an expense action, not a diagnostic requirement when debug is off.

### 12.4 Privacy and failure safety

- Use an allowlisted event schema and metadata keys. Do not accept arbitrary data objects or trust redaction of free-form messages as the sole defense.
- Never persist/export audio, transcripts, English drafts, amounts/budgets, descriptions, custom tags, merchant names, expense IDs, file names/paths, URLs with queries, tokens or credentials. Session/action IDs are random diagnostic references, not user identifiers.
- Display stable human-readable messages from event codes. Do not store raw exception message/stack, browser event objects or provider output; these may contain sensitive text.
- Reject/drop oversized or invalid events safely. Prevent log injection and HTML execution in viewer, clipboard and export paths.
- Log writes are best-effort and asynchronous. Their rejection cannot fail or reverse a saved expense, block voice, or create recursive logging errors. Surface a constant “Diagnostics unavailable” notice and bounded memory-only fallback when persistent logging fails.
- Batch/cap events and deduplicate repeated identical errors within the same action using a repetition count. Export an explicit dropped/evicted count where known; do not imply completeness.
- Logs are plain local diagnostic data, not encrypted or tamper-proof. No secrets belong in them. Only previewed sanitized files may be shared at the user's direction.

### 12.5 Reset, clearing and recovery

| Operation | Log content | Logging mode and session |
| --- | --- | --- |
| Delete selected-month expenses | Retain diagnostics; optional debug event describes scope kind/count | Keep current error/debug mode |
| Delete all month expenses | Retain diagnostics; no expense content | Keep current error/debug mode |
| Clear diagnostic logs | Purge all stored and memory diagnostic events, queued writes and counters after confirmation | Preserve errors-only default; stop debug in all active Penny tabs; rotate session IDs |
| Full Reset Penny | Clear diagnostic content and counters along with local app reset; existing reset recovery snapshot excludes diagnostics | Force Errors only; cancel debug timers and rotate session IDs across tabs |
| Undo delete/reset | Restore eligible app state without old logs or prior debug state | Remain in current mode; reset undo cannot re-enable debug |
| JSON/Excel import or export | Ordinary backups/imports exclude diagnostics, debug consent and session identifiers | No debug activation or old-log restoration through imported settings |

A successful clear/reset must not immediately write a new debug “cleared/reset” row into the emptied log. Its acknowledgement is a UI status. A genuine later failure may create a new sanitized error. If reset fails before commit, preserve existing application data/logs and record the reset failure when logging is available.

Use a log generation/epoch checked inside write transactions so in-flight stale events cannot reappear after clear/reset. Broadcast generation changes to active tabs; resumed/suspended tabs recheck before flushing. Full reset uses the existing double-confirmation flow, explicitly mentioning diagnostics and return to error-only mode. Clear logs has its own single confirmation and is not undoable; say so before confirmation. Diagnostic purging is local deletion, not a forensic secure-erasure guarantee.

### 12.6 Delivery and verification impacts

Implement after the parser's structured error contract and storage transaction design, before final browser testing, so voice/session evidence is available during reproduction. Add the new runtime module to script order, Docker allowlist and startup failure handling. Use a separate diagnostic object store and metadata; change IndexedDB version deliberately with a non-destructive upgrade test. Schema 4 portable state remains separate from diagnostic-store schema/version.

For IndexedDB, full reset's app write, recovery snapshot, log purge and epoch update must share one transaction across the required stores. A log-store write failure may not poison ordinary expense transactions: those are separate writes. Fallback mode needs a documented safe reset protocol; if its persistent diagnostics cannot be purged safely, refuse to claim complete reset, preserve original financial data and expose a recoverable error.

Add the dedicated cases in `EVENT-LOG-TEST-CASES.md`; execute and record results during implementation, not as part of this plan-only update. Run a controlled failure exercise (speech denied, translator timeout, stale-save conflict and worker failure). Verify that a tester can locate the originating error/action/session and appropriate recovery path from sanitized evidence; report measured exercise times without promising a specific MTTR reduction.

Required live-document impacts: README Diagnostics walkthrough, What's New, Settings/reset wording, privacy/security review, schema/storage design, tests/results, Docker allowlist, troubleshooting/support instructions and release scorecard limitations. Logs do not go to Studio or GitHub automatically. Keep raw reproducer phrases in fictional reviewed test fixtures rather than production logs.

Budget impact: provisionally allocate **20,000 tokens from the existing 85,000 contingency** (12,000 implementation, 6,000 verification/security, 2,000 documentation). Core subtotal remains 265,000; reserved logging allowance is 20,000 and unallocated contingency becomes 65,000, retaining the **350,000 total envelope**. Re-estimate if the cross-store/fallback reset protocol needs more work. Logging correctness/privacy is mandatory; defer decorative log charts, adjustable retention, live remote streaming, audio playback and operational dashboards.

<a id="ui"></a>
## 13. UI and HCI continuity acceptance

Requirement IDs `UI-01` through `UI-10` are defined in `TRACEABILITY.md`; detailed interaction decisions are in `design.md` section 13. Preserve V3.1's successful mental model rather than redesigning the dashboard for the new features.

### Familiarity and progressive disclosure

- Keep the Penny brand, INR formatting, summary cards, month overview, search, expense list, category view and budget shortcut in their familiar hierarchy.
- Keep **Add expense** the dominant task. Preserve keyboard-first entry, field order, edit/delete labels, existing Data & backups access and What's New access.
- Add one secondary **Settings** entry. Keep Data & backups as a direct shortcut into the same data section, and Set budget as a direct budget shortcut. Do not force existing tasks through a new Settings hierarchy.
- Keep **Start fresh** available as a quiet list-level control or menu item separated from Add expense, and as a Settings destination. Avoid prominent destructive buttons on the dashboard.
- Use recognition rather than memorization: visible labels, current values, selected month/year, plain-language scope summaries and contextual help. No mandatory tutorial or new navigation shell.
- Hide advanced Diagnostics filters and event details until requested. Error-only is the visible default; normal expense entry never needs logging configuration.

### Measurable mobile/web checks

- Design touch controls to a product target of at least 44 × 44 CSS pixels, including icon/tag removal hit areas. At a minimum, audit WCAG 2.2 target-size requirements and documented exceptions; do not assume existing small chip buttons meet them.
- Support 320, 390, 768 and 1280 CSS-pixel viewport widths, portrait/landscape and 200% text zoom. At a 320 CSS-pixel content width, no page-level horizontal scrolling or loss of actions; preserve readable Hindi and long tag wrapping.
- On mobile, use a single-column Settings drill-down and form, native month/date controls where suitable, and action areas that remain reachable above the virtual keyboard/safe area. Avoid nested scroll traps and overlapping bottom bars.
- On desktop, retain efficient list scanning and direct actions; Settings may use section navigation inside one modal shell. Same labels and operation semantics on both platforms.
- Maintain keyboard navigation, visible focus, labelled inputs, screen-reader names/status, non-color-only state cues and sufficient text/control contrast. Target WCAG 2.2 AA for changed flows; record actual checked criteria and gaps without claiming certification.
- Use one modal at a time. Reset stage two replaces stage one in the same shell, with a Back action and cleared final phrase. On close/cancel restore focus to the invoking control.
- Financial/scope errors appear next to fields and in a persistent summary where necessary. Critical errors/recovery options must not exist only in a disappearing toast.
- Give immediate pending feedback for long operations, disable repeated submission, preserve entered data on failure and never silently dismiss a failed form.

### Continuity evaluation

Before implementation, record V3.1 reference screenshots and the keyboard Add/Edit, budget and export interaction paths. After implementation, compare the same tasks on desktop and iPhone Chrome. Acceptance: no additional required screen or confirmation for ordinary Add/Edit, no displacement of essential existing entry points, no accidental destructive activation, and no unresolved serious accessibility issue in changed flows.

Run a lightweight uncoached walkthrough with the user and, if available, a person unfamiliar with the changes: add an expense, edit a budget, export a backup, delete one selected month, identify full-reset scope, and locate an error event. Record completion, hesitations, mis-selections and recovery; there is no invented completion rate or timing claim. If participants/devices are unavailable, leave those evidence items pending rather than substituting source inspection.

### Traceability and delivery

Maintain `TRACEABILITY.md` as the requirement-to-artifact index. Link stable requirement IDs from cases and implementation reviews; use explicit HTML anchors in plan/design where needed. New requirements or reduced scope must update the matrix and corresponding tests before being called complete. Historical V3.1 artifacts remain reference evidence, not proof of V3.2 compliance.

Publishing this document set records approved planning updates only. It does not authorize or claim a V3.2 app release, user testing, runtime security testing or data reset. UI acceptance and the focused artifact-link check use the existing testing/documentation allocation; keep the 350,000-token estimate and reassess only if observed implementation work requires it.
