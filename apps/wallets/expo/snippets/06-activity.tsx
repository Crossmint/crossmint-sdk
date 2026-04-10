import { useWallet } from "@crossmint/client-sdk-react-native-ui";
import { ActivityList } from "@crossmint/wallets-playground-shared";

export function Activity() {
    const { wallet } = useWallet();
    return <ActivityList wallet={wallet} />;
}
