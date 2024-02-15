export function isSendTransactionMethod(method: string) {
    return ["eth_sendTransaction"].includes(method);
}
