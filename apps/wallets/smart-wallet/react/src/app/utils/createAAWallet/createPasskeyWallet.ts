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

    console.log("Here's the jwt");
    console.log(parseToken(jwt));

    try {
        const sdk = SmartWalletSDK.init({
            clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_STG!,
        });
        return await sdk.getOrCreateWallet({ jwt }, "polygon-amoy");
    } catch (e) {
        console.log("There's been an error, here it is");
        console.log((e as any).message);
        console.log(e);
        throw e;
    }
}
