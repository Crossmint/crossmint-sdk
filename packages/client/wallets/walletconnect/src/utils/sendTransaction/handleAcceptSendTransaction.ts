import type { CrossmintWalletConnectWallet } from "@/types/wallet";
import type { SendEthersTransaction } from "@/types/wallet/features";
import { type JsonRpcResult, formatJsonRpcResult } from "@walletconnect/jsonrpc-utils";
import type { WalletKitTypes } from "@reown/walletkit";

import { decodeSendTransactionRequest } from "./decodeSendTransactionRequest";

export async function handleAcceptSendTransaction(
    request: WalletKitTypes.SessionRequest,
    wallet: CrossmintWalletConnectWallet
): Promise<JsonRpcResult> {
    const { rawTransaction } = decodeSendTransactionRequest(request);

    if (!(wallet as Required<SendEthersTransaction>).sendTransaction) {
        throw new Error(`[handleAcceptSendTransaction()] wallet does not support sendTransaction`);
    }

    const transactionHash = await (wallet as Required<SendEthersTransaction>).sendTransaction(rawTransaction);
    return formatJsonRpcResult(request.id, transactionHash);
}
