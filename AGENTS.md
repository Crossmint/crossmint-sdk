# Crossmint SDK — Agent Reference

Multi-chain SDK monorepo (smart wallets, auth, UI components, server SDK) for web and React Native. pnpm workspaces and Turborepo; libraries live in `packages/`, starter apps and playgrounds in `apps/`.

## Best practices

At session start, run `./scripts/fetch-best-practices.sh` and read the file it names before writing or reviewing code. That file holds every rule in `Paella-Labs/best-practices`; this `AGENTS.md` adds what is specific to this repo. When reviewing PRs in this repo, check changes against both and cite the file and rule when flagging.

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
- New and changed code follows `code/test.md` in the fetched best practices; existing test suites stay.
- PR evidence to link in the PR description: the Playwright report from the `apps/wallets/quickstart-devkit` POM tests (HTML locally, `test-results/playwright-results.json` in CI; traces are kept on retry and video on failure), extended with a recorded E2E run against the staging sandbox.
