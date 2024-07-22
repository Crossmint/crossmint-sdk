import { SmartWalletSDK } from "@crossmint/client-sdk-aa-passkeys-beta";

import { checkAuthState, parseToken, signInWithGoogle } from "../../auth/FirebaseAuthManager";

export async function createPasskeyWallet(isProd: boolean) {
    let jwt = await checkAuthState();

    if (!jwt) {
        jwt = await signInWithGoogle();
    }

    if (!jwt) {
        throw new Error("No JWT token found");
    }

    try {
        // Create and return passkey smart wallet here
    } catch (e) {
        console.log("There's been an error, here it is");
        console.log((e as any).message);
        console.log(e);
        throw e;
    }
}
