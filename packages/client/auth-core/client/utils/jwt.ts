import { jwtDecode } from "jwt-decode";

export function getJWTExpiration(token: string) {
    const decoded = jwtDecode(token);
    return decoded.exp;
}
