import { Chain, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

import { checkAuthState, signInWithGoogle } from "../../auth/FirebaseAuthManager";

export async function createPasskeyWallet(isProd: boolean) {
    let jwt = await checkAuthState();

    if (!jwt) {
        jwt = await signInWithGoogle();
    }

    if (!jwt) {
        throw new Error("No JWT token found");
    }

    try {
        const xm = isProd
            ? SmartWalletSDK.init({
                  clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_PROD || "",
              })
            : SmartWalletSDK.init({
                  clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_STG || "",
              });

        const chain = isProd ? Chain.POLYGON : Chain.POLYGON_AMOY;

        const test = await xm.getOrCreateWallet({ jwt }, chain);

        return test;
    } catch (error: any) {
        console.error("Error creating passkey wallet:", error);
        console.log(error);
        console.log(error.message);
        throw error;
    }
}
