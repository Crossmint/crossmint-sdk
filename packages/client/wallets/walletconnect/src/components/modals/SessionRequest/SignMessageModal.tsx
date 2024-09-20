import ModalLayout from "@/components/common/layouts/modal/ModalLayout";
import { useCrossmintWalletConnect } from "@/hooks/useCrossmintWalletConnect";
import { useWalletConnectRequests } from "@/hooks/useWalletConnectRequests";
import { decodeSignMessageRequest } from "@/utils/signMessage/decodeSignMessageRequest";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";
import { useState } from "react";

import type { RequesterMetadata } from "../../common/layouts/modal/DAppRequestHeader";

export default function SignMessageModal({
    request,
    requesterMetadata,
}: {
    request: Web3WalletTypes.SessionRequest;
    requesterMetadata: RequesterMetadata;
}) {
    const [loading, setLoading] = useState(false);

    const { dictionary } = useCrossmintWalletConnect();
    const { acceptRequest, rejectRequest } = useWalletConnectRequests();

    const handleCancel = async () => {
        setLoading(true);
        await rejectRequest(request);
        setLoading(false);
    };

    const handleSign = async () => {
        setLoading(true);
        await acceptRequest(request);
        setLoading(false);
    };

    return (
        <ModalLayout
            modal={{
                show: true,
                onClose: handleCancel,
            }}
            dAppRequestHeader={{
                requesterMetadata,
                message: dictionary.signMessage.wantsYouToSignMessage,
            }}
            dualActionButtons={{
                left: {
                    text: dictionary.buttons.cancel,
                    onClick: handleCancel,
                    disabled: loading,
                    loading,
                },
                right: {
                    text: dictionary.buttons.sign,
                    onClick: handleSign,
                    disabled: loading,
                    loading,
                },
            }}
        >
            <MessagePreview request={request} />
        </ModalLayout>
    );
}

function MessagePreview({ request }: { request: Web3WalletTypes.SessionRequest }) {
    const { dictionary, uiConfig } = useCrossmintWalletConnect();

    return (
        <div className="my-8 tracking-tight">
            <p
                className="mb-2 font-medium"
                style={{
                    color: uiConfig.colors.textPrimary,
                }}
            >
                {dictionary.signMessage.messageColon}
            </p>
            <p
                className="w-full p-4 break-all whitespace-pre-line rounded-lg max-h-[350px] overflow-y-auto"
                style={{
                    color: uiConfig.colors.textSecondary,
                    backgroundColor: uiConfig.colors.background,
                }}
            >
                {decodeSignMessageRequest(request).uiMessage}
            </p>
        </div>
    );
}
