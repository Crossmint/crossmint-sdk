import type { CrossmintErrors } from "@/types";

export class CrossmintSDKError extends Error {
    constructor(
        message: string,
        public readonly code: CrossmintErrors,
        public readonly details?: string
    ) {
        super(message);
    }
}
