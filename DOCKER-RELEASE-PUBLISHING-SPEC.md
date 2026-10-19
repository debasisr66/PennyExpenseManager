> V3.2 release note (19 October 2026): local build/runtime evidence is in [V3.2-TEST-RESULTS.md](V3.2-TEST-RESULTS.md). Publication steps below remain a specification, not evidence of a registry push or public release. Use the V3.2 source folder containing this file; the launcher resolves it relative to itself.

# Penny Docker Release Publishing Specification

Document version: 1.0  
Date: 15 October 2026  
Status: Proposed release process; image publication is not performed by this document  
Repository: https://github.com/debasisr66/PennyExpenseManager  
Application release: V3.2.0 / `v3.2`; prior V3.1 source baseline: `9bb7eda30f5ad4109618834cbcbfec362eb70b2b`

## 1. Purpose and outcome

Publish a tested, traceable Docker image so another person can run Penny without downloading and building its source. Use GitHub Container Registry (GHCR), linked to the Penny repository.

The release is complete when an unauthenticated user can pull the approved public image, run it on ARM64 or AMD64, see a healthy container, and use the app. The image must be traceable to its source commit and test evidence.

This specification defines implementation and acceptance requirements. It does not claim that Docker validation or image publication has already been completed.

## 2. Scope

Include:

- Docker build validation and functional smoke tests.
- ARM64 and AMD64 release images.
- Security review, vulnerability scan, software inventory and build provenance.
- Controlled publication to GHCR.
- Version tags, release documentation, installation, updates and rollback.
- A downloadable Compose file for running the published image.

The runtime remains a static web server. Personal expenses and budgets stay in browser storage. No server database, account system or data synchronization is introduced. GitHub Pages remains a separate distribution channel.

## 3. Current baseline and implementation gaps

Existing local files include `Dockerfile`, `.dockerignore`, `nginx.conf`, `compose.yaml` and `scripts/penny`. The Dockerfile tests the application in a Node stage and serves an explicit application file list through unprivileged NGINX. Compose requests a read-only filesystem, temporary `/tmp`, dropped capabilities and no new privileges.

Before publication:

1. Reconcile and commit these files to the repository using the latest remote head. Preserve unrelated changes.
2. Fix the syntax-check loop so any failed `node --check` stops the build immediately. The current loop can hide an earlier failure when a later file passes. Use an explicit `|| exit 1` for each check, or equivalent fail-fast behavior.
3. Pin Node and NGINX base images to verified multi-platform digests.
4. Add OCI image labels for source repository, version, revision, license and creation time.
5. Configure NGINX to operate without trying to modify its read-only configuration at startup. Validate the actual entrypoint and `/tmp` requirements.
6. Resolve the runtime license-notice requirements for Penny and bundled dependencies, and include applicable notices without exposing development files.
7. Add the CI workflows and evidence files defined below.
8. Add a separate release Compose file that pulls GHCR images instead of building locally.

The exact release source SHA will differ from the application baseline after Docker release changes are committed. Record that new SHA; do not label the image with the older application-only SHA.

## 4. Registry and naming

Registry: `ghcr.io`  
Image: `ghcr.io/debasisr66/penny-expense-manager`  
Visibility: public after publication approval  
Source repository link: `https://github.com/debasisr66/PennyExpenseManager`

Repository visibility and package visibility must be checked separately. A public repository does not by itself prove that an image can be pulled anonymously. Set and verify the package access explicitly during the first release.

Use the repository workflow's short-lived `GITHUB_TOKEN` for registry authentication. A personal access token should not be added merely to support ordinary workflow publication. See [GitHub Container Registry guidance](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## 5. Version and tag policy

The first candidate version is `3.2.0`, subject to checking that this image tag does not already exist. A subsequent package change must use a new patch version; a published exact-version tag must never be reassigned.

| Reference | Purpose | Update rule |
| --- | --- | --- |
| `3.2.0` | Exact approved release | Never overwrite after publication |
| `sha-<full-source-sha>` | Source traceability | Never overwrite |
| `3.1` | Latest approved patch in 3.1 | Move only after validation |
| `3` | Latest approved release in major 3 | Move only after validation |
| `latest` | Current stable release | Move last, after pull verification |
| `@sha256:<index-digest>` | Exact multi-platform artifact | Preferred for reproducible installs |

Semantic version, application display version and README release notes must agree. If packaging alone needs a patch release, explain that in the notes.

## 6. Required repository deliverables

| File | Required purpose |
| --- | --- |
| `.github/workflows/docker-validate.yml` | Validate PRs and main without publishing images |
| `.github/workflows/docker-release.yml` | Publish only an approved, validated source SHA |
| `compose.release.yaml` | Pull and run a published image without source or local build |
| `DOCKER-RELEASE-PUBLISHING-SPEC.md` | This release contract |
| `DOCKER-RELEASE-RESULTS.md` | Actual executed checks, outcomes, source SHA and image digests |
| `README.md` | Installation, update, backup, limitations and rollback instructions |
| `scripts/penny` | Keep local build behavior clear; document any future registry mode |

Workflow artifacts must also include test output, per-platform smoke-test results, scanner reports, the software bill of materials (SBOM) and provenance references.

## 7. Validation workflow

Trigger on pull requests and changes to main affecting application, Docker or workflow files. This workflow has read access to source and no package publication permission.

Sequence:

1. Check out the exact source SHA.
2. Run all first-party and test-script syntax checks with fail-fast behavior.
3. Run the full automated suite. The current baseline is 189 tests; report the actual count and fail on failures or unexpected skipped checks. Do not hard-code an old count as the sole success criterion.
4. Run Dockerfile build checks and validate both Compose files.
5. Build the runtime image for `linux/arm64` and `linux/amd64`.
6. Run the checks in sections 8 and 9 on each platform. Native runners are preferred. If emulation is used, record it and perform a native smoke test before calling that platform fully verified.
7. Scan each platform image and generate an SBOM.
8. Save all reports with their source SHA.

Do not execute PR-controlled code in a privileged publishing workflow or expose publication credentials to untrusted pull requests.

## 8. Container and application acceptance

| Check | Pass condition |
| --- | --- |
| Startup | Container reaches `healthy` within 60 seconds |
| Health endpoint | `/healthz` returns HTTP 200 and `ok` |
| Root page | `/` serves the expected Penny version |
| Required assets | All referenced application, worker and vendor assets load |
| Runtime isolation | Process is non-root; filesystem is read-only; capabilities are dropped; no-new-privileges is active |
| Startup logs | No fatal startup or application-serving errors |
| Browser console | No JavaScript or policy errors in exercised flows |
| Expense flow | Add, edit and delete a disposable expense; totals and chart update |
| Budget | Exceeded budget produces the expected warning |
| Search and tags | Category, payment method and tag searches return expected records |
| File portability | CSV, genuine Excel and JSON exports can be imported correctly |
| Voice drafts | English amount extraction and Hindi/Spanish reviewed drafts preserve financial facts |
| Unknown vocabulary | Correction and approval are required before applying an incomplete draft |
| Restart | Browser data remains after container restart at the same origin and profile |
| Responsive UI | Desktop and 390-pixel mobile views remain usable without horizontal overflow |
| Missing files | Missing JavaScript/CSS assets return 404 rather than application HTML |

Use disposable browser profiles and fictional data. Separate simulated transcript tests from real microphone tests. Real iPhone capture depends on the browser/device speech service; Docker publication does not remove that dependency.

## 9. Security and supply-chain gates

Required gates:

- Base images and third-party workflow actions are pinned by digest or full commit SHA, respectively.
- No credentials, personal expense records, Git metadata, test fixtures or build tools are present in the runtime web root.
- Applicable license notices are included.
- Security headers are inspected on normal and error responses.
- Content Security Policy permits only required application behavior, including the worker and currency endpoint.
- Hidden files and directory listing are inaccessible.
- Each runtime platform image is scanned with a recorded scanner version and vulnerability database timestamp.
- Zero unreviewed Critical or High findings. An exception requires a written finding-specific reason, owner, expiry and explicit release-owner acceptance.
- Generate an SBOM and build provenance for the actual released digest.
- Keep build inputs free of secrets; provenance must not disclose sensitive build arguments.

GitHub supports attestations for container build provenance. Configure only the permissions required by the chosen attestation mechanism. See [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) and [Docker provenance](https://docs.docker.com/build/metadata/attestations/slsa-provenance/).

## 10. Publishing workflow and approval

Use a manually dispatched release workflow with an exact version and source SHA as inputs. Ordinary pushes must not publish stable tags.

### Before the approval point

1. Confirm the SHA belongs to reviewed main history and all relevant validation checks passed for that SHA.
2. Check that the requested version tag is unused.
3. Build both platform artifacts, run tests and scans, and preserve the artifacts as workflow outputs suitable for publication without rebuilding.
4. Assemble a reviewable release summary: version, source SHA, platform results, scan findings, limitations, proposed tags and public visibility.
5. Request the release owner's approval against that concrete summary.

### After explicit approval

1. Publish the preserved platform artifacts and multi-platform index to GHCR. If any rebuild is necessary, repeat testing and approval for the new artifact.
2. Attach SBOM/provenance to the published artifacts and record the index and platform digests.
3. Set package visibility to public if approved and required for the first release.
4. Pull the exact release anonymously on both supported platforms and run the health and functional smoke checks again.
5. If these checks pass, promote `3.1`, `3` and finally `latest` to the approved digest.
6. Publish release notes containing installation commands, source SHA, digest references, evidence links and known voice limitations.

If the GitHub account supports environment approval rules, use a protected `docker-release` environment. Otherwise keep publication manually controlled with documented explicit approval; do not silently substitute an automatic approval path.

Recommended job permissions: validation uses `contents: read`; publication adds `packages: write`; a GitHub attestation job may also need `attestations: write` and `id-token: write`. Restrict elevated permissions to the relevant jobs. See [GitHub publishing guidance](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images).

## 11. Multi-platform requirements

The published image index must contain runtime images for `linux/amd64` and `linux/arm64`. Attestation descriptors may also appear; they must not be mistaken for extra runnable architectures.

Inspect the published index with:

```sh
docker buildx imagetools inspect ghcr.io/debasisr66/penny-expense-manager:3.2.0
```

Both platform digests must correspond to the tested artifacts. See [Docker multi-platform builds in GitHub Actions](https://docs.docker.com/build/ci/github-actions/multi-platform/).

## 12. Consumer installation contract

The README must clearly say that the following command becomes usable only after the image is published:

```sh
docker run -d \
  --name penny \
  --init \
  --read-only \
  --tmpfs /tmp:size=16m,mode=1777 \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  ghcr.io/debasisr66/penny-expense-manager:3.2.0
```

Open `http://localhost:8080/`. Bind to localhost by default for a personal desktop deployment. Remote use requires a deliberate network binding and HTTPS through a hosting platform or reverse proxy.

The release Compose file must provide equivalent settings with an `image:` reference and no `build:` section. Support an exact image digest for reproducible operation. The existing source-building `compose.yaml` remains the development path.

No host database volume is needed. Browser storage is scoped to the browser profile and origin: switching between GitHub Pages, localhost, IP addresses or ports does not automatically transfer records. Document JSON export/import for migration.

## 13. Updating and rollback

Before upgrading, download a Penny JSON backup. Keep the same browser origin when preserving the same local record store.

For a Compose-managed release installation:

1. Record the currently deployed digest.
2. Change the image reference in `compose.release.yaml` to the approved new version or digest.
3. Run `docker compose -f compose.release.yaml pull`.
4. Run `docker compose -f compose.release.yaml up -d`.
5. Check health, application version and one expense read operation.

Rollback by restoring the previous approved image digest in that same file and repeating the pull/start steps. A rollback changes application files, not browser data. If browser-data schema compatibility is not established, review it and use the pre-upgrade backup through the supported import flow.

Never overwrite or delete an older release image as part of rollback. Do not silently retag a defective exact version. Stop promotion, document the issue and issue a corrected patch version.

## 14. Required release evidence record

`DOCKER-RELEASE-RESULTS.md` must contain:

- Release version, date and approver.
- Source commit SHA and reviewed change reference.
- Build workflow run URL and pinned base-image digests.
- Multi-platform index digest and individual platform digests.
- Automated test counts and links to logs.
- Per-platform health, isolation and browser smoke-test results.
- Native versus emulated execution details.
- Scan reports, timestamps and accepted exceptions, if any.
- SBOM and provenance references and verification result.
- Anonymous pull confirmation and package visibility.
- Known limitations, including physical voice-capture coverage.
- Installation instructions and rollback target.

Update README and the release scorecard only after actual checks support each changed status. Historical journey-map versions remain historical records unless a new document version is requested.

## 15. Completion checklist

- [ ] Docker changes are committed and reviewed against current main.
- [ ] Syntax-check loop fails immediately on any error.
- [ ] Base-image and workflow action references are pinned.
- [ ] Full automated suite passes on the release SHA.
- [ ] Both platform images are built and tested.
- [ ] Security and functional gates pass.
- [ ] SBOM and provenance are generated and verified.
- [ ] Release owner approves the specific artifacts and public publication.
- [ ] Exact version and source tags point to the tested artifacts.
- [ ] Anonymous public pulls and post-publication smoke checks pass.
- [ ] Stable aliases are promoted to the approved digest.
- [ ] README, release notes and Docker evidence are published.
- [ ] Previous approved digest and rollback instructions are recorded.

## 16. Acceptance decision

Publish only when every required gate is passed or a permitted exception is explicitly accepted and documented. Local operation being reported successful is useful feedback; it does not substitute for per-platform container tests, a vulnerability review or an anonymous registry pull check.
