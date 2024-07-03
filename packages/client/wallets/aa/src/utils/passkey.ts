import { Hex } from "viem";

export type PasskeyValidatorSerializedData = {
    passkeyServerUrl: string;
    credentials: string;
    entryPoint: Hex;
    validatorAddress: Hex;
    pubKeyX: string;
    pubKeyY: string;
    authenticatorIdHash: Hex;
};

export const serializePasskeyValidatorData = (params: PasskeyValidatorSerializedData) => {
    const replacer = (_: string, value: any) => {
        if (typeof value === "bigint") {
            return value.toString();
        }
        return value;
    };

    const jsonString = JSON.stringify(params, replacer);
    const uint8Array = new TextEncoder().encode(jsonString);
    const base64String = bytesToBase64(uint8Array);
    return base64String;
};

export const deserializePasskeyValidatorData = (params: string) => {
    const uint8Array = base64ToBytes(params);
    const jsonString = new TextDecoder().decode(uint8Array);
    return JSON.parse(jsonString) as PasskeyValidatorSerializedData;
};

function base64ToBytes(base64: string) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
}

function bytesToBase64(bytes: Uint8Array) {
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join("");
    return btoa(binString);
}
