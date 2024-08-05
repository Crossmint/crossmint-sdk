import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    client: {
        NEXT_PUBLIC_BASE_URL: z.string().default("http://localhost:3000"),
        NEXT_PUBLIC_CROSSMINT_API_KEY: z.string().default("your-crossmint-api-key"),
        NEXT_PUBLIC_FIREBASE_API_KEY: z.string().default("your-firebase-api-key"),
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().default("your-firebase-auth-domain"),
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().default("your-firebase-project-id"),
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().default("your-firebase-storage-bucket"),
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().default("your-firebase-messaging-sender-id"),
        NEXT_PUBLIC_FIREBASE_APP_ID: z.string().default("your-firebase-app-id"),
    },
    // For Next.js >= 13.4.4, you only need to destructure client variables:
    experimental__runtimeEnv: {
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        NEXT_PUBLIC_CROSSMINT_API_KEY: process.env.NEXT_PUBLIC_CROSSMINT_API_KEY,
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
});
