# Crossmint SDK — Agent Reference

Multi-chain SDK monorepo (smart wallets, auth, UI components, server SDK) for web and React Native. pnpm workspaces and Turborepo; libraries live in `packages/`, starter apps and playgrounds in `apps/`.

## Best practices

At session start, run `./scripts/fetch-best-practices.sh typescript.md`, then follow the fetched best-practices doc. When reviewing PRs in this repo, check changes against the fetched best-practices doc and cite the specific rule when flagging.

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
- The E2E-first testing policy in the fetched best-practices doc applies to new code; existing test suites stay.
- PR evidence to link in the PR description: the Playwright report from the `apps/wallets/quickstart-devkit` POM tests (HTML locally, `test-results/playwright-results.json` in CI; traces are kept on retry and video on failure), extended with a recorded E2E run against the staging sandbox.
