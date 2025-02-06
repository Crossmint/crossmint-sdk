import { CrossmintCheckoutProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";
import type { ReactNode } from "react";

export function EmbeddedCheckoutV3ClientProviders({ children }: { children: ReactNode }) {
    return (
        <CrossmintProvider
            apiKey="ck_production_6CC5Y3Rid78DXVVURtts2z5z1D15LzgC5pFPA4Lba3P7CmKNnbHsPX2VvLhfzsKUEhEUtKQYXuNeZWezWnaH21YojVV2xLkSLJdJp45jeyUXP15rC3V3rVxMqUGh9f8yvNPEuD5fGPPoY7vShp5VnnEyomzwitVk1DDa6CBnp7s2Q6bUeuzgRcY8oG9q15rP172e6WX4vKyM4gfpvVJKktvh"
        >
            <CrossmintCheckoutProvider>{children}</CrossmintCheckoutProvider>
        </CrossmintProvider>
    );
}
