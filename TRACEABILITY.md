# Penny V3.2 artifact traceability

Date: 19 October 2026  
Status: Requirements/design/test specification published; V3.2 implementation and execution evidence pending

## Source of truth and lifecycle

[plan.md](plan.md) defines scope, behavior, impact and release gates. [design.md](design.md) defines implementation contracts. This matrix assigns stable requirement IDs and connects them to proposed modules, test specifications and evidence destinations. A requirement is not complete because its documentation is linked.

Lifecycle: **Planned → Implemented at SHA → Tested with case/result/evidence → Reviewed → Released at SHA**. Every row below starts Planned. Document publication is separate from application release. When a case fails, retain its linked requirement and failure result; do not remove the link to create apparent coverage.

<a id="requirements"></a>
## Functional requirements

All ACC cases link to [V3.2-TEST-CASES.md — functional](V3.2-TEST-CASES.md#functional). LOG cases link to [EVENT-LOG-TEST-CASES.md](EVENT-LOG-TEST-CASES.md). Modules listed are proposed change locations, not claims of completed code.

| ID | Requirement | Plan/design link | Proposed implementation | Test cases | Status |
| --- | --- | --- | --- | --- | --- |
| REQ-01 | Current-month default and selected-month-only deletion | [Plan](plan.md), [Reset](design.md#reset) | app, data, storage | ACC-F01, ACC-UI09 | Planned |
| REQ-02 | Explicit all-month scope with refreshed confirmation | [Plan](plan.md), [Reset](design.md#reset) | app, data, storage | ACC-F02, ACC-UI09 | Planned |
| REQ-03 | Double-confirmed full reset; tags kept; linked file preserved | [Plan](plan.md), [Reset](design.md#reset) | app, data, storage, voice | ACC-F03, LOG24–LOG26 | Planned |
| REQ-04 | ₹1,25,000 default and preserved monthly overrides | [Plan](plan.md), [Data](design.md#data) | core/data, app | ACC-F04 | Planned |
| REQ-05 | Independent tag catalogue and portable schema 4 | [Plan](plan.md), [Data](design.md#data) | data, storage, spreadsheet/worker | ACC-F05 | Planned |
| REQ-06 | Essential Settings and explicit validated saves | [Plan UI](plan.md#ui), [UI](design.md#ui) | app, index, styles, data | ACC-F06, ACC-UI02/05 | Planned |
| REQ-07 | Snapshot/revision-safe recovery; no partial data loss | [Plan](plan.md), [Reset](design.md#reset) | storage, data, app | ACC-F07, LOG15/23–26 | Planned |
| REQ-08 | Hindi amount integrity and source/item preservation | [Voice plan](plan.md#voice), [Voice](design.md#voice) | Hindi parser, core, translation | ACC-F08; reviewed Hindi corpus specified in plan | Planned |
| REQ-09 | Capture/retry/correction and English/Spanish regression | [Voice plan](plan.md#voice), [Voice](design.md#voice) | voice, translation, app | ACC-F09, LOG06/08/09 | Planned |
| REQ-10 | Error-only default and temporary correlated debug | [Logging plan](plan.md#diagnostics), [Diagnostics](design.md#diagnostics) | diagnostics, app, viewer | ACC-F10, LOG01–09/12 | Planned |
| REQ-11 | Bounded logs, export, clear/reset epoch and no resurrection | [Logging plan](plan.md#diagnostics), [Diagnostics](design.md#diagnostics) | diagnostics, storage, app | ACC-F11, LOG13–30 | Planned |
| REQ-12 | Financial/input/log privacy and security boundaries | [Plan](plan.md), [Security](design.md#security) | all changed boundary modules | ACC-F12, LOG10/11/15/21/28/30 | Planned |
| REQ-13 | Truthful docs, build packaging and release evidence | [Plan](plan.md), [Design](design.md) | Docker allowlist, documentation, workflows | ACC-F13; recorded build/release checks | Planned |

<a id="ui"></a>
## UI and HCI requirements

Each row links to [plan UI criteria](plan.md#ui), [UI design](design.md#ui) and [UI test specification](V3.2-TEST-CASES.md#ui-acceptance).

| ID | Requirement | Test | Evidence to record | Status |
| --- | --- | --- | --- | --- |
| UI-01 | Preserve familiar dashboard, labels and direct Add/Edit/budget/data/What's New paths | ACC-UI01 | V3.1 reference plus V3.2 same-task screen/path comparison | Planned |
| UI-02 | Secondary Settings/Start fresh with progressive disclosure | ACC-UI02 | Desktop/mobile discovery walkthrough | Planned |
| UI-03 | Responsive reflow, readable long/Hindi content and zoom | ACC-UI03 | Width/zoom matrix and screenshots | Planned |
| UI-04 | Usable touch target size and spacing | ACC-UI04 | Target measurements and exception audit | Planned |
| UI-05 | One modal, keyboard/focus/unsaved-edit control | ACC-UI05 | Keyboard/screen-reader steps and actual outcomes | Planned |
| UI-06 | Contrast, status, meaningful labels and non-color cues | ACC-UI06 | Accessibility criteria/checker plus manual findings | Planned |
| UI-07 | Real mobile keyboard, calendar and safe-area usability | ACC-UI07 | iPhone/browser versions and device observations | Planned |
| UI-08 | Clear persistent errors/pending feedback and input retention | ACC-UI08 | Failure fixtures and visible recovery evidence | Planned |
| UI-09 | Distinct deletion/reset/log-clear scope and consent | ACC-UI09 | Scope comprehension and no-write negative cases | Planned |
| UI-10 | Minimal relearning demonstrated by uncoached tasks | ACC-UI10 | Actual participant observations; no invented metrics | Planned |

## Artifact responsibilities and release linkage

| Artifact | Role | Update rule |
| --- | --- | --- |
| [plan.md](plan.md) | Scope and acceptance | Update when requirement/scope changes; link this index |
| [design.md](design.md) | Architecture, UI and safety contracts | Link requirement IDs and affected contracts |
| [V3.2-TEST-CASES.md](V3.2-TEST-CASES.md) | Functional/UI acceptance specification | Every case names requirement ID and actual expected behavior |
| [EVENT-LOG-TEST-CASES.md](EVENT-LOG-TEST-CASES.md) | Detailed logging checks | Maintain LOG/LOGB IDs and requirement mapping |
| [TEST-CASES.md](TEST-CASES.md) | Existing test catalogue | Add V3.2 case links during implementation; preserve historical records |
| [TEST-RESULTS.md](TEST-RESULTS.md) | Executed release evidence | Add source SHA, case ID, pass/fail, environment and evidence path only after execution |
| [SECURITY-REVIEW.md](SECURITY-REVIEW.md) / [ADVERSARIAL-REVIEW.md](ADVERSARIAL-REVIEW.md) | Security/reviewer outcomes | Reference REQ/UI/case IDs and unresolved findings; do not overwrite history with unrun assertions |
| [README.md](README.md) / [CHANGELOG.md](CHANGELOG.md) | Navigation/user and release communication | Mark V3.2 as planned until actually released |
| [Architecture reference](docs/Penny-Architecture-and-Design.md) | Published V3.1 architecture baseline | New V3.2 version follows actual implementation; current design is the target |
| [Journey map](docs/Penny-Journey-Map_v2.html) / [scorecard](docs/Penny-Release-Scorecard.html) | Shareable historical story/status | Version new factual updates; earlier checks do not prove V3.2 readiness |

During implementation each source change/PR description must name relevant requirement and case IDs. The release record must add exact commit SHA, test report references and unresolved/pending items. Automated log cases support requirements but do not prove physical voice or uncoached UI results.

## Completeness checks

1. Every in-scope REQ/UI row has at least one design reference and one planned case.
2. All named ACC/LOG/LOGB IDs resolve to a case in the linked specification.
3. Local relative document links and explicit anchors exist, including historical baseline links in the remote repository.
4. Any deferral is recorded in plan, design and matrix consistently; required voice/data/privacy/accessibility checks are not silently dropped.
5. No V3.2 row becomes Tested/Released until executed evidence for the relevant SHA exists.
