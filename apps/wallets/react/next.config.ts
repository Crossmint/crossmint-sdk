import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: ["@crossmint/client-sdk-react-ui", "@crossmint/wallets-sdk"],
};

export default nextConfig;
