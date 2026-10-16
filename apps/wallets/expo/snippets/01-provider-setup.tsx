import {
    CrossmintProvider,
    CrossmintAuthProvider,
    CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-native-ui";
import { Passkey } from "react-native-passkey";

type ProvidersProps = {
    children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
    return (
        <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY!}>
            <CrossmintAuthProvider>
                <CrossmintWalletProvider
                    createOnLogin={{
                        chain: (process.env.EXPO_PUBLIC_CHAIN as any) || "base-sepolia",
                        recovery: { type: "email" },
                    }}
                    showOtpSignerPrompt
                    passkeys={{ rpId: "wallets-ios.demos-crossmint.com", rpName: "Crossmint", passkey: Passkey }}
                >
                    {children}
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
