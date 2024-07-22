import { mnemonicToAccount } from "viem/accounts";

import { Blockchain, SmartWalletSDK, ViemAccount } from "@crossmint/client-sdk-aa-passkeys-beta";

import { checkAuthState, parseToken, signInWithGoogle } from "../../auth/FirebaseAuthManager";

export const createViemAAWallet = async (isProd: boolean) => {
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

    let mnemonic = localStorage.getItem(`mnemonic-${email}`);

    if (!mnemonic) {
        try {
            mnemonic = "legal winner thank year wave sausage worth useful legal winner thank yellow";
            localStorage.setItem(`mnemonic-${email}`, mnemonic);
        } catch (error) {
            console.error("Error generating mnemonic:", error);
            throw error;
        }
    }

    const account = mnemonicToAccount(mnemonic) as any;
    // NOTE: Do NOT do this in production. This is just for demo purposes.
    // Proper storage of private key material is critical.
    // Crossmint supports several secure signer options, documented later in the guide.

    const signer: ViemAccount = {
        type: "VIEM_ACCOUNT",
        account,
    };

    return await xm.getOrCreateWallet({ jwt }, isProd ? Blockchain.POLYGON : Blockchain.POLYGON_AMOY, {
        signer,
    });
};
