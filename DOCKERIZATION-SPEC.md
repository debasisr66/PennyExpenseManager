> V3.2 release note (19 October 2026): local build/runtime evidence is in [V3.2-TEST-RESULTS.md](V3.2-TEST-RESULTS.md). Publication steps below remain a specification, not evidence of a registry push or public release. Use the V3.2 source folder containing this file; the launcher resolves it relative to itself.

# Penny Expense Manager Dockerization Specification

**Document version:** 1.0  
**Application version:** Penny V3.2.0  
**Date:** 14 October 2026  
**Status:** Implementation prepared; container build pending installation of Docker Desktop or another Docker-compatible runtime

## 1. Purpose

This specification defines how to package and run Penny Expense Manager as a secure, portable Docker container. It covers the container architecture, files, configuration, security controls, build process, validation, release criteria and operating instructions.

Penny is a static client-side web application. Docker serves its HTML, CSS, JavaScript and bundled spreadsheet library. Expense records and budgets remain in the user's browser storage.

## 2. Goals

The Docker implementation must:

1. Serve Penny on container port `8080`.
2. Run as an unprivileged user.
3. Run all automated tests before producing the runtime image.
4. Keep development tools and tests out of the runtime image.
5. Support read-only container operation.
6. Provide a health-check endpoint.
7. Add appropriate browser security headers.
8. Work on Apple Silicon and common AMD64 systems.
9. Preserve all existing Penny functionality.
10. Leave GitHub Pages deployment unchanged.

## 3. Out of scope

The first Docker release will not add:

- A server-side database
- User accounts or authentication
- Server-side synchronization
- A backend API
- Automatic HTTPS termination inside the Penny container
- A bundled general-purpose translation model

HTTPS should be provided by the hosting platform or a separate reverse proxy when Penny is exposed outside localhost.

## 4. Architecture

```text
User browser
    |
    | HTTP on localhost or HTTPS through a reverse proxy
    v
Unprivileged NGINX container :8080
    |
    +-- index.html
    +-- CSS and JavaScript modules
    +-- SheetJS runtime asset
    +-- /healthz

Browser IndexedDB
    +-- expenses
    +-- budgets
    +-- import undo data
```

The container is stateless. Restarting, rebuilding or deleting the container does not delete IndexedDB records in an unchanged browser profile. Clearing browser site data can remove those records.

## 5. Required repository files

### 5.1 `Dockerfile`

The Dockerfile uses two stages.

#### Verification stage

- Base: Node.js 22 Alpine
- Working directory: `/app`
- Copies the repository build context
- Runs `node --check` for first-party and test scripts
- Runs `node --test tests/*.test.cjs`
- Stops the build if a syntax check or test fails

#### Runtime stage

- Base: `nginxinc/nginx-unprivileged:stable-alpine`
- Runs without root privileges
- Listens on port `8080`
- Copies only the runtime application files
- Excludes tests, documentation, Git data and Node.js
- Defines a `/healthz` container health check

Before a production image is published, the selected base-image tags should be resolved and pinned by digest. Scheduled dependency maintenance should update those digests after tests pass.

### 5.2 `.dockerignore`

The build context excludes:

- `.git`
- `.github`
- operating-system metadata
- `node_modules`
- generated outputs and ZIP packages
- local logs

### 5.3 `nginx.conf`

NGINX must:

- Listen on IPv4 and IPv6 port `8080`
- Serve `/usr/share/nginx/html`
- Disable server version disclosure
- Disable hidden-file access
- Serve a plain-text `/healthz` response
- Return `index.html` for the application root
- Prevent stale release caching
- Send security headers on successful and error responses

Required response headers:

- `Content-Security-Policy`
- `Permissions-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`

The Content Security Policy must permit Penny's own scripts, styles, worker and data images. Network connections are limited to the same origin and `https://api.frankfurter.dev` for user-requested currency rates. Microphone permission is limited to the same origin.

### 5.4 `compose.yaml`

The Compose service must:

- Build from the repository root
- Publish host port `8080` to container port `8080`
- Use a stable local image name
- Run with a read-only root filesystem
- Mount a small temporary filesystem at `/tmp`
- Drop all Linux capabilities
- Set `no-new-privileges`
- Use the image health check
- Restart unless deliberately stopped

No host data volume is required because Penny stores its records in browser IndexedDB.

## 6. Runtime file allowlist

Only these application assets are copied into the final image:

```text
index.html
styles.css
app.js
core.js
data.js
storage.js
spreadsheet.js
import-worker.js
voice.js
translation.js
vendor/
```

Any new runtime asset added in a later Penny version must also be added to the Dockerfile allowlist and container smoke tests.

## 7. Local prerequisites

One of the following must be installed and running:

- Docker Desktop
- Docker Engine with the Compose plugin
- Another Docker-compatible runtime supporting Compose

Verify the environment with:

```sh
docker version
docker compose version
```

If `docker: command not found` appears, install and start a Docker runtime before continuing. At the time this specification was created, the current Mac did not have a `docker` command available.

## 8. Build procedure

From the repository root:

```sh
docker build --check .
docker build --pull -t penny-expense-manager:3.2.0 .
```

Expected result:

1. Dockerfile checks complete without errors.
2. All JavaScript syntax checks pass.
3. All 189 automated tests pass.
4. The runtime image is created.
5. The final image contains no Node.js runtime or test files.

## 9. Run procedure

### Penny command on this Mac

The command is installed at:

```text
/Users/debasisray/.local/bin/penny
```

Its version-controlled source is:

```text
scripts/penny
```

Because `~/.local/bin` is already on the shell `PATH`, it can be run from any folder:

```sh
penny --start
penny --status
penny --open
penny --logs
penny --stop
```

`penny --start` builds the image, starts the container, waits for a healthy status and opens the browser. It also removes the temporary Python preview previously used on port 8080.

### Compose

```sh
docker compose up --build -d
docker compose ps
```

Open:

```text
http://localhost:8080/
```

### Docker CLI

```sh
docker run --rm \
  --name penny-expense-manager \
  --read-only \
  --tmpfs /tmp:size=16m,mode=1777 \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -p 8080:8080 \
  penny-expense-manager:3.2.0
```

## 10. Health checks

Check the application endpoint:

```sh
curl --fail http://localhost:8080/
```

Check the dedicated health endpoint:

```sh
curl --fail http://localhost:8080/healthz
```

Expected response:

```text
ok
```

Check Docker health:

```sh
docker inspect \
  --format '{{.State.Health.Status}}' \
  penny-expense-manager
```

Expected status after the start period:

```text
healthy
```

## 11. Functional validation

The containerized application must pass these checks:

1. Dashboard loads with the fictional sample data.
2. October 2026 sample spending is ₹13,338.50.
3. October 2026 sample budget is ₹18,000.00.
4. An expense can be added, edited and deleted.
5. Monthly totals and the category chart update correctly.
6. Search, tags and payment rails work.
7. Budget warnings appear when spending exceeds the budget.
8. CSV, Excel and JSON import/export work.
9. Currency conversion works with manual and requested rates.
10. English voice parsing works after a transcript is captured.
11. Hindi and Spanish create reviewed English drafts.
12. Unknown Hindi or Spanish terms require correction.
13. The phone-keyboard dictation fallback remains available.
14. The app remains usable at 390×844 and desktop widths.
15. The browser console contains no application or CSP errors.

## 12. Storage validation

Perform the following sequence:

1. Add a disposable expense.
2. Refresh the page and confirm it remains.
3. Restart the container and confirm it remains.
4. Run `docker compose down`.
5. Start the container again and confirm it remains in the same browser profile.
6. Export a JSON backup.
7. Clear site data only after the backup is confirmed.

This proves the separation between the stateless container and browser-owned records.

## 13. Security validation

Before release:

1. Confirm the running process is not root.
2. Confirm the root filesystem is read-only.
3. Confirm all Linux capabilities are dropped.
4. Confirm `no-new-privileges` is active.
5. Confirm directory listing is disabled.
6. Confirm hidden files cannot be downloaded.
7. Confirm the expected security headers are present.
8. Confirm CSP does not block required application behavior.
9. Scan the final image for known vulnerabilities.
10. Record the base-image digests and scan results.

Suggested inspection commands:

```sh
docker exec penny-expense-manager id
docker inspect penny-expense-manager
curl -I http://localhost:8080/
docker scout cves penny-expense-manager:3.2.0
```

An equivalent trusted image scanner may replace Docker Scout.

## 14. Multi-platform validation

The release should build for:

- `linux/amd64`
- `linux/arm64`

Example local build command:

```sh
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t penny-expense-manager:3.2.0 \
  .
```

A multi-platform build should be published only after both platform builds and smoke tests succeed.

## 15. CI plan

Add a GitHub Actions workflow with these jobs:

1. Check JavaScript syntax.
2. Run all automated tests.
3. Run Docker build checks.
4. Build the final image.
5. Start the container.
6. Wait for a healthy state.
7. Run HTTP and browser smoke tests.
8. Scan the image.
9. Save test and scan evidence as workflow artifacts.

The first workflow should validate without publishing an image. Image publication must be enabled only after review and approval.

## 16. Image publishing plan

The recommended registry is GitHub Container Registry:

```text
ghcr.io/debasisr66/penny-expense-manager
```

Recommended tags:

```text
3.2.0
3.1
3
latest
```

The exact version tag is immutable. Moving tags are updated only after the exact version passes all release checks.

The image should include OCI labels for:

- Source repository
- Version
- Commit SHA
- License
- Build date
- Project URL

## 17. Reverse proxy and HTTPS

Localhost can be served directly over HTTP. A remotely accessible deployment must be placed behind HTTPS to support secure browser behavior, particularly microphone access.

The reverse proxy or hosting platform should:

- Terminate TLS
- Forward requests to container port `8080`
- Preserve the original scheme and host headers
- Redirect HTTP to HTTPS
- Use a valid public certificate

Authentication is outside the first Docker release. Do not expose private financial records through server-side logs or URL parameters.

## 18. Stop, update and rollback

Stop Penny:

```sh
docker compose down
```

Update from source:

```sh
git pull
docker compose build --pull
docker compose up -d
```

Rollback by running an earlier immutable image tag:

```sh
docker run --rm -p 8080:8080 \
  ghcr.io/debasisr66/penny-expense-manager:3.2.0
```

Browser data is not rolled back with the image. Export a Penny JSON backup before application upgrades.

## 19. Troubleshooting

### Browser reports connection refused

Check:

```sh
docker version
docker compose ps
docker compose logs penny
lsof -nP -iTCP:8080 -sTCP:LISTEN
```

Common causes:

- Docker is not installed.
- Docker Desktop is installed but not running.
- The container build failed because tests failed.
- Port 8080 is already occupied.
- The container started but failed its NGINX configuration check.

### Port 8080 is occupied

Use another host port without changing the container:

```sh
docker run --rm -p 8081:8080 penny-expense-manager:3.2.0
```

Then open `http://localhost:8081/`.

### Microphone does not work remotely

Confirm the deployment uses HTTPS, microphone permission is allowed for that origin, and the browser supports speech recognition for the chosen language. The phone-keyboard dictation path remains the fallback.

## 20. Release acceptance criteria

Dockerization is complete only when all of the following are true:

- [ ] Docker is installed and the engine is running.
- [ ] `docker build --check .` passes.
- [ ] The image builds with all 189 automated tests passing.
- [ ] The container becomes healthy.
- [ ] Root and `/healthz` return HTTP 200.
- [ ] The runtime process is non-root.
- [ ] Read-only operation succeeds.
- [ ] Security headers are present and correct.
- [ ] Browser functional checks pass.
- [ ] Mobile layout has no horizontal overflow.
- [ ] Import and export work from the containerized site.
- [ ] English, Hindi and Spanish transcript processing works.
- [ ] Container restart does not remove browser records.
- [ ] Vulnerability scan results are reviewed.
- [ ] AMD64 and ARM64 builds succeed.
- [ ] README and test evidence are updated.
- [ ] Publishing is separately approved.

## 21. Current implementation status

The repository currently contains:

- `.dockerignore`
- `Dockerfile`
- `nginx.conf`
- `compose.yaml`
- Docker operating instructions in `README.md`

The Penny application and automated Node tests are available. An actual image build and container security validation remain pending because the current Mac does not have the Docker command installed.

