import vue from "@vitejs/plugin-vue";
import { URL, fileURLToPath } from "node:url";
import * as path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    build: {
        cssCodeSplit: true,
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: "src/main.ts",
            name: "crossmintClientSdkVueUi",
            formats: ["es", "cjs", "umd"],
            fileName: (format) => `index.${format}.js`,
        },
        rollupOptions: {
            // make sure to externalize deps that should not be bundled
            // into your library
            input: {
                main: path.resolve(__dirname, "src/main.ts"),
            },
            external: ["vue"],
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name === "main.css") return "index.css";
                    return assetInfo.name || "";
                },
                exports: "named",
                globals: {
                    vue: "Vue",
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
