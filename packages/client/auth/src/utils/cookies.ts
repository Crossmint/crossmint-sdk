export function getCookie(name: string): string | undefined {
    const crossmintRefreshToken = document.cookie.split("; ").find((row) => row.startsWith(name));
    return crossmintRefreshToken ? crossmintRefreshToken.split("=")[1] : undefined;
}

export function setCookie(name: string, value: string, expiresAt?: string) {
    const expiresInUtc = expiresAt ? new Date(expiresAt).toUTCString() : "";
    document.cookie = `${name}=${value}; ${expiresAt ? `expires=${expiresInUtc};` : ""} path=/; SameSite=Lax;`;
}

export function deleteCookie(name: string) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
