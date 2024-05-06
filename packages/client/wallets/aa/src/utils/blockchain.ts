import { getBundlerRPC } from "@/blockchain";
import type { Deferrable } from "@ethersproject/properties";
import { type TransactionRequest } from "@ethersproject/providers";
import { BigNumber, BigNumberish } from "ethers";
import { BytesLike, hexlify } from "ethers/lib/utils";
import { createPublicClient, http } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export type VerifyMessageParams = {
    address: `0x${string}`;
    message: string;
    signature: `0x${string}` | Uint8Array;
    chain: EVMBlockchainIncludingTestnet;
};

/**
 * We need to support odd value and data fields in a tx, as that data comes from WC
 * ZeroDev implements hexlify, but doesn't support to send an odd string in value or data fields
 * so we need to make the hexlify fix manually when sending a transaction.
 * That fix can be found here:
 * https://github.com/ethers-io/ethers.js/commit/a12030ad29aa13c02aa75d9e0860f4986a0043b4#diff-047e7ebfdbd5c41e762cda03593bd15ed8b3121dece67262729dfcbde7040818R221
 * And more context on this issue:
 * https://github.com/ethers-io/ethers.js/issues/614
 *
 * Applying to it hexValue is used as a workaround on Crossbit, but doesn't cover all the cases (i.e. 0x71afd498d0000).
 * This function is the same as hexValue but without hexStripZeros, which is what makes it to not work.
 */
export async function decorateSendTransactionData(transaction: Deferrable<TransactionRequest>) {
    const decoratedTransaction = { ...transaction };
    if (transaction.value) {
        const awaitedValue = await transaction.value;
        if (awaitedValue) {
            decoratedTransaction.value = hexlify(awaitedValue, { hexPad: "left" });
        }
    }

    if (transaction.data) {
        const awaitedData = await transaction.data;
        if (awaitedData) {
            decoratedTransaction.data = hexlify(awaitedData, { hexPad: "left" });
        }
    }

    return decoratedTransaction;
}

export async function getNonce(
    nonce: BigNumberish | Promise<BigNumberish | undefined> | undefined
): Promise<number | undefined> {
    if (nonce === undefined) return undefined;
    const resolvedNonce = await Promise.resolve(nonce);
    if (resolvedNonce === undefined) return undefined;
    return BigNumber.from(resolvedNonce).toNumber();
}

export async function convertData(
    data: BytesLike | Promise<BytesLike | undefined> | undefined
): Promise<`0x${string}` | undefined> {
    if (data === undefined) return undefined;
    const resolvedData = await Promise.resolve(data);
    if (resolvedData === undefined) return undefined;
    return hexlify(resolvedData) as `0x${string}`;
}

export async function verifyMessage({ address, message, signature, chain }: VerifyMessageParams) {
    const publicClient = createPublicClient({
        transport: http(getBundlerRPC(chain)),
    });

    return publicClient.verifyMessage({
        address,
        message,
        signature,
    });
}

export function hasEIP1559Support(chain: EVMBlockchainIncludingTestnet) {
    const chainsNotSupportingEIP1559: EVMBlockchainIncludingTestnet[] = [
        EVMBlockchainIncludingTestnet.ZKYOTO,
        EVMBlockchainIncludingTestnet.ASTAR_ZKEVM,
    ];
    return !chainsNotSupportingEIP1559.includes(chain);
}
