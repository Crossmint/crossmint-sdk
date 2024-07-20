export abstract class ApiClient {
    #authHeaders: HeadersInit;
    constructor(authHeaders: HeadersInit) {
        this.#authHeaders = authHeaders;
    }

    abstract get baseUrl(): string;

    private async makeRequest(path: string, init: RequestInit) {
        return fetch(`${ApiClient.normalizePath(this.baseUrl)}/${path}`, {
            ...init,
            headers: { ...this.#authHeaders, ...init.headers }, // #authHeaders intentionally first, in case sub class wants to override
        });
    }

    async get(path: string, params: Omit<RequestInit, "method">) {
        return this.makeRequest(path, { ...params, method: "GET" });
    }

    async post(path: string, params: Omit<RequestInit, "method">) {
        return this.makeRequest(path, { ...params, method: "POST" });
    }

    async put(path: string, params: Omit<RequestInit, "method">) {
        return this.makeRequest(path, { ...params, method: "PUT" });
    }

    async delete(path: string, params: Omit<RequestInit, "method">) {
        return this.makeRequest(path, { ...params, method: "DELETE" });
    }

    async patch(path: string, params: Omit<RequestInit, "method">) {
        return this.makeRequest(path, { ...params, method: "PATCH" });
    }

    static normalizePath(path: string) {
        path = path.startsWith("/") ? path.slice(1) : path;
        path = path.endsWith("/") ? path.slice(0, -1) : path;
        return path;
    }
}
