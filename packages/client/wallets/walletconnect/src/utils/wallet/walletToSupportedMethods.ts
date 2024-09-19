import type { CrossmintWalletConnectWallet } from "@/types/wallet";
import { SessionRequestMethods } from "@/types/walletconnect/RequestMethods";

import { isEVMBlockchain } from "@crossmint/common-sdk-base";

export function walletToSupportedMethods(wallet: CrossmintWalletConnectWallet) {
    const evmSupportedMethods: string[] = [];
    const solanaSupportedMethods: string[] = [];

    const supportedChains = wallet.getSupportedChains();
    const supportsSolana = supportedChains.includes("solana");
    const supportsEVM = supportedChains.some(isEVMBlockchain);

    if (wallet.signMessage != null) {
        if (supportsEVM) {
            evmSupportedMethods.push(SessionRequestMethods.EVM_PERSONAL_SIGN);
        }
        if (supportsSolana) {
            solanaSupportedMethods.push(SessionRequestMethods.SOLANA_SIGN_MESSAGE);
        }
    }
    if ("signTypedData" in wallet && wallet.signTypedData != null) {
        evmSupportedMethods.push(
            SessionRequestMethods.EVM_SIGN_TYPED_DATA,
            SessionRequestMethods.EVM_SIGN_TYPED_DATA_V4
        );
    }
    if ("sendTransaction" in wallet && wallet.sendTransaction != null) {
        evmSupportedMethods.push(SessionRequestMethods.EVM_SEND_TRANSACTION);
    }
    if ("signTransaction" in wallet && wallet.signTransaction != null) {
        solanaSupportedMethods.push(SessionRequestMethods.SOLANA_SIGN_TRANSACTION);
    }

    return {
        eip155: evmSupportedMethods.length > 0 ? evmSupportedMethods : undefined,
        solana: solanaSupportedMethods.length > 0 ? solanaSupportedMethods : undefined,
    };
}
