import { useWallet } from "@crossmint/client-sdk-react-native-ui";
import { Permissions as PermissionsShared } from "@crossmint/wallets-playground-shared";
import { createMockPasskeySigner } from "../src/mockPasskey";

export function Permissions() {
    const { wallet, createDeviceSigner, createPasskeySigner } = useWallet();
    // Mock passkeys are for CI e2e only: the Maestro flows in
    // crossmint-mobile-e2e-tests set EXPO_PUBLIC_MOCK_PASSKEY=true at build time
    // so they can exercise the add-signer path (the RN provider's real
    // createPasskeySigner always throws — no WebAuthn on native). The real path
    // is preserved by default for local/manual testing.
    const useMockPasskey = process.env.EXPO_PUBLIC_MOCK_PASSKEY === "true";
    return (
        <PermissionsShared
            wallet={wallet}
            createDeviceSigner={createDeviceSigner}
            createPasskeySigner={useMockPasskey ? createMockPasskeySigner : createPasskeySigner}
        />
    );
}
