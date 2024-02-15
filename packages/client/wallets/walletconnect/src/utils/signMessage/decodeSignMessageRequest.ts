import { hexToUtf8 } from "@walletconnect/encoding";
import { Web3WalletTypes } from "@walletconnect/web3wallet";

export function decodeSignMessageRequest(request: Web3WalletTypes.SessionRequest): {
    uiMessage: string;
    rawMessage: string;
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
        case "eth_signTypedData":
        case "eth_signTypedData_v4":
            return {
                uiMessage: JSON.stringify(JSON.parse(params[1]), null, 2),
                rawMessage: params[1],
                requestedSignerAddress: params[0],
                chainId,
            };
        case "personal_sign":
            return {
                uiMessage: hexToUtf8(params[0]),
                rawMessage: params[0],
                requestedSignerAddress: params[1],
                chainId,
            };
        default:
            throw new Error(`[decodeSignMessageRequest] unhandled request method: ${method}`);
    }
}
