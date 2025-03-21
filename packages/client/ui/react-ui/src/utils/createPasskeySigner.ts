import { WebAuthnP256 } from "ox";
import type { PasskeySigner } from "@/types/passkey";

export async function createWebAuthnPasskeySigner(name: string): Promise<PasskeySigner> {
    const credential = await WebAuthnP256.createCredential({
        name,
    });
    return {
        type: "PASSKEY",
        credential,
    };
}
