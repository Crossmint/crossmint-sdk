import type { Chain } from "../../chains/chains";
import { secureWipe } from "../../utils/secure-wipe";
import {
    type ApiSourcedServerSignerConfig,
    type DerivedServerSigner,
    type ServerSignerConfig,
    type ServerSignerLocator,
    isApiSourcedServerSignerConfig,
} from "../types";
import { deriveServerSignerCandidates as deriveServerSignerCandidatesHelper } from "../server";

export class ServerSignerResolver {
    readonly #chain: Chain;
    readonly #projectId: string;
    readonly #environment: string;
    readonly #apiRecoveryAddresses: string[];
    readonly #apiDelegatedAddresses: string[];
    readonly #knownOnChainAddresses: () => string[];

    #resolvedServerSigner: DerivedServerSigner | null = null;
    /** One entry per recovery server signer whose secret has been provided, keyed by derived address. */
    #resolvedRecoveryServerSigners: DerivedServerSigner[] = [];

    constructor(params: {
        chain: Chain;
        projectId: string;
        environment: string;
        apiRecoveryAddresses: string[];
        apiDelegatedAddresses: string[];
        knownOnChainAddresses: () => string[];
    }) {
        this.#chain = params.chain;
        this.#projectId = params.projectId;
        this.#environment = params.environment;
        this.#apiRecoveryAddresses = params.apiRecoveryAddresses;
        this.#apiDelegatedAddresses = params.apiDelegatedAddresses;
        this.#knownOnChainAddresses = params.knownOnChainAddresses;
    }

    deriveCandidates(config: ServerSignerConfig): { primary: DerivedServerSigner; legacy: DerivedServerSigner | null } {
        return deriveServerSignerCandidatesHelper(config, this.#chain, this.#projectId, this.#environment);
    }

    resolveDerivation(config: ServerSignerConfig | ApiSourcedServerSignerConfig): DerivedServerSigner {
        if (isApiSourcedServerSignerConfig(config)) {
            const resolved = this.#resolvedRecoveryFor(config.address);
            if (resolved != null) {
                return resolved;
            }
            throw new Error(
                "Cannot resolve server signer derivation: no secret available and no cached recovery resolution. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first.'
            );
        }

        const { primary, legacy } = this.deriveCandidates(config);
        const candidateAddresses = [primary.derivedAddress, legacy?.derivedAddress];
        const cached =
            [this.#resolvedServerSigner, ...this.#resolvedRecoveryServerSigners].find(
                (c) => c != null && candidateAddresses.includes(c.derivedAddress)
            ) ?? null;
        if (cached != null) {
            secureWipe(primary.derivedKeyBytes, legacy?.derivedKeyBytes);
            return cached;
        }

        if (legacy != null) {
            if (this.#apiRecoveryAddresses.includes(legacy.derivedAddress)) {
                secureWipe(primary.derivedKeyBytes);
                return legacy;
            }
            if (this.#knownOnChainAddresses().includes(legacy.derivedAddress)) {
                secureWipe(primary.derivedKeyBytes);
                return legacy;
            }
            secureWipe(legacy.derivedKeyBytes);
        }
        return primary;
    }

    apiLocator(config: ServerSignerConfig | ApiSourcedServerSignerConfig): ServerSignerLocator {
        const resolved = this.resolveDerivation(config);
        // Only the address is needed here — wipe the selected candidate's key bytes (never the cached slots).
        if (!this.#isCached(resolved)) {
            secureWipe(resolved.derivedKeyBytes);
        }
        return `server:${resolved.derivedAddress}`;
    }

    /**
     * Resolves a server signer with a SINGLE candidate derivation: the same derivation drives the
     * registered check, the recovery selection, and the unregistered wipe, so key material is
     * derived (and wiped) exactly once. `isRecovery` is consulted only after the registered check fails.
     * A recovery resolution reports the derived address that was selected so callers can replace the
     * secret-carrying config with an address-only one.
     */
    resolveForUseSigner(
        config: ServerSignerConfig,
        registeredLocators: string[],
        isRecovery: () => boolean
    ): { kind: "delegated" } | { kind: "recovery"; address: string } | { kind: "unregistered"; message: string } {
        const { primary, legacy } = this.deriveCandidates(config);
        if (this.#selectRegistered(primary, legacy, registeredLocators) != null) {
            return { kind: "delegated" };
        }
        if (isRecovery()) {
            return { kind: "recovery", address: this.#selectRecovery(primary, legacy).derivedAddress };
        }
        const tried =
            legacy != null
                ? `"server:${primary.derivedAddress}" or "server:${legacy.derivedAddress}"`
                : `"server:${primary.derivedAddress}"`;
        secureWipe(primary.derivedKeyBytes, legacy?.derivedKeyBytes);
        return { kind: "unregistered", message: `Signer ${tried} is not registered in this wallet.` };
    }

    #selectRegistered(
        primary: DerivedServerSigner,
        legacy: DerivedServerSigner | null,
        registeredLocators: string[]
    ): DerivedServerSigner | null {
        if (registeredLocators.includes(`server:${primary.derivedAddress}`)) {
            this.#resolvedServerSigner = primary;
            this.#wipeNonSelectedCandidate(primary, legacy);
            return primary;
        }
        if (legacy != null && registeredLocators.includes(`server:${legacy.derivedAddress}`)) {
            this.#resolvedServerSigner = legacy;
            this.#wipeNonSelectedCandidate(legacy, primary);
            return legacy;
        }
        return null;
    }

    #selectRecovery(primary: DerivedServerSigner, legacy: DerivedServerSigner | null): DerivedServerSigner {
        const selected =
            legacy != null && this.#apiRecoveryAddresses.includes(legacy.derivedAddress) ? legacy : primary;
        this.#wipeNonSelectedCandidate(selected, selected === legacy ? primary : legacy);
        const previous = this.#resolvedRecoveryFor(selected.derivedAddress);
        if (previous != null) {
            secureWipe(previous.derivedKeyBytes);
            this.#resolvedRecoveryServerSigners = this.#resolvedRecoveryServerSigners.filter((c) => c !== previous);
        }
        this.#resolvedRecoveryServerSigners.push(selected);
        return selected;
    }

    #resolvedRecoveryFor(address: string): DerivedServerSigner | null {
        return this.#resolvedRecoveryServerSigners.find((c) => c.derivedAddress === address) ?? null;
    }

    #isCached(candidate: DerivedServerSigner): boolean {
        return candidate === this.#resolvedServerSigner || this.#resolvedRecoveryServerSigners.includes(candidate);
    }

    keyMaterialForAssembly(config: ServerSignerConfig | ApiSourcedServerSignerConfig): {
        derivedKeyBytes: Uint8Array;
        derivedAddress: string;
    } {
        const resolved = this.resolveDerivation(config);
        const keyBytesCopy = new Uint8Array(resolved.derivedKeyBytes);
        if (!this.#isCached(resolved)) {
            secureWipe(resolved.derivedKeyBytes);
        }
        return { derivedKeyBytes: keyBytesCopy, derivedAddress: resolved.derivedAddress };
    }

    candidateAddresses(config: ServerSignerConfig | ApiSourcedServerSignerConfig): string[] {
        if (isApiSourcedServerSignerConfig(config)) {
            return [config.address];
        }
        const { primary, legacy } = this.deriveCandidates(config);
        const addresses = [primary.derivedAddress];
        if (legacy != null) {
            addresses.push(legacy.derivedAddress);
        }
        secureWipe(primary.derivedKeyBytes, legacy?.derivedKeyBytes);
        return addresses;
    }

    resetDelegatedCache(): void {
        secureWipe(this.#resolvedServerSigner?.derivedKeyBytes);
        this.#resolvedServerSigner = null;
    }

    /** Whether the secret behind the recovery server signer at `address` has been provided via useSigner. */
    hasRecoveryResolutionFor(address: string): boolean {
        return this.#resolvedRecoveryFor(address) != null;
    }

    get apiRecoveryAddresses(): string[] {
        return this.#apiRecoveryAddresses;
    }

    get apiDelegatedAddresses(): string[] {
        return this.#apiDelegatedAddresses;
    }

    #wipeNonSelectedCandidate(selected: DerivedServerSigner, other: DerivedServerSigner | null): void {
        if (other != null && other !== selected) {
            secureWipe(other.derivedKeyBytes);
        }
    }
}
