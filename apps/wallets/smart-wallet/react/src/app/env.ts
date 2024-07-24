import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
    server: {
        /* add server .env here */
    },

    /**
     * The prefix that client-side variables must have. This is enforced both at
     * a type-level and at runtime.
     */
    clientPrefix: "REACT_APP_",
    client: {
        REACT_APP_CROSSMINT_API_KEY_PROD: z.string().optional(),
        REACT_APP_CROSSMINT_API_KEY_STG: z.string().min(1),
        REACT_APP_FIREBASE_API_KEY: z.string().min(1),
        REACT_APP_FIREBASE_AUTH_DOMAIN: z.string().min(1),
        REACT_APP_FIREBASE_PROJECT_ID: z.string().min(1),
        REACT_APP_FIREBASE_STORAGE_BUCKET: z.string().min(1),
        REACT_APP_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
        REACT_APP_FIREBASE_APP_ID: z.string().min(1),
        REACT_APP_WEB3_AUTH_CLIENT_ID_PROD: z.string().optional(),
        REACT_APP_WEB3_AUTH_CLIENT_ID_STG: z.string().min(1),
        REACT_APP_WEB3_AUTH_NETWORK_PROD: z.string().optional(),
        REACT_APP_WEB3_AUTH_NETWORK_STG: z.string().min(1),
        REACT_APP_WEB3_AUTH_VERIFIER_ID_PROD: z.string().optional(),
        REACT_APP_WEB3_AUTH_VERIFIER_ID_STG: z.string().min(1),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});
