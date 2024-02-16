import { SessionRequestMethods } from "@/types/walletconnect/RequestMethods";

import { isSignTypedDataMethod } from "./isSignTypedDataMethod";

export function isSignMessageMethod(method: string) {
    return (
        isSignTypedDataMethod(method) ||
        ([SessionRequestMethods.EVM_PERSONAL_SIGN, SessionRequestMethods.SOLANA_SIGN_MESSAGE] as string[]).includes(
            method
        )
    );
}
