# Crossmint SDK — Agent Reference

Multi-chain SDK monorepo (smart wallets, auth, UI components, server SDK) for web and React Native. pnpm workspaces and Turborepo; libraries live in `packages/`, starter apps and playgrounds in `apps/`.

## Best Practices

Before you write or change code, write tests, write a PR description, write docs or prose, define alerts or observability, plan a deployment, or write an SOP or post-mortem, read the Paella best practices that match the action and apply them. A topic is a directory or file of the rules repo: `read code` before changing code, `read code/test` before writing tests, `read operations/pull-requests documentation` before a PR description; `list` prints all of them.

```bash
BP="${PAELLA_BEST_PRACTICES_DIR:-$HOME/.cache/paella-best-practices}/bin/best-practices.sh"
[ -x "$BP" ] || { mkdir -p "$(dirname "$BP")" && { gh api -H 'Accept: application/vnd.github.raw' repos/Paella-Labs/best-practices/contents/bin/best-practices.sh > "$BP.$$" 2>/dev/null || { T=$(mktemp -d) && GIT_TERMINAL_PROMPT=0 git clone -q --depth=1 https://github.com/Paella-Labs/best-practices.git "$T" && cp "$T/bin/best-practices.sh" "$BP.$$"; s=$?; rm -rf "$T"; [ "$s" = 0 ]; }; } && [ -s "$BP.$$" ] && bash -n "$BP.$$" && chmod +x "$BP.$$" && mv -f "$BP.$$" "$BP" || rm -f "$BP.$$"; }
"$BP" read <topic>...
```

## Commands

```bash
pnpm install
pnpm build:libs    # build all packages
pnpm test:vitest   # run unit tests (packages with a test:vitest script)
pnpm --filter @crossmint/common-sdk-auth test   # this package only defines `test`
pnpm lint          # biome check
pnpm lint:fix
```

## Testing

- Test file names, BDD structure, tags and folder layout follow `test-conventions.md` (repo root).
- New and changed code follows the `code/test` best practices; existing test suites stay.
- PR evidence to link in the PR description: the Playwright report from the `apps/wallets/quickstart-devkit` POM tests (HTML locally, `test-results/playwright-results.json` in CI; traces are kept on retry and video on failure), extended with a recorded E2E run against the staging sandbox.

## Project context

### Active Project: Test Suite Migration

#### Context

Migrating all tests in the monorepo to comply with the conventions defined in `test-conventions.md` (repo root).
Linear project: https://linear.app/crossmint/project/crossmint-sdk-refactor-tests-to-be-compliant-on-naming-conventions-ef98514c10c6

Convention doc PR: https://github.com/Crossmint/crossmint-sdk/pull/1831 (branch: `docs/testing-conventions`)

---

#### Execution Plan

##### Phase 1 — Parallel (no dependencies) ✅ COMPLETE

| Ticket | Branch | PR | Status |
|--------|--------|----|--------|
| ENG-2306 — `apps/wallets/quickstart-devkit` Playwright tests | `feat/eng-2306-migrate-quickstart-devkit-tests` | [#1832](https://github.com/Crossmint/crossmint-sdk/pull/1832) | ✅ Done |
| ENG-2310 — `packages/server` auth unit tests | `feat/eng-2310-migrate-server-auth-unit-tests` | [#1833](https://github.com/Crossmint/crossmint-sdk/pull/1833) | ✅ Done |
| ENG-2311 — `packages/common` auth + base unit tests | `feat/eng-2311-migrate-common-auth-base-unit-tests` | [#1834](https://github.com/Crossmint/crossmint-sdk/pull/1834) | ✅ Done |

##### Phase 2 — Sequential in packages/wallets ✅ COMPLETE

| Ticket | Branch | PR | Status |
|--------|--------|----|--------|
| ENG-2307 — `packages/wallets` API client unit + integration tests | `feat/eng-2307-migrate-wallets-api-client-tests` | [#1838](https://github.com/Crossmint/crossmint-sdk/pull/1838) | ✅ Done |
| ENG-2308 — `packages/wallets` wallet core unit tests | `feat/eng-2308-migrate-wallets-wallet-core-unit-tests` | [#1839](https://github.com/Crossmint/crossmint-sdk/pull/1839) | ✅ Done |
| ENG-2309 — `packages/wallets` signers + utils unit tests | `feat/eng-2309-migrate-wallets-signers-utils-unit-tests` | [#1840](https://github.com/Crossmint/crossmint-sdk/pull/1840) | ✅ Done |

##### Phase 3 — Parallel in packages/client ✅ COMPLETE

| Ticket | Branch | PR | Status |
|--------|--------|----|--------|
| ENG-2313 — `packages/client/signers-cryptography` tests | `feat/eng-2313-migrate-client-signers-cryptography-tests` | [#1842](https://github.com/Crossmint/crossmint-sdk/pull/1842) | ✅ Done |
| ENG-2312 — `packages/client` auth, base, smart-wallet unit tests | `feat/eng-2312-migrate-client-auth-base-unit-tests` | [#1841](https://github.com/Crossmint/crossmint-sdk/pull/1841) | ✅ Done |
| ENG-2314 — `packages/client/verifiable-credentials` unit tests | `feat/eng-2314-migrate-client-verifiable-credentials-tests` | [#1843](https://github.com/Crossmint/crossmint-sdk/pull/1843) | ✅ Done |

---

#### What Each Ticket Involves

**ENG-2307** (`packages/wallets` — API client, ~150 BDD fixes)
- Files live under `packages/wallets/src/__tests__/` and colocated source dirs
- Remove `.unit.` and `.integration.` infixes from file names
- Rename PascalCase/camelCase test files to kebab-case
- Move files out of `__tests__/` dirs (colocate with source, or move to `tests/` if the package has one)
- Fix ~150 `should` BDD violations
- Add `@critical` tags where applicable
- Branch from `main`

**ENG-2308** (`packages/wallets` — wallet core, ~50 BDD fixes)
- 5 files, same pattern as ENG-2307
- Branch from `feat/eng-2307-...` (or from main after ENG-2307 merges)

**ENG-2309** (`packages/wallets` — signers + utils, structural only)
- 4 files, mainly structural renames and BDD
- Branch from `feat/eng-2308-...` (or from main after ENG-2308 merges)

**ENG-2313** (`packages/client/signers-cryptography` — 2 files from `src/__tests__/`)
- Move out of `__tests__/` dir
- Structural only

**ENG-2312** (`packages/client` — auth, base, smart-wallet, 5 files)
- One PascalCase rename
- BDD fixes

**ENG-2314** (`packages/client/verifiable-credentials` — 15 files)
- 5 camelCase renames
- BDD fixes

---

#### Conventions Summary (from test-conventions.md)

- **File names**: `kebab-case.spec.ts` (Playwright) / `kebab-case.test.ts` (Vitest unit)
- **BDD**: No `should`/`can`/`it` prefix. `describe` (subject) → `when` (context) → `test` (behaviour)
- **Tags**: `{ tag: "@smoke" }` / `{ tag: "@critical" }` / `{ tag: "@mainonly" }` on `describe` blocks — Playwright only (Vitest has no equivalent)
- **Folder**: `tests/<suite>/specs/<domain>/<feature>.spec.ts` for Playwright; unit tests colocated with source
- **Constants**: `UPPER_SNAKE_CASE`; data files: `camelCase.ts`; shared utils: `tests/shared/`

---

#### Branching Strategy

- Each ticket gets its own branch off `main`: `feat/eng-XXXX-<description>`
- PRs are opened individually per ticket
- Phase 2 tickets can be branched off the previous ticket's branch if not yet merged, or off `main` after merge

---

### Active Project: Mobile E2E Test Suite

See `mobile-e2e-reference.md` (repo root) for full context, architecture, fixes, and open tickets.
