import { SessionRequestMethods } from "@/types/walletconnect/RequestMethods";
import type { WalletKitTypes } from "@reown/walletkit";

export function decodeSendTransactionRequest(request: WalletKitTypes.SessionRequest): {
    uiTransaction: string;
    rawTransaction: any; // TODO: type this
    requestedSignerAddress: string;
    chainId: string;
} {
    const {
        params: {
            request: { method, params },
            chainId,
        },
    } = request;

    switch (method) {
        case SessionRequestMethods.EVM_SEND_TRANSACTION: {
            const rawTransaction = params[0];
            return {
                uiTransaction: JSON.stringify(rawTransaction, null, 2),
                rawTransaction,
                requestedSignerAddress: rawTransaction.from,
                chainId,
            };
        }
        default: {
            throw new Error(`[decodeSendTransactionRequest] unhandled request method: ${method}`);
        }
    }
}
