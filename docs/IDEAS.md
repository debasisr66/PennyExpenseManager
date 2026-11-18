# Penny ideas backlog

Ideas logged for later, with the reasoning that produced them. An idea graduates to a spec in `docs/specs/` before any build.

## Source: brainstorm, 18 November 2026

Frame: Penny is mainly a **showcase** product. The most real pain is **recurring bills**. Constraints: **no data model change, no network or third-party code**. Ambition: a meaningful, surprising arc built in steps from 3.3.1 up to 3.4. Strict detection was chosen over generous: a wrong guess on a showcase costs more than a missed bill.

### The recurring-bills arc (top 3, in build order)

| # | Idea | Release | Status | What it does | Depends on |
|---|---|---|---|---|---|
| 1 | **Recurring detector** | 3.3.1 | **Spec approved**: [RECURRING-DETECTOR-SPEC](specs/RECURRING-DETECTOR-SPEC.md) | Penny infers monthly bills from history and lists them with their evidence. Read only | — |
| 2 | **Due and not logged, then one-tap add** | 3.3.2 | Backlog | "3 bills you usually log by now aren't logged this month." Tap to open a pre-filled normal expense, or tick several and add them together through the existing preview and undo | Idea 1 (and its D7 "paid this month" flag) |
| 3 | **Month-end forecast and the true cost of commitments** | 3.4 | Backlog | "At this pace you'll end at ₹X against ₹Y, including ₹Z in bills still to come." A commitments view: fixed monthly total, annual cost, price rises | Idea 1; idea 2 makes it more accurate |

Each step aims to stay inside the constraints: new records are ordinary expenses, and nothing new is stored. Idea 2's "tick several and add together" would be a **new write path**, so it needs its own impact check (reuse the import preview and undo, or not) before it is specified.

### Considered and set aside (not now)

| Idea | Why set aside | Revisit when |
|---|---|---|
| Year in Penny (annual review) | Showcase appeal, but no link to the recurring-bills pain | Around year end, as a seasonal release |
| Plain-language questions ("how much on rent this year?") | The search syntax (`#tag`, `min:`, `rail:`) already covers most of it | If search usage shows people struggle with the syntax |
| Bill calendar | A presentation of idea 3's data | Fold into idea 3 if the commitments view needs a visual |
| Quarterly and yearly bills | Outside strict monthly rules | After idea 1's spike shows monthly detection is reliable |
| "Not recurring" dismiss button | Needs stored state, which breaks the no-data-model-change constraint | If the constraint is relaxed (a `settings` field would be the smallest change) |
| "Recurring" checkbox on an expense (owner, spike feedback 18 Nov) | Tick when first entering a bill, untick when it stops. Makes recurring explicit instead of inferred, but adds a field to each expense: a schema 4 → 5 change touching storage, CSV and JSON formats and import. Pairs with the dismiss button above (the opposite signal) | Decide after the 3.3.1 spike gate; strongest candidate to merge into idea 2 (3.3.2) with its own impact check |
| Reminders or notifications | Needs a background service and permissions; a large surface for a static app | Not planned |

### Owner note (18 November 2026)

"Zillion monthly payments" exist, and the owner may log only one month, or log after paying. Strict idea 1 needs 4 months of history before it shows a bill, so it helps long-time users first. **Resolved the same day (D8):** the owner kept 4 of 6 for accuracy and pulled a read-only **"Paid last month, not yet this month"** section into 3.3.1, so help starts after one month. Idea 2 then makes those rows one-tap adds. **Revised after the spike (18 Nov):** on real data about half of that section's rows were one-offs, so D8 moved to 3.3.2, built on the "recurring" checkbox below.

### Open questions carried forward

- Does detection hold up on real, messy descriptions? Idea 1's spike (D2) answers this before any UI is built.
- For idea 2: should bulk add go through the import preview, or through a new, lighter confirmation?
- For idea 3: should forecast pace use calendar days or a typical spending curve?
