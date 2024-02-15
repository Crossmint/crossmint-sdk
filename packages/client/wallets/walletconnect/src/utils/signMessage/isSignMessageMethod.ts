export function isSignMessageMethod(method: string) {
    return ["personal_sign", "eth_signTypedData", "eth_signTypedData_v4"].includes(method);
}
