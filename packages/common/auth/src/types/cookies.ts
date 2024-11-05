export type CookieData = {
    name: string;
    value: string;
    options?: CookieOptions;
};

export type CookieOptions = {
    expiresAt?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    domain?: string;
};
