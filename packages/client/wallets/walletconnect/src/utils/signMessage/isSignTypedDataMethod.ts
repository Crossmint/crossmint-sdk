import { SessionRequestMethods } from "@/types/walletconnect/RequestMethods";

export function isSignTypedDataMethod(method: string) {
    return (
        [SessionRequestMethods.EVM_SIGN_TYPED_DATA, SessionRequestMethods.EVM_SIGN_TYPED_DATA_V4] as string[]
    ).includes(method);
}
