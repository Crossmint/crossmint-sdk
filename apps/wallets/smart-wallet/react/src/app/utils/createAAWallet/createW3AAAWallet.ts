import { Blockchain, SmartWalletSDK } from "@crossmint/client-sdk-aa-passkeys-beta";

import { checkAuthState, parseToken, signInWithGoogle } from "../../auth/FirebaseAuthManager";

export const createW3AAAWallet = async (isProd: boolean) => {
    let jwt = await checkAuthState();

    if (!jwt) {
        jwt = await signInWithGoogle();
    }

    if (!jwt) {
        throw new Error("No JWT token found");
    }

    const { email } = parseToken(jwt);

    const xm = isProd
        ? SmartWalletSDK.init({
              clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_PROD || "",
          })
        : SmartWalletSDK.init({
              clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_STG || "",
          });

    const userIdentifier = { id: email, jwt };

    // const web3AuthSigner: Web3AuthSigner = {
    //     type: "WEB3_AUTH",
    //     clientId: (isProd
    //         ? process.env.REACT_APP_WEB3_AUTH_CLIENT_ID_PROD
    //         : process.env.REACT_APP_WEB3_AUTH_CLIENT_ID_STG) as string,
    //     web3AuthNetwork: (isProd
    //         ? process.env.REACT_APP_WEB3_AUTH_NETWORK_PROD
    //         : process.env.REACT_APP_WEB3_AUTH_NETWORK_STG) as Web3AuthSigner["web3AuthNetwork"],
    //     verifierId: (isProd
    //         ? process.env.REACT_APP_WEB3_AUTH_VERIFIER_ID_PROD
    //         : process.env.REACT_APP_WEB3_AUTH_VERIFIER_ID_STG) as string,
    //     jwt,
    // };

    // const walletInitParams = {
    //     signer: web3AuthSigner,
    // };

    // const wallet = await xm.getOrCreateWallet(
    //     userIdentifier,
    //     isProd ? Blockchain.POLYGON : Blockchain.POLYGON_AMOY,
    //     walletInitParams
    // );

    return {} as any;
};
