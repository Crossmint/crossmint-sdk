export abstract class ApiClient {
    abstract get authHeaders(): HeadersInit;
    abstract get baseUrl(): string;

    private async makeRequest(path: string, init: RequestInit) {
        return await fetch(this.buildUrl(path), {
            ...init,
            headers: { ...this.authHeaders, ...init.headers }, // authHeaders intentionally first, in case sub class wants to override
        });
    }

    buildUrl(path: string) {
        return `${ApiClient.normalizePath(this.baseUrl)}/${ApiClient.normalizePath(path)}`;
    }

    async get(path: string, params: Omit<RequestInit, "method">) {
        return await this.makeRequest(path, { ...params, method: "GET" });
    }

    async post(path: string, params: Omit<RequestInit, "method">) {
        return await this.makeRequest(path, { ...params, method: "POST" });
    }

    async put(path: string, params: Omit<RequestInit, "method">) {
        return await this.makeRequest(path, { ...params, method: "PUT" });
    }

    async delete(path: string, params: Omit<RequestInit, "method">) {
        return await this.makeRequest(path, { ...params, method: "DELETE" });
    }

    async patch(path: string, params: Omit<RequestInit, "method">) {
        return await this.makeRequest(path, { ...params, method: "PATCH" });
    }

    static normalizePath(path: string) {
        path = path.startsWith("/") ? path.slice(1) : path;
        path = path.endsWith("/") ? path.slice(0, -1) : path;
        return path;
    }
}
