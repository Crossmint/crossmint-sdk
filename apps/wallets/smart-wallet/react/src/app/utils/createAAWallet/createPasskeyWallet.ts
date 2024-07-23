import { SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";
import { SmartWalletChain } from "@crossmint/client-sdk-smart-wallet";

import { checkAuthState, signInWithGoogle } from "../../auth/FirebaseAuthManager";
import { env } from "../../env";

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
              clientApiKey: env.REACT_APP_CROSSMINT_API_KEY_PROD || "",
          })
        : SmartWalletSDK.init({
              clientApiKey: env.REACT_APP_CROSSMINT_API_KEY_STG || "",
          });

    const chain = isProd ? SmartWalletChain.POLYGON : SmartWalletChain.POLYGON_AMOY;

    const test = await xm.getOrCreateWallet({ jwt }, chain);

    return test;
}
