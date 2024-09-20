import type { RequesterMetadata } from "@/components/common/layouts/modal/DAppRequestHeader";
import { ErrorModal } from "@/components/common/layouts/modal/ErrorModal";
import { useCrossmintWalletConnect } from "@/hooks/useCrossmintWalletConnect";
import { useWalletConnectRequests } from "@/hooks/useWalletConnectRequests";
import type { CrossmintWalletConnectDictionary } from "@/i18n/dictionary";
import { isSendTransactionMethod } from "@/utils/sendTransaction/isSendTransactionMethod";
import { isSignMessageMethod } from "@/utils/signMessage/isSignMessageMethod";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";
import { useState } from "react";

export default function UnsupportedMethodRequestedModal({
    request,
    requesterMetadata,
}: {
    request: Web3WalletTypes.SessionRequest;
    requesterMetadata: RequesterMetadata;
}) {
    const [loading, setLoading] = useState(false);

    const { rejectRequest } = useWalletConnectRequests();
    const { dictionary } = useCrossmintWalletConnect();

    const method = request.params.request.method;
    console.error("[UnsupportedMethodRequestedModal] Recieved request for an unsupported method", method);

    async function handleCloseClick() {
        setLoading(true);
        await rejectRequest(request, "UNSUPPORTED_METHODS");
        setLoading(false);
    }

    return (
        <ErrorModal
            title={dictionary.unsupportedMethodRequested.unsupportedMethod}
            message={
                <>
                    {requesterMetadata.name} {dictionary.unsupportedMethodRequested.hasRequestedYouTo}{" "}
                    {requestMethodToCopyName(method, dictionary)},{" "}
                    {dictionary.unsupportedMethodRequested.butWalletDoesNotSupportThisMethod}
                </>
            }
            onClose={handleCloseClick}
            loading={loading}
        />
    );
}

function requestMethodToCopyName(method: string, dictionary: CrossmintWalletConnectDictionary) {
    if (isSignMessageMethod(method)) {
        return dictionary.unsupportedMethodRequested.signAMessage;
    } else if (isSendTransactionMethod(method)) {
        return dictionary.unsupportedMethodRequested.sendATransaction;
    }
    return dictionary.unsupportedMethodRequested.performAnOperation(method);
}
