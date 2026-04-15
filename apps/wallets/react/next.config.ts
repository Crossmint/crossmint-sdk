import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: [
        "@crossmint/client-sdk-react-ui",
        "@crossmint/wallets-sdk",
        "@crossmint/wallets-playground-shared",
        "react-native-web",
    ],
    turbopack: {
        resolveAlias: {
            "react-native": "react-native-web",
        },
    },
};

export default nextConfig;
