import { privateKeyToAccount } from "viem/accounts";

import { Blockchain, SmartWalletSDK, ViemAccount } from "@crossmint/client-sdk-aa-passkeys-beta";

import { checkAuthState, signInWithGoogle } from "../../auth/FirebaseAuthManager";

export const createViemAAWallet = async (isProd: boolean, privateKey: `0x${string}`) => {
    if (!privateKey) {
        throw new Error(
            "No private key found: Please provide a private key to this function or use the createPasskeyWallet function"
        );
    }

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

    // NOTE: Do NOT do this in production. This is just for demo purposes.
    // Proper storage of private key material is critical.
    // Crossmint supports several secure signer options, documented later in the guide.
    const signer: ViemAccount = {
        type: "VIEM_ACCOUNT",
        account: privateKeyToAccount(privateKey) as any,
    };
    const chain = isProd ? Blockchain.POLYGON : Blockchain.POLYGON_AMOY;
    return await xm.getOrCreateWallet({ jwt }, chain, { signer });
};
