import type { Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount, signMessage } from "viem/accounts";

export interface TestSigner {
    signer: { type: "external-wallet"; address: Hex };
    locator: string;
    approval(message: string): Promise<{ signer: string; signature: string }>;
}

function asHex(value: string): Hex {
    if (!value.startsWith("0x")) {
        throw new Error(`expected a hex message, got: ${value.slice(0, 20)}`);
    }
    return value as Hex;
}

export function externalWalletSigner(): TestSigner {
    const privateKey = generatePrivateKey();
    const address = privateKeyToAccount(privateKey).address;
    const locator = `external-wallet:${address}`;
    return {
        signer: { type: "external-wallet", address },
        locator,
        async approval(message) {
            const signature = await signMessage({ message: { raw: asHex(message) }, privateKey });
            return { signer: locator, signature };
        },
    };
}

export function pendingMessage(withApprovals: unknown): string {
    const message = (withApprovals as { approvals?: { pending?: Array<{ message: string }> } }).approvals?.pending?.[0]
        ?.message;
    if (!message) {
        throw new Error(`No pending approval message on: ${JSON.stringify(withApprovals)}`);
    }
    return message;
}
