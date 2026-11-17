# Security quick fixes — impact and plan

Status: **awaiting decisions** (D1–D3). No code changed yet.
Scope: findings 2–5 of the November 2026 repo review. App version stays 3.2.0.

## Freeze list (must not change; a check proves it)

- Runtime files: `index.html`, `styles.css`, the ten first-party `.js` files, `vendor/`. Proof: their SHA-256 values still match `V3.2-SHA256SUMS.txt`.
- Public app URL: `https://debasisr66.github.io/PennyExpenseManager/` (Studio's "Open app" link).
- Studio contract: event `product-updated` sent to `debasisr66/studio`, payload `{"source_repo": "debasisr66/PennyExpenseManager"}`, secret `STUDIO_DISPATCH_TOKEN`, same triggers.
- Tests: the suite and its fixtures are not edited.

## What Studio depends on (checked in `debasisr66/studio`)

| Dependency | Where | Touched by this PR |
|---|---|---|
| `repository_dispatch` type `product-updated` | `sync.yml` | Sender changes form only (fix 2) |
| GitHub API `/repos/…` and `/releases/latest` | `sync-products.js`, `health-check.js` | No |
| Release asset `PennyExpenseManager-*.zip` | `products.json` | No |
| App URL | `products.json` | Only if fix 3 is deployed wrongly |

Studio never reads files from the Penny repo or its Pages site.

## Fixes

| # | Change | Files | Risk to Studio |
|---|---|---|---|
| 2 | Pin the dispatch Action to commit `ff45666b…` (= `v3`, identical code); add `permissions: {}`; correct the token comment to "Contents: Read and write" | `notify-studio.yml` | None: same code runs |
| 3 | Publish only the runtime files (see D2) | new `pages.yml` | URL must stay live: see rollout |
| 4 | Bind the container port to `127.0.0.1` | `compose.yaml` | None |
| 5 | nginx CSP matches the page's own policy: `base-uri 'none'`, `form-action 'none'`, no `blob:` workers | `nginx.conf` | None |

Fix 5 changes no behavior: the browser already applies both policies together, and the app starts its worker from `import-worker.js`, not a blob.

## Decisions

- **D1 — dispatch sender.** (a) Pin the existing Action by SHA — *recommended*, zero behavior change. (b) Replace it with one `gh api` call: no third-party code at all, but a new code path.
- **D2 — fix 3 shape.** (a) New Pages workflow uploads only the 12 runtime files and `vendor/`; no files move — *recommended*. (b) Move runtime files into `site/`: touches Dockerfile, tests, CI and the release zip. (c) Leave fix 3 out of this PR.
- **D3 — live Studio test before merge.** Run `Notify studio hub` from the PR branch. It triggers a real Studio sync, which commits only if product data changed. *Recommended: yes.*

## Rollout for fix 3 (order matters)

1. Merge the PR. Pages still serves from the branch; nothing changes for users.
2. Switch Pages source to "GitHub Actions" (repository setting; owner approval needed).
3. Run the Pages workflow; confirm the app URL returns 200 and the 13 runtime files match their hashes.
4. Rollback: switch the setting back to "Deploy from branch".

Side effect: `README`, `docs/`, `tests/` stop being served from `github.io`. Nothing in the repo or in Studio links to them there.

## Test plan

- `node --test tests/*.test.cjs` before and after: same pass count.
- Freeze check: runtime hashes against `V3.2-SHA256SUMS.txt`.
- `docker build`, then: port listens on 127.0.0.1 only; response CSP header as specified; app loads with no console errors; Excel import still works (worker path).
- Workflow syntax check; D3 live dispatch; Studio `sync.yml` run succeeds.
- Independent review of the diff by a fresh agent on a different model.

## Known stale records after merge

`V3.2-SHA256SUMS.txt` and `tests/evidence/runtime-headers.txt` describe the v3.2 release. They are left untouched as history; the three changed config files will no longer match them.
