/**
 * Detects the runtime environment
 */
export type Platform = "browser" | "react-native" | "server" | "unknown";

/**
 * Detects the current runtime environment
 * @returns The detected environment type
 */
export function detectPlatform(): Platform {
    // Check for React Native first (before browser check)
    // React Native has navigator.product === 'ReactNative'
    if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
        return "react-native";
    }

    // Check for browser environment
    if (typeof window !== "undefined" && typeof window.document !== "undefined") {
        return "browser";
    }

    // Check for Node.js/server environment
    if (typeof process !== "undefined" && process.versions != null && process.versions.node != null) {
        return "server";
    }

    return "unknown";
}
