import { jwtDecode } from "jwt-decode";

export function getJWTExpiration(token: string) {
    const decoded = jwtDecode(token);
    return decoded.exp;
}

export function getJWTAudience(token: string): string | undefined {
    const decoded = jwtDecode(token);
    return decoded.aud as string | undefined;
}
