import { EIP1193Provider } from "viem";

import { Chain, WalletSDK } from "@crossmint/client-sdk-wallet";

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
            ? WalletSDK.init({
                  clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_PROD || "",
              })
            : WalletSDK.init({
                  clientApiKey: process.env.REACT_APP_CROSSMINT_API_KEY_STG || "",
              });

        const chain = isProd ? Chain.POLYGON : Chain.POLYGON_AMOY;
        return await xm.getOrCreateWallet(userIdentifier, chain, {
            type: "evm-smart-wallet",
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
