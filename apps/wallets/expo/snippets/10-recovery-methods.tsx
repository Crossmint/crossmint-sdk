import { useWallet } from "@crossmint/client-sdk-react-native-ui";
import { RecoveryMethods as RecoveryMethodsShared } from "@crossmint/wallets-playground-shared";
import { createMockPasskeySigner } from "../src/mockPasskey";

export function RecoveryMethods() {
    const { wallet, createWallet } = useWallet();
    // The RN provider's createPasskeySigner always throws, so passkeys are only offered with the CI-only mock.
    const useMockPasskey = process.env.EXPO_PUBLIC_MOCK_PASSKEY === "true";
    return (
        <RecoveryMethodsShared
            wallet={wallet}
            createWallet={(args) => createWallet(args as Parameters<typeof createWallet>[0])}
            createPasskeySigner={useMockPasskey ? createMockPasskeySigner : undefined}
        />
    );
}
