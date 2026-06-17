import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiSourcedServerSignerConfig, ServerSignerConfig } from "../types";
import { deriveServerSignerCandidates } from "../server";
import { ServerSignerResolver } from "./resolver";
vi.mock("../server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../server")>();
    return { ...actual, deriveServerSignerCandidates: vi.fn() };
});
const mockedCandidates = vi.mocked(deriveServerSignerCandidates);
type CandidateSpec = { address: string; fill: number };
type Slot = "primary" | "legacy";
type Derived = { derivedKeyBytes: Uint8Array; derivedAddress: string };
type RecordedCandidates = { primary: Derived; legacy: Derived | null };
const slot = (s: CandidateSpec) => ({ derivedKeyBytes: new Uint8Array(32).fill(s.fill), derivedAddress: s.address });
const installCandidates = (
    bySecret: Record<string, { primary: CandidateSpec; legacy: CandidateSpec | null }>
): RecordedCandidates[] => {
    const recorded: RecordedCandidates[] = [];
    mockedCandidates.mockImplementation(((signer: { secret?: string }) => {
        const spec = bySecret[signer?.secret ?? ""];
        if (spec == null) {
            throw new Error(`test setup: no candidate spec for secret "${signer?.secret}"`);
        }
        const out = { primary: slot(spec.primary), legacy: spec.legacy == null ? null : slot(spec.legacy) };
        recorded.push(out);
        return out;
    }) as any);
    return recorded;
};
const installDual = () =>
    installCandidates({ s: { primary: { address: "0xPrimary", fill: 7 }, legacy: { address: "0xLegacy", fill: 9 } } });
const isZeroed = (buf: Uint8Array): boolean => buf.length > 0 && buf.every((b) => b === 0);
const everyByteIs = (buf: Uint8Array, value: number): boolean => buf.length === 32 && buf.every((b) => b === value);
const expectWipedAndKept = (rec: RecordedCandidates, wiped: Slot, survivor: Slot, survivorFill: number) => {
    expect(isZeroed(rec[wiped]!.derivedKeyBytes)).toBe(true);
    expect(everyByteIs(rec[survivor]!.derivedKeyBytes, survivorFill)).toBe(true);
};
const fullConfig = (secret: string): ServerSignerConfig => ({ type: "server", secret });
const apiConfig = (address: string): ApiSourcedServerSignerConfig => ({ type: "server", address });
const makeResolver = (overrides?: {
    apiRecoveryAddress?: string | null;
    apiDelegatedAddresses?: string[];
    knownOnChainAddresses?: string[];
}): ServerSignerResolver =>
    new ServerSignerResolver({
        chain: "base-sepolia",
        projectId: "proj_test_123",
        environment: "staging",
        apiRecoveryAddress: overrides?.apiRecoveryAddress ?? null,
        apiDelegatedAddresses: overrides?.apiDelegatedAddresses ?? [],
        knownOnChainAddresses: () => overrides?.knownOnChainAddresses ?? [],
    });
const cacheRecovery = (r: ServerSignerResolver, rec: RecordedCandidates[], secret: string) => {
    expect(r.resolveForUseSigner(fullConfig(secret), [], () => true)).toEqual({ kind: "recovery" });
    return rec[rec.length - 1];
};
const cacheDelegated = (r: ServerSignerResolver, rec: RecordedCandidates[], secret: string, loc: string) => {
    expect(r.resolveForUseSigner(fullConfig(secret), [loc], () => false)).toEqual({ kind: "delegated" });
    return rec[rec.length - 1];
};
describe("ServerSignerResolver", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it("deriveCandidates derives primary and legacy via the helper with chain, projectId, and environment", () => {
        installCandidates({ s: { primary: { address: "0xP", fill: 7 }, legacy: { address: "0xL", fill: 9 } } });
        const { primary, legacy } = makeResolver().deriveCandidates(fullConfig("s"));
        expect(primary.derivedAddress).toBe("0xP");
        expect(legacy?.derivedAddress).toBe("0xL");
        const ctx = ["base-sepolia", "proj_test_123", "staging"];
        expect(mockedCandidates).toHaveBeenNthCalledWith(1, fullConfig("s"), ...ctx);
    });
    describe("resolveDerivation", () => {
        it("returns the cached recovery resolution for api-sourced config", () => {
            const recorded = installCandidates({ rec: { primary: { address: "0xRec", fill: 5 }, legacy: null } });
            const resolver = makeResolver({ apiRecoveryAddress: "0xRec" });
            cacheRecovery(resolver, recorded, "rec");
            const resolved = resolver.resolveDerivation(apiConfig("0xRec"));
            expect(resolved.derivedAddress).toBe("0xRec");
            expect(everyByteIs(resolved.derivedKeyBytes, 5)).toBe(true);
        });
        it("throws the exact message when api-sourced config has no cached recovery resolution", () => {
            expect(() => makeResolver().resolveDerivation(apiConfig("0xSome"))).toThrow(
                "Cannot resolve server signer derivation: no secret available and no cached recovery resolution. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first.'
            );
        });
        it("returns the cache hit and wipes both fresh candidates", () => {
            const resolver = makeResolver({ apiRecoveryAddress: "0xRecPrimary" });
            const recorded = installCandidates({
                rec: { primary: { address: "0xRecPrimary", fill: 7 }, legacy: { address: "0xRecLegacy", fill: 9 } },
            });
            cacheRecovery(resolver, recorded, "rec");
            const cached = recorded[0].primary;
            expect(resolver.resolveDerivation(fullConfig("rec"))).toBe(cached);
            expect(isZeroed(recorded[1].primary.derivedKeyBytes)).toBe(true);
            expect(isZeroed(recorded[1].legacy!.derivedKeyBytes)).toBe(true);
            expect(everyByteIs(cached.derivedKeyBytes, 7)).toBe(true);
        });
        it.each([
            ["legacy matches apiRecoveryAddress", { apiRecoveryAddress: "0xLegacy" }],
            ["legacy is a known on-chain address", { knownOnChainAddresses: ["0xLegacy"] }],
        ] as const)("picks legacy and wipes primary when %s", (_t, o) => {
            const recorded = installDual();
            expect(makeResolver(o).resolveDerivation(fullConfig("s")).derivedAddress).toBe("0xLegacy");
            expectWipedAndKept(recorded[0], "primary", "legacy", 9);
        });
        it("picks primary and wipes legacy otherwise", () => {
            const recorded = installDual();
            expect(makeResolver().resolveDerivation(fullConfig("s")).derivedAddress).toBe("0xPrimary");
            expectWipedAndKept(recorded[0], "legacy", "primary", 7);
        });
    });
    it("apiLocator formats the resolved derived address as a server locator", () => {
        installCandidates({ s: { primary: { address: "0xPrimary", fill: 7 }, legacy: null } });
        expect(makeResolver().apiLocator(fullConfig("s"))).toBe("server:0xPrimary");
    });
    describe("resolveForUseSigner", () => {
        it.each([
            ["server:0xPrimary", "legacy", "primary", 7],
            ["server:0xLegacy", "primary", "legacy", 9],
        ] as const)("returns delegated, wipes non-selected, keeps selected (%s)", (loc, w, s, f) => {
            const recorded = installDual();
            const r = makeResolver().resolveForUseSigner(fullConfig("s"), [loc], () => false);
            expect(r).toEqual({ kind: "delegated" });
            expectWipedAndKept(recorded[0], w, s, f);
        });
        it("caches the selected delegated candidate so a later resolveDerivation cache-hit returns it", () => {
            const recorded = installCandidates({ s: { primary: { address: "0xPrimary", fill: 7 }, legacy: null } });
            const resolver = makeResolver();
            const cached = cacheDelegated(resolver, recorded, "s", "server:0xPrimary").primary;
            installCandidates({ s: { primary: { address: "0xPrimary", fill: 7 }, legacy: null } });
            expect(resolver.resolveDerivation(fullConfig("s"))).toBe(cached);
        });
        it("returns recovery and caches the recovery slot when not registered but isRecovery is true", () => {
            installCandidates({ s: { primary: { address: "0xPrimary", fill: 7 }, legacy: null } });
            const resolver = makeResolver();
            expect(resolver.resolveForUseSigner(fullConfig("s"), [], () => true)).toEqual({ kind: "recovery" });
            expect(resolver.hasRecoveryResolution).toBe(true);
        });
        it("returns the dual-locator unregistered message and wipes both candidates", () => {
            const recorded = installCandidates({
                s: { primary: { address: "0xPrimaryAddr", fill: 7 }, legacy: { address: "0xLegacyAddr", fill: 9 } },
            });
            const r = makeResolver().resolveForUseSigner(fullConfig("s"), [], () => false);
            const message = 'Signer "server:0xPrimaryAddr" or "server:0xLegacyAddr" is not registered in this wallet.';
            expect(r).toEqual({ kind: "unregistered", message });
            expect(isZeroed(recorded[0].primary.derivedKeyBytes)).toBe(true);
            expect(isZeroed(recorded[0].legacy!.derivedKeyBytes)).toBe(true);
        });
        it("returns the single-locator unregistered message and wipes the primary when there is no legacy", () => {
            const recorded = installCandidates({ s: { primary: { address: "0xOnlyPrimary", fill: 7 }, legacy: null } });
            const r = makeResolver().resolveForUseSigner(fullConfig("s"), [], () => false);
            const message = 'Signer "server:0xOnlyPrimary" is not registered in this wallet.';
            expect(r).toEqual({ kind: "unregistered", message });
            expect(isZeroed(recorded[0].primary.derivedKeyBytes)).toBe(true);
        });
        it("does not consult isRecovery when a candidate is already registered", () => {
            installCandidates({ s: { primary: { address: "0xPrimary", fill: 7 }, legacy: null } });
            const isRecovery = vi.fn(() => true);
            makeResolver().resolveForUseSigner(fullConfig("s"), ["server:0xPrimary"], isRecovery);
            expect(isRecovery).not.toHaveBeenCalled();
        });
        it.each([
            ["legacy matches apiRecoveryAddress", "0xLegacy", "primary", "legacy", 9],
            ["primary otherwise", "0xPrimary", "legacy", "primary", 7],
        ] as const)("caches the recovery slot and wipes the non-selected candidate (%s)", (_t, rec, w, s, f) => {
            const recorded = installDual();
            const resolver = makeResolver({ apiRecoveryAddress: rec });
            expect(resolver.resolveForUseSigner(fullConfig("s"), [], () => true)).toEqual({ kind: "recovery" });
            expect(resolver.resolvedRecoveryAddress).toBe(rec);
            expectWipedAndKept(recorded[0], w, s, f);
        });
    });
    it("keyMaterialForAssembly returns a copy of cached bytes the caller can wipe without corrupting the cache", () => {
        const recorded = installCandidates({ rec: { primary: { address: "0xRec", fill: 5 }, legacy: null } });
        const resolver = makeResolver({ apiRecoveryAddress: "0xRec" });
        const cached = cacheRecovery(resolver, recorded, "rec").primary;
        installCandidates({ rec: { primary: { address: "0xRec", fill: 5 }, legacy: null } });
        const first = resolver.keyMaterialForAssembly(fullConfig("rec"));
        expect(first.derivedKeyBytes).not.toBe(cached.derivedKeyBytes);
        expect(everyByteIs(first.derivedKeyBytes, 5)).toBe(true);
        first.derivedKeyBytes.fill(0);
        expect(everyByteIs(cached.derivedKeyBytes, 5)).toBe(true);
        installCandidates({ rec: { primary: { address: "0xRec", fill: 5 }, legacy: null } });
        const second = resolver.keyMaterialForAssembly(fullConfig("rec"));
        expect(second.derivedKeyBytes).not.toBe(first.derivedKeyBytes);
        expect(everyByteIs(second.derivedKeyBytes, 5)).toBe(true);
    });
    it("keyMaterialForAssembly wipes the resolved derivation when it is neither cached slot, after copying", () => {
        const recorded = installDual();
        const material = makeResolver().keyMaterialForAssembly(fullConfig("s"));
        expect(material.derivedAddress).toBe("0xPrimary");
        expect(everyByteIs(material.derivedKeyBytes, 7)).toBe(true);
        expect(isZeroed(recorded[0].primary.derivedKeyBytes)).toBe(true);
        expect(isZeroed(recorded[0].legacy!.derivedKeyBytes)).toBe(true);
    });
    it("candidateAddresses returns the api-sourced address for api-sourced config without deriving", () => {
        expect(makeResolver().candidateAddresses(apiConfig("0xApiAddr"))).toEqual(["0xApiAddr"]);
        expect(mockedCandidates).not.toHaveBeenCalled();
    });
    it.each([
        ["collects both addresses and wipes both", { address: "0xLegacy", fill: 9 }, ["0xPrimary", "0xLegacy"]],
        ["returns only the primary address and wipes it when no legacy", null, ["0xPrimary"]],
    ] as [string, CandidateSpec | null, string[]][])("candidateAddresses derives, %s", (_t, legacy, expected) => {
        const recorded = installCandidates({ s: { primary: { address: "0xPrimary", fill: 7 }, legacy } });
        expect(makeResolver().candidateAddresses(fullConfig("s"))).toEqual(expected);
        expect(isZeroed(recorded[0].primary.derivedKeyBytes)).toBe(true);
        const leg = recorded[0].legacy;
        expect(leg == null || isZeroed(leg.derivedKeyBytes)).toBe(true);
    });
    it("resetDelegatedCache wipes and clears the delegated cache while preserving the recovery cache", () => {
        const recorded = installCandidates({ rec: { primary: { address: "0xRec", fill: 5 }, legacy: null } });
        const resolver = makeResolver({ apiRecoveryAddress: "0xRec" });
        const recoveryCached = cacheRecovery(resolver, recorded, "rec").primary;
        const dRec = installCandidates({ del: { primary: { address: "0xDel", fill: 3 }, legacy: null } });
        expect(everyByteIs(cacheDelegated(resolver, dRec, "del", "server:0xDel").primary.derivedKeyBytes, 3)).toBe(
            true
        );
        resolver.resetDelegatedCache();
        expect(isZeroed(dRec[0].primary.derivedKeyBytes)).toBe(true);
        expect(resolver.hasRecoveryResolution).toBe(true);
        expect(everyByteIs(recoveryCached.derivedKeyBytes, 5)).toBe(true);
        expect(resolver.resolveDerivation(apiConfig("0xRec"))).toBe(recoveryCached);
    });
    it("hasRecoveryResolution reflects whether the recovery cache is populated", () => {
        const recorded = installCandidates({ rec: { primary: { address: "0xRec", fill: 5 }, legacy: null } });
        const resolver = makeResolver({ apiRecoveryAddress: "0xRec" });
        expect(resolver.hasRecoveryResolution).toBe(false);
        cacheRecovery(resolver, recorded, "rec");
        expect(resolver.hasRecoveryResolution).toBe(true);
    });
    it("resolvedRecoveryAddress is null until cached, then exposes the resolved derived address", () => {
        const recorded = installCandidates({ rec: { primary: { address: "0xRec", fill: 5 }, legacy: null } });
        const resolver = makeResolver({ apiRecoveryAddress: "0xRec" });
        expect(resolver.resolvedRecoveryAddress).toBeNull();
        cacheRecovery(resolver, recorded, "rec");
        expect(resolver.resolvedRecoveryAddress).toBe("0xRec");
    });
    it("exposes the constructor-provided api recovery and delegated addresses", () => {
        const resolver = makeResolver({ apiRecoveryAddress: "0xRec", apiDelegatedAddresses: ["0xDelA", "0xDelB"] });
        expect(resolver.apiRecoveryAddress).toBe("0xRec");
        expect(resolver.apiDelegatedAddresses).toEqual(["0xDelA", "0xDelB"]);
    });
});
