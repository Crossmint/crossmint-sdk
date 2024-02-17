import { SessionRequestMethods } from "@/types/walletconnect/RequestMethods";

export function isSendTransactionMethod(method: string) {
    return ([SessionRequestMethods.EVM_SEND_TRANSACTION] as string[]).includes(method);
}
