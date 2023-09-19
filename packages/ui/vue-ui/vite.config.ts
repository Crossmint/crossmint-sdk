import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [vue(), dts()],
    build: {
        sourcemap: true,
        outDir: "dist",
        lib: {
            entry: resolve(__dirname, "./src/index.ts"),
            name: "CrossmintVueSDKUi",
            formats: ["es", "cjs"],
            fileName: "index",
        },
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled into your library
            external: ["vue"],
            output: {
                // Provide global variables to use in the UMD build for externalized deps
                globals: {
                    vue: "Vue",
                },
                exports: "named",
            },
        },
    },
});
