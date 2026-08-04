import type { CrossmintIdentityVerificationProps } from "@/types/identity-verification/CrossmintIdentityVerificationProps";
import {
    identityVerificationIncomingEvents,
    identityVerificationOutgoingEvents,
} from "@/types/identity-verification/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

export type IdentityVerificationServiceProps = {
    apiClient: CrossmintApiClient;
};

export function createIdentityVerificationService({ apiClient }: IdentityVerificationServiceProps) {
    function getIFrameUrl(props: CrossmintIdentityVerificationProps) {
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
            incomingEvents: identityVerificationIncomingEvents,
            outgoingEvents: identityVerificationOutgoingEvents,
        });
    }

    return {
        iframe: {
            getUrl: getIFrameUrl,
            createClient: createIframeClient,
        },
    };
}
