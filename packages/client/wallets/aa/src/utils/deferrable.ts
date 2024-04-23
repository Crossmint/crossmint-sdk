import { Deferrable } from "ethers/lib/utils";

export const resolveDeferrable: <T>(obj: Deferrable<T>) => Promise<T> = async <T>(obj: Deferrable<T>): Promise<T> => {
    const resolved = {} as T;

    const entries = Object.entries(obj) as [keyof T, Promise<T[keyof T]>][];
    await Promise.all(
        entries.map(async ([key, value]) => {
            resolved[key] = await value;
        })
    );

    return resolved;
};