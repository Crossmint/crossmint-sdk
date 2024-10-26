export function appendObjectToQueryParams<T extends Record<string, any>>(queryParams: URLSearchParams, props: T): void {
    for (const [key, value] of Object.entries(props)) {
        if (!value || typeof value === "function") {
            continue;
        }

        if (typeof value === "object") {
            queryParams.append(
                key,
                JSON.stringify(value, (_, val) => (typeof val === "function" ? "function" : val))
            );
        } else if (typeof value === "string") {
            if (value === "undefined") {
                continue;
            }
            queryParams.append(key, value);
        } else if (["boolean", "number"].includes(typeof value)) {
            queryParams.append(key, value.toString());
        }
    }
}
