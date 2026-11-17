# Repo simplification — impact and plan

Status: **awaiting decisions** (D1–D4). No file moved or deleted yet.
Scope: documentation and committed evidence only. No runtime, test, build or workflow change. App version stays 3.2.0.

## Why

About 1,000 lines of first-party app code sit beside about 2,500 lines of process documents, 424 KB of committed test evidence and 128 KB of Word copies. Most of it describes the v3.2 release and does not change again. A reader cannot tell which document is current.

## Everything removed stays retrievable

- **Git tag `v3.2`** holds every file as released.
- **Release asset `PennyExpenseManager-v3.2.zip`** contains the whole repo, including all documents and evidence.
- **Git history** keeps every version.

Links to removed files are rewritten as permanent links to tag `v3.2`, so no reader hits a dead link.

## Freeze list (must not change; a check proves it)

- Runtime files: `index.html`, `styles.css`, the 10 root `.js` files, `vendor/`. Proof: hashes identical to `main`.
- Tests and fixtures: everything under `tests/` except the committed results and evidence named below. Proof: hashes identical; 633 tests pass.
- Build and deploy: `Dockerfile`, `.dockerignore`, `nginx.conf`, `compose.yaml`, `scripts/penny`, `.github/workflows/*`, `.nojekyll` (needed if Pages is ever rolled back to branch mode).
- Releases and tags: untouched. Studio's download asset `PennyExpenseManager-*.zip` is unaffected.
- No Pages deployment: no runtime file changes, so `pages.yml` does not run.

## What depends on these files (checked)

| Check | Result |
|---|---|
| Tests or CI reading any document or evidence file | None. Tests read only `styles.css`, `index.html` and `tests/hindi-corpus.json` |
| Studio | Reads only the GitHub API and release assets; never repo files |
| `notify-studio.yml` | Fires when `README.md` or `CHANGELOG.md` changes on `main`. Group B edits both, so merging triggers one Studio sync. Harmless and expected |
| Inbound links | `README.md` links to 11 local documents; `SECURITY-REVIEW.md`, `CHANGELOG.md` and `docs/README.md` link to files that would be removed. All are repaired in the same PR |

## Target layout

```
README.md            how to use, run, test, deploy; links to the rest
CHANGELOG.md         release history (unchanged content, links repaired)
SECURITY-REVIEW.md   current security position (links repaired)
DEPENDENCIES.md      third-party record
LICENSE
docs/
  ARCHITECTURE.md    the one design document (see D2)
  specs/             SECURITY-QUICK-FIXES-SPEC.md, this spec
app files, Docker files, scripts/, tests/, vendor/   unchanged
```

Top-level documents: 17 → 4 (plus `LICENSE`).

## Groups (one PR each, pause between)

| Group | Change | Files |
|---|---|---|
| **A. Dead weight** | Remove `docs/EmptyFile`; the superseded journey map (`Penny-Journey-Map.html/.docx`, replaced by `_v2`); all three `.docx` copies of documents that also exist as HTML | 5 files, ~128 KB |
| **B+C. Documents and evidence** | Remove the documents and committed evidence listed below; repair links; rename and move per target layout | ~30 files |

B and C are one PR because they are coupled: the evidence files are referenced only by the documents B removes.

**Removed in B+C** (all preserved at tag `v3.2`):

- Plans and specs: `plan.md`, `design.md` (see D2), `DOCKERIZATION-SPEC.md`, `DOCKER-RELEASE-PUBLISHING-SPEC.md`, `START-HERE.txt`
- Test documentation: `TEST-CASES.md`, `TEST-RESULTS.md`, `V3.2-TEST-CASES.md`, `V3.2-TEST-RESULTS.md`, `EVENT-LOG-TEST-CASES.md`, `TRACEABILITY.md`
- Release records: `RELEASE-NOTES-v3.2.md`, `DEPLOYMENT-VERIFICATION-v3.2.md`, `V3.2-SHA256SUMS.txt`, `ADVERSARIAL-REVIEW.md` (see D3)
- Evidence: `tests/evidence/` (10 files), `tests/results.tap`, `tests/browser-results.json`
- Rendered copies: remaining `docs/*.html` (journey map v2, release scorecard, architecture HTML) and `docs/README.md`

## Decisions

- **D1 — removal method.**
  (a) Delete, with permanent links to tag `v3.2` — *recommended*: three copies already exist (tag, release zip, history).
  (b) Move to an `archive/` folder: nothing leaves the tree, but the clutter stays.
  (c) Upload to the v3.2 release as assets, then delete: duplicates what the zip already holds.
- **D2 — the one design document.**
  (a) Keep `docs/Penny-Architecture-and-Design.md` (201 lines, covers 3.1 baseline plus 3.2 contracts) as `docs/ARCHITECTURE.md`; remove `design.md` and `plan.md` (1,070 lines) — *recommended*. The independent reviewer will check that nothing current in `design.md` is lost; anything missing gets a short section added.
  (b) Keep `design.md` as the design document and drop the architecture file.
- **D3 — `ADVERSARIAL-REVIEW.md`.**
  (a) Remove; `SECURITY-REVIEW.md` links to it at tag `v3.2` — *recommended*.
  (b) Keep it beside `SECURITY-REVIEW.md` as current security evidence.
- **D4 — Groups D, E, F from the earlier proposal** (one version source; formatting the source; keeping Docker and Excel).
  (a) Out of this round — *recommended*: they change runtime files, so they are a 3.2.1 release with their own spec and smoke test.
  (b) Add D (version source) to this round.

## Test plan (per PR)

- `node --test tests/*.test.cjs`: 633 pass, 0 fail.
- Freeze check: hash every frozen file on `main` and on the branch; they must be identical.
- Link check: every relative Markdown link in the kept documents resolves to a file in the branch; every `v3.2` permalink returns 200.
- `docker build` still succeeds (the `Dockerfile` copies only runtime files, so it should be unaffected).
- Independent review of the diff by a fresh agent on a different model, briefed with the code.
- After merge of B+C: Studio sync run succeeds; app URL still 200; no Pages deployment ran.

## Not in scope

Runtime code, tests, workflows, Docker, version numbers, the Pages subdomain move.
