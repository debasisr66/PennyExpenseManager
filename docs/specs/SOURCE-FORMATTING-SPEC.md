# Group E: readable source formatting. Impact and plan

Status: **decisions approved 17 November 2026**: D1 (a) pinned Prettier, run once in a container, with config committed; D2 (a) all runtime files; D3 (a) tests frozen after a pattern-only first commit; D4 (a) bump to 3.2.1, with the release published after merge and smoke. In progress.
Scope: whitespace and layout of first-party source files only. **No behaviour change.** Every claim of "no behaviour change" below is backed by a mechanical proof, not by reading the diff.

## Why

Most first-party code is written as very long single lines. A one-character fix shows up in review as a changed 2,000-character line, so reviews, blame and diffs are close to useless. That is a security problem as well as a style one: a reviewer cannot see what changed.

| File | Bytes | Lines | Longest line | Lines over 200 chars |
|---|---|---|---|---|
| `index.html` | 22,057 | 35 | 4,085 | 22 |
| `styles.css` | 14,192 | 17 | 6,217 | 6 |
| `app.js` | 49,292 | 295 | 1,976 | 66 |
| `data.js` | 12,762 | 35 | 2,018 | 16 |
| `spreadsheet.js` | 6,968 | 10 | 2,458 | 6 |
| `hindi.js` | 17,618 | 96 | 1,413 | 17 |
| `core.js`, `diagnostics.js`, `storage.js`, `translation.js`, `import-worker.js` | 43,506 | 381 | 923 | 54 |
| `voice.js` | 6,715 | 170 | 128 | 0 (already readable) |
| `tests/*.cjs` and fixtures | ~74,000 | ~420 | 748 | 151 |

## What depends on the current formatting (checked)

| Dependency | Effect of formatting | Handling |
|---|---|---|
| `tests/ui-colours.test.cjs` reads `styles.css` with `/--name:(#hex)/` and no space allowed | Formatted CSS writes `--name: #hex`, so the test would fail | D3 |
| `tests/version.test.cjs` expects `appVersion:'3.2.0'` and `Version 3.2.0` | The formatter writes `appVersion: "3.2.0"` and may wrap "Version" onto its own line | D3 |
| `tests/serve-tests.cjs` rewrites `<script src="core.js">` and `<script src="app.js">` in `index.html` for the browser harness | Survives if the tags are printed unchanged | Verified after formatting |
| Tests that `require()` runtime modules | Unaffected by whitespace | AST proof below |
| CSP (`script-src 'self'`, no inline script) | Unaffected; no inline script or style is added | Header check |
| `pages.yml` | Runtime files change, so **merging deploys to Pages** | D4 |
| Studio hub | Reads releases only. Changes only if a release is published | D4 |
| `vendor/` (SheetJS, hash recorded in `DEPENDENCIES.md`) | Must not be touched | Freeze list |
| Storage keys and data `schemaVersion` values | They are inside string literals and the AST proof covers them | Freeze list |

`index.html` contains `<pre>` and `<textarea>`, and `styles.css` sets `white-space: pre-wrap` on one selector. These are the places where an HTML formatter could change what the user sees. The rendering proof below is designed to catch that.

## Decisions

- **D1: tool and how formatting stays consistent.**
  - (a) **Recommended.** Use [Prettier](https://prettier.io) at one exact pinned version, run once inside a throwaway `node:22-alpine` container, so nothing is installed on the host or in the repo.
    - Commit only `.prettierrc.json` (a few lines) and `.prettierignore` (`vendor/`, `tests/hindi-corpus.json`).
    - README gets the one-line command to reformat.
    - The project stays free of a toolchain: no `package.json`, no `node_modules`.
  - (b) As (a), plus a CI step that runs the pinned Prettier with `--check`. This catches drift, but every CI run then downloads a package from npm. Easy to add later if drift appears.
  - (c) Format by hand. Rejected: it can't be reproduced or proven.
  - (d) Leave the code as it is.
- **D2: which files.**
  - (a) **Recommended.** All first-party runtime files: the 10 root `.js` files, `styles.css` and `index.html`. Each file type has its own proof (below).
  - (b) JavaScript only, with `styles.css` and `index.html` left as they are. Lower risk, but the two least readable files stay unreadable.
- **D3: test files.**
  - (a) **Recommended.** Freeze the tests as the referee, with one exception. In a first, separate commit, relax the three source-text patterns to accept any whitespace and either quote style (`:\s*`, `Version\s+`, `appVersion:\s*["']`). That commit must pass against the **unformatted** code, which shows the change is not "editing a test to pass". After that, no test file changes. The same tests then judge the formatted code.
  - (b) Also format the tests. Readable tests, but the referee changes in the same PR as the code it judges, and the diff doubles.
- **D4: release.**
  - (a) **Recommended.**
    - Bump `VERSION` to 3.2.1 and update the copies the version test names.
    - Add a CHANGELOG entry: "Source formatting only; no behaviour change."
    - What's New content stays as it is; only the badge shows 3.2.1.
    - After merge, the Pages deploy and your 2-minute smoke, I publish GitHub release `v3.2.1` with a source zip. That needs your go-ahead at that point. Studio then picks it up.
  - (b) No bump. Live files no longer match the `v3.2` release, while the site still says 3.2.0.
  - (c) Bump, but hold the release until Group F, so one release covers E and F.

## Change (if all (a))

The PR has three commits, verified one by one:

1. **Test patterns.** Make the three regex relaxations in `tests/ui-colours.test.cjs` and `tests/version.test.cjs`. Tests pass on the **current** code (639).
2. **Formatting.**
   - Add `.prettierrc.json` and `.prettierignore`.
   - Output of exactly one pinned command over the D2 files, with no hand edits.
   - A reviewer can rerun the command and must get a byte-identical tree.
3. **Release 3.2.1.** `VERSION`, its copies, CHANGELOG and README note.

Expected size: formatted files grow from added whitespace, roughly 20–40%, about 50–80 KB in total, before gzip. Pages compresses responses.

## Proofs of "no behaviour change"

| Proof | What it shows |
|---|---|
| **JavaScript AST identity** | For each `.js` file, parse before and after with an independent parser (acorn, pinned, run in the throwaway container) and compare the trees with positions and raw text removed. They must be identical. Quote style and whitespace disappear, while every identifier, string value, number and operator must match. Prettier's own `--debug-check` also runs as a second opinion |
| **Rendering identity** | Serve `main` and the branch side by side with the existing local harness and load both in a browser. For every element, the computed style, text content, and attributes other than whitespace must match. The pass is repeated with each dialog open (What's New, Settings, Start fresh) and at 320 px and desktop widths. This covers `index.html` and `styles.css`, including the `<pre>`, `<textarea>` and `pre-wrap` cases |
| **Tests** | After commit 1 the tests are frozen. 639 pass on the formatted code, inside the Docker build too |
| **Reproducibility** | Rerunning the pinned command on the branch produces no change |
| **Freeze check** | Everything not named in this spec is byte-identical to `main` |

## Freeze list (a check proves it)

- **`vendor/`** and `tests/hindi-corpus.json`.
- **Every test file and fixture after commit 1.**
- **`Dockerfile`, `.dockerignore`, `nginx.conf`, `compose.yaml` (except its version tag), `scripts/penny` (except its version line) and all workflows.**
- **Storage keys, data schema versions, CSP and the runtime file list.**
- **Existing releases and tags.**

## Test plan

- The proofs above.
- `docker build` succeeds.
- An independent review on a different model, briefed with the diff and the reproduction command. It reruns the command itself.
- After merge:
  - CI passes.
  - Pages deploys, and live runtime files match the branch byte for byte.
  - The app returns 200, with the CSP header and meta tag intact.
- **2-minute manual smoke (yours), per the checklist:**
  - Open the app, with no console errors, in two browsers.
  - Add, edit and delete an expense.
  - Export and re-import JSON.
  - Open each dialog twice.
  - Check that the version shows 3.2.1.
- Then the D4 release step, and Studio picks up v3.2.1.

## Not in scope

- Renaming, refactoring, dead-code removal or comments: anything that changes the AST.
- Group F (Docker and Excel scope).
- `scripts/penny` layout.
- Adding a CI formatting check (that is D1 (b)).
