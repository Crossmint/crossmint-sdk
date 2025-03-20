import type { WebAuthnP256 } from "ox";

export type PasskeySigner = {
    type: "PASSKEY";
    credential: WebAuthnP256.P256Credential;
};
