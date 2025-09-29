import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    root: resolve(__dirname, "harness"),
    server: {
        port: process.env.PORT ? Number(process.env.PORT) : 5177,
        strictPort: true,
    },
    optimizeDeps: {
        include: ["@crossmint/wallets-sdk"],
    },
    resolve: {
        dedupe: ["@crossmint/wallets-sdk"],
    },
});
