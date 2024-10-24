import type { CrossmintEmbeddedCheckoutV3Props } from "@/types/embed/v3/CrossmintEmbeddedCheckoutV3Props";
import { embeddedCheckoutV3IncomingEvents, embeddedCheckoutV3OutgoingEvents } from "@/types/embed/v3/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";

import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

export type CrossmintEmbeddedCheckoutV3ServiceProps = {
    apiClient: CrossmintApiClient;
};

export function crossmintEmbeddedCheckoutV3Service({ apiClient }: CrossmintEmbeddedCheckoutV3ServiceProps) {
    function getIFrameUrl(props: CrossmintEmbeddedCheckoutV3Props) {
        const sdkMetadata = apiClient["internalConfig"].sdkMetadata;
        const urlWithPath = apiClient.buildUrl("/sdk/2024-03-05/embedded-checkout");
        const queryParams = new URLSearchParams();

        appendObjectToQueryParams(queryParams, props);

        queryParams.append("apiKey", apiClient.crossmint.apiKey);
        queryParams.append("sdkMetadata", JSON.stringify(sdkMetadata));

        return `${urlWithPath}?${queryParams.toString()}`;
    }

    function createIframeClient(iframe: HTMLIFrameElement) {
        return IFrameWindow.initExistingIFrame(iframe, {
            incomingEvents: embeddedCheckoutV3IncomingEvents,
            outgoingEvents: embeddedCheckoutV3OutgoingEvents,
        });
    }

    return {
        iframe: {
            getUrl: getIFrameUrl,
            createClient: createIframeClient,
        },
    };
}
