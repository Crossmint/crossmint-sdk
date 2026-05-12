# Crossmint Test Suite — Naming Conventions & Structure

> Applies to all Crossmint repositories. Each app owns its own `tests/` directory and Playwright config.

---

## 1. Guiding Principles

-   **Consistency over preference** — one way to do things, everywhere.
-   **Readability as documentation** — a test name should explain itself without reading the code.
-   **Scalability** — must support E2E, smoke, API, SDK, and unit tests as the platform grows.
-   **Page Object Model (POM) for all UI tests** — decouple selectors and interactions from assertions.
-   **Tests live with their app** — config and tests are colocated inside the app they cover.

---

## 2. Folder Structure

Root is always `<app-root>/tests/`, where `<app-root>` is the directory that contains the app's `package.json` and `playwright.config.ts`.

```
<app-root>/
  ├── playwright.config.ts
  └── tests/
      ├── e2e/
      │   ├── pages/                        ← Page Object classes (UI tests only)
      │   │   └── <FeatureName>Page.ts
      │   ├── specs/
      │   │   └── <domain>/
      │   │       └── <feature>.spec.ts
      │   ├── fixtures/
      │   │   └── <name>.fixture.ts
      │   ├── data/
      │   │   └── <dataType>.ts
      │   └── utils/
      │       └── <name>.ts
      │
      ├── smoke/
      │   ├── pages/
      │   │   └── <FeatureName>Page.ts
      │   ├── specs/
      │   │   └── <feature>.spec.ts
      │   └── data/
      │       └── smokeConfig.ts
      │
      ├── api/
      │   └── <api-version>/                ← required when the API is versioned (e.g. 2025-06-09, v2)
      │       ├── specs/                      omit version folder only for unversioned APIs
      │       │   └── <domain>/
      │       │       └── <feature>.spec.ts
      │       ├── helpers/
      │       │   ├── <domain>/
      │       │   │   └── <scope>-helpers.ts  ← scoped helpers (e.g. evm-helpers.ts)
      │       │   └── request.ts              ← generic HTTP client, shared across all api/
      │       └── data/
      │           └── apiConstants.ts
      │
      ├── sdk/
      │   ├── specs/
      │   │   └── <feature>.spec.ts
      │   ├── fixtures/
      │   │   └── <name>.fixture.ts
      │   └── helpers/
      │       └── <name>-helpers.ts
      │
      └── shared/
          ├── constants/
          │   └── globalConstants.ts
          ├── fixtures/
          │   └── commonFixtures.ts
          └── utils/
              └── pollAndWaitFor.ts
```

**Key paths:**

| Artifact            | Path                                                       |
| ------------------- | ---------------------------------------------------------- |
| Spec file           | `tests/<suite>/<version>/specs/<domain>/<feature>.spec.ts` |
| Page Object         | `tests/<suite>/pages/<FeatureName>Page.ts`                 |
| Scoped helper       | `tests/api/<version>/helpers/<domain>/<scope>-helpers.ts`  |
| Generic HTTP client | `tests/api/<version>/helpers/request.ts`                   |
| Test data           | `tests/<suite>/data/<dataType>.ts`                         |
| Fixture             | `tests/<suite>/fixtures/<name>.fixture.ts`                 |
| Utility             | `tests/<suite>/utils/<name>.ts`                            |
| Shared code         | `tests/shared/`                                            |

**API versioning:** when the API under test is versioned, the version segment is required so specs for different versions can coexist:

```
tests/api/2025-06-09/specs/wallets/delegated-signers.spec.ts
tests/api/v1-alpha/specs/wallets/wallets.spec.ts
```

**Playwright config** points to the `tests/` root:

```ts
testDir: path.join(__dirname, "tests");
```

---

## 3. File Naming Conventions

| Type             | Convention              | Example                               |
| ---------------- | ----------------------- | ------------------------------------- |
| Spec files       | `kebab-case.spec.ts`    | `delegated-signers.spec.ts`           |
| Page Objects     | `PascalCasePage.ts`     | `CollectionTablePage.ts`              |
| Scoped helpers   | `kebab-case-helpers.ts` | `evm-helpers.ts`, `solana-helpers.ts` |
| Generic client   | `request.ts`            | `request.ts`                          |
| Data / constants | `camelCase.ts`          | `apiConstants.ts`, `users.ts`         |
| Utilities        | `camelCase.ts`          | `pollAndWaitFor.ts`                   |
| Fixtures         | `camelCase.fixture.ts`  | `auth.fixture.ts`                     |

---

## 4. Code Naming Conventions

**Functions — camelCase**

```ts
async function createSmartWallet(config: WalletConfig): Promise<Wallet> { ... }
async function loginWithJwt(userIdentifier: string): Promise<void> { ... }
async function waitForTransactionSuccess(walletAddress: string, txId: string): Promise<void> { ... }
```

**Constants — UPPER_SNAKE_CASE**

```ts
export const MAX_RETRY_ATTEMPTS = 5;
export const DEFAULT_TIMEOUT_MS = 60_000;
```

**Page Objects — PascalCase**

```ts
export class BillingTopUpPage { ... }
export class WalletDashboardPage { ... }
```

---

## 5. Selector Strategy (UI Tests)

**Single source of truth: `data-testid`**

```ts
// Preferred
page.getByTestId("submit-payment-button");

// Acceptable fallback
page.getByRole("heading", { name: "My Assets" });

// Avoid
page.locator(".btn-primary");
```

**Selector grouping inside Page Objects:**

```ts
static readonly SELECTORS = {
    ADD_FUNDS_BUTTON: '[data-testid="billing-add-funds-button"]',
    SUBMIT_TOPUP_BUTTON: '[data-testid="billing-submit-topup-button"]',
} as const;
```

**`data-testid` format:** `{feature}-{element-description}`

e.g. `"billing-add-funds-button"`, `"wallet-creation-submit"`

---

## 6. Test Naming — BDD Style

Structure tests as: **describe** (subject) → **describe/when** (context) → **test** (behaviour).

The test name states the behaviour directly — no `should/can/does` prefix. The verb comes from the action itself.

```ts
// Good
test.describe("save button", () => {
    test.describe("when fields are missing", () => {
        test("is disabled", async () => {});
    });
    test.describe("when all fields are filled", () => {
        test("submits the form", async () => {});
    });
});

// Good — flat when context is self-evident from the describe
test.describe("Delegated Signers", { tag: "@critical" }, () => {
    test("creates a signer and sends a transaction", async () => {});
    test.describe("when the signer is expired", () => {
        test("rejects the request with 400", async () => {});
    });
});
```

**Avoid** verb prefixes that add no information:

```ts
// Avoid
test("should create a signer and send a transaction", ...);
test("it can create a signer", ...);
test("it returns 400", ...);
```

A test name should read as a sentence when prefixed with its describe chain:

> `Delegated Signers > when the signer is expired > rejects the request with 400`

---

## 7. Test Tagging Convention

Tags go on the `describe` block. Apply to individual tests only when the tag does not apply to the whole suite.

| Tag         | Meaning                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| `@smoke`    | Production health checks — must pass before any deploy                   |
| `@critical` | High priority, runs on every PR                                          |
| `@mainonly` | Main branch only (slow or environment-dependent)                         |
| `@flaky`    | Temporarily disabled in CI — must include a `TODO` with ticket reference |

Use Playwright's `{ tag }` option — never embed tags inside the string. Embedding tags in the string pollutes reporter output and makes test names harder to read when a test fails.

```ts
// Good
test.describe("Wallet Creation", { tag: "@critical" }, () => { ... });
test.describe("Multi-chain Signers", { tag: "@mainonly" }, () => { ... });

// Avoid — tag gets lost in reporter output
test.describe("Wallet Creation @critical", () => { ... });
```

For `@flaky`, use `test.skip` with a `TODO` comment:

```ts
test.skip("syncs delegated signers across chains", async () => {
    // TODO(ENG-1234): @flaky — race condition in chain sync
});
```

**Running by tag:**

```bash
# Smoke tests only
npx playwright test --grep @smoke

# Critical tests only
npx playwright test --grep @critical

# Exclude slow / environment-specific
npx playwright test --grep-invert "@mainonly"
```

---

## 8. Page Object Model

POM applies to `e2e/` and `smoke/` tests only. API tests use plain exported helper functions.

### Element access vs. workflow methods

Use **element access** for simple, single interactions — it's explicit about what is being interacted with:

```ts
// Good — element access
await apiKeysPage.createNewKeyButton.click();
await billingPage.addFundsButton.click();

// Avoid — action wrappers add a naming layer with no value
await apiKeysPage.clickCreateNewKey();
await billingPage.clickAddFunds();
```

Use **intent/workflow methods** for multi-step flows that would otherwise require the test to know too many implementation details:

```ts
// Good — encapsulates a multi-step interaction
await apiKeysPage.createNewKeyForm.fillWithValidData({ name: "my-key" });
await checkoutPage.paymentForm.fillWithCard({ number: "4242...", expiry: "12/26" });

// Avoid — the test should not orchestrate each step manually
await apiKeysPage.keyNameInput.fill("my-key");
await apiKeysPage.keyPermissionsSelect.selectOption("read");
await apiKeysPage.createKeySubmitButton.click();
```

**Rule of thumb:**

-   Single interaction → expose the element: `page.someButton.click()`
-   3+ steps that always go together → encapsulate as intent method: `page.someForm.fill(data)`

### Page Object structure

```ts
export class ApiKeysPage {
    // Elements — for simple interactions
    readonly createNewKeyButton: Locator;
    readonly deleteKeyButton: Locator;

    // Sub-objects — for multi-step workflows
    readonly createNewKeyForm: CreateNewKeyForm;

    constructor(private readonly page: Page) {
        this.createNewKeyButton = page.getByTestId("api-keys-create-button");
        this.deleteKeyButton = page.getByTestId("api-keys-delete-button");
        this.createNewKeyForm = new CreateNewKeyForm(page);
    }
}

class CreateNewKeyForm {
    constructor(private readonly page: Page) {}

    async fillWithValidData({ name }: { name: string }) {
        await this.page.getByTestId("api-keys-name-input").fill(name);
        await this.page.getByTestId("api-keys-permissions-select").selectOption("read");
        await this.page.getByTestId("api-keys-submit-button").click();
    }
}
```

### API helpers (not POM)

```ts
// tests/api/2025-06-09/helpers/wallets/evm-helpers.ts
export async function createSmartWallet(adminSignerAddress: Hex): Promise<string> { ... }
export async function createDelegatedSigner(walletAddress: string, delegatedAddress: Hex): Promise<SignatureRequest> { ... }
export async function approveDelegatedSigner(...): Promise<void> { ... }
```

---

## 9. Unit Test Alignment

|           | Convention                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| E2E       | `.spec.ts`                                                                                                                   |
| Unit      | `.test.ts`                                                                                                                   |
| Naming    | Same BDD style — describe/when/it, no verb prefix                                                                            |
| Selectors | [Testing Library](https://testing-library.com/) (`getByRole`, `getByTestId`) — same semantic strategy as Playwright UI tests |

---

## 10. Migration Checklist

-   [ ] Move file to `tests/<suite>/<version>/specs/<domain>/<feature>.spec.ts`
-   [ ] Rename file to `kebab-case.spec.ts`
-   [ ] Rename data files to `camelCase.ts`
-   [ ] Extract inline helpers to `tests/api/<version>/helpers/<domain>/<scope>-helpers.ts`
-   [ ] Move shared utils to `tests/shared/utils/`
-   [ ] Rename inline constants to `UPPER_SNAKE_CASE`
-   [ ] Convert test descriptions to BDD style: `describe` (subject) → `when` (context) → `test` (behaviour), no verb prefix
-   [ ] Add `@smoke` / `@critical` / `@mainonly` tags to `describe` blocks
-   [ ] Update `playwright.config.ts` `testDir` to `tests/` (once per app, on first migration)
-   [ ] Selectors → `data-testid` only (UI tests)
-   [ ] Move selectors into Page Object classes (UI tests)

---

## 11. Quick Reference

|                |                                                                   |
| -------------- | ----------------------------------------------------------------- |
| Spec file      | `tests/api/<version>/specs/wallets/delegated-signers.spec.ts`     |
| Page Object    | `tests/e2e/pages/WalletDashboardPage.ts`                          |
| Scoped helper  | `tests/api/<version>/helpers/wallets/evm-helpers.ts`              |
| Generic client | `tests/api/<version>/helpers/request.ts`                          |
| Data file      | `tests/api/<version>/data/apiConstants.ts`                        |
| Shared util    | `tests/shared/utils/pollAndWaitFor.ts`                            |
| Function       | `createSmartWallet()`                                             |
| Constant       | `DEFAULT_CHAIN`, `MAX_RETRY_ATTEMPTS`                             |
| Selector       | `data-testid="billing-add-funds-button"`                          |
| Test name      | `"rejects the request with 400"` (no verb prefix)                 |
| Tags           | `{ tag: "@critical" }` `{ tag: "@smoke" }` `{ tag: "@mainonly" }` |
