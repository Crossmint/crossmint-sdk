import { jwtDecode } from "jwt-decode";

export function getJWTExpiration(token: string) {
    const decoded = jwtDecode(token);
    return decoded.exp;
}

export function getJWTAudience(token: string): string | undefined {
    try {
        const decoded = jwtDecode(token);
        const aud = decoded.aud;
        if (Array.isArray(aud)) {
            return aud[0];
        }
        return aud;
    } catch {
        return undefined;
    }
}
