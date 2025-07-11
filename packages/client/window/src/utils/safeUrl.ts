export function safeUrl(url: string): string {
    const parsed = new URL(url, window.location.origin);
    if (!/^https?:$/.test(parsed.protocol)) {
        throw new Error("Unsupported URL scheme");
    }
    return parsed.href;
}
