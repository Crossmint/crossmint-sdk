import "react-native-get-random-values";
import type { PasskeyProvider } from "@crossmint/wallets-sdk";
import { bytesToBase64Url, hexChallengeToBase64Url, publicKeyFromRegistration, toPasskeySignResult } from "./webauthn";

/** The relying party of the app's passkeys, and the native passkey module that creates and uses them. */
export type NativePasskeyConfig = {
    /**
     * The relying party id: a domain the app is associated with (iOS `webcredentials:` associated domain, Android
     * Digital Asset Links). Passkeys are bound to it, so it must not change once users have created passkeys.
     */
    rpId: string;
    /** The relying party name shown by the system passkey dialogs. Defaults to `rpId`. */
    rpName?: string;
    /**
     * `Passkey` from `react-native-passkey` (v3): `import { Passkey } from "react-native-passkey"`. The app passes it
     * so that its bundler links the native module; the SDK does not import the optional package itself.
     */
    passkey: NativePasskeyModule;
};

/** The subset of `react-native-passkey` (v3) that this provider uses. All binary values are base64url strings. */
export type NativePasskeyModule = {
    create(request: {
        challenge: string;
        rp: { id: string; name: string };
        user: { id: string; name: string; displayName: string };
        pubKeyCredParams: Array<{ type: "public-key"; alg: number }>;
        authenticatorSelection?: {
            residentKey?: "discouraged" | "preferred" | "required";
            userVerification?: "discouraged" | "preferred" | "required";
        };
        attestation?: "none";
    }): Promise<{ id: string; response: { attestationObject: string; publicKey?: string } }>;
    get(request: {
        challenge: string;
        rpId: string;
        allowCredentials?: Array<{ type: "public-key"; id: string }>;
        userVerification?: "discouraged" | "preferred" | "required";
    }): Promise<{ response: { authenticatorData: string; clientDataJSON: string; signature: string } }>;
};

/** COSE algorithm id of ES256 (ECDSA on P-256 with SHA-256), the only one the on-chain verifiers accept. */
const ES256 = -7;

function randomBase64Url(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return bytesToBase64Url(bytes);
}

/**
 * Creates and signs with passkeys through the platform passkey APIs (iOS AuthenticationServices, Android
 * Credential Manager), for the wallet SDK's `passkeyProvider` option.
 */
export function createNativePasskeyProvider({ rpId, rpName, passkey }: NativePasskeyConfig): PasskeyProvider {
    return {
        async createPasskey(name) {
            const credential = await passkey.create({
                // The wallet does not verify the attestation, so the challenge only has to be unpredictable.
                challenge: randomBase64Url(32),
                rp: { id: rpId, name: rpName ?? rpId },
                user: { id: randomBase64Url(16), name, displayName: name },
                pubKeyCredParams: [{ type: "public-key", alg: ES256 }],
                authenticatorSelection: { residentKey: "required", userVerification: "required" },
                attestation: "none",
            });
            return { id: credential.id, publicKey: publicKeyFromRegistration(credential.response) };
        },
        async signWithPasskey(message, credentialId) {
            const assertion = await passkey.get({
                challenge: hexChallengeToBase64Url(message),
                rpId,
                allowCredentials: credentialId != null ? [{ type: "public-key", id: credentialId }] : undefined,
                // The on-chain verifiers and the Crossmint API require user verification.
                userVerification: "required",
            });
            return toPasskeySignResult(assertion.response);
        },
    };
}
