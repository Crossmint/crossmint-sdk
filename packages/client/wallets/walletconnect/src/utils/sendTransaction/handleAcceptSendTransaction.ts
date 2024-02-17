import { CrossmintWalletConnectWallet } from "@/types/wallet";
import { SendEthersTransaction } from "@/types/wallet/features";
import { JsonRpcResult, formatJsonRpcResult } from "@walletconnect/jsonrpc-utils";
import { Web3WalletTypes } from "@walletconnect/web3wallet";

import { decodeSendTransactionRequest } from "./decodeSendTransactionRequest";

export async function handleAcceptSendTransaction(
    request: Web3WalletTypes.SessionRequest,
    wallet: CrossmintWalletConnectWallet
): Promise<JsonRpcResult> {
    const { rawTransaction } = decodeSendTransactionRequest(request);

    if (!(wallet as Required<SendEthersTransaction>).sendTransaction) {
        throw new Error(`[handleAcceptSendTransaction()] wallet does not support sendTransaction`);
    }

    const transactionHash = await (wallet as Required<SendEthersTransaction>).sendTransaction(rawTransaction);
    return formatJsonRpcResult(request.id, transactionHash);
}
