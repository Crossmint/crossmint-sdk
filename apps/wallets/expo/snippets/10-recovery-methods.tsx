import { useWallet } from "@crossmint/client-sdk-react-native-ui";
import { RecoveryMethods as RecoveryMethodsShared } from "@crossmint/wallets-playground-shared";
import { createMockPasskeySigner } from "../src/mockPasskey";

export function RecoveryMethods() {
    const { wallet, createWallet, createPasskeySigner } = useWallet();
    // Same CI-only passkey mock as Permissions: the RN provider's createPasskeySigner throws on native.
    const useMockPasskey = process.env.EXPO_PUBLIC_MOCK_PASSKEY === "true";
    return (
        <RecoveryMethodsShared
            wallet={wallet}
            createWallet={(args) => createWallet(args as Parameters<typeof createWallet>[0])}
            createPasskeySigner={useMockPasskey ? createMockPasskeySigner : createPasskeySigner}
        />
    );
}
