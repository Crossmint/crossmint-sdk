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

        // Throw on server errors (5xx) and on any non-ok response whose body is not JSON
        // (e.g. an HTML 502 from a load balancer, or a Cloudflare 403 geo-block). Calling
        // `.json()` on those bodies would otherwise raise an opaque SyntaxError. JSON 4xx
        // responses are still passed through so callers can inspect the structured error body.
        const contentType = response.headers.get("content-type") ?? "";
        const isJsonResponse = contentType.includes("application/json");
        if (response.status >= 500 || (!response.ok && !isJsonResponse)) {
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
