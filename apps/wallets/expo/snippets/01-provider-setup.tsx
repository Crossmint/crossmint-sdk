import {
    CrossmintProvider,
    CrossmintAuthProvider,
    CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-native-ui";

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
                >
                    {children}
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
