import { z } from "zod";

const envSchema = z.object({
    REACT_APP_CROSSMINT_API_KEY_PROD: z.string(),
    REACT_APP_CROSSMINT_API_KEY_STG: z.string().min(1),
    REACT_APP_FIREBASE_API_KEY: z.string().min(1),
    REACT_APP_FIREBASE_AUTH_DOMAIN: z.string().min(1),
    REACT_APP_FIREBASE_PROJECT_ID: z.string().min(1),
    REACT_APP_FIREBASE_STORAGE_BUCKET: z.string().min(1),
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
    REACT_APP_FIREBASE_APP_ID: z.string().min(1),
    REACT_APP_WEB3_AUTH_CLIENT_ID_PROD: z.string().min(1),
    REACT_APP_WEB3_AUTH_CLIENT_ID_STG: z.string().min(1),
    REACT_APP_WEB3_AUTH_NETWORK_PROD: z.string().min(1),
    REACT_APP_WEB3_AUTH_NETWORK_STG: z.string().min(1),
    REACT_APP_WEB3_AUTH_VERIFIER_ID_PROD: z.string().min(1),
    REACT_APP_WEB3_AUTH_VERIFIER_ID_STG: z.string().min(1),
});

const envResult = envSchema.safeParse(process.env);

function logEnvErrors(errors: z.ZodError["errors"]) {
    const errorMessage = `
    Before running the application, you need to set up your environment variables:
    1. Copy the '.env.example' file in the root directory and rename the copy to '.env'.
    2. Open the '.env' file and fill in the necessary values as described in the readme.md.`;
    console.error(errorMessage);
    console.error("Zod Errors: ", errors);
}

// log environment variable warning in console but don't block.
export const env = envResult.success
    ? envResult.data
    : (() => {
          logEnvErrors(envResult.error.errors);
          return {} as typeof envSchema._type;
      })();
