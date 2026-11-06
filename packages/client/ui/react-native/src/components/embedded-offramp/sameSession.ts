// URL.searchParams is not implemented on every supported React Native version.
function queryParam(url: string, name: string) {
    const query = url.split("#")[0]?.split("?").slice(1).join("?") ?? "";
    for (const pair of query.split("&")) {
        const at = pair.indexOf("=");
        const [key, value] = at < 0 ? [pair, ""] : [pair.slice(0, at), pair.slice(at + 1)];
        const decode = (text: string) => decodeURIComponent(text.replace(/\+/g, " "));
        if (decode(key) === name) {
            return decode(value);
        }
    }
    return null;
}

export function isSameSession(pageUrl: string, ownUrl: string) {
    try {
        return ["apiKey", "credentials"].every((name) => {
            const own = queryParam(ownUrl, name);
            return own != null && own === queryParam(pageUrl, name);
        });
    } catch {
        return false;
    }
}
