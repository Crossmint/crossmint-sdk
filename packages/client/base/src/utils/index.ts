export * from "./validate";
export * from "./ui";
export * from "./SDKLogger";
export * from "./tasks";

export function isClient() {
    return typeof window !== "undefined";
}

export function isLocalhost() {
    if (process.env.NODE_ENV === "test") {
        return false;
    }

    return window.location.origin.includes("localhost");
}
