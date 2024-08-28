import { privateKeyToAccount } from "viem/accounts";

import { Chain, ViemAccount, WalletSDK } from "@crossmint/client-sdk-wallet";

import { checkAuthState, signInWithGoogle } from "../../auth/FirebaseAuthManager";

export const createViemAAWallet = async (isProd: boolean, privateKey: `0x${string}`) => {
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

    // NOTE: Do NOT do this in production. This is just for demo purposes.
    // Proper storage of private key material is critical.
    // Crossmint supports several secure signer options, documented later in the guide.
    const signer: ViemAccount = {
        type: "VIEM_ACCOUNT",
        account: privateKeyToAccount(privateKey) as unknown as ViemAccount["account"],
    };
    const chain = isProd ? Chain.POLYGON : Chain.POLYGON_AMOY;
    return await xm.getOrCreateWallet({ jwt }, chain, { signer, type: "evm-smart-wallet" });
};
