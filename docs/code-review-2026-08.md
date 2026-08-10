# Code review — August 2026

**Commit reviewed:** `82a63cc` (`main`)
**Scope:** the whole monorepo — `apps/web`, `packages/{core,ui,i18n,tokens,database}`, CI.
**Out of scope:** the old production repo (`~/Code/kalkulacka`), deployment/Vercel configuration, and the shared CockroachDB itself. Where this codebase deliberately mirrors the old app's wire contracts (session API shape, cookie format, Prisma schema, `application/problem+json` errors), findings are marked **[inherited]** — changing them means changing production first, so they are constraints to know about, not defects introduced here.

**Method.** Three review dimensions: security, readability/scalability, design consistency. Candidate findings were collected by a full sweep of the API surface, session handling, external-data ingestion, and the largest source files, then each was verified by reading the actual code path end-to-end. Anything that didn't survive a concrete failure-scenario check was dropped; one candidate is explicitly recorded below as **refuted** because the refutation is itself useful information. Every claim carries a `file:line` reference against `82a63cc`.

**Baseline at the reviewed commit:** `pnpm lint` — 0 diagnostics (Biome, 306 files). `pnpm typecheck` — clean across all 6 packages. `pnpm test` — 304 tests in 38 files, all passing. Plus 4 Playwright e2e specs (run in CI, not part of the vitest count).

---

## Summary

| # | Severity | Category | Finding |
|---|----------|----------|---------|
| S1 | High | Security | No security headers anywhere — no CSP, HSTS, nosniff, referrer policy |
| S2 | Medium | Security | Asset proxy re-serves upstream `Content-Type` verbatim on its own origin |
| S3 | Medium | Security | Non-UUID inputs reach Prisma `@db.Uuid` columns and 500 instead of 404/401 |
| S4 | Low–Med | Security | Share route's warm-up fetch builds its URL from the Host header |
| S5 | Low | Security | CDN image URLs are unvalidated strings that get server-side fetched into `sharp` |
| S6 | Low | Security | OG image route: unbounded second font fetch, no per-route rate limiting |
| S7 | Low | Security | `embedName` is an unconstrained string used to build a cookie name |
| S8 | Info | Security | Notes: auth model **[inherited]**, CSRF posture, OTel key routing, Actions pinning |
| R1 | Medium | Readability | Test-coverage gaps concentrated in `apps/web/lib` and gesture code |
| R2 | Low | Readability | `@vk/core` barrel exports internals and fixtures alongside the real API |
| R3 | Low | Readability | `@vk/ui`'s isolation rules are enforced only by a doc comment |
| R4 | Info | Readability | Two import styles coexist in `apps/web` |
| C1 | Medium | Consistency | The default palette exists in three hand-synced copies |
| C2 | Low | Consistency | The share card is drawn twice (React + satori), kept in sync by hand |
| C3 | Decision | Consistency | `DistrictKind`/`FlowStep`/`RouteSlugs` live in `@vk/i18n`, imported by `@vk/core` |
| C4 | Decision | Consistency | Archive and platform adapters share no abstraction — deliberately |

---

## Security

### S1 · High — No security headers

[next.config.ts](../apps/web/next.config.ts) has no `headers()` block and there is no middleware or `vercel.json` setting any. The app currently ships with no `Content-Security-Policy`, no `Strict-Transport-Security`, no `X-Content-Type-Options`, no `Referrer-Policy`, and no `X-Frame-Options`/`frame-ancestors`.

**Why it matters here specifically:** it compounds S2 (a nosniff header would blunt the proxy's content-type passthrough), and the app renders large amounts of externally sourced text (CDN candidate data) — React's escaping is the only layer, and a CSP is the standard second one.

**Suggested fix.** Add a `headers()` block: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS, and a CSP — start in `Content-Security-Policy-Report-Only` to shake out violations before enforcing. Two constraints to design around: (a) the color-mode bootstrap in [layout.tsx:93–101](../apps/web/app/layout.tsx) is an inline `<script>` (a fixed constant, safe in itself, but it needs a hash or nonce under CSP), and (b) `frame-ancestors` must stay permissive on `/embed/*` routes once Phase E lands — a per-path header split, not a blanket deny.

### S2 · Medium — Asset proxy echoes upstream `Content-Type`

[app/api/assets/[...path]/route.ts:89](../apps/web/app/api/assets/%5B...path%5D/route.ts) re-serves whatever `Content-Type` the data CDN sent, on this app's own origin, with `Cache-Control: public, max-age=86400, immutable`. There is also no response size cap.

**Scenario.** The proxy exists to serve avatar images with same-origin pixels for the canvas export. If the CDN — a separately operated service — ever serves HTML or SVG at any path under a calculator's asset folder (compromise, misconfiguration, or a stored-upload feature on the platform side), that document renders on this origin: stored XSS, cached for a day. The path validation itself is solid (see "Verified sound" below); the content-type is the remaining trust gap.

**Suggested fix.** The proxy only ever needs to serve images. Allowlist the response type (`image/png`, `image/jpeg`, `image/webp`, `image/avif`, `image/gif`; treat `image/svg+xml` with care or re-serve it as `application/octet-stream`), send `X-Content-Type-Options: nosniff` on the response, and cap the body size (avatars are tens of KB; a 5 MB cap is generous).

### S3 · Medium — Non-UUID inputs 500 instead of failing cleanly

`sessionId`, `calculatorId`, and `publicId` are all `@db.Uuid` columns ([schema.prisma](../packages/database/prisma/schema.prisma)). Prisma throws on a non-UUID value in a `where` clause rather than returning no rows, and the thrown error is not an `HttpError`, so the route handlers' catch blocks re-throw it as a 500. Four places accept such values unvalidated:

- [app/api/session/[public-id]/route.ts:17–20](../apps/web/app/api/session/%5Bpublic-id%5D/route.ts) — the public result API; any typo'd link 500s. The codebase already knows this failure mode: [lib/shared-result.ts:51](../apps/web/lib/shared-result.ts) guards the identical query with `isUuid` and a comment explaining exactly why. The route predates that lesson and never got the guard.
- The `calculator-id` path param in [session-data/route.ts:43](../apps/web/app/api/calculators/%5Bcalculator-id%5D/session-data/route.ts) and [sessions:share/route.ts:20](../apps/web/app/api/calculators/%5Bcalculator-id%5D/sessions%3Ashare/route.ts).
- The Bearer token — [get-session-from-request.ts](../apps/web/lib/session/server/get-session-from-request.ts) returns any string after `Bearer `, which flows into the same `@db.Uuid` lookup.
- A malformed session cookie: [get-session-cookie.ts:20](../apps/web/lib/session/server/get-session-cookie.ts) throws a plain `Error` on unparseable JSON, so a garbage cookie 500s every session route for that visitor until the cookie expires — 90 days ([set-session-cookie.ts:30](../apps/web/lib/session/server/set-session-cookie.ts)) — or is cleared by hand.

**Impact.** Availability/noise, not data exposure: trivially triggerable 500s pollute error monitoring and make real incidents harder to see. The stuck-cookie case degrades one visitor's sync silently for months.

**Suggested fix.** Reuse the existing `isUuid` ([lib/session-sync/answer-wire.ts](../apps/web/lib/session-sync/answer-wire.ts)) at all four boundaries: 404 for a bad `public-id`/`calculator-id`, 401 for a bad bearer. Turn the cookie parse failure into "no session" (401) and overwrite the bad cookie instead of throwing.

### S4 · Low–Medium — Warm-up fetch trusts the Host header

[sessions:share/route.ts:68](../apps/web/app/api/calculators/%5Bcalculator-id%5D/sessions%3Ashare/route.ts) fires a fire-and-forget `fetch(new URL('/api/images/...', request.url))` to pre-warm the OG image. `request.url` is derived from the incoming Host header. A request with a spoofed Host makes the server issue an outbound request to an attacker-chosen origin — blind SSRF, with a valid `publicId` in the path as a bonus. Hosting platforms often normalize Host, so exploitability depends on deployment; the code shouldn't rely on that.

**Suggested fix.** Build the warm-up URL from `NEXT_PUBLIC_BASE_URL` when set (it already exists for `metadataBase`), falling back to skipping the warm-up rather than trusting the header.

### S5 · Low — CDN image URLs: unvalidated strings, server-side fetch into `sharp`

[platform-schema.ts:20–31](../packages/core/src/adapters/platform-schema.ts) types every image URL as `z.string()`, not `z.url()`. Downstream, [platform-data.ts:31–39](../apps/web/lib/platform-data.ts) passes candidate avatar URLs to [logo-color.ts:129](../apps/web/lib/logo-color.ts), which `fetch()`es them server-side and pipes the bytes into `sharp` with no size or content-type check; the same URLs land in `<img src>` ([avatar.tsx:39](../packages/ui/src/avatar/avatar.tsx)).

**One candidate refuted during review:** a `javascript:` or `data:` URL in the data **cannot** reach `<img src>` — [platform.ts:28–32](../packages/core/src/adapters/platform.ts) prefixes anything that isn't `http(s)://` with the asset base, turning it into a harmless relative path. The real residual surface is narrower: CDN-controlled JSON can point the *server* at any `http(s)` host (SSRF from the rendering server; the response is only pixel-analyzed, never returned, so it's blind) and hand `sharp` arbitrary bytes (a well-maintained decoder, but a decoder nonetheless, with no size cap on the input).

**Assessment.** The CDN is already fully trusted for all displayed content, so this is an explicit trust-boundary statement more than a vulnerability. **Suggested hardening,** cheap: `z.string().url()` + scheme check in the schema, and a size cap (e.g. 2 MB) on the `arrayBuffer()` in `deriveLogoColor` before it reaches `sharp`.

### S6 · Low — OG route: unbounded font fetch, no rate limiting

[opengraph/route.tsx:74–94](../apps/web/app/api/images/sessions/%5Bpublic-id%5D/opengraph/route.tsx): `loadFont` fetches Google Fonts CSS, regex-extracts a URL from the response (line 85), and fetches *that* with no timeout or size cap — the target is whatever the CSS says. Both fetches trust `fonts.googleapis.com`, so this is an availability concern (a slow font server stalls the route; the surrounding code does handle total failure gracefully by falling back to satori's bundled face), not an injection one. The route as a whole does up to 6 network round-trips plus rasterization per cold request, and nothing rate-limits it; the font cache is process-lifetime and bounded in practice by the 3 fixed specs.

**Suggested fix.** `AbortSignal.timeout(...)` on both font fetches (the asset proxy at [assets/route.ts:74](../apps/web/app/api/assets/%5B...path%5D/route.ts) already models this). Rate limiting is a platform-level question (Vercel/WAF) worth deciding before launch; input validation is already correct here — the route goes through `loadSharedResult`, which UUID-checks before touching the DB.

### S7 · Low — `embedName` is unconstrained input to a cookie name

`embedName` arrives from two places — the POST body ([sessions/route.ts:29](../apps/web/app/api/sessions/route.ts), any string) and the `Referer` path ([get-embed-name-from-request.ts:4–17](../apps/web/lib/session/server/get-embed-name-from-request.ts)) — and is interpolated into the cookie name ([cookie-name.ts:8](../apps/web/lib/session/shared/cookie-name.ts)) and stored in the DB. Cookie names have a restricted charset; a hostile value is most likely a runtime error or a rejected Set-Cookie rather than an injection, and the Referer-derived read path only selects *which* cookie is consulted — but none of it is validated or length-capped. **[inherited]** in shape (the old app derives embed names the same way).

**Suggested fix.** Validate against `/^[a-z0-9-]{1,64}$/i` at both entry points; treat anything else as "not an embed".

### S8 · Informational

- **Auth model [inherited].** A session is authenticated by possession of its UUID — unsigned plain-JSON cookie ([set-session-cookie.ts](../apps/web/lib/session/server/set-session-cookie.ts)), or the same UUID as a raw Bearer token, mirrored into `sessionStorage` for embed contexts ([runtime-session.ts](../apps/web/lib/session/client/runtime-session.ts)). For anonymous, low-stakes sessions this is a defensible design, and it is the production wire contract; it just deserves being *known*: anyone holding a session UUID can read and overwrite that session's answers. UUIDs are v4 (122 random bits), so enumeration is not practical.
- **CSRF posture — better than it first looks.** There is no CSRF token and `request.json()` ignores `Content-Type`, but the normal cookie is `SameSite=Lax` (blocks cross-site POST) and embed cookies are `SameSite=None; Partitioned` ([set-session-cookie.ts:28–29](../apps/web/lib/session/server/set-session-cookie.ts)) — CHIPS partitioning keys the cookie to the embedding top-level site, which defeats classic cross-site request forgery in supporting browsers. An `Origin`-header check on the mutating routes would be cheap defense-in-depth for older browsers.
- **AppSignal key in OTel attributes.** [instrumentation.ts:30](../apps/web/instrumentation.ts) places `APPSIGNAL_PUSH_API_KEY` into resource attributes — this is AppSignal's documented OTLP auth mechanism and stays server-side, but it means the key travels with every span export: a misconfigured `OTEL_EXPORTER_OTLP_ENDPOINT` would send it to a third party.
- **Plausible rewrite.** `/api/event` unconditionally proxies to `plausible.io` ([next.config.ts:49–60](../apps/web/next.config.ts)) even when analytics is unconfigured — documented as deliberate; harmless beyond being a small open relay to one fixed host.
- **CI.** Actions are pinned to major tags (`actions/checkout@v4`), not SHAs — pin to SHAs if supply-chain hardening is wanted. Otherwise the workflow is notably clean: no `pull_request_target`, no secrets, deliberately empty `env: {}` proving fixture-mode.
- **Data sensitivity.** Answers are political-opinion data. They live unencrypted in `localStorage` (`vk-answers`) and sync to anonymous DB sessions with no PII attached — the anonymity *is* the privacy design, and it holds. Two things have no story yet: retention (sessions live indefinitely; the cookie lasts 90 days) and deletion (nothing deletes a server-side session). Worth a conscious decision before launch, if only "we keep them indefinitely, anonymously, on purpose".

### Verified sound

Called out explicitly, because "we looked" is only meaningful alongside "and here is what held up":

- **Asset proxy path validation** ([assets/route.ts:36–57](../apps/web/app/api/assets/%5B...path%5D/route.ts)): rejects slash/backslash-carrying and dot segments, then re-checks resolved origin *and* pathname prefix — the encoded-slash smuggling case is handled and documented. This is the pattern S2 should finish.
- **Sessions kill-switch** ([sessions-enabled.ts](../apps/web/lib/api/sessions-enabled.ts)): every session route degrades to a clean 503 with no backend configured; verified live earlier in development — zero `/api` traffic in fixture mode.
- **`loadSharedResult`** ([shared-result.ts](../apps/web/lib/shared-result.ts)): UUID pre-check, schema-validates stored answers on the way out, collapses every failure to `null`/404, and cross-checks the URL's calculator against the session's.
- **No `eval`, no `innerHTML`, exactly one inline script** — a module-scope constant with no request data in it ([color-mode.ts](../apps/web/lib/color-mode.ts)), correctly annotated at its one `dangerouslySetInnerHTML` call site.
- **No secrets in the repo** — `.env.local` is gitignored (verified with `git check-ignore`); the committed `.env.example` contains only the public data-endpoint URL.
- **Wire-format validation** — the answer schema ([answer-schema.ts](../apps/web/lib/api/answer-schema.ts)) is `.strict()` and byte-compatible with the old app's, with matches range-checked 0–100.
- **CDN text everywhere reaches the DOM through React** (escaped) or satori (not HTML) — no header or markup injection path found.

---

## Readability & scalability

The overall shape is strong and worth saying so first: the package graph is a clean DAG (`web → {core, ui, i18n, tokens, database}`, `core →(types) i18n`, `ui → tokens` CSS-only); state management is one Zustand store plus URL — **zero React contexts in the repo**, and it doesn't miss them; config is tight (one strict tsconfig base, one Biome config with `preset: recommended` and no exceptions, a 4-task turbo pipeline where every non-obvious entry carries its reason). The largest files (~370–400 lines: [question-deck.tsx](../packages/ui/src/question-deck/question-deck.tsx), [results.tsx](../apps/web/components/results.tsx), [session-sync.ts](../apps/web/lib/session-sync/session-sync.ts)) were each read in full for this review, and none is a god-file — they're dense but single-purpose, and the comment discipline is unusually good: comments state *why*, decisions are recorded where they're made, and rejected alternatives are named. `session-sync.ts` deserves particular mention: module-global mutable state is normally a review red flag, but here the per-document lifetime is a documented requirement (the once-per-document restore guard), it exposes an explicit test seam, and it has real tests.

### R1 · Medium — Test coverage is thin exactly where the app is most itself

304 passing tests, but distribution matters more than the count:

| Area | State |
|---|---|
| `packages/core` (domain logic) | Well covered — 8 test files over matching, insights, routing, adapters |
| `packages/ui` | 11 test files + 35 stories for ~35 components; jsdom configured properly |
| `apps/web/lib` | Mixed — session-sync, wire mapping, shared-result, logo-color, calculators covered; **`answers-store.ts`, `paths.ts`, `platform-data.ts`, `http-errors.ts` untested** |
| `apps/web` API routes | `sessions` and `session-data` have tests; the other four routes don't |
| `apps/web` components | **Zero component tests** — `apps/web`'s vitest env is node-only; the 23 components are covered only by 4 e2e specs |
| Gesture code | 767 lines across `question-deck.tsx` + `use-swipe-deck.ts`; only the extracted `swipe-physics.ts` is unit-tested |
| `packages/tokens` | 0 tests, including the theme-contract → CSS build (`contract.ts`, `to-css.ts`) |

**Highest-leverage additions,** in order: (1) `http-errors.ts` — it's a frozen wire contract with production, which is precisely what a pinning test is for; (2) `paths.ts` — every link in the app flows through it; (3) the four untested API routes, using the two existing route tests as templates; (4) a jsdom vitest project for `apps/web` components, using `packages/ui/vitest.config.ts` as the template. The gesture code is the hardest to test and the e2e specs exercise it — lowest priority despite its size.

### R2 · Low — `@vk/core`'s barrel is wider than its API

[packages/core/src/index.ts](../packages/core/src/index.ts) exports scoring internals (`processSingleAnswer`, `calculateBaseScore`, `answerToNumber`) alongside the real entry points (`calculateMatches`, `buildResults`), and exports the fixtures (`getPardubiceCalculator`, ~350 KB of JSON) from the production barrel. The fixtures are used server-side by the fixture-mode fallback, so nothing heavy reaches the client bundle today — the issue is API hygiene: the handoff developer can't tell the supported surface from the incidental one.

**Suggested fix.** Move fixtures to a `@vk/core/fixtures` subpath export; either stop exporting the scoring internals or mark them `/** @internal — exported for tests */`.

### R3 · Low — `@vk/ui`'s isolation is convention, not mechanism

The rules that make the design system portable — no i18n imports, every string a prop, CSS-module styling off `--vk-*` vars only — live in a doc comment at [packages/ui/src/index.ts:1–8](../packages/ui/src/index.ts). Verified true today across the package. Nothing enforces it; the first violation will compile fine.

**Suggested fix.** A Biome `noRestrictedImports`-style rule or a trivial CI grep (`@vk/i18n|@vk/core` under `packages/ui/src` → fail) would freeze the guarantee cheaply.

### R4 · Informational — Two import styles

API routes and a few lib files use the `@/` alias; components and most of `lib/` use relative imports. Both work; a one-line convention note (or letting Biome organize toward one) removes the question for future contributors. Similarly, `const messages = getMessages()` appears at module scope in 22 files and inside functions in a handful — consistent enough to be the convention, worth writing down (it's correct under the build-time-single-locale design; it would need revisiting only if locales ever became runtime-switchable).

---

## Design consistency

### C1 · Medium — One palette, three copies

The default theme's palette exists in: [tokens/themes/default.theme.ts](../packages/tokens/src/themes/default.theme.ts) (canonical), the hand-copied fallback set in [ui/share-card/theme-colors.ts:194–205](../packages/ui/src/share-card/theme-colors.ts), and the hard-coded `COLOR` map in [opengraph/route.tsx:39–47](../apps/web/app/api/images/sessions/%5Bpublic-id%5D/opengraph/route.tsx). All three currently agree (verified value-by-value in this review). Each copy documents *why* it exists — no DOM to resolve `light-dark()` against — and both copies carry "worth re-checking by hand" comments. Hand-checking is the weak link: drift shows up as an off-brand share card, which nobody tests for.

**Suggested fix.** Not generation — a **pinning test**: a unit test that imports `default.theme.ts` and asserts the other two maps match its light palette. Turns silent drift into a red CI run for ~20 lines of test, with no build-step or dependency-direction changes.

### C2 · Low — The share card is drawn twice

[ui/share-card/share-card-layout.tsx](../packages/ui/src/share-card/share-card-layout.tsx) renders the card with real components; the OG route redraws the same design in satori-compatible inline styles. The fork is justified and documented (satori is not a browser: no CSS modules, no custom properties, explicit `display: flex` everywhere) — but ~350 lines of visual duplication now rely on hand-sync, and small divergences already exist by design (the card exports top 5, the OG image top 3). Accept the fork; consider extracting the shared *numbers* (dimensions, TOP_N rationale, radii) into one constants module so the two renderings at least share their geometry.

### C3 · Decision to ratify — domain types live in the locale package

`DistrictKind`, `FlowStep`, and `RouteSlugs` are defined in `@vk/i18n` and imported (type-only) by `@vk/core` ([core/src/routing/routes.ts:1](../packages/core/src/routing/routes.ts), [core/src/domain/types.ts:11](../packages/core/src/domain/types.ts)), with core re-exporting them — so the same type is importable from two packages. This looks inverted (the locale catalog owning domain vocabulary) but is a recorded decision, twice over: it avoids a workspace dependency cycle, and for `DistrictKind` it is load-bearing — a district kind *is* defined by having a complete picker vocabulary in the catalog, so adding a kind without its copy is a type error. The cost is discoverability: a reader looking for the domain model in `@vk/core` finds three types that live elsewhere. **Recommendation:** keep it; add a short note in `core/domain/types.ts` explaining the ownership so the next reader doesn't "fix" it.

### C4 · Decision to ratify — two adapter stacks, no shared abstraction

`adapters/archive{,-schema}.ts` (~260 lines) and `adapters/platform{,-schema}.ts` (~650 lines) implement the same validate-and-adapt shape for two backend formats independently. The formats differ enough (single-file index vs six files, fixed CDN root vs per-calculator asset base) that a shared abstraction would mostly be parameter plumbing, and the two evolve on different clocks — the archive format is frozen, the platform one is live. Independence is the right call; the cost is that a new adapter (a third format) copies a shape rather than filling in an interface. Fine until a third format actually appears.

### Minor notes

- Two modules independently write attributes on `document.documentElement` ([color-mode.ts](../apps/web/lib/color-mode.ts), [scroll-mode.tsx](../apps/web/components/scroll-mode.tsx)) — different attributes, no conflict, just two owners of one node to be aware of.
- The type scale, breakpoint convention, and icon house style are each documented at their source of truth in `packages/tokens` / `packages/ui` — the kind of consistency infrastructure that usually doesn't exist in a project this age. The two remaining off-scale font sizes (donut center, quote watermark) are commented as deliberate.

---

## Suggested priority

**Before public launch**
1. S1 — security headers (start CSP as report-only immediately; enforce before launch)
2. S3 — UUID validation at the four boundaries; malformed cookie → 401 + reset
3. S2 — asset proxy content-type allowlist + nosniff + size cap
4. S4 — warm-up URL from `NEXT_PUBLIC_BASE_URL`, not the Host header
5. Decide the rate-limiting story for `/api/*` (platform-level is fine; deciding is the point) and the session retention/deletion posture (S8)

**Soon after**
6. C1 — palette pinning test
7. R1 — pinning tests for `http-errors.ts` and `paths.ts`; route tests for the remaining four API routes
8. S5/S6/S7 — URL schema validation + fetch size caps/timeouts; `embedName` charset check
9. R3 — mechanical check for `@vk/ui` isolation

**Accept as-is (with the reasoning above)**
- The possession-of-UUID auth model (S8, inherited production contract)
- The satori share-card fork (C2), the adapter independence (C4), the i18n type ownership (C3)
- The `@vk/core` barrel width (R2) — tidy when convenient
