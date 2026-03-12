export class ApiClientError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly statusText: string,
        public readonly responseBody: string | null
    ) {
        super(message);
        this.name = "ApiClientError";
    }
}

export abstract class ApiClient {
    abstract get commonHeaders(): HeadersInit;
    abstract get baseUrl(): string;

    private async makeRequest(path: string, init: RequestInit) {
        const response = await fetch(this.buildUrl(path), {
            ...init,
            headers: { ...this.commonHeaders, ...init.headers }, // commonHeaders intentionally first, in case sub class wants to override
        });

        // Only throw on server errors (5xx) where the response body is likely
        // non-JSON (e.g. HTML 502 from load balancer). 4xx responses are passed
        // through so callers can inspect the JSON error body as before.
        if (response.status >= 500) {
            let responseBody: string | null = null;
            try {
                responseBody = await response.text();
            } catch {
                // If we can't read the body, that's fine
            }

            throw new ApiClientError(
                `API request failed: ${response.status} ${response.statusText}`,
                response.status,
                response.statusText,
                responseBody
            );
        }

        return response;
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
