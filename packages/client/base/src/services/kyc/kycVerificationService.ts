import type { CrossmintKycVerificationProps } from "@/types/kyc/CrossmintKycVerificationProps";
import { kycVerificationIncomingEvents, kycVerificationOutgoingEvents } from "@/types/kyc/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

export type KycVerificationServiceProps = {
    apiClient: CrossmintApiClient;
};

export function createKycVerificationService({ apiClient }: KycVerificationServiceProps) {
    function getIFrameUrl(props: CrossmintKycVerificationProps) {
        const urlWithPath = apiClient.buildUrl("/sdk/unstable/kyc-verification");
        const queryParams = new URLSearchParams();

        // appendObjectToQueryParams drops function values, so the lifecycle
        // callbacks never reach the URL.
        appendObjectToQueryParams(queryParams, props);

        queryParams.append("apiKey", apiClient.crossmint.apiKey);
        queryParams.append("sdkMetadata", JSON.stringify(apiClient["internalConfig"].sdkMetadata));

        return `${urlWithPath}?${queryParams.toString()}`;
    }

    function createIframeClient(iframe: HTMLIFrameElement) {
        return IFrameWindow.initExistingIFrame(iframe, {
            incomingEvents: kycVerificationIncomingEvents,
            outgoingEvents: kycVerificationOutgoingEvents,
        });
    }

    return {
        iframe: {
            getUrl: getIFrameUrl,
            createClient: createIframeClient,
        },
    };
}
