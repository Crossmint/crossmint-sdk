import { useWalletConnectSessions } from "@/hooks/useWalletConnectSessions";
import { isSendTransactionMethod } from "@/utils/sendTransaction/isSendTransactionMethod";
import { isSignMessageMethod } from "@/utils/signMessage/isSignMessageMethod";
import { SessionTypes } from "@walletconnect/types";
import { Web3WalletTypes } from "@walletconnect/web3wallet";

import { RequesterMetadata } from "../../common/layouts/modal/DAppRequestHeader";
import SendTransactionModal from "./SendTransactionModal";
import SignMessageModal from "./SignMessageModal";

export default function SessionRequestViewRouter({ request }: { request: Web3WalletTypes.SessionRequest }) {
    const { sessions } = useWalletConnectSessions();

    const requesterMetadata = buildRequesterMetadata(request, sessions);

    const props = {
        request,
        requesterMetadata,
    };

    const method = request.params.request.method;

    if (isSignMessageMethod(method)) {
        return <SignMessageModal {...props} />;
    } else if (isSendTransactionMethod(method)) {
        return <SendTransactionModal {...props} />;
    }

    return <p>Unsupported method</p>;
}

function buildRequesterMetadata(
    request: Web3WalletTypes.SessionRequest,
    sessions: SessionTypes.Struct[]
): RequesterMetadata {
    const sessionForRequest = sessions.find((s) => s.topic === request.topic);
    const requesterMetadata = sessionForRequest?.peer.metadata;

    if (!requesterMetadata) {
        return {
            name: "Unknown",
            icon: "https://www.crossmint.com/assets/ui/picPlaceholder.png",
            url: "unknown",
        };
    }

    const icon =
        requesterMetadata.icons && requesterMetadata.icons[0]
            ? requesterMetadata.icons[0]
            : "https://www.crossmint.com/assets/ui/picPlaceholder.png";

    return {
        name: requesterMetadata.name,
        icon,
        url: requesterMetadata.url,
    };
}
