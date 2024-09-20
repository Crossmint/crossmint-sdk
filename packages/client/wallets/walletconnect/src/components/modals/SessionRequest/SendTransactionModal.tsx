import ModalLayout from "@/components/common/layouts/modal/ModalLayout";
import { useCrossmintWalletConnect } from "@/hooks/useCrossmintWalletConnect";
import { useWalletConnectRequests } from "@/hooks/useWalletConnectRequests";
import { decodeSendTransactionRequest } from "@/utils/sendTransaction/decodeSendTransactionRequest";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";
import { useState } from "react";

import type { RequesterMetadata } from "../../common/layouts/modal/DAppRequestHeader";

export default function SendTransactionModal({
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
                message: dictionary.sendTransaction.wantsYouToSendTransaction,
            }}
            dualActionButtons={{
                left: {
                    text: dictionary.buttons.cancel,
                    onClick: handleCancel,
                    disabled: loading,
                    loading,
                },
                right: {
                    text: dictionary.buttons.send,
                    onClick: handleSign,
                    disabled: loading,
                    loading,
                },
            }}
        >
            <TransactionPreview request={request} />
        </ModalLayout>
    );
}

function TransactionPreview({ request }: { request: Web3WalletTypes.SessionRequest }) {
    const { dictionary, uiConfig } = useCrossmintWalletConnect();

    return (
        <div className="my-8 tracking-tight">
            <p
                className="mb-2 font-medium"
                style={{
                    color: uiConfig.colors.textPrimary,
                }}
            >
                {dictionary.sendTransaction.transactionColon}
            </p>
            <p
                className="w-full p-4 break-all whitespace-pre-line rounded-lg max-h-[350px] overflow-y-auto"
                style={{
                    color: uiConfig.colors.textSecondary,
                    backgroundColor: uiConfig.colors.background,
                }}
            >
                {decodeSendTransactionRequest(request).uiTransaction}
            </p>
        </div>
    );
}
