import type { CrossmintWalletConnectWallet } from "@/types/wallet";
import type { SignTypedData } from "@/types/wallet/features";
import { type JsonRpcResult, formatJsonRpcResult } from "@walletconnect/jsonrpc-utils";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";

import { decodeSignMessageRequest } from "./decodeSignMessageRequest";
import { isSignTypedDataMethod } from "./isSignTypedDataMethod";

export async function handleAcceptSignMessage(
    request: Web3WalletTypes.SessionRequest,
    wallet: CrossmintWalletConnectWallet
): Promise<JsonRpcResult> {
    const { rawMessage } = decodeSignMessageRequest(request);

    const method = request.params.request.method;

    let signature;
    if (isSignTypedDataMethod(method)) {
        if ("signTypedData" in wallet && !wallet.signTypedData) {
            throw new Error(
                `[WalletConnectRequestsContextProvider.handleAcceptSignMessage()] wallet does not support signTypedData`
            );
        }
        signature = await (wallet as Required<SignTypedData>).signTypedData(rawMessage);
    } else {
        if (!wallet.signMessage) {
            throw new Error(
                `[WalletConnectRequestsContextProvider.handleAcceptSignMessage()] wallet does not support signMessage`
            );
        }
        signature = await wallet.signMessage(rawMessage);
    }

    return formatJsonRpcResult(request.id, signature);
}
