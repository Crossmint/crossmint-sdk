import { useCrossmintWalletConnect } from "@/hooks/useCrossmintWalletConnect";
import { XCircleIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import Loader from "../../Loader";
import ActionModal from "./ActionModal";

export interface ErrorModalProps {
    title: string;
    message: ReactNode;
    loading?: boolean;
    onClose: () => void;
}

export function ErrorModal({ title, message, loading, onClose }: ErrorModalProps) {
    const { uiConfig, dictionary } = useCrossmintWalletConnect();

    return (
        <ActionModal show={true} onClose={onClose}>
            <XCircleIcon
                className="w-[72px] h-[72px] my-4"
                style={{
                    color: uiConfig.colors.danger,
                }}
            />

            <p
                className="tracking-tight font-semibold text-lg pb-1 text-center"
                style={{
                    color: uiConfig.colors.textPrimary,
                }}
            >
                {title}
            </p>

            <p
                className="text-center text-sm"
                style={{
                    color: uiConfig.colors.textSecondary,
                }}
            >
                {message}
            </p>

            <button
                onClick={onClose}
                disabled={loading}
                className="w-full rounded-md flex items-center justify-center text-center h-11 border mt-4 font-semibold hover:opacity-60 transition-opacity duration-200"
                style={{
                    borderColor: uiConfig.colors.border,
                    color: uiConfig.colors.textPrimary,
                }}
            >
                {loading ? <Loader size={4} color={uiConfig.colors.textSecondary} /> : dictionary.buttons.close}
            </button>
        </ActionModal>
    );
}
