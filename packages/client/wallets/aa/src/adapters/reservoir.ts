import { ReservoirWallet } from "@reservoir0x/reservoir-sdk";
import { hexToBigInt, http } from "viem";

import { getBundlerRPC } from "..";
import { EVMSmartWallet } from "../blockchain/wallets/EVMSmartWallet";

export function reservoirAdapter(smartAccount: EVMSmartWallet): ReservoirWallet {
    return {
        address: async () => smartAccount.address,
        handleSignMessageStep: async ({ data }) => {
            const signData = data?.sign;

            if (signData == null) {
                return;
            }

            console.log(`Execute Steps: Signing with ${signData.signatureKind}`);
            if (signData.signatureKind === "eip191") {
                return smartAccount.client.wallet.signMessage({ message: signData.message });
            } else if (signData.signatureKind === "eip712") {
                return smartAccount.client.wallet.signTypedData({
                    domain: signData.domain as any,
                    types: signData.types as any,
                    primaryType: signData.primaryType,
                    message: signData.value,
                });
            }
        },
        handleSendTransactionStep: async (chainId, stepItem) => {
            const stepData = stepItem.data;
            return smartAccount.client.wallet.sendTransaction({
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
        transport: http(getBundlerRPC(smartAccount.chain)),
    };
}
