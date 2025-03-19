import { WebAuthnP256 } from "ox";
import type { CreateWalletResponse } from "../api";
import type { EVMSigner, EVMSignerInput, PasskeyCreationCallback } from "./wallet";

export function getEvmAdminSigner(
    input: EVMSignerInput,
    response: Extract<CreateWalletResponse, { type: "evm-smart-wallet" }>
): EVMSigner {
    const responseSigner = response.config.adminSigner;
    switch (input.type) {
        case "evm-keypair":
            if (responseSigner.type !== "evm-keypair") {
                throw new Error("Admin signer type mismatch");
            }
            return {
                ...input,
                locator: responseSigner.locator,
            };
        case "evm-passkey":
            if (responseSigner.type !== "evm-passkey") {
                throw new Error("Admin signer type mismatch");
            }
            return {
                type: "evm-passkey",
                id: responseSigner.id,
                name: input.name,
                locator: responseSigner.locator,
            };
    }
}

export async function createPasskeySigner(name?: string, creationCallback?: PasskeyCreationCallback) {
    const passkeyName = name ?? `Crossmint Wallet ${Date.now()}`;
    const passkeyCredential = creationCallback
        ? await creationCallback(passkeyName)
        : await WebAuthnP256.createCredential({
              name: passkeyName,
          });
    return {
        type: "evm-passkey",
        id: passkeyCredential.id,
        name: passkeyName,
        publicKey: {
            x: passkeyCredential.publicKey.x.toString(),
            y: passkeyCredential.publicKey.y.toString(),
        },
    } as const;
}
