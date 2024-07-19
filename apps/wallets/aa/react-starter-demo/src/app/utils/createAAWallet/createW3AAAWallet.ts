import { Blockchain, SmartWalletSDK, Web3AuthSigner } from "@crossmint/client-sdk-aa-passkeys-beta";

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

    console.log("Here they are:");
    console.log(process.env.REACT_APP_CROSSMINT_API_KEY_PROD);
    console.log(process.env.REACT_APP_CROSSMINT_API_KEY_STG);

    const xm = isProd
        ? SmartWalletSDK.init({
              clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_PROD || "",
          })
        : SmartWalletSDK.init({
              clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_STG || "",
          });

    const userIdentifier = { id: email, jwt };

    const web3AuthSigner: Web3AuthSigner = {
        type: "WEB3_AUTH",
        clientId: isProd
            ? "BEbQWgoEiWso39k9FwIWRS5ML5L-MOMgUzCnK0ND3I14Hc93qE3ZPa7z5zcpPDWxcv2BvZuRXhiMB2QgDvLBZus"
            : "BDSwOWOvXYz_ZrUzgDcBRFoz6mCCuno76zuWGEz09FCg-XVaGED941abRaYJ6I3EcYjRvLCDXhdr8qPH2wf-03E",
        web3AuthNetwork: isProd ? "sapphire_mainnet" : "sapphire_devnet",
        verifierId: isProd ? "xm-aa-prod-verifier" : "xm-aa-verifier",
        jwt,
    };

    const walletInitParams = {
        signer: web3AuthSigner,
    };

    const wallet = await xm.getOrCreateWallet(
        userIdentifier,
        isProd ? Blockchain.POLYGON : Blockchain.POLYGON_AMOY,
        walletInitParams
    );

    return wallet;
};
