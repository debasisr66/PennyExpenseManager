> V3.2 release update: 633 automated tests pass locally and in Docker. [Current results](V3.2-TEST-RESULTS.md) and [release notes](RELEASE-NOTES-v3.2.md) distinguish completed checks from remaining device, language, accessibility and image-publication work. Historical evidence below is preserved.

# Penny V3.2 event log test specification

Date: 19 October 2026  
Status: Planned; these cases have not been executed against a logging implementation  
References: [plan.md](plan.md) revision 5, [design.md](design.md) revision 3, [TRACEABILITY.md](TRACEABILITY.md)

Requirement mapping: LOG01–LOG09 and LOG12 support REQ-10; LOG13–LOG30 support REQ-11; LOG10/LOG11/LOG15/LOG21/LOG28/LOG30 also support REQ-12. LOG06/LOG08/LOG09 support REQ-09. Browser LOGB cases supplement the UI cases in [V3.2-TEST-CASES.md](V3.2-TEST-CASES.md#ui-acceptance); they do not replace the keyboard/device/accessibility evidence.

## Test setup and evidence

Use fictional data, an injected clock/ID source, isolated IndexedDB and storage-failure fixtures. Stub speech/translation providers; separately exercise target-device capture. For every case record source SHA, environment, input conditions, expected/actual outcome, pass/fail and artifact reference in `TEST-RESULTS.md` or a dedicated results attachment. No placeholder PASS entries.

## Unit and integration cases

| ID | Scenario | Required result |
| --- | --- | --- |
| LOG01 | Fresh install or legacy-state migration | Errors-only mode; no debug activity persisted; financial records/catalogue/budgets unchanged |
| LOG02 | Ordinary expense actions with debug off | No action/start/success events; a simulated failure records one sanitized error with session/action IDs |
| LOG03 | Enable debug explicitly | Only that tab records permitted debug events; status shows active mode/deadline |
| LOG04 | Advance clock beyond 30 minutes; suspend/resume tab | Debug stops on emit/resume regardless of delayed timers; errors continue |
| LOG05 | Stop debug, reload or close/reopen | Debug not restored; existing retained logs remain until expiration/clear |
| LOG06 | Voice capture → parse → review → save | Stable action/parent references relate stages in debug; no audio/text/amounts recorded |
| LOG07 | Two tabs and reload | Session IDs differ; sequences order each session; no identifying expense data in IDs |
| LOG08 | Unknown Hindi vocabulary or cancel | Expected needs-correction/cancel is debug-only; no error flood; no raw unknown word logged |
| LOG09 | Parser financial integrity violation | Error with stable enum; no raw numbers, translated draft or source phrase |
| LOG10 | Malicious/private values in exceptions and metadata | Allowlist rejects raw messages/stacks, tokens, URLs, financial values, paths, descriptions, tag/merchant/source text in every mode |
| LOG11 | UTF-8 oversized event and prototype-shaped metadata | Enforce 2 KiB event cap; reject invalid keys/objects without throwing into caller |
| LOG12 | Duplicate/error flood and very long text | Deduplication/count bounds and rate protection hold; UI remains responsive; no recursive error events |
| LOG13 | More than 1,000 events or 2 MiB retained payload | Expired/oldest records evicted; both limits hold transactionally; financial data unaffected |
| LOG14 | Seven-day errors and 24-hour debug expiry | Boundary tests at just-before/exact/after expiry; read/export cannot expose expired rows |
| LOG15 | Diagnostics store unavailable/quota/rejected insert | Expense save still reports actual success; bounded memory fallback, one constant notice and no recursion |
| LOG16 | Unhandled rejection handler receives hostile provider object | A constant code is emitted where safe; no serialization of raw object and no application-handler crash |
| LOG17 | Main revision conflict or import/worker failure | Stable component/action/error code supports locating failure; operation retains existing financial records |
| LOG18 | Filter session/action/time/component/severity | Exact matching/paging; newest display first; empty result distinct from unavailable store |
| LOG19 | Clock change | Per-session sequence remains ordered; durations remain nonnegative/monotonic; no unsafe dependency on wall-clock order |
| LOG20 | Diagnostic export preview and download | Only selected sanitized records and safe metadata; valid schema-versioned JSON; no upload/network call |
| LOG21 | HTML/script/control characters in allowed text paths | Text-only viewer/clipboard/export; no script execution, malformed JSON or log injection |
| LOG22 | Clear logs cancel and confirm | Cancel preserves logs; confirmed clear purges stored/memory events/counters, ends debug, rotates sessions and leaves financial/recovery data untouched |
| LOG23 | Queued event during clear and suspended second tab | Old epoch events rejected at transaction boundary; no resurrection or silent re-stamping |
| LOG24 | Full reset succeeds | Main/default/recovery/log epoch changes commit together; logs cleared, debug off, tags retained and linked external file untouched |
| LOG25 | Full reset transaction fails | Original app/log data preserved; no success message; sanitized reset error may be added independently |
| LOG26 | Undo a reset/delete after clear | Eligible financial recovery only; logs/session/debug settings not restored; newer-edit guard still enforced |
| LOG27 | Month/all-month expense deletion | Logs retained; scope debug event has only enum/counts; budgets/settings/tags unchanged |
| LOG28 | JSON/Excel/linked-file backup/import | No logs, consent or session IDs in ordinary exports; injected debug/log settings rejected or excluded by schema allowlist |
| LOG29 | IDB store upgrade, blocked tab and fallback reset | Non-destructive upgrade; clear explanation for blocked store; no false claim of complete reset if fallback purge cannot complete safely |
| LOG30 | Cross-origin and Studio/GitHub interaction | Logs isolated to browser origin/profile; no expense/log upload or Studio dispatch from local diagnostics |

## Browser and device acceptance

| ID | Scenario | Required result |
| --- | --- | --- |
| LOGB01 | Open Settings Diagnostics on desktop and 390-pixel mobile | Labelled accessible controls, keyboard focus/return, readable event references and no horizontal page overflow |
| LOGB02 | Enable/stop debug and wait/advance fixture time | Mode/timer clear; no automatic microphone activation; expiry announced without interrupting expense entry |
| LOGB03 | Denied microphone and Translator timeout | Locate error by session/action, view safe code and recovery hint, retry/keyboard path remains functional |
| LOGB04 | Log clear and two-stage app reset dialogs | Clear scope/irreversibility visible; app reset explicitly mentions diagnostics and error-only mode; no preselected destructive acknowledgement |
| LOGB05 | Export, inspect JSON and copy event reference | Preview matches file and scope; copied ID helps correlate; no private payload or remote transmission |
| LOGB06 | Two open tabs, one sleeping tab and log clearing | Queued/old events stay purged, debug ends on resume and financial views remain consistent |
| LOGB07 | Diagnostics write failure during expense save | Save outcome remains correct; diagnostics shows persistent-unavailable/memory-only status without console/error loops |

## Troubleshooting exercise and release gate

Reproduce speech denial, translation timeout, stale revision and workbook worker failure. In debug mode a tester must identify the related stage/session/action and suitable recovery without source transcripts or expense values. In errors-only mode they must find the failure reference and understand that preceding actions were not retained. Record exercise timings; do not infer a measured MTTR gain from feature completion alone.

Release requires executed results for these cases, zero leaks of forbidden data, no logging-induced financial failure, and no stale-event resurrection after confirmed purge/reset. Actual target-device or platform gaps remain explicitly pending. This file is a specification, not evidence that any case passed.


## Execution evidence

See [V3.2-TEST-RESULTS.md](V3.2-TEST-RESULTS.md) for the implemented candidate, actual automated/browser results and explicit pending manual cases. This specification remains the full acceptance checklist; a linked automated suite does not imply every manual case passed.
