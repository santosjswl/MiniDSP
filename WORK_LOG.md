# Work log — Agent maintains this automatically

## Environment / baseline
- Before this milestone the workspace contained documentation only; no app scaffold, source, test setup, fixtures, or Git repository.
- The prior detection entry is **NOT FOUND IN WORKSPACE – superseded**. Its reported test history is retained below as historical information only and was not verifiable against the starting workspace.
- Runtime: Node.js 24.19.0, npm 11.17.0. The approved package list was installed at its exact pinned versions.

## Progress
| Time (UTC) | Task | Changed files | Tests: command + actual result | Problems / fix | Git status |
|---|---|---|---|---|---|
| 2026-10-21T05:34:57Z | Prior detection entry — **NOT FOUND IN WORKSPACE – superseded** | Previously reported `package.json`, `src/detection.ts`, `tests/detection.test.ts`, `WORK_LOG.md`, `LEARNINGS.md`; absent at this milestone's start | Supplied log reported final `npm test`: 11 pass, 0 fail; historical only, not rerun or verified here | Implementation and test files were missing from the workspace | No Git repository |
| 2026-10-21T06:15:18Z | Milestone 1: app foundation and detection/classification | `.gitignore`, `package.json`, `package-lock.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.mts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/detection.ts`, `tests/detection.test.ts`, `tests/fixtures/acceptance-valid.txt`, `tests/fixtures/acceptance-invalid.txt`, `WORK_LOG.md`, `LEARNINGS.md` | Final `npm test`: 6 pass, 0 fail, exit 0. `npx tsc --noEmit`: pass, exit 0. `npm run lint`: pass, exit 0. `npm run build`: pass, exit 0. See milestone details for initial failures and retests. | First `npm test`: 2 pass/4 fail, exit 1. Fixed international phone spacing, invalid NINO suffix partial match, malformed email substring, and an invalid Luhn fixture number. Retest and final suite passed. | Unavailable: this directory is not a Git repository; no commit |
| 2026-10-21T06:22Z | Re-verification (no code changes) | `WORK_LOG.md` | `npm test`: 6 pass, 0 fail, exit 0. `npx tsc --noEmit`: exit 0. `npm run lint`: exit 0. `npm run build`: exit 0. | None | Not a Git repository (exit 128) |

### Superseded prior detection record
- The supplied prior entry reported test runs of 7/11, 9/11, then 11/11 passing. The corresponding implementation/tests were absent at this milestone's start, so those results are not evidence for the current workspace.

### Milestone 1 details
- Added a minimal Next.js App Router and TypeScript foundation. The root page intentionally renders no product UI; no upload, API, persistence, auth, Supabase, CSV, or design-system UI was added.
- Added Vitest and synthetic fixtures/tests for email (Low), UK mobile/geographic phone (Medium), format-checked UK NINO (High), and Luhn-valid 13–19 digit card candidates (Critical). Findings aggregate by type with count and one masked example; overall risk is the highest finding or `None`. Results contain no raw match field.
- Package list was approved before installation. Exact installed direct versions: Next.js / `eslint-config-next` 16.4.2, React / React DOM 19.3.1, TypeScript 5.9.3, Vitest 5.0.5, Vite 8.3.4, ESLint 9.39.5, `@types/node` 24.19.2, and React type packages 19.3.0.
- Initial `npm test`: 1 file, 6 tests; 2 passed, 4 failed, exit 1. The failures exposed accepted international spacing, suffix handling, malformed-address partial detection, and an invalid Luhn test candidate. After fixes, `npm test` passed twice: 6/6, exit 0.
- `npx tsc --noEmit`: pass, exit 0 on both runs. `npm run lint`: pass, exit 0 on both runs. `npm run build`: pass, exit 0 on both runs. Next.js updated `tsconfig.json` to set `jsx` to `react-jsx` and include `.next/dev/types/**/*.ts`.
- `npm install` reported 5 high-severity dependency advisories in the development lint dependency tree and marked the approved ESLint 9.39.5 package unsupported/deprecated. `npm audit --omit=dev` reported 0 vulnerabilities. No dependency remediation was applied beyond the approved package list; seek approval before changing it.
- No Git repository is present, so Git status and commit details are unavailable.

## Decisions and known gaps
- The root App Router page is an empty placeholder to keep this milestone limited to app foundation and detection; UI work requires the approved live design reference, which remains TODO in `DESIGN_REFERENCE.md`.
- Supabase, authentication, owner isolation, upload validation, persistence, API routes, and safe CSV export remain unimplemented and unverified.
- Full dependency audit still reports 5 high findings in development lint tooling; seek approval before changing the package set.
- Vercel, GitHub, live integrations, and deployment are not configured or verified.

## Security checks
- Detection returns only type, risk, count, and a masked example; a serialization test checks that complete synthetic values are absent. Detection does not log or persist content.
- `npm audit --omit=dev`: 0 vulnerabilities. Full install audit reported 5 high-severity development dependency advisories, not remediated.
- Authentication, RLS, upload handling, database/log safety, and two-user isolation were not in scope and were not tested.

## Milestone 2 progress — blocked before real database validation
- On re-entry, a Git repository and untracked Next.js/Supabase auth, upload, migration, and test files were already present. Reviewed these files; this log does not attribute their prior creation to this turn. User confirmed a dedicated development project and approved applying the named migration.
- Verified installed versions with `npm ls --depth=0`: `@supabase/supabase-js@2.118.0` and `@supabase/ssr@0.12.7`. No package install or manifest change was made in this turn.
- Replaced credential-like test-account entries in `.env.example` with placeholders. `.env.local` remains git-ignored; its contents were not read. If its prior example values were valid, rotate those test-account passwords.
- Tightened the not-yet-applied migration's finding constraints to require type-specific masked-example shapes and risk/type consistency. Added a real-database test that attempts a raw email example and checks rollback. This revised migration has not yet been applied.
- Final local checks: `npm test` 24 passed, 0 failed, exit 0; `npx tsc --noEmit` exit 0; `npm run lint` exit 0; `npm run build` exit 0.
- Real Supabase/RLS and upload integration tests: **NOT RUN**. The approved CLI was invoked temporarily as `supabase@2.121.0`, but `supabase link` exited 1 with `AccessTokenRequiredError`; there is no usable CLI login in this process context. No project link was created and no migration was applied. `psql` is also unavailable.
- Git status: repository exists on `master`, no commits; project files are untracked. No commit or push made.
- Local CLI invocation attempt: `npx --yes supabase@2.121.0 --version` reported 2.121.0, exit 0. `npx --yes supabase@2.121.0 link --project-ref <derived locally> --yes` exited 1 because the CLI could not find an access token. No token or credential should be pasted into chat.
- After the user reported browser sign-in, `npx --yes supabase@2.121.0 projects list --output json` exited 1 (output suppressed); dashboard browser sign-in did not establish CLI authentication in this process context.
- Next blocker: authenticate the approved CLI locally in the same Windows user context, then link/apply the revised migration and execute real two-user/database tests.

### Milestone 2 re-entry — 2026-10-21T07:33Z
- Supabase CLI still unauthenticated: `npx --yes supabase@2.121.0 projects list --output json` exit 1.
- `npx vitest run --config vitest.integration.config.mts tests/integration/supabase-rls.test.ts`: 1 suite failed, 11 tests skipped, exit 1 — test user A sign-in raised `AuthRetryableFetchError` (status 0).
- Diagnosis: Node fetch to the project and to supabase.com fails with `SELF_SIGNED_CERT_IN_CHAIN` (local TLS-inspection CA not trusted by Node). With `NODE_USE_SYSTEM_CA=1` (Windows trust store; TLS verification stays on) the auth health endpoint returned HTTP 200. Do **not** use `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- Retest with `NODE_USE_SYSTEM_CA=1`: 1 suite failed, 11 skipped, exit 1 — sign-in `invalid_credentials`. Test accounts in `.env.local` do not exist or their passwords do not match.
- Anonymous probe (no data read): `scans` HEAD returned HTTP 401; `create_scan_with_findings` RPC returned `42501` (permission denied, not "function not found"). Indicates migration objects exist and anon is denied. **UNVERIFIED** which revision of the migration was applied.
- Local mocked checks: `npm test` 2 files, 24 passed, 0 failed, exit 0; `npx tsc --noEmit` exit 0; `npm run lint` exit 0; `npm run build` exit 0. Mocked route tests are not evidence of RLS.
- Real RLS, cross-user, rollback and upload E2E checks: **NOT RUN** (blocked on test accounts). No commit or push.
- Human decisions (07:35Z): installed Supabase packages (`@supabase/supabase-js@2.118.0`, `@supabase/ssr@0.12.7`) approved retroactively; user states the migration is already applied (revision still verified only by the pending raw-email RLS test); user will create test users A/B and then ask to continue; user requested a new repository named "MiniDSP" — not yet created (scope — local vs private GitHub repo — pending confirmation).
- 2026-10-21T07:41:10Z retry (Milestone 3 gated on this): `NODE_USE_SYSTEM_CA=1 npx vitest run --config vitest.integration.config.mts tests/integration/supabase-rls.test.ts` — 1 suite failed, 11 skipped, exit 1, test user A `invalid_credentials`. Milestone 3 not started.
- 2026-10-21T07:52:27Z retry: `NODE_USE_SYSTEM_CA=1 npx vitest run --config vitest.integration.config.mts tests/integration/supabase-rls.test.ts` — 1 suite failed, 11 skipped, exit 1, test user A `invalid_credentials`. Did not start upload E2E or Milestone 3.
- 2026-10-21T08:02:19Z after user updated `.env.local`: both test users sign in (checked without printing values). Same RLS command — **REAL dev database: 10 passed, 1 failed, exit 1.** Passed: own read, masked-only own findings, B cannot read A's scan/findings, B cannot attach findings to A's scan (3 variants), B cannot forge a scan owned by A, update/delete denied, anon read/save denied, failed finding write rolls back the scan. **Failed: the database accepted `alex@example.test*` as an email masked example** — the live DB has the older, weaker masked-example check, not the current migration file.
- Consequence: that test persisted one synthetic row whose `masked_example` contains a full synthetic email. Authenticated users have no delete grant; it is removed by the hardening migration below.
- 2026-10-21T08:03Z `NODE_USE_SYSTEM_CA=1 MINIDSP_BASE_URL=http://127.0.0.1:3000 npx vitest run --config vitest.integration.config.mts tests/integration/upload-e2e.test.ts` against the running dev server — **REAL app + dev database: 5 passed, 0 failed, exit 0** (wrong-password sign-in, unauthenticated 401, six invalid uploads rejected with no new records, exact 1 MiB accepted, mixed upload stored masked-only and hidden from user B).
- Added `supabase/migrations/20261021000100_harden_masked_examples.sql` (NOT APPLIED; awaiting approval): deletes scans with non-conforming findings, drops old masked-example/risk checks, adds strict type-specific checks.
- Human decision (08:04Z): user approved the hardening migration, including deletion of non-conforming synthetic test rows; user to run it in the Supabase SQL Editor.

### Milestone 2 verification run — 2026-10-21T08:07Z (requested rerun)
| Command | Environment | Pass / fail / skip | Exit |
|---|---|---|---|
| `NODE_USE_SYSTEM_CA=1 npx vitest run --config vitest.integration.config.mts tests/integration/supabase-rls.test.ts` | REAL dev database | 10 / 1 / 0 | 1 |
| `NODE_USE_SYSTEM_CA=1 MINIDSP_BASE_URL=http://127.0.0.1:3000 npx vitest run --config vitest.integration.config.mts tests/integration/upload-e2e.test.ts` | REAL app + dev database | 5 / 0 / 0 | 0 |
| `npm test` | Unit + mocked Supabase (not RLS evidence) | 24 / 0 / 0 (2 files) | 0 |
| `npx tsc --noEmit` | Local | 0 type errors | 0 |
| `npm run lint` | Local | 22 files, 0 errors, 0 warnings | 0 |
| `npm run build` | Local | compiled; 6 routes + proxy; no errors | 0 |
- Failing test: "rejects a raw or incorrectly masked example at the database boundary" — DB accepted `alex@example.test*`. The approved hardening migration is **still not applied** to the live database.
- Fix attempt BLOCKED: no Supabase CLI login (`SUPABASE_ACCESS_TOKEN` absent, no CLI token file), no database connection string, and no service-role key by design. Applying requires the human to run the migration in the SQL Editor. Affected test not rerun after a fix because no fix could be applied.
- Read-only count as user A: **3** synthetic scans named `*-unmasked.csv` now persist with a full synthetic email in `masked_example` (one per failing run). The approved migration deletes them. Do not rerun the RLS suite before the migration, as each run adds one.
- Development dependency audit findings and ESLint 9 deprecation remain open (unchanged).

### Milestone 2 status (end of this run)
- **Completed and verified on the real database:** sign-in/sign-out; server-side session check on `/api/scans`; upload validation (empty, >1 MiB, binary, invalid UTF-8, unsupported extension, mismatched type) with no records created; exactly 1 MiB accepted; masked-only response and storage via the app; owner-scoped reads; User B cannot read A's data, attach findings to A's scan, or forge an A-owned scan; update/delete denied; anon denied; failed finding write rolls back the scan.
- **UNVERIFIED / open:** database-level rejection of unmasked examples (awaiting migration); removal of 3 leaked synthetic rows; migration revision applied to live DB. Milestone 3 not started.
- Git: local repo on `master`, no commits; nothing pushed. Repository naming/remote ("MiniDSP") still awaiting confirmation.
- Human decision: user approved the hardening migration (including deletion of non-conforming synthetic rows), to be run by the user in the Supabase SQL Editor.

### Milestone 2 verification run — 2026-10-21T08:05Z
| Command | Environment | Result | Exit |
|---|---|---|---|
| `NODE_USE_SYSTEM_CA=1 npx vitest run --config vitest.integration.config.mts tests/integration/supabase-rls.test.ts` | REAL dev DB | 10 passed, 1 failed, 0 skipped | 1 |
| `NODE_USE_SYSTEM_CA=1 MINIDSP_BASE_URL=http://127.0.0.1:3000 npx vitest run --config vitest.integration.config.mts tests/integration/upload-e2e.test.ts` | REAL app + dev DB | 5 passed, 0 failed, 0 skipped | 0 |
| `npm test` | Unit + mocked Supabase | 2 files, 24 passed, 0 failed, 0 skipped | 0 |
| `npx tsc --noEmit` | Local | pass | 0 |
| `npm run lint` | Local | pass | 0 |
| `npm run build` | Local | pass | 0 |

- The single failure is unchanged: the live DB still accepts `alex@example.test*` as an email masked example, so the approved hardening migration has **not yet taken effect**. It cannot be applied from here (Supabase CLI unauthenticated; no service-role key by design).
- Each RLS-suite run while the DB is weak stores one more synthetic row containing a full synthetic email (two so far). The hardening migration deletes them. Do not rerun the suite until the migration is applied.
- Verified for real: two-user read isolation; B cannot attach findings to A's scan (3 variants) or forge an A-owned scan; update/delete denied; anon read/save denied; failed finding write rolls back the scan; invalid uploads create no records; stored and returned upload data is masked-only.
- **Outstanding / UNVERIFIED:** database-level enforcement of masked examples; cleanup of the leaked synthetic rows. Milestone 2 is not complete until the RLS suite passes 11/11 after the migration. No Git commit made.

## Milestone 3 — product UI and stored-data flow (2026-10-21T08:28:07Z)

- Human decision: implement Milestone 3 only, without reopening Milestone 2 scope except for discovered blockers. The earlier live database-masking failure remains unresolved; no migration was applied or changed in this milestone.
- Approved and installed dev-only UI test packages: `@testing-library/react@16.3.3`, `@testing-library/dom@10.4.2`, `jsdom@30.1.3`. No application dependency or audit-remediation changes. Installation still reports 5 high development dependency advisories.
- Completed: responsive upload, immediate masked scan result, persisted dashboard totals, High/Critical file indicators, risk distribution, newest five scans, findings with filename/UTC date/type/risk/count/masked example, combined type/risk filters, loading/empty/no-match/error/retry states, and safe page-level loading/error boundaries.
- Added `GET /api/scans`: server-side session verification, explicit owner filter plus existing RLS, private/no-store responses, all database pages read (500 rows per page, tested with 501). No service-role client. Dashboard totals come from stored scan counts; filters never change those totals.
- UI refreshes persisted history after a successful upload rather than incrementing optimistic counters. Older in-flight history responses cannot overwrite a newer refresh. A failed refresh is shown separately from a successful save.
- Existing legacy examples may contain the known invalid mask from Milestone 2 tests. GET withholds non-conforming examples and returns an explicit warning count; no unsafe stored example is sent to the UI. This protects the new read surface but **does not fix or verify database-level enforcement**.
- Browser discovered a tightly coupled blocker: Next dev normalized `request.url` to localhost while the actual Host and Origin were 127.0.0.1, causing legitimate uploads to return 403 and auth redirects to change hosts. Origin comparisons and auth redirects now use the actual Host (not `x-forwarded-host`); regression tests verify allowed same-host and denied cross-host requests.

### Actual validation evidence

| Exact command | Kind | Pass / fail / skip | Exit |
|---|---|---|---|
| `npx vitest run tests\workspace.test.tsx tests\scans.test.ts tests\history-route.test.ts tests\http.test.ts tests\pages.test.tsx` | Targeted DOM + unit/mocked session/HTTP/database | 31 / 0 / 0; 5 files | 0 |
| `npm test` | Full unit/DOM suite; excludes real integration suites | 56 / 0 / 0; 7 files | 0 |
| `npx tsc --noEmit` | Type-check | N/A test counts; no type errors | 0 |
| `npm run lint` | ESLint | N/A test counts; 0 errors, 0 warnings | 0 |
| `npm run build` | Production build | N/A test counts; compiled, 6 routes plus proxy | 0 |
| `$env:NODE_USE_SYSTEM_CA='1'; $env:MINIDSP_BASE_URL='http://127.0.0.1:3000'; npx vitest run --config vitest.integration.config.mts tests\integration\upload-e2e.test.ts` | REAL app + development Supabase | 7 / 0 / 0; 1 file | 0 |

- Failures/retests retained: initial targeted suite had 21 passed / 1 failed / 0 skipped (22 total), exit 1: an assertion selected both the visible and screen-reader loading label. Fixed the assertion; the 22-test rerun passed. The first two lint checks failed (one `react-hooks/set-state-in-effect` error each); changed initial loading to use request completion callbacks, then lint passed. Vite warned that the old esbuild JSX option was ignored; switched to Vite 8's supported oxc JSX configuration. Extended targeted runs passed 26/26 and finally 31/31; full runs passed 51/51 and finally 56/56. Both production build runs passed. Type-checks passed.
- Real suite signs in via the app, rejects unauthenticated upload/history, checks invalid uploads leave counts unchanged, accepts exactly 1 MiB, verifies stored masked aggregates, compares history file count to the real owner database count, and verifies user B's history contains no user A IDs. These 7 checks do not rerun or replace the separate database-masking/RLS suite.

### Browser and design evidence (not runner test counts)

- Authenticated the integrated browser using a one-request, loopback-only helper calling the real sign-in route with the local test account. Credentials/cookies were not printed or saved; the helper stopped and its temporary source was deleted. An initial helper attempt failed only because its redirect assertion expected 127.0.0.1 rather than Next's normalized localhost; checking the redirect path allowed the real sign-in.
- Real browser form submission of one synthetic mixed file returned a saved masked result. Stored dashboard changed from 12 files / 33 findings to 13 / 37 and Critical files from 6 to 7. Raw synthetic matches were absent from page text. Type filtering and combined no-match risk filtering worked.
- Desktop 1440px: no page overflow and a two-column dashboard. Mobile 390px: no page overflow and a one-column dashboard; findings scroll region 327px wide with a 1152px inner table. Login was also checked at 390px. An initial narrow table compressed six columns; corrected with a token-sized wrapper canvas rather than restyling Lepidus table internals.
- Light/dark/high-contrast tokens resolved to distinct expected page/text colors without overflow. All layout CSS token names were found in the supplied contract (0 undocumented tokens).
- Browser pointer actionability checks timed out; actual form submission and radio changes were then exercised through DOM events in the real browser. The integrated tool delivered no keyboard events during an ArrowRight probe, so native keyboard navigation/manual accessibility is **UNVERIFIED**, not claimed passed.
- Applied `design.md` section 2's theme shell and versioned CSS/JS, section 5's Button/Input/Card/Badge/Table/Radio/Message/Spinner/EmptyState/Link anatomy, and section 7's token-only layout wrappers. No Tailwind or replacement component library. Risk distribution uses accessible counts and badges, not an invented chart.
- System gap: no dedicated file-picker component in the supplied inventory. Used a labelled native file input with help text plus documented Button/Message components. Live-reference/approved-assets fields in `DESIGN_REFERENCE.md` remain TODO; no design-owner approval or full compliance claim.

### Files, decisions and outstanding issues

- Changed: `package.json`, `package-lock.json`, `vitest.config.mts`, `src/lib/scans.ts`, `src/lib/http.ts`, `src/app/api/scans/route.ts`, `src/app/auth/sign-in/route.ts`, `src/app/auth/sign-out/route.ts`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/login/page.tsx`, `src/app/upload-form.tsx`, `src/app/workspace.tsx`, `src/app/components.tsx`, `src/app/globals.css`, `src/app/loading.tsx`, `src/app/error.tsx`, `tests/ui-fixtures.ts`, `tests/workspace.test.tsx`, `tests/scans.test.ts`, `tests/history-route.test.ts`, `tests/http.test.ts`, `tests/pages.test.tsx`, `tests/upload-route.test.ts`, `tests/integration/upload-e2e.test.ts`, `README.md`, `WORK_LOG.md`, `LEARNINGS.md`.
- Preserved existing detection code and behavior. No raw uploads/matches logged, retained, or exported; no CSV export/deployment work. `.env.local` remains Git-ignored; no secrets added to tracked source.
- **Outstanding / UNVERIFIED:** live database hardening migration and prior leaked synthetic-row cleanup; full RLS suite after that migration; manual keyboard/accessibility and design-owner sign-off; external design asset availability offline; existing development dependency audit findings. Synthetic scans created by successful real tests remain in the dedicated development account.
- Git: repository on `master`, no commits; all project files remain untracked. No commit, push or deployment. The development server is intended to remain available for the human.

## Milestone 4 — QA hardening and safe CSV export (2026-10-21T08:40:19Z)

- Pre-check (read-only, as user A): 3 leaked `*-unmasked.csv` scans still present, so the approved hardening migration is **not applied** to the live database. The RLS suite was deliberately **NOT RUN**, because each run against the weak schema adds one more leaked row.
- Added `GET /api/scans/export`. It verifies the session on the server (401 before any data query), validates `type`/`risk` against allow-lists (400; `Object.hasOwn` so prototype keys such as `toString` are rejected), and reads owner-scoped rows (explicit `owner_id` filter plus RLS, all pages, no service role). Any failed page returns a safe 503, never a partial CSV. Malformed stored examples are redacted before export.
- CSV (`src/lib/csv.ts`): every field is quoted per RFC 4180 (embedded quotes doubled, CRLF row endings). A `'` is prefixed to cells starting with `=`, `+`, `-`, `@`, tab or CR. Columns: Filename, Date (UTC ISO), Type, Risk, Count, Masked example. Headers: `text/csv; charset=utf-8`, `attachment; filename="minidsp-findings.csv"` (a fixed name, not user input), `private, no-store`, `nosniff`.
- Refactored the shared owner-history loader into `src/lib/scan-history.ts`; `GET /api/scans` behaviour is unchanged (existing tests pass).
- UI: a Lepidus standalone Link (`design.md` Link section: anchors for resources, not Button) labelled "Export filtered findings (CSV, masked)" carries the active type/risk filters. It is hidden when no rows match.

### Actual validation evidence

| Exact command | Kind | Pass / fail / skip | Exit |
|---|---|---|---|
| `npx vitest run tests/csv.test.ts tests/export-route.test.ts tests/workspace.test.tsx tests/history-route.test.ts` (1st) | Targeted unit/mocked/DOM | 25 / 0 / 0, but 1 file failed to parse | 1 |
| same (rerun) | Targeted unit/mocked/DOM | 40 / 0 / 0; 4 files | 0 |
| `$env:NODE_USE_SYSTEM_CA='1'; $env:MINIDSP_BASE_URL='http://127.0.0.1:3000'; npx vitest run --config vitest.integration.config.mts tests/integration/upload-e2e.test.ts` (1st) | REAL app + development Supabase | 11 / 1 / 0 | 1 |
| same (rerun) | REAL app + development Supabase | 12 / 0 / 0 | 0 |
| `npm test` | Full unit/DOM suite (excludes real suites) | 76 / 0 / 0; 9 files | 0 |
| `npx tsc --noEmit` | Type-check | no errors | 0 |
| `npm run lint` | ESLint | 0 errors / 0 warnings | 0 |
| `npm run build` | Production build | compiled; 7 routes (incl. `/api/scans/export`) plus proxy | 0 |
| `tests/integration/supabase-rls.test.ts` | REAL RLS | **NOT RUN**: hardening migration not applied (see above) | — |

- Failures and fixes: (1) my test edit accidentally deleted an adjacent `it(` line, causing a parse error. I restored it; no product change. (2) The real export test expected 4 rows for a formula filename containing `http://`. The upload validator correctly strips path segments, so the stored name differed. I changed the test filename to `=HYPERLINK("x.test")-<run>.csv`; no product change. In the same failed run, the total export row count already matched.
- The real Milestone 4 checks prove five things. Dashboard file count, total findings and the five-level risk distribution equal direct owner-scoped database rows. All 30 type × risk filter combinations equal direct `scan_findings` rows (group count and occurrence sum). Unauthenticated (401) and invalid-filter (400) exports return no CSV. A's export has a row count equal to the UI findings, no raw synthetic values, a neutralised formula filename and no formula-leading Filename/Masked-example cells. B's export excludes A's run and equals B's own finding count. Negative uploads (empty, oversize, binary, invalid UTF-8, bad extension, bad MIME) were rerun: all rejected, scan count unchanged.
- Browser: **UNVERIFIED** for the export link click. The integrated browser tab reports `document.visibilityState = "hidden"`, so React's frame-scheduled streaming reveal never ran and the page stayed on "Loading your workspace...". The server HTML did contain the workspace, and there were no console or network errors. Restarting the dev server (`minidsp-dev2`, after `npm run build` shared `.next`) did not change this. The link and filters are covered by a DOM test; the download is covered by the real HTTP E2E.

### Files, decisions and outstanding issues

- Changed: `src/lib/csv.ts` (new), `src/lib/scan-history.ts` (new), `src/app/api/scans/export/route.ts` (new), `src/app/api/scans/route.ts`, `src/app/workspace.tsx`, `tests/csv.test.ts` (new), `tests/export-route.test.ts` (new), `tests/workspace.test.tsx`, `tests/integration/upload-e2e.test.ts`, `README.md`, `WORK_LOG.md`, `LEARNINGS.md`. No dependency or migration changes.
- **Outstanding / UNVERIFIED:** live hardening migration plus cleanup of leaked rows, then the RLS suite (expect 11/11); browser click-download; manual keyboard/accessibility; design-owner sign-off; existing dev-dependency audit advisories. Real tests add synthetic scans to the dev test accounts (including one formula-named file per run).
- Git: `master`, no commits, everything untracked. No commit, push or deployment.

## UI reference refresh (2026-10-21T09:29:54Z)

- Human request: update the app UI to match the attached MiniDSP screenshots. This is a UI task only; the separate GitHub/Vercel deployment request was not performed.
- Added the documented Lepide `lp-sidebar` rail and a compact workspace header. Dashboard is the initial section; the rail navigates to dashboard, upload, and findings. The existing sign-out POST remains available in the header.
- Reordered the workspace so the dashboard is first, followed by upload and findings. Added a risk distribution table with data-derived file counts and percentages/share bars, keeping the recent scans table and all metrics sourced from stored history. No data-flow, auth, scan, or export logic changed.
- Used Lepide tokens and documented Sidebar/Card/Table components, no Tailwind or new dependencies. Sidebar width and canonical classes are from `design.md`'s Sidebar section.

### Actual validation evidence

| Exact command | Result | Exit |
|---|---|---|
| `npx vitest run tests/workspace.test.tsx tests/pages.test.tsx` | 18 passed / 0 failed / 0 skipped; 2 files | 0 |
| `npm test` | 76 passed / 0 failed / 0 skipped; 9 files | 0 |
| `npx tsc --noEmit` | No type errors | 0 |
| `npm run lint` | 0 errors / 0 warnings | 0 |
| `npm run build` | Production build completed; 7 routes plus proxy | 0 |

- Added a DOM assertion that the risk-distribution table has five meter rows and reflects the fixture's 100% Critical share.
- Browser visual check: **UNVERIFIED**. Local `GET /login` returned 200, but the integrated browser tab stayed on "Loading your workspace..." and did not hydrate, as in the previous browser check. No screenshot or live-browser behavior is claimed as verified. The existing design inventory and DOM tests were checked instead.
- Current Git status: branch `main`; modified `src/app/globals.css`, `src/app/page.tsx`, `src/app/workspace.tsx`, `tests/workspace.test.tsx`; new untracked `src/app/workspace-sidebar.tsx`. No commit, push, or deployment.

**Rule:** Keep failures and retests. Do not claim PASS without executing a test.

**Rule:** Use actual UTC timestamps or Git commit timestamps. Never estimate times.
