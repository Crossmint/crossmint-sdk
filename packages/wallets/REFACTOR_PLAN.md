# `wallet.ts` refactor plan

**Baseline: main @ `f20c85b027ec`** (includes #1911 server-secret wiping, #1912 storage-partitioning gate). `wallet.ts` is currently 2,291 lines.

Target: reduce `src/wallets/wallet.ts` to a ~350-line façade composing focused services, with per-signer-type and per-chain behavior moved into strategy objects. Public API stays byte-for-byte identical.

## Recent main changes this plan accounts for

1. **#1911 — server-signer secret hygiene.** There are now *two* derivation caches: `#resolvedServerSigner` (delegated) and `#resolvedRecoveryServerSigner` (recovery; survives `useSigner` resets). `matchResolvedServerSigner` was deleted (merged into `resolveServerSignerDerivation`, which now also accepts `ApiSourcedServerSignerConfig` and throws without a cached recovery resolution). Every place that derives candidates must `secureWipe()` the losing candidate's key bytes (`wipeNonSelectedCandidate`); `buildInternalSignerConfig`'s server case hands out a *copy* of the key bytes and wipes non-cached derivations; `stripSecretFromRecovery()` replaces the recovery config with an address-only config after resolution so the plaintext secret isn't retained. **All of this is server-signer-resolver behavior** — it lands wholesale in `ServerSignerResolver`, and is the reason that service now moves *before* the descriptor phase (the server descriptor depends on it).
2. **#1912 — storage partitioning.** `IframeDeviceSignerKeyStorage`'s constructor now throws the new `UnsupportedBrowserError` (via `hasPartitionedStorage()`) on browsers without third-party storage partitioning. This is contained in the key-storage layer (the throw happens before a `Wallet` exists), so `DeviceRecoveryService` only needs parity tests for the "key storage construction failed" path.
3. Minor: `secureWipe()` util (`src/utils/secure-wipe.ts`), server signers wipe their key copy, HKDF rename. No structural impact.

## Decided names

- `ChainAdapter` / `getChainAdapter` (dir `src/chains/adapters/`)
- `SignerDescriptor` / `getSignerDescriptor` (dir `src/signers/descriptors/`)
- `DeviceRecoveryService`
- `SignerManager`
- `waitForTransactionCompletion` / `waitForSignatureCompletion`
- `adoptRecoveryConfig`

## Phase 0 — contract hardening ✅ DONE (2026-06-12)

Before any extraction, the behavioral contract of wallet.ts was pinned by a dedicated characterization suite in
`src/wallets/__tests__/contract/` (13 files, 201 tests). Process: 10 area auditors → 2 adversarial verification
lenses per area (duplication + correctness) → per-area writers → completeness critic → second round closing the
critic's 9 residual findings (all independently re-verified as pinned). Full suite: **550 passed / 0 failed / 68
skipped (pre-existing skips)**. Tests pin exact error classes + message strings, API call arguments, secure-wipe
ordering, and state effects.

**Test-migration policy (decided 2026-06-12):** as each phase extracts a module, the contract tests that pin that
module's *pure logic* are MOVED to a colocated test file next to the new module (e.g. `services/balance-formatter.ts`
→ `services/balance-formatter.test.ts`), retargeted at the module API with the same literal assertions. Tests that
pin Wallet-level orchestration stay in `__tests__/contract/`, which shrinks as the refactor proceeds. Migration
happens AFTER each phase's integration step is green (never in the same step that moves source code), so the net
stays intact during the risky part.

Suspected bugs found and pinned as-is (each has a `// NOTE: suspected bug` comment in the contract suite).
**All tracked in Linear, project "Reliability: This Cycle", to be fixed AFTER the refactor** (each fix updates its
pin in the same PR):
1. **WAL-10667 (High)** — secure-wipe gap: `resolveServerSignerApiLocator` locator-only path never wipes/caches the
   selected candidate's `derivedKeyBytes`; only the loser is zeroed. Inconsistent with #1911.
2. **WAL-10668 (Medium)** — stale `needsRecovery` flag survives a successful device `useSigner` key adoption.
3. **WAL-10669 (Medium)** — failed `send()` (invalid amount) still mutates `this.chain` via `resolveChainForEnvironment()`.
4. **WAL-10670 (Low)** — `waitForTransaction` "failed" branch always renders `Transaction sending failed: undefined`.
5. **WAL-10671 (Medium)** — `nfts()` returns API error objects instead of throwing; skips staging chain remap.
6. **WAL-10672 (Low)** — `transaction()` serializes `response.error` where siblings serialize `response.message`.
7. **WAL-10673 (Low)** — `signers()` unsupported-chainType error interpolates `type` ("smart") instead of `chainType`.
   ✅ FIXED in #1926 (folded in during Phase 2 at reviewer request): now throws `Wallet chain type <x> not supported`,
   and the supported-chain check is adapter-driven (`getChainAdapterByType`) so wallet.ts has no chain literals left.
8. **WAL-10674 (Medium)** — `addSigner` silently drops `options.scopes` on the resume path.
9. **WAL-10675 (Low)** — decide: `waitForSignature` polls indefinitely (no timeout) vs `waitForTransaction`'s 60s cap.

## Ground rules (apply to every phase)

1. **Public API frozen.** The exported signatures of `Wallet`, `EVMWallet`, `SolanaWallet`, `StellarWallet`, `WalletFactory`, and everything re-exported from `src/index.ts` do not change. New modules are internal.
2. **Existing tests are the behavior contract.** `wallet.test.ts` (~150 tests), `evm.test.ts`, `solana.test.ts`, `stellar.test.ts`, `wallet-factory.test.ts` keep their assertions untouched through Phase 4 (import-path changes only). Tests assert on error *message strings* and logger event keys — extracted code preserves both verbatim. The secure-wipe call ordering from #1911 is also part of the contract: a wipe must never happen before the bytes' last legitimate read.
3. **Verification gate per phase** (no merge without all three):
   - `pnpm --filter @crossmint/wallets-sdk test:vitest`
   - `pnpm --filter @crossmint/wallets-sdk build`
   - Adversarial review agent: diff removed wallet.ts code vs. new module, hunting behavioral drift (error classes, message strings, logger keys, side-effect ordering, wipe ordering).
4. **Small unstacked PRs, ≤500 additions each** (decided 2026-06-12). A phase splits into as many PRs as needed to
   stay under the cap; PRs branch from main independently (disjoint `wallet.ts` regions; whichever merges second
   rebases trivially on the import block). All of a phase's PRs merge before the next phase starts.
   - Each PR contains ONLY: its `src/` changes, the colocated tests for its new modules, and a **changeset**
     (`@crossmint/wallets-sdk: patch`, "internal refactor — no behavior or API changes").
   - The Phase 0 contract suite (`__tests__/contract/`) and this plan file stay **local to the refactor worktree**
     — the working safety net, run before every push, never merged. Their pins reach main gradually as colocated
     tests when each module is extracted (test-migration policy above).
   - Keep colocated test files lean (table-driven `it.each`, fixture factories) — they count toward the cap.
   - **No unnecessary comments in PR code** (decided 2026-06-12): obvious code gets no comment; tests carry their
     meaning in `describe`/`it` titles, never in comments; never explain the implementation history or this refactor
     plan in code (no "moved from wallet.ts", no file-header blocks describing the extraction). Deliberately-pinned
     bugs are referenced via the WAL id in the test title (e.g. "...(WAL-10670)"), not comments. The only acceptable
     comment is a constraint the code cannot express (rare).
   - PR body: review guide, verification results (suite counts, build, adversarial review verdict), deviations
     from verbatim with justification.
   - Phase 1 PRs: https://github.com/Crossmint/crossmint-sdk/pull/1920 (balance-formatter + locators, +469/−118)
     and https://github.com/Crossmint/crossmint-sdk/pull/1921 (operation-poller, +483/−76).
5. **Parallel agents never edit shared files.** Fan-out agents only *create* new files (module + unit test). All `wallet.ts` edits happen in one sequential integration step per phase.

## Standard phase shape

| Step | Who | What |
|------|-----|------|
| A. Scaffold | 1 agent (sequential) | Interfaces/types only. **Naming review checkpoint.** |
| B. Fan-out | N agents (parallel) | Each creates one implementation file + one unit-test file. |
| C. Integrate | 1 agent (sequential) | Rewire `wallet.ts`, delete old code. |
| D. Verify | 2 agents (parallel) | Test/build runner + adversarial behavior-drift reviewer. |

---

## Phase 1 — Pure extractions (no behavior change) ✅ DONE (2026-06-12)

**Shipped as two unstacked PRs**: https://github.com/Crossmint/crossmint-sdk/pull/1920 (balance-formatter +
locators) and https://github.com/Crossmint/crossmint-sdk/pull/1921 (operation-poller).
**The 1.4 in-place cleanups were deferred to keep the PRs under the 500-addition cap** — re-apply them from the
local backup branch `backup/phase1-full` (commit 24681f57, full integrated Phase 1 incl. 1.4):
- 1.4a `PendingSignerOperation` in wallets/types.ts → fold into **Phase 2** (ChainAdapter's
  `extractAddSignerOperation` needs the named type anyway; also retype `signer-mapping.ts`).
- 1.4b/c `withRecoverySigner` restoreOnError dedupe + `assertRecoveryConfigAssemblable` → fold into **Phase 3**
  (DeviceRecoveryService absorbs `resumePendingDeviceSignerApproval`).
Outcome: wallet.ts 2,291 → 2,117 lines once both PRs merge (combined). New modules: `services/balance-formatter.ts`, `utils/locators.ts`,
`services/operation-poller.ts`, each with colocated unit tests (11/17/17). All 1.4 cleanups applied
(`PendingSignerOperation` in wallets/types.ts — note `signer-mapping.ts` still has the inline literal, fold into a
later phase; `withRecoverySigner` restoreOnError option; `assertRecoveryConfigAssemblable` takes
`{ missingSecret, missingOnSign }` prefixes since the four guard messages differ). Test migration: 24 contract tests
moved colocated (literal-verified), 32 kept. Adversarial review: PASS. Final gate: 571 passed / 0 failed / 68
skipped, build green. Known API nuance: polling's in-loop sleep no longer routes through the overridable protected
`Wallet.sleep()` (module-local now) — no in-repo subscriber, but an external subclass overriding `sleep()` would no
longer affect polling cadence. Build env note: tsup DTS worker needs `NODE_OPTIONS=--max-old-space-size=8192` on
this machine (pre-existing, unrelated).

### Original Phase 1 spec (for reference)

Removes ~450 lines from `wallet.ts`. Verbatim moves; no design decisions beyond the already-agreed names.

### 1.1 `src/wallets/services/balance-formatter.ts`
- `export function formatBalanceResponse<C extends Chain>(response: GetBalanceSuccessResponse, chain: C, nativeTokenSymbol: TokenBalance["symbol"], requestedTokens?: string[]): Balances<C>`
- Internal helpers: `toTokenBalance`, `emptyTokenBalance`
- Source: `Wallet.transformBalanceResponse`. Chain conditionals stay inside for now; Phase 2 moves them to `ChainAdapter`.

### 1.2 `src/utils/locators.ts`
- `export function toRecipientLocator(to: string | UserLocator): string`
- `export function toTokenLocator(token: string, chain: string): string`
- Source: module-level functions at the bottom of wallet.ts, moved verbatim. Unit tests cover every `UserLocator` arm (email/x/twitter/phone/userId) and the invalid-address error.

### 1.3 `src/wallets/services/operation-poller.ts`
- `export type PollingOptions = { timeoutMs?: number; initialBackoffMs?: number; backoffMultiplier?: number; maxBackoffMs?: number }`
- `export async function waitForTransactionCompletion(apiClient: ApiClient, walletLocator: WalletLocator, transactionId: string, options?: PollingOptions): Promise<Transaction<false>>`
- `export async function waitForSignatureCompletion(apiClient: ApiClient, walletLocator: WalletLocator, signatureId: string): Promise<Signature<false>>`
- Source: `Wallet.waitForTransaction`, `Wallet.waitForSignature`, `sleep`.
- `Wallet` keeps thin `protected waitForTransaction(...)` / `waitForSignature(...)` wrappers (chain subclasses call them — `StellarWallet` passes a custom timeout).

### 1.4 In-place cleanup inside `wallet.ts` (same PR, after 1.1–1.3 land)
- `export type PendingSignerOperation = { type: "signature" | "transaction"; id: string }` defined **once** in `src/wallets/types.ts` (currently inlined 6×).
- `withRecoverySigner<T>(operation: () => Promise<T>, options?: { restoreOnError?: SignerAdapter }): Promise<T>` — absorbs the duplicated swap/restore logic in `resumePendingDeviceSignerApproval`.
- `private assertRecoveryConfigAssemblable(action: string): void` — the two identical guard blocks. Note post-#1911 shape: the api-sourced-server guard is now conditional on `#resolvedRecoveryServerSigner == null`.

**Agents:** 3 parallel (1.1, 1.2, 1.3) → 1 integrator (rewires imports, does 1.4) → verify.

---

## Phase 2 — `ChainAdapter` (kill the chain switches) ✅ DONE (2026-06-16)

**PR: https://github.com/Crossmint/crossmint-sdk/pull/1926** (+393/−95). wallet.ts 2,109 → 2,051.
Built `chains/chain-adapter.ts` + `chains/adapters/{evm,solana,stellar}.ts` with **8** chain-dispatched members.
Deliberate deviations from the spec below:
- Dropped `transactionPayloadToSign` and `extractTransactionHash` — they dispatch on the API RESPONSE
  (`transaction.chainType`) / are already chain-agnostic, so a per-wallet-chain adapter would be wrong. They stay
  in wallet.ts / operation-poller.ts.
- `extractAddSignerOperation` returns `PendingSignerOperation | null` (EVM path can return null).
- `assertAddSignerSucceeded(response, chain, signerLocator, signerType)` — signerType added for the
  `wallet.addSigner.failed` log payload; integrator calls assert-then-extract (behavior-equivalent to the original).
- `supportsSignatures` initially set true for stellar (faithful: only solana was blocked). **Superseded by PR #1927**
  (https://github.com/Crossmint/crossmint-sdk/pull/1927, stacked on #1926): stellar → false. Investigation found
  Stellar message-signing is not a usable feature — no `createSignature` entry point (only `EVMWallet.signMessage`/
  `signTypedData`), and Stellar external-wallet + non-custodial signers reject `signMessage`. So signatures are
  EVM-only; the "only supported for EVM smart wallets" error is now accurate. Transaction approval unaffected
  (`supportsSignatures` gates only `approveSignatureInternal`).
- solana/stellar `balanceTokenFields` keep the original `contractAddress` fallback for exact fidelity.
- Folded in deferred Phase-1.4a: `PendingSignerOperation` named type (also retyped signer-mapping.ts + getSignerState).
  Still-inline literals remain at wallet.ts addSigner-local / completeSignerRegistration param /
  resumePendingDeviceSignerApproval param — fold into Phase 3.
Verify: 608/0/68; review PASS.

**CI OOM (fixed in this PR).** First CI run failed with `ERR_WORKER_OUT_OF_MEMORY` in the tsup DTS step. Root cause:
the shared `tsup.config.base.ts` globs every non-test src file as its own DTS entry; Phase 2's 4 new files tipped the
DTS worker past Node's default heap. Fix: wallets `build` script now uses
`cross-env NODE_OPTIONS=--max-old-space-size=8192 tsup` (CI runs `turbo build --concurrency=1` on 16GB ubuntu-latest,
so one bumped DTS worker is safe; published output unchanged). This headroom covers Phases 3–5.
Each future phase adds files → DTS entries; 8GB is generous but if it ever recurs, the durable fix is to override
`entry: ["src/index.ts"]` in wallets/tsup.config.ts (bundle instead of per-file). Verified safe: exports is only
"." and nothing deep-imports `@crossmint/wallets-sdk/dist/*` (the two tsconfig.typedoc `/*` mappings point at src/,
not dist). Not done now to avoid changing published packaging mid-refactor.

Separate worktree-only note: local DTS also fails on an UNRELATED pre-existing `ncs-signer.ts(384,21)` type error
(reproduces on pristine origin/main; CI builds clean — do not chase it).

### Original Phase 2 spec (for reference)

### 2A. Scaffold: `src/chains/chain-adapter.ts`
```ts
/** Alias for the API's RegisterSignerChain, named to match the SDK's addSigner verb. */
export type AddSignerChain = RegisterSignerChain;

export interface ChainAdapter {
    readonly nativeToken: "eth" | "sol" | "xlm";
    readonly walletLocatorPrefix: "me:evm:smart" | "me:solana:smart" | "me:stellar:smart";
    /** False for Solana — standalone signature approval is unsupported. */
    readonly supportsSignatures: boolean;
    /** EVM returns the concrete chain; Solana/Stellar return undefined. */
    addSignerChain(chain: Chain): AddSignerChain | undefined;
    /** Solana/Stellar: expect `response.transaction`. EVM: read `response.chains[chain]`. */
    extractAddSignerOperation(response: RegisterSignerResponse, chain: Chain): PendingSignerOperation;
    /** EVM: throw InvalidSignerError when chains[chain].status === "failed". No-op elsewhere. */
    assertAddSignerSucceeded(response: RegisterSignerResponse, chain: Chain, signerLocator: string): void;
    /** Stellar reads `onChain.txHash`; others read `onChain.txId`. */
    extractTransactionHash(onChain: GetTransactionSuccessResponse["onChain"]): string | undefined;
    /** mintHash (solana) / contractId (stellar) / contractAddress (evm). */
    balanceTokenFields(chainData: unknown): Partial<TokenBalance>;
    emptyBalanceTokenFields(): Partial<TokenBalance>;
    /** Solana ed25519 signs the serialized tx; Solana device (secp256r1) and all other chains sign the pending message. */
    transactionPayloadToSign(transaction: GetTransactionSuccessResponse, pendingMessage: string, signerType: SignerAdapter["type"]): string;
}

export function getChainAdapter(chain: Chain): ChainAdapter;
```

### 2B. Fan-out (3 parallel agents)
- `src/chains/adapters/evm.ts` → `export const evmChainAdapter: ChainAdapter`
- `src/chains/adapters/solana.ts` → `export const solanaChainAdapter: ChainAdapter`
- `src/chains/adapters/stellar.ts` → `export const stellarChainAdapter: ChainAdapter`
- Each with a unit-test file asserting exact parity with current switch behavior.

### 2C. Integrate
- `wallet.ts` gains `private get chainAdapter(): ChainAdapter { return getChainAdapter(this.chain); }` — a **getter, not a cached field**, because `resolveChainForEnvironment()` mutates `this.chain`.
- Replace 8 sites: `balances()` native-token switch, balance-formatter chain fields (pass adapter in), `walletLocator` prefix switch, `getSignerRegistrationChain` (delete, use `addSignerChain`), `addSigner` pending-op extraction + failed-status check, Stellar txHash in operation-poller, Solana guard in `approveSignatureInternal`, payload selection in `approveTransactionInternal`. Delete `isSolanaWallet`.

---

## Phase 3 — Stateful services (2 independent parallel tracks)

**Shipping as two sequential PRs** (≤500 additions, unstacked):
- **3A ServerSignerResolver ✅ PR https://github.com/Crossmint/crossmint-sdk/pull/1931** (+495/−160; wallet.ts ~2050→1952).
  `signers/server/resolver.ts` owns the dual caches + #1911 wipe discipline. Key decisions: a single-derivation
  `resolveForUseSigner(config, registeredLocators, isRecovery)` replaced the literal resolveFromRegistered+resolveAsRecovery
  split (which would derive twice and break the wipe pins); `stripSecretFromRecovery` stays in Wallet; the resolver
  exposes apiRecoveryAddress/apiDelegatedAddresses so the from() static accessors keep working; the derive helper is
  imported from the `../server` index so vitest's `vi.mock('@/signers/server')` reaches it. Test-only methods
  (resolveFromRegistered/resolveAsRecovery) were NOT exposed. Suite 640/0/68, review PASS, tsc+build clean.
- **3B DeviceRecoveryService** — REORDERED to LAST (after Phase 5), decided 2026-06-17. Device recovery is tightly
  coupled to signer assembly (it needs ~13 Wallet methods: buildInternalSignerConfig, assembleFullSigner,
  isAutoAssemblableSignerConfig, #signer get/set, #recovery, signers()/getSignerState/addSigner, approve*AndWait) —
  all of which Phase 5 SignerManager will own. Extracting it before SignerManager would require a wide temporary
  Wallet port that Phase 5 then reworks. So the new order is: Phase 4 (SignerDescriptor) → Phase 5 (SignerManager) →
  DeviceRecoveryService last, where its host port is essentially SignerManager + a few apiClient reads.

Moved ahead of the descriptor phase because the post-#1911 server-signer logic (dual caches + wipe discipline) is now the hairiest state in the class, and the server `SignerDescriptor` (Phase 4) needs `ServerSignerResolver` in its context to stay thin.

### 3A. `src/signers/server/resolver.ts` — `class ServerSignerResolver`
Absorbs: `deriveServerSignerCandidates`, `resolveServerSignerDerivation`, `resolveServerSignerApiLocator`, `resolveServerSigner`, `wipeNonSelectedCandidate`, the server case of `buildInternalSignerConfig`, the `resolveAddresses` helper inside `isRecoverySigner`, and the state `#resolvedServerSigner`, `#resolvedRecoveryServerSigner`, `#apiRecoveryServerSignerAddress`, `#apiDelegatedServerSignerAddresses`.

**Wipe discipline is fully internal to this class** — callers never touch `derivedKeyBytes` lifetimes.

```ts
export type ServerSignerCandidates = { primary: DerivedServerSigner; legacy: DerivedServerSigner | null };

export class ServerSignerResolver {
    constructor(params: {
        chain: Chain;
        projectId: string;
        environment: string;
        apiRecoveryAddress: string | null;
        apiDelegatedAddresses: string[];
        /** Addresses of api-sourced server signers in the wallet's initial signer list. */
        knownOnChainAddresses: () => string[];
    });
    /** ← deriveServerSignerCandidates (thin pass-through to signers/server helper). */
    deriveCandidates(config: ServerSignerConfig): ServerSignerCandidates;
    /** ← resolveServerSignerDerivation (post-#1911): accepts api-sourced configs (serves the
        recovery cache or throws the "no secret available" error verbatim); checks delegated
        AND recovery caches; wipes losing candidates; legacy-vs-primary heuristic. */
    resolveDerivation(config: ServerSignerConfig | ApiSourcedServerSignerConfig): DerivedServerSigner;
    /** ← resolveServerSignerApiLocator. */
    apiLocator(config: ServerSignerConfig | ApiSourcedServerSignerConfig): ServerSignerLocator;
    /** ← first half of resolveServerSigner: match against registered locators;
        caches into the DELEGATED slot, wipes the losing candidate. Null if no match. */
    resolveFromRegistered(config: ServerSignerConfig, registeredLocators: string[]): DerivedServerSigner | null;
    /** ← second half: picks legacy iff it matches apiRecoveryAddress, else primary;
        caches into the RECOVERY slot, wipes the losing candidate. */
    resolveAsRecovery(config: ServerSignerConfig): DerivedServerSigner;
    /** ← buildInternalSignerConfig "server" case: returns a COPY of derivedKeyBytes (so signer
        adapters can wipe their copy without corrupting the cache) + wipes non-cached derivations. */
    keyMaterialForAssembly(config: ServerSignerConfig | ApiSourcedServerSignerConfig): { derivedKeyBytes: Uint8Array; derivedAddress: string };
    /** ← isRecoverySigner's resolveAddresses: derive → collect addresses → wipe both candidates. */
    candidateAddresses(config: ServerSignerConfig | ApiSourcedServerSignerConfig): string[];
    /** ← useSigner's fresh-server reset: wipes + clears the DELEGATED cache only;
        the recovery cache intentionally survives. */
    resetDelegatedCache(): void;
    /** True when a recovery derivation is cached. Gates canAutoAssemble for api-sourced
        configs and the withRecoverySigner / resumePending guards. */
    get hasRecoveryResolution(): boolean;
}
```
- `stripSecretFromRecovery()` **stays in `Wallet`** (it mutates `#recovery`, which the resolver doesn't own); `Wallet` calls it right after `resolveAsRecovery`. It migrates into `SignerManager` in Phase 5.
- Unit tests must cover the #1911 invariants: losing candidate always wiped, cache never wiped by `keyMaterialForAssembly`, recovery cache survives `resetDelegatedCache`, api-sourced config without recovery cache throws the exact current message.

### 3B. `src/signers/device/device-recovery-service.ts` — `class DeviceRecoveryService`
Absorbs: `initDeviceSigner`, `resolveDeviceSignerAvailability`, `recover`, `checkAndResumeDeviceSigner`, `resumePendingDeviceSignerApproval`, `findLocalDeviceSigner`, `assembleRecoverySignerFallback` (~500 lines) and **replaces the flags** `#needsRecovery`, `#deviceSignerApproved`, `#deviceSignerUnsupported` with one explicit state:

```ts
export type DeviceSignerState =
    | { kind: "unknown" }
    | { kind: "ready"; signer: SignerAdapter }
    | { kind: "needs-registration" }
    | { kind: "pending-approval"; signer: SignerAdapter; operation: PendingSignerOperation }
    | { kind: "unsupported" };   // backend returned DEVICE_SIGNER_NOT_SUPPORTED

/** Narrow port — everything the service needs from Wallet, nothing more. */
export interface DeviceRecoveryHost {
    walletAddress: string;
    listSigners(): Promise<WalletSigner[]>;
    getSignerState(locator: SignerLocator): Promise<SignerStateResult>;
    registerDeviceSigner(config: DeviceSignerConfig): Promise<void>;       // wraps wallet.addSigner
    approveWithRecoverySigner(operation: PendingSignerOperation): Promise<void>;
    assembleDeviceSigner(locator: SignerLocator): SignerAdapter;
    assembleRecoveryFallback(): Promise<void>;
    setActiveSigner(signer: SignerAdapter): void;
}

export class DeviceRecoveryService {
    constructor(host: DeviceRecoveryHost, keyStorage: DeviceSignerKeyStorage | undefined);
    /** ← initDeviceSigner: resolve local key availability, assemble if found. */
    initialize(): Promise<void>;
    /** ← recover(): full registration / resumption / unsupported-fallback flow. */
    recover(): Promise<void>;
    get state(): DeviceSignerState;
    /** Derived: state.kind === "needs-registration" || "pending-approval". */
    get needsRecovery(): boolean;
}
```
- The fragile string-match for "delegated signer already approved" gets isolated into one named function `isAlreadyApprovedSignerError(error: unknown): boolean` with a `TODO: replace with backend error code`.
- Post-#1912 note: `UnsupportedBrowserError` is thrown by `IframeDeviceSignerKeyStorage`'s **constructor** (before a `Wallet` exists), so the service doesn't handle it specially — but parity tests must cover `initialize()` error paths (errors during availability checks → `needs-registration`-equivalent behavior, as today's `initDeviceSigner` catch does).

### 3C. Integrate
- `Wallet` constructs both services; `needsRecovery()` and `recover()` delegate. Highest-risk integration of the plan — the adversarial reviewer specifically replays the recover() scenarios in `wallet.test.ts`: interrupted approval, OTP rejection (`OtpValidationError` keeps local key), auth rejection (`AuthRejectedError` keeps local key), unsupported-fallback (deletes key, assembles recovery), local-key match (`mapAddressToKey` only after confirmation).

**Agents:** 3A and 3B as 2 parallel tracks (each: scaffold + implement + unit tests, disjoint files) → 1 integrator → verify.

---

## Phase 4 — `SignerDescriptor` registry (kill the signer-type switches)

**Split into two PRs by method group** (the descriptor module + tests exceed the 500-add cap on their own):
- **PR1 ✅ config-shaping methods — https://github.com/Crossmint/crossmint-sdk/pull/1932** (+485; wallet.ts 1952→1850).
  `signers/descriptors/{types,index,api-key,email,phone,device,external-wallet,passkey,server}.ts` implement
  `validateConfig` / `buildInternalConfig` / `canAutoAssemble`; wallet.ts dispatches via `getSignerDescriptor(type)` +
  `descriptorContext()`. server descriptor delegates to ServerSignerResolver. Added `UnknownSignerTypeError`. Two
  intentional notes: unknown-type now throws uniformly (was no-op/false on 2 of 3 paths — unreachable closed union);
  validateConfig dropped the vestigial RegisterSignerPasskeyParams arm. Suite 671/0/68, review PASS.
- **PR2 ✅ add-signer payload + recovery matching — https://github.com/Crossmint/crossmint-sdk/pull/1933**
  (+252 vs PR1 base; wallet.ts 1850→1806; STACKED on #1932, rebase onto main + retarget when #1932 merges). Added
  `addSignerPayload` + `matchesRecovery` to the descriptors; wired the addSigner payload ternary and isRecoverySigner
  (per-type branches → `matchesRecovery`; the `#recovery` upgrade is now explicit `adoptRecoveryConfig`, called only on
  a true match). Suite 690/0/68, review PASS. **`isSignerAvailable` / `requireSigner` DEFERRED to Phase 5** —
  requireSigner becomes SignerManager.require() and its `!canAutoAssemble` fallback doesn't fit a no-arg
  isSignerAvailable() cleanly; moving it twice is wasteful. So the descriptor's recovery/availability method lands with
  SignerManager. (Deviation from the plan's Phase 4C, which had requireSigner messages here.)

Scope guard: only **synchronous per-type** behavior moves here. The async resolution flows (`resolveNonDeviceSigner`, `resolveServerSigner` orchestration) move into `SignerManager` in Phase 5.

### 4A. Scaffold: `src/signers/descriptors/types.ts`
```ts
export interface SignerDescriptorContext<C extends Chain> {
    chain: C;
    walletAddress: string;
    crossmint: Crossmint;
    clientTEEConnection?: HandshakeParent;            // match existing WalletOptions type
    onAuthRequired?: Callbacks["onAuthRequired"];
    deviceSignerKeyStorage?: DeviceSignerKeyStorage;
    /** Phase 3 service — owns derivation caches and wipe discipline. */
    serverSigners: ServerSignerResolver;
}

export interface SignerDescriptor<C extends Chain = Chain> {
    readonly type: "email" | "phone" | "passkey" | "device" | "api-key" | "server" | "external-wallet";
    /** ← validateSignerInput */
    validateConfig(config: SignerConfigForChain<C>): void;
    /** ← buildInternalSignerConfig. Post-#1911: must accept ApiSourcedServerSignerConfig;
        server case delegates to ctx.serverSigners.keyMaterialForAssembly. */
    buildInternalConfig(config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig, ctx: SignerDescriptorContext<C>): InternalSignerConfig<C>;
    /** ← isAutoAssemblableSignerConfig. Post-#1911 server arm:
        !isApiSourcedServerSignerConfig(config) || ctx.serverSigners.hasRecoveryResolution */
    canAutoAssemble(config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig, ctx: SignerDescriptorContext<C>): boolean;
    /** ← addSigner's nested ternary: locator string vs full passkey config vs device publicKey object */
    addSignerPayload(config: SignerConfigForChain<C>, ctx: SignerDescriptorContext<C>): RegisterSignerParams["signer"];
    /** ← per-type branches of isRecoverySigner. PURE — the adoptRecoveryConfig side effect stays at the call site. */
    matchesRecovery(config: SignerConfigForChain<C>, recovery: RecoverySignerConfigForChain<C>, ctx: SignerDescriptorContext<C>): boolean;
    /** ← requireSigner's per-type error texts. Returns null when the signer is usable as-is;
        otherwise the guidance message to surface (e.g. "call useSigner with the server secret"). */
    isSignerAvailable(): string | null;
}
```
Registry in `src/signers/descriptors/index.ts`:
- `export function getSignerDescriptor<C extends Chain>(type: SignerDescriptor["type"]): SignerDescriptor<C>` — throws `UnknownSignerTypeError` (new, in `src/utils/errors.ts`, added to the `WalletError` union).

### 4B. Fan-out (7 parallel agents, one per descriptor + unit tests)
| File | Export | Notes |
|------|--------|-------|
| `descriptors/api-key.ts` | `apiKeySignerDescriptor` | simplest — lands first as the pattern reference |
| `descriptors/email.ts` | `emailSignerDescriptor` | straightforward |
| `descriptors/phone.ts` | `phoneSignerDescriptor` | straightforward |
| `descriptors/device.ts` | `deviceSignerDescriptor` | addSignerPayload has the publicKey-object branch |
| `descriptors/external-wallet.ts` | `externalWalletSignerDescriptor` | canAutoAssemble checks `onSign` |
| `descriptors/passkey.ts` | `passkeySignerDescriptor` | matchesRecovery is type-only match (documented quirk, keep comment) |
| `descriptors/server.ts` | `serverSignerDescriptor` | thin adapter over `ctx.serverSigners`; matchesRecovery uses `candidateAddresses` |

### 4C. Integrate
- Delete from `wallet.ts`: `validateSignerInput`, `buildInternalSignerConfig`, `isAutoAssemblableSignerConfig`, the `addSigner` payload ternary, the per-type bodies of `isRecoverySigner`, the per-type error messages in `requireSigner`.
- `isRecoverySigner` becomes: `descriptor.matchesRecovery(...)` + explicit `private adoptRecoveryConfig(config: SignerConfigForChain<C>): void` (the formerly hidden `#recovery = signerConfig` mutation, now named and called deliberately).
- Add `private descriptorContext(): SignerDescriptorContext<C>` helper.

---

## Phase 5 — `SignerManager` + façade slim-down

**Approach decided 2026-06-18 (Option 1): two separate classes with clear ownership + a narrow seam, NOT shared
mutable state.** The signer-session and device-recovery code share fields (#signer/#recovery/#needsRecovery/#recovering),
so the discipline is: each service owns its own state; the seam between them is a couple of single-purpose methods, and
the lifecycle orchestration (initDefaultSigner, preAuthIfNeeded) lives in the Wallet façade calling both. Confirmed
`recover()` already skips+clears when a non-device signer is active (wallet.ts ~1130), so the session→device coupling
reduces to one `onSignerSelected` notification (deferred to the device phase). Dependency graph is a DAG:
Wallet → {SignerManager, DeviceRecoveryService}; DeviceRecoveryService → SignerManager.

**Sequencing — two PRs:**
- **PR1 SignerManager ✅ https://github.com/Crossmint/crossmint-sdk/pull/1934** (+493; wallet.ts 1808→1676; suite
  716/0/68, review PASS). Seam fix worth remembering: the manager takes `walletLocator: () => WalletLocator` and
  `listSigners: () => Promise<WalletSigner[]>` as FUNCTIONS (never a Wallet ref) so the dynamic walletLocator getter and
  the overridable `wallet.signers()` are preserved — the naive duplicate-listSigners-in-manager version broke 23 contract
  tests. `require()` moved verbatim (isSignerAvailable conversion still deferred). `assemble()` drops the explicit
  deviceSignerKeyStorage arg (uses options internally — note for the device phase: recover/initDeviceSigner call assemble).
- **PR1 SignerManager (the dependency, no device knowledge)** — owns `#signer` (active) + `#recovery`. Moves the
  device-INDEPENDENT session ops: `signer` getter, `recovery` getter, `require()` (= requireSigner moved VERBATIM,
  literals intact — the `isSignerAvailable` descriptor conversion is deferred to its own follow-up because the
  `!canAutoAssemble` fallback makes an exact mapping subtle), `withRecoverySigner`, `assemble` (= assembleFullSigner),
  `adoptRecoveryConfig`, `stripSecretFromRecovery`, `getSignerState`, `signerIsRegistered`, `isSignerApproved`,
  `isApprovedSignerStatus`, `setActive`. Needs from Wallet (constructor inputs): apiClient, options, chain,
  walletAddress, serverSignerResolver, recovery config, initialSigners; owns `descriptorContext()`.
  STAYS in wallet.ts (calls the manager, unidirectional wallet→manager): useSigner + resolveNonDeviceSigner/
  resolveServerSigner/tryAutoSelectPasskey, ALL device methods (initDeviceSigner/recover/...), initDefaultSigner +
  preAuthIfNeeded orchestration, `#needsRecovery`/device flags, `#signerInitialization`/`#recovering`. No manager→wallet
  calls in PR1 (so #needsRecovery stays wholly in wallet.ts — no shared-flag problem yet).
- **PR2 DeviceRecoveryService (the finale)** — owns the device state (DeviceSignerState union) + recover/initDeviceSigner
  flow; depends on SignerManager (assemble/setActive/getActive/recovery). The session→device `#needsRecovery` clears
  become the single `onSignerSelected` notification. Orchestration stays in Wallet.

### 5A. `src/wallets/services/signer-manager.ts` — `class SignerManager<C extends Chain>`
Owns the remaining signer state: `#active: SignerAdapter | undefined`, `#recovery: RecoverySignerConfigForChain<C>`, `#initialization: Promise<void>`, `#recovering: Promise<void> | null`, plus references to `ServerSignerResolver` and `DeviceRecoveryService`.

```ts
export class SignerManager<C extends Chain> {
    get active(): SignerAdapter | undefined;
    waitForInit(): Promise<void>;
    /** ← useSigner + resolveNonDeviceSigner + tryAutoSelectPasskey + resolveServerSigner orchestration. */
    use(config: SignerConfigForChain<C>): Promise<void>;
    /** ← requireSigner (per-type messages come from descriptor.isSignerAvailable()). */
    require(): SignerAdapter;
    /** ← preAuthIfNeeded: init → recover → ensureAuthenticated. */
    ensureReady(): Promise<void>;
    /** ← withRecoverySigner. */
    withRecoverySigner<T>(operation: () => Promise<T>, options?: { restoreOnError?: SignerAdapter }): Promise<T>;
    /** ← the formerly hidden isRecoverySigner mutation, explicit. */
    adoptRecoveryConfig(config: SignerConfigForChain<C>): void;
    /** ← stripSecretFromRecovery (moves here from Wallet). */
    stripSecretFromRecovery(): void;
    /** ← assembleFullSigner. */
    assemble(config: SignerConfigForChain<C> | ApiSourcedServerSignerConfig, options?: { isAdminSigner?: boolean }): Promise<SignerAdapter>;
}
```
Side-effect cleanups land here (behavior identical, mutations made explicit):
- `tryAutoSelectPasskey` → `private resolvePasskeyCredentialId(config): Promise<string | null>` returning the id instead of mutating `signer.id`.
- Device availability returns a locator instead of writing `config.locator`.

### 5B. Façade + subclass cleanup
- `wallet.ts` shrinks to the public façade (~350 lines): each public method is validate → delegate to a service → map result.
- `wallet-factory.ts` constructs the chain subclass **directly** (`new EVMWallet(...)` — it already knows the chain) instead of building a base `Wallet` and rewrapping. `EVMWallet.from(wallet)` etc. stay for API compat, now implemented via the direct constructor.
- Delete the `protected static getApiClient/getOptions/getRecovery/getInitialSigners/...` accessor hack; subclasses use `protected get signerManager(): SignerManager<C>` and the existing `protected get apiClient()` / `options`.

---

## Phase 6 (optional, separate decision) — hardening
- Remove deprecated `approveTransaction()` (breaking — needs a major).
- Backend error code for "delegated signer already approved" → delete `isAlreadyApprovedSignerError` string match.
- `resolveChainForEnvironment` stops mutating `this.chain` (needs an audit of who reads `wallet.chain` after construction).

---

## Size & review budget

| Phase | New files | wallet.ts delta | Review focus |
|-------|-----------|-----------------|--------------|
| 1 | 3 modules + 3 tests | ~−450 lines | Verbatim-move check only |
| 2 | 1 interface + 3 adapters + 3 tests | ~−120 lines | Adapter parity with old switches |
| 3 | 2 services + 2 tests | ~−700 lines | Wipe discipline; DeviceSignerState transitions |
| 4 | 1 interface + 7 descriptors + 7 tests | ~−300 lines | server + passkey descriptors |
| 5 | 1 service + 1 test | ~−400 lines | useSigner flow, factory change |

## Remaining naming notes
- `isSignerAvailable(): string | null` — adopted as decided. Contract documented as "null = usable as-is; string = guidance message". Flag for later: the `is*` prefix usually implies a boolean — `signerUnavailableReason()` would self-document — but not worth churn unless you feel strongly.
- `AddSignerChain` is a type alias for the API's `RegisterSignerChain` so the adapter surface matches the SDK's `addSigner` verb.

---

## Follow-up — bundle tsup from a single entry (kill the DTS-OOM treadmill)

**Why:** the shared `tsup.config.base.ts` globs every non-test src file as its own DTS entry
(`entry: ["src/**/*.(ts|tsx)", "!src/**/*.test.(ts|tsx)"]`). The DTS worker holds the full type graph per entry, so
memory grows with the file count. Phase 2 already pushed CI over Node's default heap (`ERR_WORKER_OUT_OF_MEMORY`),
patched by bumping the wallets `build` script to `cross-env NODE_OPTIONS=--max-old-space-size=8192 tsup`. Every
remaining phase adds files (Phase 3: +2 services; Phase 4: +7 descriptors), so the per-file-entry approach is a
treadmill the heap bump only delays.

**Fix:** override `entry` in `packages/wallets/tsup.config.ts` to bundle from the public barrel instead of per-file:
```ts
import type { Options } from "tsup";
import { treeShakableConfig } from "../../tsup.config.base";
const config: Options = { ...treeShakableConfig, entry: ["src/index.ts"] };
export default config;
```
With `bundle: true` + `splitting: true` (already in the base), tsup emits `dist/index.{js,cjs}` + shared chunks and a
single `dist/index.d.ts`. Once done, REVERT the `--max-old-space-size` heap bump in the build script — it's no longer
needed.

**Safety (verified 2026-06-16):** `package.json` `exports` is only `"."` (→ `dist/index.js`); nothing deep-imports
`@crossmint/wallets-sdk/dist/*` across the monorepo (the two `tsconfig.typedoc.json` `@crossmint/wallets-sdk/*`
mappings resolve to `wallets/src/*`, i.e. source for doc-gen, NOT the built dist — unaffected). So the public
contract (root entry, `main`/`module`/`types`) is unchanged; only the internal dist layout shrinks.

**Why deferred, not done inline:** it changes the published npm tarball's file layout (outward-facing packaging), and
it can't be validated locally in this worktree because the unrelated pre-existing `ncs-signer.ts(384,21)` DTS type
error blocks any local DTS build. Best landed as its own small PR with a clean CI build as the proof, separate from
the decomposition. Confirm the built `dist/index.d.ts` still re-exports the full public surface (diff the exported
names against a pre-change build) before merging.
