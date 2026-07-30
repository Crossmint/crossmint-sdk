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
    readonly #apiRecoveryAddress: string | null;
    readonly #apiQuorumServerMemberAddresses: string[];
    readonly #apiDelegatedAddresses: string[];
    readonly #knownOnChainAddresses: () => string[];

    #resolvedServerSigner: DerivedServerSigner | null = null;
    #resolvedRecoveryServerSigner: DerivedServerSigner | null = null;

    constructor(params: {
        chain: Chain;
        projectId: string;
        environment: string;
        apiRecoveryAddress: string | null;
        apiQuorumServerMemberAddresses?: string[];
        apiDelegatedAddresses: string[];
        knownOnChainAddresses: () => string[];
    }) {
        this.#chain = params.chain;
        this.#projectId = params.projectId;
        this.#environment = params.environment;
        this.#apiRecoveryAddress = params.apiRecoveryAddress;
        this.#apiQuorumServerMemberAddresses = params.apiQuorumServerMemberAddresses ?? [];
        this.#apiDelegatedAddresses = params.apiDelegatedAddresses;
        this.#knownOnChainAddresses = params.knownOnChainAddresses;
    }

    // The admin identity is either the single recovery signer's address or any quorum
    // member's — a legacy derivation matching either must win over the primary, so the
    // assembled adapter's locator lines up with the API's member locator.
    #isAdminAddress(address: string): boolean {
        return address === this.#apiRecoveryAddress || this.#apiQuorumServerMemberAddresses.includes(address);
    }

    deriveCandidates(config: ServerSignerConfig): { primary: DerivedServerSigner; legacy: DerivedServerSigner | null } {
        return deriveServerSignerCandidatesHelper(config, this.#chain, this.#projectId, this.#environment);
    }

    resolveDerivation(config: ServerSignerConfig | ApiSourcedServerSignerConfig): DerivedServerSigner {
        if (isApiSourcedServerSignerConfig(config)) {
            // The cache holds one admin identity; with quorum server members there can be
            // several, so serve it only for the address it was resolved for — never
            // substitute another member's key material.
            const cached = this.#resolvedRecoveryServerSigner;
            if (cached != null && cached.derivedAddress === config.address) {
                return cached;
            }
            throw new Error(
                `Cannot resolve server signer derivation for "server:${config.address}": ` +
                    "no secret available and no cached recovery resolution for that address. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first.'
            );
        }

        const { primary, legacy } = this.deriveCandidates(config);
        const cached = this.#resolvedServerSigner ?? this.#resolvedRecoveryServerSigner;
        if (cached != null) {
            const cachedAddr = cached.derivedAddress;
            if (cachedAddr === primary.derivedAddress || (legacy != null && cachedAddr === legacy.derivedAddress)) {
                secureWipe(primary.derivedKeyBytes, legacy?.derivedKeyBytes);
                return cached;
            }
        }

        if (legacy != null) {
            if (this.#isAdminAddress(legacy.derivedAddress)) {
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
        if (resolved !== this.#resolvedServerSigner && resolved !== this.#resolvedRecoveryServerSigner) {
            secureWipe(resolved.derivedKeyBytes);
        }
        return `server:${resolved.derivedAddress}`;
    }

    /**
     * Resolves a server signer with a SINGLE candidate derivation: the same derivation drives the
     * registered check, the recovery selection, and the unregistered wipe, so key material is
     * derived (and wiped) exactly once. `isRecovery` is consulted only after the registered check fails.
     */
    resolveForUseSigner(
        config: ServerSignerConfig,
        registeredLocators: string[],
        isRecovery: () => boolean
    ): { kind: "delegated" } | { kind: "recovery" } | { kind: "unregistered"; message: string } {
        const { primary, legacy } = this.deriveCandidates(config);
        if (this.#selectRegistered(primary, legacy, registeredLocators) != null) {
            return { kind: "delegated" };
        }
        if (isRecovery()) {
            this.#selectRecovery(primary, legacy);
            return { kind: "recovery" };
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
        if (legacy != null && this.#isAdminAddress(legacy.derivedAddress)) {
            this.#resolvedRecoveryServerSigner = legacy;
            this.#wipeNonSelectedCandidate(legacy, primary);
            return legacy;
        }
        this.#resolvedRecoveryServerSigner = primary;
        this.#wipeNonSelectedCandidate(primary, legacy);
        return primary;
    }

    keyMaterialForAssembly(config: ServerSignerConfig | ApiSourcedServerSignerConfig): {
        derivedKeyBytes: Uint8Array;
        derivedAddress: string;
    } {
        const resolved = this.resolveDerivation(config);
        const keyBytesCopy = new Uint8Array(resolved.derivedKeyBytes);
        if (resolved !== this.#resolvedServerSigner && resolved !== this.#resolvedRecoveryServerSigner) {
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

    get hasRecoveryResolution(): boolean {
        return this.#resolvedRecoveryServerSigner != null;
    }

    get resolvedRecoveryAddress(): string | null {
        return this.#resolvedRecoveryServerSigner?.derivedAddress ?? null;
    }

    get apiRecoveryAddress(): string | null {
        return this.#apiRecoveryAddress;
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
