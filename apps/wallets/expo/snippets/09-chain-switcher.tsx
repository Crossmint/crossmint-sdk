import { useWallet } from "@crossmint/client-sdk-react-native-ui";
import { ChainSwitcher } from "@crossmint/wallets-playground-shared";

export function ChainSwitcherSection() {
    const { wallet, getWallet } = useWallet();
    return <ChainSwitcher wallet={wallet} getWallet={getWallet} />;
}
