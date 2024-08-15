export interface AuthAdapter {
    login: () => Promise<string>;
    check: () => Promise<string | undefined>;
    logout: () => Promise<void>;
}
