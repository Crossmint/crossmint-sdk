export type ObjectValues<T extends object> = T[keyof T];
export function objectValues<T extends object>(obj: T): ReadonlyArray<T[keyof T]> {
    return Object.values(obj);
}
