import ModalLayout from "@/components/common/layouts/modal/ModalLayout";
import { useCrossmintWalletConnect } from "@/hooks/useCrossmintWalletConnect";
import { useWalletConnectSessions } from "@/hooks/useWalletConnectSessions";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";
import { useState } from "react";

export default function RequestedPermissionsModal({ proposal }: { proposal: Web3WalletTypes.SessionProposal }) {
    const [loading, setLoading] = useState(false);

    const { uiConfig, dictionary } = useCrossmintWalletConnect();
    const { approveSession, rejectSession } = useWalletConnectSessions();

    const handleCancel = async () => {
        setLoading(true);
        await rejectSession(proposal);
        setLoading(false);
    };
    const handleConnect = async () => {
        setLoading(true);
        await approveSession(proposal);
        setLoading(false);
    };

    return (
        <ModalLayout
            modal={{
                show: true,
                onClose: handleCancel,
            }}
            dAppRequestHeader={{
                requesterMetadata: {
                    ...proposal.params.proposer.metadata,
                    icon: proposal.params.proposer.metadata.icons[0],
                },
                message: dictionary.sessionProposal.wantsToAccessYourWallet(uiConfig.metadata.name),
            }}
            dualActionButtons={{
                left: {
                    text: dictionary.buttons.cancel,
                    onClick: handleCancel,
                    disabled: loading,
                    loading,
                },
                right: {
                    text: dictionary.buttons.connect,
                    onClick: handleConnect,
                    disabled: loading,
                    loading,
                },
            }}
        >
            <RequestedPermissions />
        </ModalLayout>
    );
}

function RequestedPermissions() {
    const { uiConfig, dictionary } = useCrossmintWalletConnect();
    const textItemClassName = "text-secondary-text tracking-tight";
    const textStyle = {
        color: uiConfig.colors.textPrimary,
    };

    return (
        <div className="flex flex-col items-center justify-start w-full my-8">
            <div className="flex flex-col items-start justify-start w-full">
                <h3 className="mb-2 font-medium tracking-tight">{dictionary.sessionProposal.wouldLikeTo}</h3>

                <ul className="space-y-1">
                    <li className="flex items-center space-x-4">
                        <CheckIcon color={uiConfig.colors.accent} className="w-4 h-4" />{" "}
                        <p className={textItemClassName} style={textStyle}>
                            {dictionary.sessionProposal.viewYourWalletAddress(uiConfig.metadata.name)}
                        </p>
                    </li>
                    <li className="flex items-center space-x-4">
                        <CheckIcon color={uiConfig.colors.accent} className="w-4 h-4" />{" "}
                        <p className={textItemClassName} style={textStyle}>
                            {dictionary.sessionProposal.viewYourNFTs}
                        </p>
                    </li>
                </ul>
            </div>

            <hr
                className="w-full my-4 rounded-full opacity-50"
                style={{
                    borderColor: uiConfig.colors.border,
                }}
            />

            <div className="flex flex-col items-start justify-start w-full">
                <h3 className="mb-2 font-medium tracking-tight">{dictionary.sessionProposal.wontBeAbleTo}</h3>

                <ul className="space-y-1">
                    <li className="flex items-center space-x-4">
                        <XMarkIcon color={uiConfig.colors.danger} className="w-4 h-4" />{" "}
                        <p className={textItemClassName} style={textStyle}>
                            {dictionary.sessionProposal.takeActionsWithoutPermission}
                        </p>
                    </li>
                    <li className="flex items-center space-x-4">
                        <XMarkIcon color={uiConfig.colors.danger} className="w-4 h-4" />{" "}
                        <p className={textItemClassName} style={textStyle}>
                            {dictionary.sessionProposal.accessPersonalInformation}
                        </p>
                    </li>
                </ul>
            </div>
        </div>
    );
}
