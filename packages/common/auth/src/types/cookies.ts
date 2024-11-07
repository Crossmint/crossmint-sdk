export type CookieData = {
    name: string;
    value: string;
    options?: CookieOptions;
};

export type CookieOptions = {
    expiresAt?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict" | "None";
    domain?: string;
};
