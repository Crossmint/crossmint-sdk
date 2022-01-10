import React, { FC, ReactNode, useEffect, useState } from "react";
import { OnboardingRequestStatusResponse, CrossMintStatusContext } from "./useCrossMintStatus";

export interface CrossMintStatusProviderProps {
    clientId: string;
    hideMintOnInactiveClient: boolean;
    children: ReactNode;
}

export const CrossMintStatusProvider: FC<CrossMintStatusProviderProps> = ({
    clientId,
    hideMintOnInactiveClient,
    children,
}) => {
    const [status, setStatus] = useState<OnboardingRequestStatusResponse>(
        OnboardingRequestStatusResponse.WAITING_SUBMISSION
    );

    async function fetchClientIntegration() {
        const res = await fetch(`https://crossmint.io/api/crossmint/onboardingRequests/${clientId}/status`);

        if (res.status === 200) {
            const resData: { clientId: string; status: OnboardingRequestStatusResponse } = await res.json();

            console.log("resData", resData);
            setStatus(resData.status);
        } else {
            if (status !== OnboardingRequestStatusResponse.INVALID) {
                setStatus(OnboardingRequestStatusResponse.INVALID);
            }
        }
    }

    useEffect(() => {
        fetchClientIntegration();

        const interval = setInterval(() => {
            fetchClientIntegration();
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <CrossMintStatusContext.Provider
            value={{
                status,
                clientId,
                hideMintOnInactiveClient,
            }}
        >
            {children}
        </CrossMintStatusContext.Provider>
    );
};
