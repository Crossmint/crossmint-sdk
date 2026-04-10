import { useWallet } from "@crossmint/client-sdk-react-native-ui";
import { ApprovalTest as ApprovalTestShared } from "@crossmint/wallets-playground-shared";

export function ApprovalTest() {
    const { wallet } = useWallet();
    return <ApprovalTestShared wallet={wallet} />;
}
