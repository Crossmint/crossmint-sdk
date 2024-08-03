import { env } from "@/env";

import { Chain, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

export async function createOrGetPasskeyWallet(jwt: string) {
    const xm = SmartWalletSDK.init({
        clientApiKey: env.NEXT_PUBLIC_CROSSMINT_API_KEY_STG || "",
    });

    const test = await xm.getOrCreateWallet({ jwt }, Chain.POLYGON_AMOY);

    return test;
}
