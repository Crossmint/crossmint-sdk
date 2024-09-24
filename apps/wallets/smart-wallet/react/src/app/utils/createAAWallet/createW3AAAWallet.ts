import { SmartWalletSDK, type WalletParams } from "@crossmint/client-sdk-smart-wallet";
import { Chain } from "@crossmint/client-sdk-smart-wallet";
import { type TORUS_NETWORK_TYPE, getWeb3AuthSigner } from "@crossmint/client-sdk-smart-wallet-web3auth-adapter";

import { checkAuthState, signInWithGoogle } from "../../auth/FirebaseAuthManager";

export const createW3AAAWallet = async (isProd: boolean) => {
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

    const walletConfig = {
        signer: await getWeb3AuthSigner({
            clientId: (isProd
                ? process.env.REACT_APP_WEB3_AUTH_CLIENT_ID_PROD
                : process.env.REACT_APP_WEB3_AUTH_CLIENT_ID_STG) as string,
            web3AuthNetwork: (isProd
                ? process.env.REACT_APP_WEB3_AUTH_NETWORK_PROD
                : process.env.REACT_APP_WEB3_AUTH_NETWORK_STG) as TORUS_NETWORK_TYPE,
            verifierId: (isProd
                ? process.env.REACT_APP_WEB3_AUTH_VERIFIER_ID_PROD
                : process.env.REACT_APP_WEB3_AUTH_VERIFIER_ID_STG) as string,
            jwt,
            chain,
        }),
    };

    return await xm.getOrCreateWallet({ jwt }, chain, walletConfig as WalletParams);
};
