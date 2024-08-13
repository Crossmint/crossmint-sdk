import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

export default ({ children }: { children: ReactNode }) => {
    return (
        <PrivyProvider
            appId="clz8iksv40d95odgp6jcai4vp"
            config={{
                // Customize Privy's appearance in your app
                appearance: {
                    theme: "light",
                    accentColor: "#676FFF",
                    logo: "https://cdn.prod.website-files.com/653a93effa45d5e5a3b8e1e8/653b06fbe475503198236e11_LOGO.svg",
                },
                // Create embedded wallets for users who don't have a wallet
                embeddedWallets: {
                    createOnLogin: "users-without-wallets",
                },
            }}
        >
            {children}
        </PrivyProvider>
    );
};
