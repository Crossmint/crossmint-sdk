import type { EIP1193Provider } from "viem";

import { Chain, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

type WindowWithEthereum = Window & {
    ethereum: EIP1193Provider;
};

export const createMetamaskAAWallet = async (isProd: boolean) => {
    if (!isWindowWithEthereum(window)) {
        throw new Error("Ethereum wallet is not available.");
    }

    try {
        const eoaAddress = await getEOAAddress(window);
        const userIdentifier = { jwt: "placeholder", id: eoaAddress };

        const xm = isProd
            ? SmartWalletSDK.init({
                  clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_PROD || "",
              })
            : SmartWalletSDK.init({
                  clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_STG || "",
              });

        return await xm.getOrCreateWallet(userIdentifier, isProd ? Chain.POLYGON : Chain.POLYGON_AMOY, {
            signer: window.ethereum as any,
        });
    } catch (error) {
        console.error("Error creating MetaMask wallet:", error);
        throw error;
    }
};

function isWindowWithEthereum(windowObj: Window): windowObj is Window & { ethereum: EIP1193Provider } {
    return (windowObj as Window & { ethereum: EIP1193Provider }).ethereum != null;
}

async function getEOAAddress(windowWithEthereum: WindowWithEthereum) {
    let eoaAddress: string;

    try {
        // Prompt user to enable MetaMask (or another wallet) if it's not already enabled
        eoaAddress = await windowWithEthereum.ethereum.request({
            method: "eth_requestAccounts",
        });
    } catch (error) {
        console.error("Error accessing Ethereum accounts:", error);
        return;
    }

    return Array.isArray(eoaAddress) ? eoaAddress[0] : eoaAddress;
}
