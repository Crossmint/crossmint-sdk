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

    const xm = isProd
        ? SmartWalletSDK.init({
              clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_PROD || "",
          })
        : SmartWalletSDK.init({
              clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_STG || "",
          });

    const chain = isProd ? Chain.POLYGON : Chain.POLYGON_AMOY;

    try {
        return await xm.getOrCreateWallet({ jwt }, chain);
    } catch (e: any) {
        console.log("Error creating wallet");
        console.log(e);
        console.log(e.message);
        throw e;
    }
}
