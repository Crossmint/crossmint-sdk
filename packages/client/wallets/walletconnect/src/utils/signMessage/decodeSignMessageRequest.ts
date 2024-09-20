import { SessionRequestMethods } from "@/types/walletconnect/RequestMethods";
import { arrayify } from "@ethersproject/bytes";
import { hexToUtf8 } from "@walletconnect/encoding";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";

export function decodeSignMessageRequest(request: Web3WalletTypes.SessionRequest): {
    uiMessage: string;
    rawMessage: any;
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
        case SessionRequestMethods.EVM_SIGN_TYPED_DATA:
        case SessionRequestMethods.EVM_SIGN_TYPED_DATA_V4:
            return {
                uiMessage: JSON.stringify(JSON.parse(params[1]), null, 2),
                rawMessage: JSON.parse(params[1]),
                requestedSignerAddress: params[0],
                chainId,
            };
        case SessionRequestMethods.EVM_PERSONAL_SIGN:
            return {
                uiMessage: hexToUtf8(params[0]),
                rawMessage: arrayify(params[0]),
                requestedSignerAddress: params[1],
                chainId,
            };
        default:
            throw new Error(`[decodeSignMessageRequest] unhandled request method: ${method}`);
    }
}
