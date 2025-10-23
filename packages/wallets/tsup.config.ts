import { treeShakableConfig } from "../../tsup.config.base";
import type { Options } from "tsup";

const config: Options = {
    ...treeShakableConfig,
    // Exclude test files and React Native storage from the main build
    entry: [
        "src/**/*.(ts|tsx)",
        "!src/**/*.test.(ts|tsx)",
        "!src/utils/shadow-signer-storage-rn.ts", // Exclude RN storage implementation
    ],
    // Add external dependencies that should not be bundled
    external: ["react-native-webview-crypto", "@react-native-async-storage/async-storage"],
    // Define environment variables for conditional compilation
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    },
};

export default config;
