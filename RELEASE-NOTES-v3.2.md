# Penny 3.2 release notes

19 October 2026 · Version 3.2.0 · Tag v3.2

Penny 3.2 adds safer ways to start fresh and diagnose problems while keeping the familiar expense workflow. All monetary values remain INR.

## Changes

- Settings for the default budget, saved tags, backups, diagnostics and app reset. Factory/default monthly budget is ₹1,25,000; existing monthly budgets, including zero, are preserved.
- Delete one selected month (current month initially) or explicitly delete all months. Preview the count/total and confirm; keep budgets and tags.
- Full reset needs an acknowledgement and typed RESET PENNY. Restore sample expenses/default budget, retain tags, clear logs/debug and disconnect the linked file without overwriting it.
- Guarded undo restores a bulk change only before a newer edit; atomic writes and revision checks protect stored records.
- Hindi digits/number words/Hinglish and currency notation, including Rs.50. Exact regression: `spend rs.50 on donation` → ₹50.00 / Other / donation after Use English draft.
- Explicit valid amount corrections in the English draft now fill Amount. Unchanged ambiguous guesses, multiple amounts and unsafe grouping stay unresolved.
- Private local errors-only event logs, optional 30-minute debug, session/action search, reviewed export and acknowledged purge. Financial backups exclude diagnostics.
- Schema-4 JSON/Excel carries saved tags/preferences; importing preferences is opt-in. Mobile reflow, helper-text contrast and unsaved-draft protection improved.

## Verification

633 automated tests passed locally and in the Docker build. This includes the existing regression suite, 250 synthetic Hindi corpus phrases, 0–99 number checks, adversarial financial cases, data-loss/log/privacy checks and base colour contrast checks. Browser verification covered the reported ₹50 phrase, explicit English correction, normal Add/Edit/Delete, reset/undo, responsive widths and diagnostic review. All 13 runtime assets matched tested source hashes.

[Detailed results and evidence](V3.2-TEST-RESULTS.md) · [Plan](plan.md) · [Design](design.md) · [Traceability](TRACEABILITY.md)

## Known limitations

- Real iPhone microphone capture, repeated Hindi/Spanish audio and background/permission behaviour are not verified by desktop typed-transcript tests. Browser/keyboard speech services may require a network connection.
- The offline language layer is a bounded expense parser, not universal translation. Native-speaker corpus review remains open. Unsupported rupee-plus-paise wording may require explicit correction.
- Full screen-reader, zoom, real phone keyboard/calendar and uncoached usability acceptance remain open.
- Docker source builds are verified locally on this Mac. No public GHCR image, AMD64/ARM64 matrix, fresh comprehensive image CVE scan or signed registry release is claimed.

The owner approved application publication with these limitations disclosed on 19 October 2026. This is not security certification.

## Use and upgrade

Open https://debasisr66.github.io/PennyExpenseManager/?release=v3.2 and refresh once if an older version remains cached. Back up existing data first. Browser records stay on their origin/profile; use a JSON backup to move between hosted and local copies. Ordinary upgrades preserve saved expenses/budgets; reset happens only through explicit confirmation.

The GitHub source archive includes Dockerfile, Compose, scripts/penny, source, documentation and tests. Start Docker Desktop, then run `./scripts/penny --start` from the extracted folder; stop with `./scripts/penny --stop`. A prebuilt registry image is not supplied.

For rollback, use the prior v3.1 source/release in a separate origin/profile and restore an appropriate backup. Do not assume the older app can read schema-4 state in place.
