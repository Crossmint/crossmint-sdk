import { WebAuthnP256 } from "ox";
import type { RegisterSignerPasskeyParams } from "../api";
import type { PasskeyProvider, PasskeySignerConfig } from "./types";

/**
 * Creates the WebAuthn credential for a passkey signer that does not exist yet, and returns the config the API
 * registers. Uses the config's `onCreatePasskey`, else the wallet's `passkeyProvider`, else the browser WebAuthn API.
 */
export async function createPasskeyCredential(
    config: Pick<PasskeySignerConfig, "name" | "onCreatePasskey">,
    passkeyProvider?: PasskeyProvider
): Promise<RegisterSignerPasskeyParams> {
    const name = config.name ?? `Crossmint Wallet ${Date.now()}`;
    const onCreatePasskey = config.onCreatePasskey ?? passkeyProvider?.createPasskey;
    const credential = onCreatePasskey ? await onCreatePasskey(name) : await WebAuthnP256.createCredential({ name });
    return {
        type: "passkey",
        id: credential.id,
        name,
        publicKey: {
            x: credential.publicKey.x.toString(),
            y: credential.publicKey.y.toString(),
        },
    };
}
