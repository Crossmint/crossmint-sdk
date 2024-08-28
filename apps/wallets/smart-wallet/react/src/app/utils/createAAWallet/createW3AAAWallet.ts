import { TORUS_NETWORK_TYPE, getWeb3AuthSigner } from "@crossmint/client-sdk-smart-wallet-web3auth-adapter";
import { Chain, WalletParams, WalletSDK } from "@crossmint/client-sdk-wallet";

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
        ? WalletSDK.init({
              clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_PROD || "",
          })
        : WalletSDK.init({
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
        type: "evm-smart-wallet",
    };

    return await xm.getOrCreateWallet({ jwt }, chain, walletConfig as WalletParams);
};
