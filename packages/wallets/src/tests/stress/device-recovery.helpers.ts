/**
 * m7 device-recovery stress helpers: a device storage that tells the SDK's key deletions from the user's, rejectable
 * keys, and readers of the fake's state (registrations, removals, signer status). Throwaway m7 code.
 */
import { P256 } from "ox";
import type { FakeRequest, FakeWalletsApi } from "./fake-api";
import { StressDeviceStorage, type TestKey } from "./harness";

// biome-ignore lint/suspicious/noExplicitAny: throwaway stress code
export type Any = any;

/** A device storage that records the keys the SDK deletes (the user's own losses go through `loseKey`). */
export class TrackedDevice extends StressDeviceStorage {
    #userDeleting = false;
    /** Locators of keys the SDK deleted, with the step it happened in. */
    readonly sdkDeletions: Array<{ step: number; locator: string }> = [];
    /** Every locator this device ever saved, in order. */
    readonly savedHistory: string[] = [];
    step = 0;
    failSaveSignerLocator = 0;
    /** Set for Stellar: its messages are base64, which may itself start with "0x" (1 in 4096). */
    base64Messages = false;

    // The harness storage (a port of quickstart-devkit's mock) reads a message starting with "0x" as hex. A Stellar
    // message is base64 and starts with "0x" once in 4096 messages, so this decodes by chain instead.
    async signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        if (!this.base64Messages) return super.signMessage(address, message);
        this.calls.push({ method: "signMessage", args: [address, message] });
        const base64 = this.addressMap.get(address);
        if (!base64) throw new Error(`No key mapped for address: ${address}`);
        const privateKey = this.keys.get(base64);
        if (!privateKey) throw new Error(`No private key for pubkey: ${base64}`);
        const payload = `0x${Buffer.from(message, "base64").toString("hex")}` as `0x${string}`;
        const { r, s } = P256.sign({ payload, hash: true, privateKey, extraEntropy: false });
        return { r: `0x${r.toString(16).padStart(64, "0")}`, s: `0x${s.toString(16).padStart(64, "0")}` };
    }

    async deleteKey(address: string): Promise<void> {
        const base64 = this.addressMap.get(address);
        if (!this.#userDeleting && base64 != null) {
            this.sdkDeletions.push({ step: this.step, locator: `device:${base64}` });
        }
        return super.deleteKey(address);
    }

    /** The device loses its key (the OS wiped it); the saved signer locator survives. */
    async loseKey(address: string): Promise<void> {
        this.#userDeleting = true;
        try {
            await this.deleteKey(address);
        } finally {
            this.#userDeleting = false;
        }
    }

    async saveSignerLocator(address: string, signerLocator: string): Promise<void> {
        if (this.failSaveSignerLocator > 0) {
            this.failSaveSignerLocator--;
            throw new Error("storage write failed");
        }
        this.savedHistory.push(signerLocator);
        return super.saveSignerLocator(address, signerLocator);
    }

    /** The locator of the key this device holds for `address`, if any. */
    heldLocator(address: string): string | null {
        return this.locatorFor(address);
    }

    /** Locators of every key this device still holds. */
    heldLocators(): string[] {
        return [...this.keys.keys()].map((base64) => `device:${base64}`);
    }
}

export type RejectableKey = TestKey & { rejectOnce: () => void; disarm: () => void };

/** A key whose `onSign` throws once after `rejectOnce()`, as a wallet does when the user dismisses the prompt. */
export function rejectable(key: TestKey): RejectableKey {
    let rejectNext = false;
    const config = {
        ...key.config,
        onSign: async (payload: Any) => {
            if (rejectNext) {
                rejectNext = false;
                const error = new Error("User rejected the request.");
                error.name = "UserRejectedRequestError";
                throw error;
            }
            return key.config.onSign(payload);
        },
    };
    return {
        ...key,
        config,
        rejectOnce: () => {
            rejectNext = true;
        },
        disarm: () => {
            rejectNext = false;
        },
    };
}

export type ApiSignerStatus = "active" | "pending" | "failed" | "absent";

/** A signer's status on `chain` as the fake renders it. */
export function apiSignerStatus(
    fake: FakeWalletsApi,
    address: string,
    chain: string,
    locator: string
): ApiSignerStatus {
    const signer = fake.signersOf(address).find((entry: Any) => entry.locator === locator);
    if (signer == null) return "absent";
    let status: string | undefined;
    if (chain === "stellar" || chain === "solana") {
        status = signer.transaction?.status ?? "success";
    } else if (signer.chains == null) {
        status = "success";
    } else {
        status = signer.chains[chain]?.status;
        if (status == null) return "absent";
    }
    if (status === "success" || status === "active") return "active";
    if (status === "awaiting-approval" || status === "pending") return "pending";
    return "failed";
}

export const isLive = (request: FakeRequest) => request.status === "awaiting-approval" || request.status === "pending";

/** The approver locators of a request: each quorum entry's quorum, each flat entry's signer. */
export function approversOf(request: FakeRequest): string[] {
    return [...request.pending, ...request.submitted].map((entry: Any) =>
        entry.kind === "quorum" ? entry.quorum.locator : entry.signer.locator
    );
}

export function approvedByQuorum(request: FakeRequest): boolean {
    return [...request.pending, ...request.submitted].some((entry: Any) => entry.kind === "quorum");
}

export function registrationsOf(fake: FakeWalletsApi, locator: string): FakeRequest[] {
    return [...fake.requests.values()].filter((request) => request.purpose === `register ${locator}`);
}

export function removalsOf(fake: FakeWalletsApi, locator: string): FakeRequest[] {
    return [...fake.requests.values()].filter((request) => request.purpose === `remove ${locator}`);
}

/** The id `approve` takes for a fake request. */
export function approveParams(request: FakeRequest): { transactionId: string } | { signatureId: string } {
    return request.kind === "transaction" ? { transactionId: request.id } : { signatureId: request.id };
}

/** Errors a fault (5xx, HTML, network) surfaces as. */
export function isFaultError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    if (error.name === "ApiClientError") return true;
    if (error instanceof TypeError && error.message === "fetch failed") return true;
    return false;
}

/** A programming error the SDK should never let escape. */
export function isProgrammingError(error: unknown): boolean {
    if (error instanceof TypeError) return error.message !== "fetch failed";
    return error instanceof ReferenceError || error instanceof SyntaxError || error instanceof RangeError;
}

export function describeError(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message.slice(0, 240)}`;
    return String(error);
}
