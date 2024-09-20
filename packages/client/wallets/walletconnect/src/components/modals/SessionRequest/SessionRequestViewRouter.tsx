import { useWalletConnectRequests } from "@/hooks/useWalletConnectRequests";
import { useWalletConnectSessions } from "@/hooks/useWalletConnectSessions";
import { useWalletConnectWallets } from "@/hooks/useWalletConnectWallets";
import { isSendTransactionMethod } from "@/utils/sendTransaction/isSendTransactionMethod";
import { isSignMessageMethod } from "@/utils/signMessage/isSignMessageMethod";
import { supportedNamespacesSatisfiesMethod } from "@/utils/wallet/supportedNamespacesSatisfiesMethod";
import type { SessionTypes } from "@walletconnect/types";
import type { BuildApprovedNamespacesParams } from "@walletconnect/utils";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";
import { useEffect, useState } from "react";

import type { RequesterMetadata } from "../../common/layouts/modal/DAppRequestHeader";
import SendTransactionModal from "./SendTransactionModal";
import SignMessageModal from "./SignMessageModal";
import UnsupportedMethodRequestedModal from "./UnsupportedMethodRequestedModal";

export default function SessionRequestViewRouter({ request }: { request: Web3WalletTypes.SessionRequest }) {
    const [supportedNamespaces, setSupportedNamespaces] = useState<
        BuildApprovedNamespacesParams["supportedNamespaces"] | undefined
    >(undefined);

    const { getSupportedNamespaces } = useWalletConnectWallets();
    const { getSessionForRequest } = useWalletConnectSessions();
    const { rejectRequest } = useWalletConnectRequests();

    const method = request.params.request.method;

    useEffect(() => {
        (async () => {
            const supportedNamespaces = await getSupportedNamespaces();
            setSupportedNamespaces(supportedNamespaces);
        })();
    }, [request]);

    if (!supportedNamespaces) {
        return null;
    }

    const sessionForRequest = getSessionForRequest(request);
    if (!sessionForRequest) {
        rejectRequest(request);
        return null;
    }

    const requesterMetadata = buildRequesterMetadata(request, sessionForRequest);
    const props = {
        request,
        requesterMetadata,
    };

    const doesSupportMethod = supportedNamespacesSatisfiesMethod(method, supportedNamespaces);
    if (!doesSupportMethod) {
        return <UnsupportedMethodRequestedModal {...props} />;
    }

    if (isSignMessageMethod(method)) {
        return <SignMessageModal {...props} />;
    } else if (isSendTransactionMethod(method)) {
        return <SendTransactionModal {...props} />;
    }

    // TODO: Unknown method modal
    return <p>Unknown method</p>;
}

function buildRequesterMetadata(
    request: Web3WalletTypes.SessionRequest,
    sessionForRequest: SessionTypes.Struct
): RequesterMetadata {
    const requesterMetadata = sessionForRequest.peer.metadata;

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
