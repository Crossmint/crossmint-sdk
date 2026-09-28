# Crossmint SDK — Agent Reference

Multi-chain SDK monorepo (smart wallets, auth, UI components, server SDK) for web and React Native. pnpm workspaces and Turborepo; libraries live in `packages/`, starter apps and playgrounds in `apps/`.

## Best practices

At session start, run `./scripts/fetch-best-practices.sh core.md typescript.md`, then follow the fetched best-practices doc. When reviewing PRs in this repo, check changes against the fetched best-practices doc and cite the specific rule when flagging.

## Commands

```bash
pnpm install
pnpm build:libs    # build all packages
pnpm test:vitest   # run unit tests
pnpm lint          # biome check
pnpm lint:fix
```

## Testing

- Test file names, BDD structure, tags and folder layout follow `test-conventions.md` (repo root).
- The E2E-first testing policy in the fetched best-practices doc applies to new code; existing test suites stay.
- Default E2E artifact: the Playwright HTML report plus trace/video from the `test-conventions.md` POM tests, extended with a recorded E2E run against the staging sandbox.
