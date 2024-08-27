import { toHex } from "viem";

function mapObject(data: any, fn: (value: unknown) => { value: unknown; replace: boolean }): any {
    const result = fn(data);
    if (result.replace) {
        return result.value;
    }
    if (Array.isArray(data)) {
        return data.map((item) => mapObject(item, fn));
    } else if (data !== null && typeof data === "object") {
        return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, mapObject(value, fn)]));
    }
    return result.value;
}

export function bigintsToHex(data: any): any {
    return mapObject(data, (value) => {
        if (typeof value === "bigint") {
            return { value: toHex(value), replace: true };
        }
        return { value, replace: false };
    });
}

export function parseBigintAPIResponse(data: any): any {
    return mapObject(data, (value) => {
        if (
            value != null &&
            typeof value == "object" &&
            "__xm_serializedType" in value &&
            "value" in value &&
            value.__xm_serializedType === "bigint" &&
            typeof value.value === "string"
        ) {
            return { value: BigInt(value.value), replace: true };
        }
        return { value, replace: false };
    });
}
