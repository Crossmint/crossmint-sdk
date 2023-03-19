import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [
        vue(),
        dts({
            tsConfigFilePath: "tsconfig.app.json",
        }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, "./src/main.ts"),
            name: "CrossmintVueSDKUi",
            fileName: "index",
        },
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ["vue"],
            output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    vue: "Vue",
                },
                exports: "named",
            },
        },
    },
});
