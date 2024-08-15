import { Chain, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

import { AuthAdapter } from "../../auth";

export async function createPasskeyWallet(isProd: boolean, authAdapter: AuthAdapter) {
    let jwt = await authAdapter.check();

    if (!jwt) {
        jwt = await authAdapter.login();
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
