import { useWallet } from "@crossmint/client-sdk-react-native-ui";
import { Permissions as PermissionsShared } from "@crossmint/wallets-playground-shared";
import { createMockPasskeySigner } from "../src/mockPasskey";

export function Permissions() {
    const { wallet, createDeviceSigner } = useWallet();
    // The RN provider guards real passkeys (no WebAuthn on native) — its
    // createPasskeySigner always throws. The playground passes a mock instead so
    // e2e flows can exercise the add-signer path, mirroring the Flutter sample.
    return (
        <PermissionsShared
            wallet={wallet}
            createDeviceSigner={createDeviceSigner}
            createPasskeySigner={createMockPasskeySigner}
        />
    );
}
