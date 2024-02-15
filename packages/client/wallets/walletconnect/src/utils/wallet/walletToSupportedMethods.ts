import { CrossmintWalletConnectWallet } from "@/types/wallet";

import { isEVMBlockchain } from "@crossmint/client-sdk-aa";

export function walletToSupportedMethods(wallet: CrossmintWalletConnectWallet) {
    const evmSupportedMethods: string[] = [];
    const solanaSupportedMethods: string[] = [];

    const supportedChains = wallet.getSupportedChains();
    const supportsSolana = supportedChains.includes("solana");
    const supportsEVM = supportedChains.some(isEVMBlockchain);

    if (wallet.signMessage != null) {
        if (supportsEVM) {
            evmSupportedMethods.push("personal_sign");
        }
        if (supportsSolana) {
            solanaSupportedMethods.push("solana_signMessage");
        }
    }
    if ("signTypedData" in wallet && wallet.signTypedData != null) {
        evmSupportedMethods.push("eth_signTypedData", "eth_signTypedData_v4");
    }
    if ("sendTransaction" in wallet && wallet.sendTransaction != null) {
        evmSupportedMethods.push("eth_sendTransaction");
    }
    if ("signTransaction" in wallet && wallet.signTransaction != null) {
        solanaSupportedMethods.push("solana_signTransaction");
    }

    return {
        eip155: evmSupportedMethods.length > 0 ? evmSupportedMethods : undefined,
        solana: solanaSupportedMethods.length > 0 ? solanaSupportedMethods : undefined,
    };
}
