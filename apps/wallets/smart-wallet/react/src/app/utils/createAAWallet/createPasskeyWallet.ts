import { PrivyInterface } from "@privy-io/react-auth";

import { Chain, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

import { checkAuthState, signInWithGoogle } from "../../auth/FirebaseAuthManager";
import { checkPrivyAuth, signInWithPrivy } from "../../auth/PrivyAuthManager";

export async function createPasskeyWallet(isProd: boolean, isFirebase: boolean, privy: PrivyInterface) {
    let jwt = isFirebase ? await checkAuthState() : await checkPrivyAuth(privy);

    if (!jwt) {
        jwt = isFirebase ? await signInWithGoogle() : await signInWithPrivy(privy);
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

    const test = await xm.getOrCreateWallet({ jwt }, chain);

    return test;
}
