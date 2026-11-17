export class CrossmintAuthenticationError extends Error {
    /** HTTP status of the Crossmint API response that caused the error, when there was one. */
    public readonly status?: number;

    constructor(message?: string, options?: { status?: number }) {
        super(message);
        this.status = options?.status;
    }
}
