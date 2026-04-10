import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: [
        "@crossmint/client-sdk-react-ui",
        "@crossmint/wallets-sdk",
        "@crossmint/wallets-playground-shared",
        "react-native-web",
    ],
    webpack: (config) => {
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            "react-native$": "react-native-web",
        };
        return config;
    },
};

export default nextConfig;
