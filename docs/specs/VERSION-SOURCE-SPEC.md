# Group D: one version source. Impact and plan

Status: **draft, awaiting decisions D1–D3.**
Scope: how the app version `3.2.0` is recorded and kept consistent. The app version stays 3.2.0. Data schema versions are out of scope.

## Why

The version `3.2.0` is typed by hand in 8 places across 5 files. A release bump must find and change all of them, and nothing catches a miss. A missed copy shows the wrong version to the user, or puts the wrong version in exported diagnostics.

## Where the version lives today (checked)

| File | Copies | What reads it |
|---|---|---|
| `index.html` | 3: header `V3.2.0 · INR`, What's New badge `V3.2.0`, Settings › About `Version 3.2.0` | The user |
| `diagnostics.js` | 2: `appVersion:'3.2.0'` on each event and in the export | Exported diagnostics files |
| `scripts/penny` | 1: `PENNY_VERSION="3.2.0"` | Launcher banner and messages. Installed as a copy in `~/.local/bin`, so it must stay self-contained |
| `compose.yaml` | 1: image tag `penny-expense-manager:3.2.0` | The local Docker image name |
| `.github/workflows/verify.yml` | 1: `docker build -t penny-expense-manager:3.2.0` | Nothing: CI throws the image away |

These are **not** app versions and must not change:
- Data `schemaVersion` values (1–4 in `core.js`, `data.js` and `diagnostics.js`).
- Storage keys `penny-v32-envelope`, `penny-v3-document`, `penny-v3-backup` and `penny-v3-fallback`. Renaming any of them would orphan saved user data.
- Historical headings in `CHANGELOG.md`, `README.md` and the docs.

## What depends on the version (checked)

| Consumer | Result |
|---|---|
| Studio hub | Reads the GitHub release `tag_name` only (`sync-products.js`), never repo files. Unaffected |
| Tests | No existing test asserts the version |
| Docker build | Runs the full test suite inside the image. `.dockerignore` excludes `.github/`, so **no test can read `verify.yml`** inside the build. This shapes D2 |
| Pages | Deploys when a runtime file changes. D1 (a) changes none |

## Decisions

- **D1: where the one source lives.**
  - (a) **Recommended.** Add a root `VERSION` file containing `3.2.0`, plus one new test that fails if any copy above differs from it. The failure message names each file to update. Runtime files are unchanged, so there is no behaviour change, no Pages deployment and no release. A bump becomes: edit `VERSION`, run the tests, fix what they name.
  - (b) A runtime `version.js` sets `PENNY_VERSION`; `index.html` fills its three labels from it and `diagnostics.js` reads it. This is a true single source at runtime, but it has costs:
    - a 13th runtime file in three lists (`Dockerfile`, and twice in `pages.yml`);
    - new DOM-filling code, and labels that are empty if the script fails;
    - `scripts/penny` and `compose.yaml` still need their own copies;
    - it is a runtime change, so it needs a 3.2.1 release and a smoke test.
  - (c) `package.json` plus a build step that stamps the version. Rejected: it adds a toolchain to a no-build app.
- **D2: the `verify.yml` image tag.**
  - (a) **Recommended.** Change it to `penny-expense-manager:ci`. Nothing reads that tag, so a copy disappears instead of being policed.
  - (b) Keep it and check it in the test. The test cannot see `.github/` during the Docker build, so it would have to skip there silently.
- **D3: release.**
  - (a) **Recommended.** No release. With D1 (a), no runtime file changes and the version stays 3.2.0. The first real bump (3.2.1, Groups E and F) uses the new check.
  - (b) Cut 3.2.1 now. This is required only if D1 (b) is chosen.

## Change (if D1 (a), D2 (a), D3 (a))

| File | Change |
|---|---|
| `VERSION` | New file containing `3.2.0` |
| `tests/version.test.cjs` | New test, described below |
| `.github/workflows/verify.yml` | Image tag `3.2.0` → `ci` (one line) |
| `README.md` | One line under Testing: "The version lives in `VERSION`; `tests/version.test.cjs` lists every copy to update." |

The new test checks four things:
- `VERSION` is `MAJOR.MINOR.PATCH`.
- Each copy listed above, matched by its exact pattern, equals `VERSION`. Each file must contain the expected number of copies, so a deleted copy also fails.
- No other `V<major>.<minor>.<patch>` app-version string in `index.html` differs from `VERSION`.
- It reads only files that are inside the Docker build context.

One group, one PR: about 4 files and 40 lines.

## Freeze list (a check proves it)

- **Every runtime file and `vendor/`.** Proof: byte-identical to `main`, so `pages.yml` does not run.
- **Every existing test file.** Proof: byte-identical, and the existing 633 tests still pass. The count rises only by the new tests.
- **`Dockerfile`, `.dockerignore`, `nginx.conf`, `compose.yaml`, `scripts/penny`, `pages.yml` and `notify-studio.yml`.** Proof: byte-identical.
- **Storage keys and data `schemaVersion` values.** These are covered by the runtime freeze.
- **Releases and tags.** Untouched.

## Test plan

- `node --test tests/*.test.cjs`: 633 existing tests plus the new ones pass, with 0 fail.
- **Negative proof:**
  - Temporarily set `VERSION` to `3.2.1` and confirm the test fails and names every file. Revert.
  - Temporarily change one copy, for example in `diagnostics.js`, and confirm the test fails on that file only. Revert.
- **Freeze check:** hash every frozen file on `main` and on the branch; they must be identical.
- **Docker:** `docker build` succeeds, which proves the new test passes inside the build context.
- **Independent review:** a fresh agent on a different model reviews the diff, briefed with the code.
- **After merge:**
  - CI `verify` passes.
  - No Pages deployment runs.
  - `notify-studio.yml` fires once, because `README.md` changed, and the Studio sync succeeds.
  - The app URL still returns 200.

## Not in scope

- Changing the version number.
- Groups E (formatting the source) and F (Docker and Excel scope).
- Data schema versions.
- Storage keys.
- Studio.
