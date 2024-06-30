export function isLocalhost() {
    if (process.env.NODE_ENV === "test") {
        return false;
    }

    return typeof window !== "undefined" && window.location.origin.includes("localhost");
}

export function isEmpty(str: string | undefined | null): str is undefined | null {
    return !str || str.length === 0 || str.trim().length === 0;
}
