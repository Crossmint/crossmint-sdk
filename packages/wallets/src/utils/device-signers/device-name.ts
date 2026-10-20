export function getDeviceName(): string {
    if (typeof navigator === "undefined") {
        return "Unknown Device";
    }

    const ua = navigator.userAgent;

    const device = parseDevice(ua);
    const browser = parseBrowser(ua);

    if (device != null && browser != null) {
        return `${browser} on ${device}`;
    }

    return device ?? browser ?? "Unknown Device";
}

function parseDevice(ua: string): string | null {
    // iOS devices
    if (/iPad/.test(ua)) {
        return "iPad";
    }
    if (/iPhone/.test(ua)) {
        return "iPhone";
    }

    // macOS — try to detect hardware via platform
    if (/Macintosh|Mac OS X/.test(ua)) {
        return "Mac";
    }

    // Windows
    if (/Windows/.test(ua)) {
        return "Windows";
    }

    // Android
    if (/Android/.test(ua)) {
        return "Android";
    }

    // Linux
    if (/Linux/.test(ua)) {
        return "Linux";
    }

    // Chrome OS
    if (/CrOS/.test(ua)) {
        return "ChromeOS";
    }

    return null;
}

function parseBrowser(ua: string): string | null {
    // Order matters — check more specific browsers first
    if (/Edg\//.test(ua)) {
        return "Edge";
    }
    if (/OPR\/|Opera/.test(ua)) {
        return "Opera";
    }
    // Brave intentionally mirrors Chrome's UA; check the navigator.brave API instead
    if (typeof navigator !== "undefined" && "brave" in navigator) {
        return "Brave";
    }
    if (/Chrome\//.test(ua)) {
        return "Chrome";
    }
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
        return "Safari";
    }
    if (/Firefox\//.test(ua)) {
        return "Firefox";
    }

    return null;
}
