import {
    CrossmintProvider,
    CrossmintAuthProvider,
    CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-native-ui";
import { Passkey } from "react-native-passkey";

type ProvidersProps = {
    children: React.ReactNode;
};

// No `createOnLogin` here: it pins the active wallet to one chain, and this
// playground switches chains at runtime (see 09-chain-switcher and 11-wallet-on-login).
export function Providers({ children }: ProvidersProps) {
    return (
        <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY!}>
            <CrossmintAuthProvider>
                <CrossmintWalletProvider
                    showOtpSignerPrompt
                    passkeys={{ rpId: "wallets-ios.demos-crossmint.com", rpName: "Crossmint", passkey: Passkey }}
                >
                    {children}
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
