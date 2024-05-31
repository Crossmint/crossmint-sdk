import { ReservoirWallet } from "@reservoir0x/reservoir-sdk";
import { hexToBigInt, http } from "viem";

import { getBundlerRPC } from "..";
import { EVMAAWallet } from "../blockchain/wallets/EVMAAWallet";

export function reservoirAdapter(wallet: EVMAAWallet): ReservoirWallet {
    return {
        address: async () => wallet.getAddress(),
        handleSignMessageStep: async ({ data }, _) => {
            const walletClient = wallet.getSigner("viem").walletClient;
            const signData = data?.sign;

            if (signData == null) {
                return;
            }

            if (signData.signatureKind === "eip191") {
                console.log("Execute Steps: Signing with eip191");
                return walletClient.signMessage({ message: signData.message });
            } else if (signData.signatureKind === "eip712") {
                console.log("Execute Steps: Signing with eip712");
                return walletClient.signTypedData({
                    domain: signData.domain as any,
                    types: signData.types as any,
                    primaryType: signData.primaryType,
                    message: signData.value,
                });
            }
        },
        handleSendTransactionStep: async (chainId, stepItem, _) => {
            const stepData = stepItem.data;
            return await wallet.sendTransaction({
                chainId: chainId,
                data: stepData.data,
                to: stepData.to,
                value: hexToBigInt((stepData.value as any) || 0),
                ...(stepData.maxFeePerGas && {
                    maxFeePerGas: hexToBigInt(stepData.maxFeePerGas as any),
                }),
                ...(stepData.maxPriorityFeePerGas && {
                    maxPriorityFeePerGas: hexToBigInt(stepData.maxPriorityFeePerGas as any),
                }),
                ...(stepData.gas && {
                    gas: hexToBigInt(stepData.gas as any),
                }),
            });
        },
        transport: http(getBundlerRPC(wallet.chain)),
    };
}
