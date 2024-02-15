import { CrossmintWalletConnectWallet } from "@/types/wallet";
import { arrayify } from "@ethersproject/bytes";
import { JsonRpcResult, formatJsonRpcResult } from "@walletconnect/jsonrpc-utils";
import { Web3WalletTypes } from "@walletconnect/web3wallet";

import { decodeSignMessageRequest } from "./decodeSignMessageRequest";

export async function handleAcceptSignMessage(
    request: Web3WalletTypes.SessionRequest,
    wallet: CrossmintWalletConnectWallet
): Promise<JsonRpcResult> {
    const { rawMessage } = decodeSignMessageRequest(request);

    if (!wallet.signMessage) {
        throw new Error(
            `[WalletConnectRequestsContextProvider.handleAcceptSignMessage()] wallet does not support signMessage`
        );
    }

    const signature = await wallet.signMessage(arrayify(rawMessage));
    return formatJsonRpcResult(request.id, signature);
}
