import { useWallet } from "@crossmint/client-sdk-react-native-ui";
import { Permissions as PermissionsShared } from "@crossmint/wallets-playground-shared";

export function Permissions() {
    const { wallet, createDeviceSigner, createPasskeySigner } = useWallet();
    return (
        <PermissionsShared
            wallet={wallet}
            createDeviceSigner={createDeviceSigner}
            createPasskeySigner={createPasskeySigner}
        />
    );
}
