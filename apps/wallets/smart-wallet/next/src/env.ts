import { z } from "zod";

const ci = !!process.env.CI;

const EnvSchema = z.object({
    NEXT_PUBLIC_BASE_URL: z.string().optional(),
    NEXT_PUBLIC_CROSSMINT_API_KEY: z.string().min(1),
    NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
    NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
});

// todo: fix later to work with CI.
export const env = ci ? (process.env as unknown as z.infer<typeof EnvSchema>) : EnvSchema.parse(process.env);
