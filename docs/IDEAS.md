# Penny ideas backlog

Ideas logged for later, with the reasoning that produced them. An idea graduates to a spec in `docs/specs/` before any build.

## Source: brainstorm, 18 November 2026

Frame: Penny is mainly a **showcase** product. The most real pain is **recurring bills**. Constraints: **no data model change, no network or third-party code**. Ambition: a meaningful, surprising arc built in steps from 3.3.1 up to 3.4. Strict detection was chosen over generous: a wrong guess on a showcase costs more than a missed bill.

### The recurring-bills arc (top 3, in build order)

| # | Idea | Release | Status | What it does | Depends on |
|---|---|---|---|---|---|
| 1 | **Recurring detector** | 3.3.1 | **Released 18 Nov 2026** ([v3.3.1](https://github.com/debasisr66/PennyExpenseManager/releases/tag/v3.3.1)). Spec: [RECURRING-DETECTOR-SPEC](specs/RECURRING-DETECTOR-SPEC.md) | Penny infers monthly bills from history and lists them with their evidence. Read only | — |
| 2 | **Due and not logged, then one-tap add** | 3.3.2 | **Reshaped and released 19 Nov 2026** as bills you mark as recurring ([v3.3.2](https://github.com/debasisr66/PennyExpenseManager/releases/tag/v3.3.2), [spec](specs/RECURRING-BILLS-3.3.2-SPEC.md)): Paid, Due soon, Overdue, Stopped?. One-tap add and bulk add were deferred (see the roadmap) | "3 bills you usually log by now aren't logged this month." Tap to open a pre-filled normal expense, or tick several and add them together through the existing preview and undo | Idea 1 (and its D7 "paid this month" flag) |
| 3 | **Month-end forecast and the true cost of commitments** | 3.4 | Backlog | "At this pace you'll end at ₹X against ₹Y, including ₹Z in bills still to come." A commitments view: fixed monthly total, annual cost, price rises | Idea 1; idea 2 makes it more accurate |

Each step aims to stay inside the constraints: new records are ordinary expenses, and nothing new is stored. Idea 2's "tick several and add together" would be a **new write path**, so it needs its own impact check (reuse the import preview and undo, or not) before it is specified.

### Roadmap after 3.3.1 (approved 19 November 2026)

| Release | Scope | Spec |
|---|---|---|
| **3.3.2** ✅ released 19 Nov | Bills you mark as recurring: "Recurring bill" checkbox and "Repeats every 1, 2, 3 or 12 months" (stored as tags, no schema change); type inferred (fixed or varies); status Paid, Due soon, Overdue, Stopped?. Built for Indian utility bills that vary in amount, date and cadence (owner observation) | [RECURRING-BILLS-3.3.2-SPEC](specs/RECURRING-BILLS-3.3.2-SPEC.md) |
| **3.3.3** | Dark and light theme toggle with Studio lineage (own small release) | [Spec](specs/THEME-TOGGLE-3.3.3-SPEC.md) awaiting owner decisions D1–D7 |
| **3.4** | Month-end forecast and the true cost of commitments (idea 3) | To write |

Deferred from 3.3.2 as good-to-haves: "Log it" pre-fill (needs a new pre-fill path), bulk "add all due", a "Mark as recurring?" button on inferred rows (writes to past entries), search token `is:due`. This supersedes the "recurring" checkbox row below, which is now in 3.3.2 without a schema change.

### Considered and set aside (not now)

| Idea | Why set aside | Revisit when |
|---|---|---|
| Year in Penny (annual review) | Showcase appeal, but no link to the recurring-bills pain | Around year end, as a seasonal release |
| Plain-language questions ("how much on rent this year?") | The search syntax (`#tag`, `min:`, `rail:`) already covers most of it | If search usage shows people struggle with the syntax |
| Bill calendar | A presentation of idea 3's data | Fold into idea 3 if the commitments view needs a visual |
| Quarterly and yearly bills | Outside strict monthly rules | After idea 1's spike shows monthly detection is reliable |
| "Not recurring" dismiss button | Needs stored state, which breaks the no-data-model-change constraint | If the constraint is relaxed (a `settings` field would be the smallest change) |
| "Recurring" checkbox on an expense (owner, spike feedback 18 Nov) | Tick when first entering a bill, untick when it stops. Makes recurring explicit instead of inferred, but adds a field to each expense: a schema 4 → 5 change touching storage, CSV and JSON formats and import. Pairs with the dismiss button above (the opposite signal) | **Done in 3.3.2 without a schema change:** stored as tags, with the form as the only writer (3.3.2 spec D1) |
| Reminders or notifications | Needs a background service and permissions; a large surface for a static app | Not planned |

### Owner requests for the next few rounds (18 November 2026, at the 3.3.1 release)

Logged, not built. Each needs its own spec (architecture, design mock, impact, plan) before any code.

| Idea | Owner's words | Notes for the spec | Revisit when |
|---|---|---|---|
| **Dark and light theme toggle** | "dark and light toggle is not in penny - it should be" | Penny has no dark theme today: no `prefers-color-scheme` rule and no toggle. Likely shape: colour tokens on `:root`, dark values under `prefers-color-scheme`, and a toggle (light, dark, system). Open questions: is the choice saved (a `settings` field changes the data model and the F02 freeze, so `localStorage` is the lighter option); colour contrast in both themes; the chart and budget colours (`tests/ui-colours.test.cjs`) | Within the next few rounds (owner) |
| **Studio product lineage** | "It should also carry the Studio product lineage" | Meaning to confirm with the owner at spec time: for example, Penny showing that it is a Studio product (a link or credit back to the Studio hub), and Studio's listing tracing Penny's releases. Check how Studio reads Penny's API and assets before changing anything Studio depends on | Within the next few rounds (owner) |

### Owner note (18 November 2026)

"Zillion monthly payments" exist, and the owner may log only one month, or log after paying. Strict idea 1 needs 4 months of history before it shows a bill, so it helps long-time users first. **Resolved the same day (D8):** the owner kept 4 of 6 for accuracy and pulled a read-only **"Paid last month, not yet this month"** section into 3.3.1, so help starts after one month. Idea 2 then makes those rows one-tap adds. **Revised after the spike (18 Nov):** on real data about half of that section's rows were one-offs, so D8 moved to 3.3.2, built on the "recurring" checkbox below.

### Open questions carried forward

- Does detection hold up on real, messy descriptions? Idea 1's spike (D2) answers this before any UI is built.
- For idea 2: should bulk add go through the import preview, or through a new, lighter confirmation?
- For idea 3: should forecast pace use calendar days or a typical spending curve?

### Deferred from the 3.3.2 build (19 November 2026)

| Idea | Why it waits | Revisit when |
|---|---|---|
| Strip a typed `#recurring` before the 12-tag check | Today 12 typed tags plus `#recurring` show the generic "Use up to 12 tags" message, even though `#recurring` would be stripped. Rare; fixing it means changing `core.js` tag parsing (frozen this round) | If anyone hits it |
| Hide `#recurring` from the Settings saved-tag list | It is a real tag and harmless there | With the next Settings change |
| DOM test harness for the form | The × and inline-form refusals, the draft preview and the edit round trip are checked in the browser, not in Node | If form logic grows again |
| Show a count of hidden (long-stopped) marked bills | They are findable by searching `#recurring`; the empty state says so | If the owner misses them |
